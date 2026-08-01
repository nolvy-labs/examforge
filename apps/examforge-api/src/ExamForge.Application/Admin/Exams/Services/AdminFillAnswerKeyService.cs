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

public sealed class AdminFillAnswerKeyService
{
    private readonly IAdminFillAnswerKeyRepository _answerKeys;
    private readonly IAdminQuestionRepository _questions;
    private readonly IAdminExamSectionRepository _sections;
    private readonly IAdminExamVersionRepository _versions;
    private readonly IUnitOfWork _unitOfWork;

    public AdminFillAnswerKeyService(
        IAdminFillAnswerKeyRepository answerKeys,
        IAdminQuestionRepository questions,
        IAdminExamSectionRepository sections,
        IAdminExamVersionRepository versions,
        IUnitOfWork unitOfWork)
    {
        _answerKeys = answerKeys;
        _questions = questions;
        _sections = sections;
        _versions = versions;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<IReadOnlyList<FillAnswerKeyResponse>, FillAnswerKeyError>> GetListAsync(
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

        if (error != FillAnswerKeyError.None)
        {
            return ListFailure(error);
        }

        var keys = await _answerKeys.GetListAsync(
            examId,
            versionId,
            sectionId,
            questionId,
            cancellationToken);
        return ListSuccess(keys.Select(ToResponse).ToList());
    }

    public async Task<Result<FillAnswerKeyResponse, FillAnswerKeyError>> GetByIdAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        Guid answerKeyId,
        CancellationToken cancellationToken = default)
    {
        var error = await ValidateReadOwnershipAsync(
            examId,
            versionId,
            sectionId,
            questionId,
            cancellationToken);

        if (error != FillAnswerKeyError.None)
        {
            return Failure(error);
        }

        var key = await _answerKeys.GetDetailAsync(
            examId,
            versionId,
            sectionId,
            questionId,
            answerKeyId,
            cancellationToken);
        return key is null
            ? Failure(FillAnswerKeyError.AnswerKeyNotFound)
            : Success(ToResponse(key));
    }

    public async Task<Result<FillAnswerKeyResponse, FillAnswerKeyError>> CreateAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CreateFillAnswerKeyRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return Failure(FillAnswerKeyError.InvalidRequest);
        }

        if (!IsValidAnswer(request.AcceptedAnswer))
        {
            return Failure(FillAnswerKeyError.InvalidAcceptedAnswer);
        }

        return await ExecuteAsync(async token =>
        {
            var context = await LoadMutableQuestionAsync(
                examId,
                versionId,
                sectionId,
                questionId,
                token);

            if (context.Error != FillAnswerKeyError.None)
            {
                return Failure(context.Error);
            }

            if (context.Question!.Type != QuestionType.FillBlank)
            {
                return Failure(FillAnswerKeyError.QuestionDoesNotSupportAnswerKeys);
            }

            var current = await _answerKeys.GetTrackedListAsync(questionId, token);

            if (HasDuplicate(current, request.AcceptedAnswer, request.IsCaseSensitive, excludedId: null))
            {
                return Failure(FillAnswerKeyError.DuplicateAcceptedAnswer);
            }

            var maximumOrder = await _answerKeys.GetMaximumDisplayOrderAsync(questionId, token);

            if (maximumOrder == int.MaxValue)
            {
                return Failure(FillAnswerKeyError.InvalidRequest);
            }

            var key = new FillAnswerKey(
                questionId,
                request.AcceptedAnswer,
                request.IsCaseSensitive,
                maximumOrder.HasValue ? maximumOrder.Value + 1 : 0);
            _answerKeys.Add(key);
            context.Version!.AdvanceContentRevision();
            await _unitOfWork.SaveChangesAsync(token);

            var saved = await _answerKeys.GetDetailAsync(
                examId,
                versionId,
                sectionId,
                questionId,
                key.Id,
                token);
            return saved is null
                ? Failure(FillAnswerKeyError.AnswerKeyNotFound)
                : Success(ToResponse(saved));
        }, Failure(FillAnswerKeyError.ConcurrencyConflict), cancellationToken);
    }

    public async Task<Result<FillAnswerKeyResponse, FillAnswerKeyError>> UpdateAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        Guid answerKeyId,
        IReadOnlyList<PatchOperation>? operations,
        CancellationToken cancellationToken = default)
    {
        var limitErrors = RestrictedPatchApplier.ValidateDocumentLimits(operations);
        if (limitErrors is not null)
            return Failure(FillAnswerKeyError.InvalidPatch, limitErrors);

        return await ExecuteAsync(async token =>
        {
            var context = await LoadMutableQuestionAsync(
                examId,
                versionId,
                sectionId,
                questionId,
                token);

            if (context.Error != FillAnswerKeyError.None)
            {
                return Failure(context.Error);
            }

            if (context.Question!.Type != QuestionType.FillBlank)
            {
                return Failure(FillAnswerKeyError.QuestionDoesNotSupportAnswerKeys);
            }

            var current = await _answerKeys.GetTrackedListAsync(questionId, token);
            var key = current.SingleOrDefault(item => item.Id == answerKeyId);

            if (key is null)
            {
                return Failure(FillAnswerKeyError.AnswerKeyNotFound);
            }

            var patch = RestrictedPatchApplier.Apply(operations, new FillAnswerKeyPatchModel
            {
                AcceptedAnswer = key.AcceptedAnswer,
                IsCaseSensitive = key.IsCaseSensitive
            });
            if (!patch.IsSuccess)
                return Failure(FillAnswerKeyError.InvalidPatch, patch.Error);

            var model = patch.Value!;

            if (!IsValidAnswer(model.AcceptedAnswer))
            {
                return Failure(FillAnswerKeyError.InvalidPatch, new[] {
                    new PatchValidationError(operations!.Count, null, "invalid_final_state", "The patched fill answer key is invalid.") });
            }

            if (HasDuplicate(current, model.AcceptedAnswer, model.IsCaseSensitive, key.Id))
            {
                return Failure(FillAnswerKeyError.DuplicateAcceptedAnswer);
            }

            if (key.Update(model.AcceptedAnswer, model.IsCaseSensitive))
            {
                context.Version!.AdvanceContentRevision();
                await _unitOfWork.SaveChangesAsync(token);
            }

            var saved = await _answerKeys.GetDetailAsync(
                examId,
                versionId,
                sectionId,
                questionId,
                answerKeyId,
                token);
            return saved is null
                ? Failure(FillAnswerKeyError.AnswerKeyNotFound)
                : Success(ToResponse(saved));
        }, Failure(FillAnswerKeyError.ConcurrencyConflict), cancellationToken);
    }

    public async Task<FillAnswerKeyError> DeleteAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        Guid answerKeyId,
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

            if (context.Error != FillAnswerKeyError.None)
            {
                return context.Error;
            }

            if (context.Question!.Type != QuestionType.FillBlank)
            {
                return FillAnswerKeyError.QuestionDoesNotSupportAnswerKeys;
            }

            var current = await _answerKeys.GetTrackedListAsync(questionId, token);
            var key = current.SingleOrDefault(item => item.Id == answerKeyId);

            if (key is null)
            {
                return FillAnswerKeyError.AnswerKeyNotFound;
            }

            _answerKeys.Remove(key);
            context.Version!.AdvanceContentRevision();
            await _unitOfWork.SaveChangesAsync(token);
            return FillAnswerKeyError.None;
        }, FillAnswerKeyError.ConcurrencyConflict, cancellationToken);
    }

    private async Task<FillAnswerKeyError> ValidateReadOwnershipAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken)
    {
        if (!await _versions.ExamExistsAsync(examId, cancellationToken))
        {
            return FillAnswerKeyError.ExamNotFound;
        }

        if (await _versions.GetDetailAsync(examId, versionId, cancellationToken) is null)
        {
            return FillAnswerKeyError.VersionNotFound;
        }

        if (await _sections.GetDetailAsync(examId, versionId, sectionId, cancellationToken) is null)
        {
            return FillAnswerKeyError.SectionNotFound;
        }

        var question = await _questions.GetDetailAsync(
            examId,
            versionId,
            sectionId,
            questionId,
            cancellationToken);

        if (question is null)
        {
            return FillAnswerKeyError.QuestionNotFound;
        }

        return question.Question.Type == QuestionType.FillBlank
            ? FillAnswerKeyError.None
            : FillAnswerKeyError.QuestionDoesNotSupportAnswerKeys;
    }

    private async Task<(ExamVersion? Version, Question? Question, FillAnswerKeyError Error)> LoadMutableQuestionAsync(
        Guid examId,
        Guid versionId,
        Guid sectionId,
        Guid questionId,
        CancellationToken cancellationToken)
    {
        var exam = await _versions.GetExamForUpdateAsync(examId, cancellationToken);

        if (exam is null)
        {
            return (null, null, FillAnswerKeyError.ExamNotFound);
        }

        if (exam.IsArchived)
        {
            return (null, null, FillAnswerKeyError.ExamArchived);
        }

        var version = await _versions.GetTrackedAsync(examId, versionId, cancellationToken);

        if (version is null)
        {
            return (null, null, FillAnswerKeyError.VersionNotFound);
        }

        if (version.Status != ExamVersionStatus.Draft)
        {
            return (version, null, FillAnswerKeyError.VersionNotEditable);
        }

        if (await _sections.GetTrackedAsync(versionId, sectionId, cancellationToken) is null)
        {
            return (version, null, FillAnswerKeyError.SectionNotFound);
        }

        var question = await _questions.GetTrackedAsync(sectionId, questionId, cancellationToken);
        return question is null
            ? (version, null, FillAnswerKeyError.QuestionNotFound)
            : (version, question, FillAnswerKeyError.None);
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

    private static bool IsValidAnswer(string? answer) =>
        FillAnswerNormalizer.Normalize(answer ?? string.Empty, caseSensitive: true).Length <=
            FillAnswerKeyConstraints.AcceptedAnswerMaxLength;

    private static bool HasDuplicate(
        IEnumerable<FillAnswerKey> keys,
        string acceptedAnswer,
        bool isCaseSensitive,
        Guid? excludedId) =>
        !string.IsNullOrWhiteSpace(acceptedAnswer) && keys.Any(key =>
            key.Id != excludedId &&
            !string.IsNullOrWhiteSpace(key.AcceptedAnswer) &&
            FillAnswerNormalizer.Conflicts(
                acceptedAnswer,
                isCaseSensitive,
                key.AcceptedAnswer,
                key.IsCaseSensitive));

    internal static FillAnswerKeyResponse ToResponse(FillAnswerKeyData key) =>
        new(
            key.Id,
            key.QuestionId,
            key.BlankKey,
            key.AcceptedAnswer,
            key.IsCaseSensitive,
            key.CreatedAtUtc,
            key.UpdatedAtUtc);

    private static Result<FillAnswerKeyResponse, FillAnswerKeyError> Success(FillAnswerKeyResponse value) =>
        Result<FillAnswerKeyResponse, FillAnswerKeyError>.Success(value);

    private static Result<FillAnswerKeyResponse, FillAnswerKeyError> Failure(FillAnswerKeyError error) =>
        Result<FillAnswerKeyResponse, FillAnswerKeyError>.Failure(error);

    private static Result<FillAnswerKeyResponse, FillAnswerKeyError> Failure(
        FillAnswerKeyError error,
        object? additionalData) =>
        Result<FillAnswerKeyResponse, FillAnswerKeyError>.Failure(error, additionalData);

    private static Result<IReadOnlyList<FillAnswerKeyResponse>, FillAnswerKeyError> ListSuccess(
        IReadOnlyList<FillAnswerKeyResponse> value) =>
        Result<IReadOnlyList<FillAnswerKeyResponse>, FillAnswerKeyError>.Success(value);

    private static Result<IReadOnlyList<FillAnswerKeyResponse>, FillAnswerKeyError> ListFailure(
        FillAnswerKeyError error) =>
        Result<IReadOnlyList<FillAnswerKeyResponse>, FillAnswerKeyError>.Failure(error);
}