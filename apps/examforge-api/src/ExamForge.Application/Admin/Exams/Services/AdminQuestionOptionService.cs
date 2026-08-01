using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Admin.Exams.Enums;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Models;
using ExamForge.Application.Admin.Exams.Utils;
using ExamForge.Application.Common;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Services;

public sealed class AdminQuestionOptionService
{
    private readonly IAdminQuestionOptionRepository _options;
    private readonly IAdminQuestionRepository _questions;
    private readonly IAdminExamSectionRepository _sections;
    private readonly IAdminExamVersionRepository _versions;
    private readonly IUnitOfWork _unitOfWork;

    public AdminQuestionOptionService(
        IAdminQuestionOptionRepository options,
        IAdminQuestionRepository questions,
        IAdminExamSectionRepository sections,
        IAdminExamVersionRepository versions,
        IUnitOfWork unitOfWork)
    {
        _options = options;
        _questions = questions;
        _sections = sections;
        _versions = versions;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<IReadOnlyList<QuestionOptionResponse>, QuestionOptionError>> GetListAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken = default)
    {
        var error = await ValidateReadOwnershipAsync(
            examId,
            versionId,
            sectionId,
            questionId,
            cancellationToken);

        if (error != QuestionOptionError.None)
        {
            return ListFailure(error);
        }

        var options = await _options.GetListAsync(
            examId,
            versionId,
            sectionId,
            questionId,
            cancellationToken);
        return ListSuccess(options.Select(ToResponse).ToList());
    }

    public async Task<Result<QuestionOptionResponse, QuestionOptionError>> GetByIdAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        Guid optionId,
        CancellationToken cancellationToken = default)
    {
        var error = await ValidateReadOwnershipAsync(
            examId,
            versionId,
            sectionId,
            questionId,
            cancellationToken);

        if (error != QuestionOptionError.None)
        {
            return Failure(error);
        }

        var option = await _options.GetDetailAsync(
            examId,
            versionId,
            sectionId,
            questionId,
            optionId,
            cancellationToken);
        return option is null
            ? Failure(QuestionOptionError.OptionNotFound)
            : Success(ToResponse(option));
    }

    public async Task<Result<QuestionOptionResponse, QuestionOptionError>> CreateAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CreateQuestionOptionRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request?.Detail is null)
        {
            return Failure(QuestionOptionError.InvalidRequest);
        }

        var validationError = ValidateDetails(
            request.Detail.Text,
            request.Detail.Label,
            request.Detail.Explanation);

        if (validationError != QuestionOptionError.None)
        {
            return Failure(validationError);
        }

        return await ExecuteAsync(async token =>
        {
            var context = await LoadMutableQuestionAsync(
                examId,
                versionId,
                sectionId,
                questionId,
                token);

            if (context.Error != QuestionOptionError.None)
            {
                return Failure(context.Error);
            }

            if (!SupportsOptions(context.Question!.Type))
            {
                return Failure(QuestionOptionError.QuestionDoesNotSupportOptions);
            }

            var maximumOrder = await _options.GetMaximumDisplayOrderAsync(questionId, token);

            if (maximumOrder == int.MaxValue)
            {
                return Failure(QuestionOptionError.DisplayOrderExhausted);
            }

            var current = await _options.GetTrackedListAsync(questionId, token);

            if (context.Question.Type == QuestionType.MultipleChoiceSingle &&
                request.Detail.IsCorrect)
            {
                UnsetOtherCorrectOptions(current, excludedOptionId: null);
            }

            var option = new QuestionOption(
                questionId,
                request.Detail.Text,
                request.Detail.Label,
                request.Detail.IsCorrect,
                request.Detail.Explanation,
                maximumOrder.HasValue ? maximumOrder.Value + 1 : 0);
            _options.Add(option);
            context.Version!.AdvanceContentRevision();
            await _unitOfWork.SaveChangesAsync(token);

            var saved = await _options.GetDetailAsync(
                examId,
                versionId,
                sectionId,
                questionId,
                option.Id,
                token);
            return saved is null
                ? Failure(QuestionOptionError.OptionNotFound)
                : Success(ToResponse(saved));
        }, Failure(QuestionOptionError.ConcurrencyConflict), cancellationToken);
    }

    public async Task<Result<QuestionOptionResponse, QuestionOptionError>> UpdateAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        Guid optionId,
        IReadOnlyList<PatchOperation>? operations,
        CancellationToken cancellationToken = default)
    {
        var limitErrors = RestrictedPatchApplier.ValidateDocumentLimits(operations);
        if (limitErrors is not null)
            return Failure(QuestionOptionError.InvalidPatch, limitErrors);

        return await ExecuteAsync(async token =>
        {
            var context = await LoadMutableQuestionAsync(
                examId,
                versionId,
                sectionId,
                questionId,
                token);

            if (context.Error != QuestionOptionError.None)
            {
                return Failure(context.Error);
            }

            if (!SupportsOptions(context.Question!.Type))
            {
                return Failure(QuestionOptionError.QuestionDoesNotSupportOptions);
            }

            var current = await _options.GetTrackedListAsync(questionId, token);
            var option = current.SingleOrDefault(item => item.Id == optionId);

            if (option is null)
            {
                return Failure(QuestionOptionError.OptionNotFound);
            }

            var patch = RestrictedPatchApplier.Apply(operations, new QuestionOptionPatchModel
            {
                Text = option.Text,
                Label = option.Label,
                IsCorrect = option.IsCorrect,
                Explanation = option.Explanation
            });
            if (!patch.IsSuccess)
                return Failure(QuestionOptionError.InvalidPatch, patch.Error);

            var model = patch.Value!;
            var validationError = ValidateDetails(model.Text, model.Label, model.Explanation);

            if (validationError != QuestionOptionError.None)
                return Failure(QuestionOptionError.InvalidPatch, new[] {
                    new PatchValidationError(operations!.Count, null, "invalid_final_state", "The patched question option details are invalid.") });

            var changedOtherOptions = context.Question.Type == QuestionType.MultipleChoiceSingle &&
                model.IsCorrect &&
                UnsetOtherCorrectOptions(current, option.Id);
            var changed = option.UpdateDetails(model.Text, model.Label, model.IsCorrect, model.Explanation);

            if (changed || changedOtherOptions)
            {
                context.Version!.AdvanceContentRevision();
                await _unitOfWork.SaveChangesAsync(token);
            }

            var saved = await _options.GetDetailAsync(
                examId,
                versionId,
                sectionId,
                questionId,
                optionId,
                token);
            return saved is null
                ? Failure(QuestionOptionError.OptionNotFound)
                : Success(ToResponse(saved));
        }, Failure(QuestionOptionError.ConcurrencyConflict), cancellationToken);
    }

    public async Task<Result<IReadOnlyList<QuestionOptionResponse>, QuestionOptionError>> ReorderAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        ReorderQuestionOptionsRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request?.OrderedOptionIds is null)
        {
            return ListFailure(QuestionOptionError.InvalidRequest);
        }

        return await ExecuteAsync(async token =>
        {
            var context = await LoadMutableQuestionAsync(
                examId,
                versionId,
                sectionId,
                questionId,
                token);

            if (context.Error != QuestionOptionError.None)
            {
                return ListFailure(context.Error);
            }

            if (!SupportsOptions(context.Question!.Type))
            {
                return ListFailure(QuestionOptionError.QuestionDoesNotSupportOptions);
            }

            var current = await _options.GetTrackedListAsync(questionId, token);
            var ids = request.OrderedOptionIds;

            if (ids.Distinct().Count() != ids.Count ||
                ids.Count != current.Count ||
                !ids.ToHashSet().SetEquals(current.Select(option => option.Id)))
            {
                return ListFailure(QuestionOptionError.InvalidOptionOrder);
            }

            if (!current.Select(option => option.Id).SequenceEqual(ids))
            {
                AssignTemporaryOrders(current);
                context.Version!.AdvanceContentRevision();
                await _unitOfWork.SaveChangesAsync(token);
                var byId = current.ToDictionary(option => option.Id);

                for (var index = 0; index < ids.Count; index++)
                {
                    byId[ids[index]].ChangeDisplayOrder(index);
                }

                await _unitOfWork.SaveChangesAsync(token);
            }

            var reordered = await _options.GetListAsync(
                examId,
                versionId,
                sectionId,
                questionId,
                token);
            return ListSuccess(reordered.Select(ToResponse).ToList());
        }, ListFailure(QuestionOptionError.ConcurrencyConflict), cancellationToken);
    }

    public async Task<QuestionOptionError> DeleteAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        Guid optionId,
        CancellationToken cancellationToken = default)
    {
        return await ExecuteAsync(async token =>
        {
            var context = await LoadMutableQuestionAsync(
                examId,
                versionId,
                sectionId,
                questionId,
                token);

            if (context.Error != QuestionOptionError.None)
            {
                return context.Error;
            }

            if (!SupportsOptions(context.Question!.Type))
            {
                return QuestionOptionError.QuestionDoesNotSupportOptions;
            }

            var current = await _options.GetTrackedListAsync(questionId, token);
            var option = current.SingleOrDefault(item => item.Id == optionId);

            if (option is null)
            {
                return QuestionOptionError.OptionNotFound;
            }

            var remaining = current.Where(item => item.Id != optionId).ToList();
            context.Version!.AdvanceContentRevision();

            if (remaining.Count > 0)
            {
                AssignTemporaryOrders(remaining);
                await _unitOfWork.SaveChangesAsync(token);
            }

            _options.Remove(option);
            await _unitOfWork.SaveChangesAsync(token);

            for (var index = 0; index < remaining.Count; index++)
            {
                remaining[index].ChangeDisplayOrder(index);
            }

            if (remaining.Count > 0)
            {
                await _unitOfWork.SaveChangesAsync(token);
            }

            return QuestionOptionError.None;
        }, QuestionOptionError.ConcurrencyConflict, cancellationToken);
    }

    private async Task<QuestionOptionError> ValidateReadOwnershipAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken)
    {
        if (!await _versions.ExamExistsAsync(examId, cancellationToken))
        {
            return QuestionOptionError.ExamNotFound;
        }

        if (await _versions.GetDetailAsync(examId, versionId, cancellationToken) is null)
        {
            return QuestionOptionError.VersionNotFound;
        }

        if (await _sections.GetDetailAsync(examId, versionId, sectionId, cancellationToken) is null)
        {
            return QuestionOptionError.SectionNotFound;
        }

        var question = await _questions.GetDetailAsync(
            examId,
            versionId,
            sectionId,
            questionId,
            cancellationToken);

        if (question is null)
        {
            return QuestionOptionError.QuestionNotFound;
        }

        return SupportsOptions(question.Question.Type)
            ? QuestionOptionError.None
            : QuestionOptionError.QuestionDoesNotSupportOptions;
    }

    private async Task<(ExamVersion? Version, Question? Question, QuestionOptionError Error)> LoadMutableQuestionAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken)
    {
        var exam = await _versions.GetExamForUpdateAsync(examId, cancellationToken);

        if (exam is null)
        {
            return (null, null, QuestionOptionError.ExamNotFound);
        }

        if (exam.IsArchived)
        {
            return (null, null, QuestionOptionError.ExamArchived);
        }

        var version = await _versions.GetTrackedAsync(examId, versionId, cancellationToken);

        if (version is null)
        {
            return (null, null, QuestionOptionError.VersionNotFound);
        }

        if (version.Status != ExamVersionStatus.Draft)
        {
            return (version, null, QuestionOptionError.VersionNotEditable);
        }

        if (await _sections.GetTrackedAsync(versionId, sectionId, cancellationToken) is null)
        {
            return (version, null, QuestionOptionError.SectionNotFound);
        }

        var question = await _questions.GetTrackedAsync(sectionId, questionId, cancellationToken);
        return question is null
            ? (version, null, QuestionOptionError.QuestionNotFound)
            : (version, question, QuestionOptionError.None);
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
        catch (ExamVersionContentRevisionExhaustedException)
        {
            return conflictResult;
        }
    }

    private static QuestionOptionError ValidateDetails(
        string? text,
        string? label,
        string? explanation)
    {
        if ((text?.Trim().Length ?? 0) > QuestionOptionConstraints.TextMaxLength)
        {
            return QuestionOptionError.InvalidText;
        }

        if (label is not null &&
            label.Trim().Length > QuestionOptionConstraints.LabelMaxLength)
        {
            return QuestionOptionError.InvalidLabel;
        }

        if (explanation is not null &&
            explanation.Trim().Length > QuestionOptionConstraints.ExplanationMaxLength)
        {
            return QuestionOptionError.InvalidExplanation;
        }

        return QuestionOptionError.None;
    }

    private static bool SupportsOptions(QuestionType type) =>
        type is QuestionType.MultipleChoiceSingle or QuestionType.MultipleChoiceMultiple;

    private static bool UnsetOtherCorrectOptions(
        IEnumerable<QuestionOption> options,
        Guid? excludedOptionId)
    {
        var changed = false;

        foreach (var option in options.Where(option =>
                     option.Id != excludedOptionId && option.IsCorrect))
        {
            changed |= option.UpdateDetails(
                option.Text,
                option.Label,
                isCorrect: false,
                option.Explanation);
        }

        return changed;
    }

    private static void AssignTemporaryOrders(IReadOnlyList<QuestionOption> options)
    {
        for (var index = 0; index < options.Count; index++)
        {
            options[index].ChangeDisplayOrder(-1 - index);
        }
    }

    internal static QuestionOptionResponse ToResponse(QuestionOptionData option) =>
        new(
            option.Id,
            option.QuestionId,
            option.Label,
            option.Text,
            option.IsCorrect,
            option.DisplayOrder,
            option.Explanation,
            option.CreatedAtUtc,
            option.UpdatedAtUtc);

    private static Result<QuestionOptionResponse, QuestionOptionError> Success(QuestionOptionResponse value) =>
        Result<QuestionOptionResponse, QuestionOptionError>.Success(value);

    private static Result<QuestionOptionResponse, QuestionOptionError> Failure(QuestionOptionError error) =>
        Result<QuestionOptionResponse, QuestionOptionError>.Failure(error);

    private static Result<QuestionOptionResponse, QuestionOptionError> Failure(
        QuestionOptionError error,
        object? additionalData) =>
        Result<QuestionOptionResponse, QuestionOptionError>.Failure(error, additionalData);

    private static Result<IReadOnlyList<QuestionOptionResponse>, QuestionOptionError> ListSuccess(
        IReadOnlyList<QuestionOptionResponse> value) =>
        Result<IReadOnlyList<QuestionOptionResponse>, QuestionOptionError>.Success(value);

    private static Result<IReadOnlyList<QuestionOptionResponse>, QuestionOptionError> ListFailure(
        QuestionOptionError error) =>
        Result<IReadOnlyList<QuestionOptionResponse>, QuestionOptionError>.Failure(error);
}