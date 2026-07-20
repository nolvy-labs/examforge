using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Application.Admin.Exams.Utils;
using ExamForge.Application.Common;
using ExamForge.Domain.Common;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Services;

public sealed class AdminQuestionService
{
    private readonly IAdminQuestionRepository _questions;
    private readonly IAdminExamSectionRepository _sections;
    private readonly IAdminExamVersionRepository _versions;
    private readonly IUnitOfWork _unitOfWork;
    private readonly NestedExamContentFactory _contentFactory;
    private readonly NestedExamContentPersistence? _contentPersistence;

    public AdminQuestionService(
        IAdminQuestionRepository questions,
        IAdminExamSectionRepository sections,
        IAdminExamVersionRepository versions,
        IUnitOfWork unitOfWork,
        NestedExamContentFactory? contentFactory = null,
        NestedExamContentPersistence? contentPersistence = null)
    {
        _questions = questions;
        _sections = sections;
        _versions = versions;
        _unitOfWork = unitOfWork;
        _contentFactory = contentFactory ?? new NestedExamContentFactory();
        _contentPersistence = contentPersistence;
    }

    public async Task<Result<IReadOnlyList<QuestionSummaryResponse>, QuestionError>> GetListAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        CancellationToken cancellationToken = default)
    {
        var error = await ValidateReadOwnershipAsync(examId, versionId, sectionId, cancellationToken);

        if (error != QuestionError.None)
        {
            return SummaryFailure(error);
        }

        var questions = await _questions.GetListAsync(
            examId,
            versionId,
            sectionId,
            cancellationToken);
        return SummarySuccess(questions.Select(ToSummaryResponse).ToList());
    }

    public async Task<Result<QuestionDetailResponse, QuestionError>> GetByIdAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken = default)
    {
        var error = await ValidateReadOwnershipAsync(examId, versionId, sectionId, cancellationToken);

        if (error != QuestionError.None)
        {
            return DetailFailure(error);
        }

        var question = await _questions.GetDetailAsync(
            examId,
            versionId,
            sectionId,
            questionId,
            cancellationToken);
        return question is null
            ? DetailFailure(QuestionError.QuestionNotFound)
            : DetailSuccess(ToDetailResponse(question));
    }

    public async Task<Result<QuestionDetailResponse, QuestionError>> CreateAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        CreateQuestionRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request?.Detail is null)
        {
            return DetailFailure(QuestionError.InvalidRequest);
        }

        var points = request.Detail.Points ?? DefaultPoints(request.Detail.Type);
        var validationError = ValidateDetails(
            request.Detail.Type,
            request.Detail.Prompt,
            request.Detail.Explanation,
            points);

        if (validationError != QuestionError.None)
        {
            return DetailFailure(validationError);
        }

        if (request.ParentQuestionId.HasValue && request.Detail.Type == QuestionType.Group)
        {
            return DetailFailure(QuestionError.InvalidParentQuestion);
        }

        return await ExecuteAsync(async token =>
        {
            var mutation = await LoadMutableSectionAsync(examId, versionId, sectionId, token);

            if (mutation.Error != QuestionError.None)
            {
                return DetailFailure(mutation.Error);
            }

            if (request.ParentQuestionId.HasValue)
            {
                var parent = await _questions.GetTrackedAsync(
                    sectionId,
                    request.ParentQuestionId.Value,
                    token);

                if (parent is null)
                {
                    return DetailFailure(QuestionError.ParentQuestionNotFound);
                }

                if (parent.Type != QuestionType.Group || parent.ParentQuestionId.HasValue)
                {
                    return DetailFailure(QuestionError.InvalidParentQuestion);
                }
            }

            var maximumOrder = await _questions.GetMaximumDisplayOrderAsync(
                sectionId,
                request.ParentQuestionId,
                token);

            if (maximumOrder == int.MaxValue)
            {
                return DetailFailure(QuestionError.DisplayOrderExhausted);
            }

            var input = new CreateQuestionInput(
                request.Detail,
                request.ChildQuestions,
                request.Options,
                request.AnswerKeys);
            var graphResult = _contentFactory.CreateQuestion(
                sectionId,
                request.ParentQuestionId,
                input,
                maximumOrder.HasValue ? maximumOrder.Value + 1 : 0);
            if (!graphResult.IsSuccess)
            {
                return Result<QuestionDetailResponse, QuestionError>.Failure(
                    QuestionError.InvalidNestedContent,
                    graphResult.Error.Select(error => error with
                    {
                        Path = error.Path.StartsWith("question.", StringComparison.Ordinal)
                            ? error.Path[9..]
                            : error.Path
                    }).ToList());
            }

            var graph = graphResult.Value!;
            var hasNestedContent = graph.Children.Count > 0 || graph.Options.Count > 0 || graph.AnswerKeys.Count > 0;
            if (hasNestedContent)
            {
                if (_contentPersistence is null)
                    throw new InvalidOperationException("Nested exam content persistence is unavailable.");
                _contentPersistence.Add(graph);
            }
            else
            {
                _questions.Add(graph.Question);
            }

            var addedScore = graph.Question.Type == QuestionType.Group
                ? graph.Children.Sum(child => child.Question.Points)
                : graph.Question.Points;
            mutation.Version!.UpdateTotalScore(mutation.Version.TotalScore + addedScore);
            await _unitOfWork.SaveChangesAsync(token);
            return DetailSuccess(NestedExamContentFactory.ToResponse(graph));
        }, DetailFailure(QuestionError.ConcurrencyConflict), cancellationToken);
    }

    public async Task<Result<QuestionDetailResponse, QuestionError>> UpdateAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        IReadOnlyList<PatchOperation>? operations,
        CancellationToken cancellationToken = default)
    {
        var limitErrors = RestrictedPatchApplier.ValidateDocumentLimits(operations);
        if (limitErrors is not null)
            return DetailFailure(QuestionError.InvalidPatch, limitErrors);

        return await ExecuteAsync(async token =>
        {
            var mutation = await LoadMutableSectionAsync(examId, versionId, sectionId, token);

            if (mutation.Error != QuestionError.None)
            {
                return DetailFailure(mutation.Error);
            }

            var question = await _questions.GetTrackedAsync(sectionId, questionId, token);

            if (question is null)
            {
                return DetailFailure(QuestionError.QuestionNotFound);
            }

            var patch = RestrictedPatchApplier.Apply(operations, new QuestionPatchModel
            {
                Type = question.Type,
                Prompt = question.Prompt,
                Explanation = question.Explanation,
                Points = question.Points
            });
            if (!patch.IsSuccess)
                return DetailFailure(QuestionError.InvalidPatch, patch.Error);

            var model = patch.Value!;
            var validationError = ValidateDetails(model.Type, model.Prompt, model.Explanation, model.Points);

            if (validationError != QuestionError.None)
                return DetailFailure(QuestionError.InvalidPatch, new[] {
                    new PatchValidationError(operations!.Count, null, "invalid_final_state", "The patched question details are invalid.") });

            if (!CanChangeType(question, model.Type))
            {
                return DetailFailure(QuestionError.IncompatibleQuestionContent);
            }

            var oldScore = question.Type == QuestionType.Group ? 0m : question.Points;
            var newScore = model.Type == QuestionType.Group ? 0m : model.Points;
            var affectsScore = oldScore != newScore;

            if (question.UpdateDetails(model.Type, model.Prompt, model.Explanation, model.Points))
            {
                if (affectsScore)
                    mutation.Version!.UpdateTotalScore(mutation.Version.TotalScore - oldScore + newScore);
                await _unitOfWork.SaveChangesAsync(token);
            }

            var saved = await _questions.GetDetailAsync(
                examId,
                versionId,
                sectionId,
                questionId,
                token);
            return saved is null
                ? DetailFailure(QuestionError.QuestionNotFound)
                : DetailSuccess(ToDetailResponse(saved));
        }, DetailFailure(QuestionError.ConcurrencyConflict), cancellationToken);
    }

    public async Task<Result<IReadOnlyList<QuestionSummaryResponse>, QuestionError>> ReorderAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        ReorderQuestionsRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request?.OrderedQuestionIds is null)
        {
            return SummaryFailure(QuestionError.InvalidRequest);
        }

        return await ExecuteAsync(async token =>
        {
            var mutation = await LoadMutableSectionAsync(examId, versionId, sectionId, token);

            if (mutation.Error != QuestionError.None)
            {
                return SummaryFailure(mutation.Error);
            }

            if (request.ParentQuestionId.HasValue)
            {
                var parent = await _questions.GetTrackedAsync(
                    sectionId,
                    request.ParentQuestionId.Value,
                    token);

                if (parent is null)
                {
                    return SummaryFailure(QuestionError.ParentQuestionNotFound);
                }

                if (parent.Type != QuestionType.Group || parent.ParentQuestionId.HasValue)
                {
                    return SummaryFailure(QuestionError.InvalidParentQuestion);
                }
            }

            var siblings = await _questions.GetTrackedSiblingsAsync(
                sectionId,
                request.ParentQuestionId,
                token);
            var ids = request.OrderedQuestionIds;

            if (ids.Distinct().Count() != ids.Count ||
                ids.Count != siblings.Count ||
                !ids.ToHashSet().SetEquals(siblings.Select(question => question.Id)))
            {
                return SummaryFailure(QuestionError.InvalidQuestionOrder);
            }

            if (!siblings.Select(question => question.Id).SequenceEqual(ids))
            {
                AssignTemporaryOrders(siblings);
                await _unitOfWork.SaveChangesAsync(token);
                var byId = siblings.ToDictionary(question => question.Id);

                for (var index = 0; index < ids.Count; index++)
                {
                    byId[ids[index]].ChangeDisplayOrder(index);
                }

                await _unitOfWork.SaveChangesAsync(token);
            }

            var reordered = await _questions.GetListAsync(
                examId,
                versionId,
                sectionId,
                token);
            return SummarySuccess(reordered.Select(ToSummaryResponse).ToList());
        }, SummaryFailure(QuestionError.ConcurrencyConflict), cancellationToken);
    }

    public async Task<QuestionError> DeleteAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken = default)
    {
        return await ExecuteAsync(async token =>
        {
            var mutation = await LoadMutableSectionAsync(examId, versionId, sectionId, token);

            if (mutation.Error != QuestionError.None)
            {
                return mutation.Error;
            }

            var question = await _questions.GetTrackedAsync(sectionId, questionId, token);

            if (question is null)
            {
                return QuestionError.QuestionNotFound;
            }

            var siblings = await _questions.GetTrackedSiblingsAsync(
                sectionId,
                question.ParentQuestionId,
                token);
            var remaining = siblings.Where(item => item.Id != questionId).ToList();

            if (remaining.Count > 0)
            {
                AssignTemporaryOrders(remaining);
                await _unitOfWork.SaveChangesAsync(token);
            }

            if (question.Type == QuestionType.Group)
            {
                var children = await _questions.GetTrackedChildrenAsync(sectionId, question.Id, token);

                if (children.Count > 0)
                {
                    _questions.RemoveRange(children);
                    await _unitOfWork.SaveChangesAsync(token);
                }
            }

            _questions.Remove(question);
            await _unitOfWork.SaveChangesAsync(token);

            for (var index = 0; index < remaining.Count; index++)
            {
                remaining[index].ChangeDisplayOrder(index);
            }

            if (remaining.Count > 0)
            {
                await _unitOfWork.SaveChangesAsync(token);
            }

            await RecalculateTotalScoreAsync(mutation.Version!, token);
            return QuestionError.None;
        }, QuestionError.ConcurrencyConflict, cancellationToken);
    }

    private async Task<QuestionError> ValidateReadOwnershipAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        CancellationToken cancellationToken)
    {
        if (!await _versions.ExamExistsAsync(examId, cancellationToken))
        {
            return QuestionError.ExamNotFound;
        }

        if (await _versions.GetDetailAsync(examId, versionId, cancellationToken) is null)
        {
            return QuestionError.VersionNotFound;
        }

        return await _sections.GetDetailAsync(examId, versionId, sectionId, cancellationToken) is null
            ? QuestionError.SectionNotFound
            : QuestionError.None;
    }

    private async Task<(ExamVersion? Version, QuestionError Error)> LoadMutableSectionAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        CancellationToken cancellationToken)
    {
        var exam = await _versions.GetExamForUpdateAsync(examId, cancellationToken);

        if (exam is null)
        {
            return (null, QuestionError.ExamNotFound);
        }

        if (exam.IsArchived)
        {
            return (null, QuestionError.ExamArchived);
        }

        var version = await _versions.GetTrackedAsync(examId, versionId, cancellationToken);

        if (version is null)
        {
            return (null, QuestionError.VersionNotFound);
        }

        if (version.Status != ExamVersionStatus.Draft)
        {
            return (version, QuestionError.VersionNotEditable);
        }

        return await _sections.GetTrackedAsync(versionId, sectionId, cancellationToken) is null
            ? (version, QuestionError.SectionNotFound)
            : (version, QuestionError.None);
    }

    private async Task RecalculateTotalScoreAsync(
        ExamVersion version,
        CancellationToken cancellationToken)
    {
        var total = await _questions.GetVersionTotalScoreAsync(version.Id, cancellationToken);

        if (version.UpdateTotalScore(total))
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task<T> ExecuteAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        T conflictResult,
        CancellationToken cancellationToken)
    {
        try
        {
            return await _unitOfWork.ExecuteInTransactionAsync(operation, cancellationToken);
        }
        catch (PersistenceConflictException)
        {
            return conflictResult;
        }
    }

    private static QuestionError ValidateDetails(
        QuestionType type,
        string? prompt,
        string? explanation,
        decimal points)
    {
        if (!Enum.IsDefined(type))
        {
            return QuestionError.InvalidType;
        }

        if (string.IsNullOrWhiteSpace(prompt) ||
            TextNormalizer.NormalizeName(prompt).Length > QuestionConstraints.PromptMaxLength)
        {
            return QuestionError.InvalidPrompt;
        }

        if (explanation is not null &&
            (string.IsNullOrWhiteSpace(explanation) ||
             explanation.Trim().Length > QuestionConstraints.ExplanationMaxLength))
        {
            return QuestionError.InvalidExplanation;
        }

        if (type == QuestionType.Group)
        {
            return points == 0m ? QuestionError.None : QuestionError.InvalidPoints;
        }

        return points is >= QuestionConstraints.MinPoints and <= QuestionConstraints.MaxPoints &&
            decimal.Round(points, QuestionConstraints.PointsScale) == points
            ? QuestionError.None
            : QuestionError.InvalidPoints;
    }

    private static bool CanChangeType(Question question, QuestionType type)
    {
        if (question.ParentQuestionId.HasValue && type == QuestionType.Group)
        {
            return false;
        }

        if (question.Type == type)
        {
            return true;
        }

        if (question.Type == QuestionType.Group && question.ChildQuestions.Count > 0)
        {
            return false;
        }

        if (question.Type == QuestionType.FillBlank && question.FillAnswerKeys.Count > 0)
        {
            return false;
        }

        if (question.Type is QuestionType.MultipleChoiceSingle or QuestionType.MultipleChoiceMultiple &&
            type is not (QuestionType.MultipleChoiceSingle or QuestionType.MultipleChoiceMultiple) &&
            question.Options.Count > 0)
        {
            return false;
        }

        return question.Type != QuestionType.MultipleChoiceMultiple ||
            type != QuestionType.MultipleChoiceSingle ||
            question.Options.Count(option => option.IsCorrect) <= 1;
    }

    private static decimal DefaultPoints(QuestionType type) =>
        type == QuestionType.Group ? 0m : 1m;

    private static void AssignTemporaryOrders(IReadOnlyList<Question> questions)
    {
        for (var index = 0; index < questions.Count; index++)
        {
            questions[index].ChangeDisplayOrder(-1 - index);
        }
    }

    private static QuestionSummaryResponse ToSummaryResponse(QuestionData question) =>
        new(
            question.Id,
            question.ExamSectionId,
            question.ParentQuestionId,
            question.Type,
            question.Prompt,
            question.Points,
            question.DisplayOrder,
            question.ChildQuestionCount,
            question.OptionCount,
            question.AnswerKeyCount,
            question.IsComplete,
            question.CreatedAtUtc,
            question.UpdatedAtUtc);

    private static QuestionDetailResponse ToDetailResponse(QuestionDetailData detail) =>
        new(
            detail.Question.Id,
            detail.Question.ExamSectionId,
            detail.Question.ParentQuestionId,
            detail.Question.Type,
            detail.Question.Prompt,
            detail.Question.Explanation,
            detail.Question.Points,
            detail.Question.DisplayOrder,
            detail.Question.ChildQuestionCount,
            detail.Question.OptionCount,
            detail.Question.AnswerKeyCount,
            detail.Question.IsComplete,
            detail.Question.CreatedAtUtc,
            detail.Question.UpdatedAtUtc,
            detail.Options.Select(AdminQuestionOptionService.ToResponse).ToList(),
            detail.AnswerKeys.Select(AdminFillAnswerKeyService.ToResponse).ToList());

    private static Result<QuestionDetailResponse, QuestionError> DetailSuccess(QuestionDetailResponse value) =>
        Result<QuestionDetailResponse, QuestionError>.Success(value);

    private static Result<QuestionDetailResponse, QuestionError> DetailFailure(QuestionError error) =>
        Result<QuestionDetailResponse, QuestionError>.Failure(error);

    private static Result<QuestionDetailResponse, QuestionError> DetailFailure(
        QuestionError error,
        object? additionalData) =>
        Result<QuestionDetailResponse, QuestionError>.Failure(error, additionalData);

    private static Result<IReadOnlyList<QuestionSummaryResponse>, QuestionError> SummarySuccess(
        IReadOnlyList<QuestionSummaryResponse> value) =>
        Result<IReadOnlyList<QuestionSummaryResponse>, QuestionError>.Success(value);

    private static Result<IReadOnlyList<QuestionSummaryResponse>, QuestionError> SummaryFailure(
        QuestionError error) =>
        Result<IReadOnlyList<QuestionSummaryResponse>, QuestionError>.Failure(error);
}