using ExamForge.Application.Abstractions;
using ExamForge.Application.Admin.Exams.Abstractions;
using ExamForge.Application.Admin.Exams.Dtos;
using ExamForge.Application.Admin.Exams.Errors;
using ExamForge.Application.Admin.Exams.Utils;
using ExamForge.Application.Common;
using ExamForge.Domain.Common;
using ExamForge.Domain.Exams;

namespace ExamForge.Application.Admin.Exams.Services;

public sealed class AdminExamVersionContentBatchService
{
    private readonly IAdminExamVersionRepository _versions;
    private readonly IAdminExamVersionContentBatchRepository _content;
    private readonly IUnitOfWork _unitOfWork;

    public AdminExamVersionContentBatchService(
        IAdminExamVersionRepository versions,
        IAdminExamVersionContentBatchRepository content,
        IUnitOfWork unitOfWork)
    {
        _versions = versions;
        _content = content;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<BulkUpdateExamVersionContentResponse, BulkUpdateExamVersionContentError>> UpdateAsync(
        Guid examId,
        Guid versionId,
        long expectedRevision,
        BulkUpdateExamVersionContentRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            return Failure(BulkUpdateExamVersionContentError.InvalidRequest);

        try
        {
            return await _unitOfWork.ExecuteInTransactionAsync(async token =>
            {
                var exam = await _versions.GetExamForUpdateAsync(examId, token);
                if (exam is null)
                    return Failure(BulkUpdateExamVersionContentError.ExamNotFound);
                if (exam.IsArchived)
                    return Failure(BulkUpdateExamVersionContentError.ExamArchived);

                var version = await _versions.GetTrackedAsync(examId, versionId, token);
                if (version is null)
                    return Failure(BulkUpdateExamVersionContentError.VersionNotFound);
                if (version.Status != ExamVersionStatus.Draft)
                    return Failure(BulkUpdateExamVersionContentError.VersionNotEditable);
                if (version.ContentRevision != expectedRevision)
                    return Failure(BulkUpdateExamVersionContentError.PreconditionFailed);

                var normalized = Normalize(request);
                var requestErrors = ValidateRequest(normalized);
                if (requestErrors.Count > 0)
                    return Failure(BulkUpdateExamVersionContentError.InvalidRequest, requestErrors);

                var sections = await _content.GetTrackedSectionsAsync(
                    versionId, normalized.Sections.Select(target => target!.SectionId).ToHashSet(), token);
                var options = await _content.GetTrackedOptionsAsync(
                    versionId, normalized.Options.Select(target => target!.OptionId).ToHashSet(), token);
                var answers = await _content.GetTrackedAnswerKeysAsync(
                    versionId, normalized.Answers.Select(target => target!.AnswerKeyId).ToHashSet(), token);

                var questionIds = normalized.Questions.Select(target => target!.QuestionId)
                    .Concat(options.Select(option => option.QuestionId))
                    .Concat(answers.Select(answer => answer.QuestionId))
                    .ToHashSet();
                var questions = await _content.GetTrackedQuestionsWithContentAsync(versionId, questionIds, token);

                var ownershipError = ValidateOwnership(normalized, sections, questions, options, answers);
                if (ownershipError is not null)
                    return Failure(BulkUpdateExamVersionContentError.TargetNotFound,
                        new[] { ownershipError });

                var sectionById = sections.ToDictionary(section => section.Id);
                var questionById = questions.ToDictionary(question => question.Id);
                var optionById = options.ToDictionary(option => option.Id);
                var answerById = answers.ToDictionary(answer => answer.Id);

                var versionModel = new ExamVersionPatchModel
                {
                    Title = version.Title,
                    Description = version.Description,
                    Instructions = version.Instructions,
                    DurationMinutes = version.DurationMinutes
                };
                if (!ApplyPatch(normalized.VersionPatch, versionModel, "versionPatch", out var patchErrors))
                    return Failure(BulkUpdateExamVersionContentError.InvalidPatch, patchErrors);

                var sectionModels = new Dictionary<Guid, ExamSectionPatchModel>();
                for (var index = 0; index < normalized.Sections.Count; index++)
                {
                    var target = normalized.Sections[index]!;
                    var section = sectionById[target.SectionId];
                    var model = new ExamSectionPatchModel
                    {
                        Kind = section.Kind,
                        Title = section.Title,
                        Instructions = section.Instructions,
                        StimulusText = section.StimulusText,
                        MediaUrl = section.MediaUrl
                    };
                    if (!ApplyPatch(target.Operations!, model, $"sectionPatches[{index}].operations", out patchErrors))
                        return Failure(BulkUpdateExamVersionContentError.InvalidPatch, patchErrors);
                    sectionModels.Add(target.SectionId, model);
                }

                var questionModels = new Dictionary<Guid, QuestionPatchModel>();
                foreach (var question in questions)
                {
                    questionModels[question.Id] = new QuestionPatchModel
                    {
                        Type = question.Type,
                        Prompt = question.Prompt,
                        Explanation = question.Explanation,
                        Points = question.Points
                    };
                }
                for (var index = 0; index < normalized.Questions.Count; index++)
                {
                    var target = normalized.Questions[index]!;
                    if (!ApplyPatch(target.Operations!, questionModels[target.QuestionId],
                            $"questionPatches[{index}].operations", out patchErrors))
                        return Failure(BulkUpdateExamVersionContentError.InvalidPatch, patchErrors);
                }

                var optionModels = questions.SelectMany(question => question.Options)
                    .DistinctBy(option => option.Id)
                    .ToDictionary(option => option.Id, option => new QuestionOptionPatchModel
                    {
                        Text = option.Text,
                        Label = option.Label,
                        IsCorrect = option.IsCorrect,
                        Explanation = option.Explanation
                    });
                for (var index = 0; index < normalized.Options.Count; index++)
                {
                    var target = normalized.Options[index]!;
                    if (!ApplyPatch(target.Operations!, optionModels[target.OptionId],
                            $"optionPatches[{index}].operations", out patchErrors))
                        return Failure(BulkUpdateExamVersionContentError.InvalidPatch, patchErrors);
                }

                var answerModels = questions.SelectMany(question => question.FillAnswerKeys)
                    .DistinctBy(answer => answer.Id)
                    .ToDictionary(answer => answer.Id, answer => new FillAnswerKeyPatchModel
                    {
                        AcceptedAnswer = answer.AcceptedAnswer,
                        IsCaseSensitive = answer.IsCaseSensitive
                    });
                for (var index = 0; index < normalized.Answers.Count; index++)
                {
                    var target = normalized.Answers[index]!;
                    if (!ApplyPatch(target.Operations!, answerModels[target.AnswerKeyId],
                            $"answerKeyPatches[{index}].operations", out patchErrors))
                        return Failure(BulkUpdateExamVersionContentError.InvalidPatch, patchErrors);
                }

                var finalErrors = ValidateFinalState(
                    normalized, versionModel, sectionModels, questionModels, optionModels, answerModels,
                    questionById, optionById, answerById);
                if (finalErrors.Count > 0)
                    return Failure(BulkUpdateExamVersionContentError.IncompatibleContent, finalErrors);

                var indirectlyChangedOptions = ApplySingleChoicePolicy(
                    normalized, questionModels, optionModels, questionById);

                var changedSections = new HashSet<Guid>();
                var changedQuestions = new HashSet<Guid>();
                var changedOptions = new HashSet<Guid>();
                var changedAnswers = new HashSet<Guid>();
                var changed = version.UpdateDetails(
                    versionModel.Title, versionModel.Description, versionModel.Instructions, versionModel.DurationMinutes);

                foreach (var (sectionId, model) in sectionModels)
                {
                    if (sectionById[sectionId].UpdateDetails(
                            model.Kind, model.Title, model.Instructions, model.StimulusText, model.MediaUrl))
                    {
                        changed = true;
                        changedSections.Add(sectionId);
                    }
                }

                foreach (var (optionId, model) in optionModels)
                {
                    var option = questions.SelectMany(question => question.Options)
                        .First(item => item.Id == optionId);
                    if (option.UpdateDetails(model.Text, model.Label, model.IsCorrect, model.Explanation))
                    {
                        changed = true;
                        changedOptions.Add(optionId);
                    }
                }

                foreach (var (answerId, model) in answerModels)
                {
                    var answer = questions.SelectMany(question => question.FillAnswerKeys)
                        .First(item => item.Id == answerId);
                    if (answer.Update(model.AcceptedAnswer, model.IsCaseSensitive))
                    {
                        changed = true;
                        changedAnswers.Add(answerId);
                    }
                }

                var scoreChanged = false;
                foreach (var nullableTarget in normalized.Questions)
                {
                    var target = nullableTarget!;
                    var question = questionById[target.QuestionId];
                    var model = questionModels[target.QuestionId];
                    scoreChanged |= question.Type != model.Type || question.Points != model.Points;
                    if (question.UpdateDetails(model.Type, model.Prompt, model.Explanation, model.Points))
                    {
                        changed = true;
                        changedQuestions.Add(question.Id);
                    }
                }

                if (scoreChanged)
                {
                    var scoreQuestions = await _content.GetTrackedQuestionsForScoreAsync(versionId, token);
                    changed |= version.UpdateTotalScore(scoreQuestions
                        .Where(question => question.Type != QuestionType.Group)
                        .Sum(question => question.Points));
                }

                if (!changed)
                    return Success(CreateResponse(version, [], [], [], []));

                try
                {
                    version.AdvanceContentRevision();
                }
                catch (ExamVersionContentRevisionExhaustedException)
                {
                    return Failure(BulkUpdateExamVersionContentError.ContentRevisionExhausted);
                }

                await _unitOfWork.SaveChangesAsync(token);

                var updatedSections = normalized.Sections
                    .Where(target => changedSections.Contains(target!.SectionId))
                    .Select(target => ToResponse(sectionById[target!.SectionId]))
                    .ToList();
                var updatedQuestions = normalized.Questions
                    .Where(target => changedQuestions.Contains(target!.QuestionId))
                    .Select(target => ToResponse(questionById[target!.QuestionId]))
                    .ToList();
                var responseOptionIds = normalized.Options.Select(target => target!.OptionId)
                    .Concat(indirectlyChangedOptions)
                    .Distinct()
                    .ToList();
                var allOptions = questions.SelectMany(question => question.Options)
                    .DistinctBy(option => option.Id)
                    .ToDictionary(option => option.Id);
                var updatedOptions = responseOptionIds
                    .Where(changedOptions.Contains)
                    .Select(id => ToResponse(allOptions[id]))
                    .ToList();
                var allAnswers = questions.SelectMany(question => question.FillAnswerKeys)
                    .DistinctBy(answer => answer.Id)
                    .ToDictionary(answer => answer.Id);
                var updatedAnswers = normalized.Answers
                    .Where(target => changedAnswers.Contains(target!.AnswerKeyId))
                    .Select(target => ToResponse(allAnswers[target!.AnswerKeyId]))
                    .ToList();

                return Success(CreateResponse(
                    version, updatedSections, updatedQuestions, updatedOptions, updatedAnswers));
            }, cancellationToken);
        }
        catch (PersistenceConflictException)
        {
            return Failure(BulkUpdateExamVersionContentError.ConcurrencyConflict);
        }
    }

    private static NormalizedRequest Normalize(BulkUpdateExamVersionContentRequest request) => new(
        request.VersionPatch ?? [],
        request.SectionPatches ?? [],
        request.QuestionPatches ?? [],
        request.OptionPatches ?? [],
        request.AnswerKeyPatches ?? []);

    private static List<BulkContentValidationError> ValidateRequest(NormalizedRequest request)
    {
        var errors = new List<BulkContentValidationError>();
        var targetCount = request.Sections.Count + request.Questions.Count +
            request.Options.Count + request.Answers.Count;
        if (targetCount > BulkUpdateExamVersionContentLimits.MaximumTargets)
            errors.Add(new("$", "too_many_targets", "The batch contains too many target resources."));

        ValidateTargets(request.Sections, target => target?.SectionId, target => target?.Operations,
            "sectionPatches", errors);
        ValidateTargets(request.Questions, target => target?.QuestionId, target => target?.Operations,
            "questionPatches", errors);
        ValidateTargets(request.Options, target => target?.OptionId, target => target?.Operations,
            "optionPatches", errors);
        ValidateTargets(request.Answers, target => target?.AnswerKeyId, target => target?.Operations,
            "answerKeyPatches", errors);

        var totalOperations = request.VersionPatch.Count + request.Sections.Sum(TargetOperationCount) +
            request.Questions.Sum(TargetOperationCount) + request.Options.Sum(TargetOperationCount) +
            request.Answers.Sum(TargetOperationCount);
        if (request.VersionPatch.Count > BulkUpdateExamVersionContentLimits.MaximumOperationsPerTarget)
            errors.Add(new("versionPatch", "too_many_patch_operations", "The Version patch has too many operations."));
        if (totalOperations > BulkUpdateExamVersionContentLimits.MaximumTotalOperations)
            errors.Add(new("$", "too_many_total_operations", "The batch contains too many patch operations."));
        return errors;
    }

    private static void ValidateTargets<TTarget>(
        IReadOnlyList<TTarget?> targets,
        Func<TTarget?, Guid?> id,
        Func<TTarget?, IReadOnlyList<PatchOperation>?> operations,
        string path,
        ICollection<BulkContentValidationError> errors) where TTarget : class
    {
        var seen = new HashSet<Guid>();
        for (var index = 0; index < targets.Count; index++)
        {
            var target = targets[index];
            if (target is null)
            {
                errors.Add(new($"{path}[{index}]", "null_target", "Patch targets cannot be null."));
                continue;
            }

            var targetId = id(target)!.Value;
            if (!seen.Add(targetId))
                errors.Add(new($"{path}[{index}]", "duplicate_target", "A resource can only be targeted once per collection."));
            var targetOperations = operations(target);
            if (targetOperations is null)
                errors.Add(new($"{path}[{index}].operations", "operations_required", "Operations are required."));
            else if (targetOperations.Count > BulkUpdateExamVersionContentLimits.MaximumOperationsPerTarget)
                errors.Add(new($"{path}[{index}].operations", "too_many_patch_operations", "The target has too many operations."));
        }
    }

    private static int TargetOperationCount<TTarget>(TTarget? target) where TTarget : class => target switch
    {
        SectionPatchTarget section => section.Operations?.Count ?? 0,
        QuestionPatchTarget question => question.Operations?.Count ?? 0,
        QuestionOptionPatchTarget option => option.Operations?.Count ?? 0,
        FillAnswerKeyPatchTarget answer => answer.Operations?.Count ?? 0,
        _ => 0
    };

    private static BulkContentValidationError? ValidateOwnership(
        NormalizedRequest request,
        IReadOnlyCollection<ExamSection> sections,
        IReadOnlyCollection<Question> questions,
        IReadOnlyCollection<QuestionOption> options,
        IReadOnlyCollection<FillAnswerKey> answers)
    {
        var sectionIds = sections.Select(item => item.Id).ToHashSet();
        var questionIds = questions.Select(item => item.Id).ToHashSet();
        var optionIds = options.Select(item => item.Id).ToHashSet();
        var answerIds = answers.Select(item => item.Id).ToHashSet();
        for (var index = 0; index < request.Sections.Count; index++)
            if (!sectionIds.Contains(request.Sections[index]!.SectionId))
                return new($"sectionPatches[{index}].sectionId", "target_not_found", "Section was not found in this Version.");
        for (var index = 0; index < request.Questions.Count; index++)
            if (!questionIds.Contains(request.Questions[index]!.QuestionId))
                return new($"questionPatches[{index}].questionId", "target_not_found", "Question was not found in this Version.");
        for (var index = 0; index < request.Options.Count; index++)
            if (!optionIds.Contains(request.Options[index]!.OptionId))
                return new($"optionPatches[{index}].optionId", "target_not_found", "Option was not found in this Version.");
        for (var index = 0; index < request.Answers.Count; index++)
            if (!answerIds.Contains(request.Answers[index]!.AnswerKeyId))
                return new($"answerKeyPatches[{index}].answerKeyId", "target_not_found", "Answer key was not found in this Version.");
        return null;
    }

    private static bool ApplyPatch<TModel>(
        IReadOnlyList<PatchOperation> operations,
        TModel model,
        string path,
        out IReadOnlyList<BulkContentValidationError> errors) where TModel : class
    {
        object result = model switch
        {
            ExamVersionPatchModel value => RestrictedPatchApplier.Apply(operations, value),
            ExamSectionPatchModel value => RestrictedPatchApplier.Apply(operations, value),
            QuestionPatchModel value => RestrictedPatchApplier.Apply(operations, value),
            QuestionOptionPatchModel value => RestrictedPatchApplier.Apply(operations, value),
            FillAnswerKeyPatchModel value => RestrictedPatchApplier.Apply(operations, value),
            _ => throw new InvalidOperationException("Unsupported patch model.")
        };

        var patchErrors = result switch
        {
            Result<ExamVersionPatchModel, IReadOnlyList<PatchValidationError>> value when !value.IsSuccess => value.Error,
            Result<ExamSectionPatchModel, IReadOnlyList<PatchValidationError>> value when !value.IsSuccess => value.Error,
            Result<QuestionPatchModel, IReadOnlyList<PatchValidationError>> value when !value.IsSuccess => value.Error,
            Result<QuestionOptionPatchModel, IReadOnlyList<PatchValidationError>> value when !value.IsSuccess => value.Error,
            Result<FillAnswerKeyPatchModel, IReadOnlyList<PatchValidationError>> value when !value.IsSuccess => value.Error,
            _ => null
        };
        errors = patchErrors?.Select(error => new BulkContentValidationError(
            $"{path}[{error.OperationIndex}]", error.Code, error.Message)).ToList() ?? [];
        return errors.Count == 0;
    }

    private static List<BulkContentValidationError> ValidateFinalState(
        NormalizedRequest request,
        ExamVersionPatchModel version,
        IReadOnlyDictionary<Guid, ExamSectionPatchModel> sections,
        IReadOnlyDictionary<Guid, QuestionPatchModel> questions,
        IReadOnlyDictionary<Guid, QuestionOptionPatchModel> options,
        IReadOnlyDictionary<Guid, FillAnswerKeyPatchModel> answers,
        IReadOnlyDictionary<Guid, Question> questionEntities,
        IReadOnlyDictionary<Guid, QuestionOption> optionEntities,
        IReadOnlyDictionary<Guid, FillAnswerKey> answerEntities)
    {
        var errors = new List<BulkContentValidationError>();
        if (!ValidVersion(version))
            errors.Add(new("versionPatch", "invalid_final_state", "The patched Version metadata is invalid."));
        foreach (var target in request.Sections.Select((value, index) => (value, index)))
            if (!ValidSection(sections[target.value!.SectionId]))
                errors.Add(new($"sectionPatches[{target.index}]", "invalid_final_state", "The patched Section is invalid."));
        foreach (var target in request.Questions.Select((value, index) => (value, index)))
            if (!ValidQuestion(questions[target.value!.QuestionId]))
                errors.Add(new($"questionPatches[{target.index}]", "invalid_final_state", "The patched Question is invalid."));
        foreach (var target in request.Options.Select((value, index) => (value, index)))
            if (!ValidOption(options[target.value!.OptionId]))
                errors.Add(new($"optionPatches[{target.index}]", "invalid_final_state", "The patched Option is invalid."));
        foreach (var target in request.Answers.Select((value, index) => (value, index)))
            if (!ValidAnswer(answers[target.value!.AnswerKeyId]))
                errors.Add(new($"answerKeyPatches[{target.index}]", "invalid_final_state", "The patched Answer Key is invalid."));

        foreach (var (questionId, model) in questions)
        {
            var entity = questionEntities[questionId];
            if (entity.ParentQuestionId.HasValue && model.Type == QuestionType.Group)
                errors.Add(new(PathForQuestion(request, questionId), "nested_group_not_allowed", "A child Question cannot be Group."));
            if (model.Type == QuestionType.Group && (entity.Options.Count > 0 || entity.FillAnswerKeys.Count > 0))
                errors.Add(new(PathForQuestion(request, questionId), "incompatible_question_content", "A Group Question cannot contain Options or Answer Keys."));
            if (model.Type != QuestionType.Group && entity.ChildQuestions.Count > 0)
                errors.Add(new(PathForQuestion(request, questionId), "incompatible_question_content", "A Question with children must remain Group."));
            if (model.Type == QuestionType.FillBlank && entity.Options.Count > 0)
                errors.Add(new(PathForQuestion(request, questionId), "incompatible_question_content", "A FillBlank Question cannot contain Options."));
            if (model.Type is QuestionType.MultipleChoiceSingle or QuestionType.MultipleChoiceMultiple && entity.FillAnswerKeys.Count > 0)
                errors.Add(new(PathForQuestion(request, questionId), "incompatible_question_content", "A multiple-choice Question cannot contain Answer Keys."));

            if (entity.Options.Count > 0 && model.Type is not (QuestionType.MultipleChoiceSingle or QuestionType.MultipleChoiceMultiple))
                errors.Add(new(PathForQuestion(request, questionId), "options_not_supported", "The final Question type does not support Options."));
            if (entity.FillAnswerKeys.Count > 0 && model.Type != QuestionType.FillBlank)
                errors.Add(new(PathForQuestion(request, questionId), "answers_not_supported", "The final Question type does not support Answer Keys."));

            if (model.Type == QuestionType.MultipleChoiceSingle)
            {
                var explicitCorrect = request.Options
                    .Where(target => optionEntities[target!.OptionId].QuestionId == questionId)
                    .Count(target => options[target!.OptionId].IsCorrect);
                var finalCorrect = entity.Options.Count(option => options[option.Id].IsCorrect);
                if (explicitCorrect > 1 || explicitCorrect == 0 && finalCorrect > 1)
                    errors.Add(new("optionPatches", "multiple_correct_options", "A single-choice Question cannot explicitly set multiple Options as correct."));
            }

            var finalAnswers = entity.FillAnswerKeys.Select(answer => answers[answer.Id]).ToList();
            for (var left = 0; left < finalAnswers.Count; left++)
                for (var right = left + 1; right < finalAnswers.Count; right++)
                    if (FillAnswerNormalizer.Conflicts(
                            finalAnswers[left].AcceptedAnswer, finalAnswers[left].IsCaseSensitive,
                            finalAnswers[right].AcceptedAnswer, finalAnswers[right].IsCaseSensitive))
                        errors.Add(new(PathForAnswer(request, entity.FillAnswerKeys.ElementAt(right).Id),
                            "duplicate_accepted_answer", "Answer Keys cannot contain normalized duplicates."));
        }

        return errors;
    }

    private static IReadOnlyList<Guid> ApplySingleChoicePolicy(
        NormalizedRequest request,
        IReadOnlyDictionary<Guid, QuestionPatchModel> questions,
        IDictionary<Guid, QuestionOptionPatchModel> options,
        IReadOnlyDictionary<Guid, Question> questionEntities)
    {
        var indirectlyChanged = new List<Guid>();
        foreach (var group in request.Options.Where(target => options[target!.OptionId].IsCorrect)
                     .GroupBy(target => questionEntities.Values.SelectMany(question => question.Options)
                         .First(option => option.Id == target!.OptionId).QuestionId))
        {
            if (questions[group.Key].Type != QuestionType.MultipleChoiceSingle || group.Count() != 1)
                continue;
            var selectedId = group.Single()!.OptionId;
            foreach (var option in questionEntities[group.Key].Options.Where(option => option.Id != selectedId))
            {
                if (!options[option.Id].IsCorrect)
                    continue;
                options[option.Id].IsCorrect = false;
                indirectlyChanged.Add(option.Id);
            }
        }
        return indirectlyChanged;
    }

    private static bool ValidVersion(ExamVersionPatchModel model) =>
        !string.IsNullOrWhiteSpace(model.Title) &&
        TextNormalizer.NormalizeName(model.Title).Length <= ExamVersionConstraints.TitleMaxLength &&
        model.Description?.Trim().Length <= ExamVersionConstraints.DescriptionMaxLength &&
        model.Instructions?.Trim().Length <= ExamVersionConstraints.InstructionsMaxLength &&
        (model.DurationMinutes is null ||
            model.DurationMinutes is > 0 and <= ExamVersionConstraints.MaxDurationMinutes);

    private static bool ValidSection(ExamSectionPatchModel model)
    {
        if (!Enum.IsDefined(model.Kind) || string.IsNullOrWhiteSpace(model.Title) ||
            TextNormalizer.NormalizeName(model.Title).Length > ExamSectionConstraints.TitleMaxLength ||
            model.Instructions?.Trim().Length > ExamSectionConstraints.InstructionsMaxLength ||
            model.StimulusText is not null && (string.IsNullOrWhiteSpace(model.StimulusText) ||
                model.StimulusText.Trim().Length > ExamSectionConstraints.StimulusTextMaxLength))
            return false;
        if (model.MediaUrl is null)
            return true;
        var mediaUrl = model.MediaUrl.Trim();
        return mediaUrl.Length > 0 && mediaUrl.Length <= ExamSectionConstraints.MediaUrlMaxLength &&
            Uri.TryCreate(mediaUrl, UriKind.Absolute, out var uri) &&
            uri.Scheme is "http" or "https";
    }

    private static bool ValidQuestion(QuestionPatchModel model) =>
        Enum.IsDefined(model.Type) && !string.IsNullOrWhiteSpace(model.Prompt) &&
        TextNormalizer.NormalizeName(model.Prompt).Length <= QuestionConstraints.PromptMaxLength &&
        (model.Explanation is null || !string.IsNullOrWhiteSpace(model.Explanation) &&
            model.Explanation.Trim().Length <= QuestionConstraints.ExplanationMaxLength) &&
        (model.Type == QuestionType.Group
            ? model.Points == 0m
            : model.Points is >= QuestionConstraints.MinPoints and <= QuestionConstraints.MaxPoints &&
                decimal.Round(model.Points, QuestionConstraints.PointsScale) == model.Points);

    private static bool ValidOption(QuestionOptionPatchModel model) =>
        !string.IsNullOrWhiteSpace(model.Text) && model.Text.Trim().Length <= QuestionOptionConstraints.TextMaxLength &&
        (model.Label is null || !string.IsNullOrWhiteSpace(model.Label) && model.Label.Trim().Length <= QuestionOptionConstraints.LabelMaxLength) &&
        (model.Explanation is null || !string.IsNullOrWhiteSpace(model.Explanation) &&
            model.Explanation.Trim().Length <= QuestionOptionConstraints.ExplanationMaxLength);

    private static bool ValidAnswer(FillAnswerKeyPatchModel model) =>
        !string.IsNullOrWhiteSpace(model.AcceptedAnswer) &&
        FillAnswerNormalizer.Normalize(model.AcceptedAnswer, true).Length <= FillAnswerKeyConstraints.AcceptedAnswerMaxLength;

    private static string PathForQuestion(NormalizedRequest request, Guid id)
    {
        var index = request.Questions.ToList().FindIndex(target => target!.QuestionId == id);
        return index >= 0 ? $"questionPatches[{index}]" : "questionPatches";
    }

    private static string PathForAnswer(NormalizedRequest request, Guid id)
    {
        var index = request.Answers.ToList().FindIndex(target => target!.AnswerKeyId == id);
        return index >= 0 ? $"answerKeyPatches[{index}]" : "answerKeyPatches";
    }

    private static BulkUpdateExamVersionContentResponse CreateResponse(
        ExamVersion version,
        IReadOnlyList<ExamSectionDetailResponse> sections,
        IReadOnlyList<QuestionDetailResponse> questions,
        IReadOnlyList<QuestionOptionResponse> options,
        IReadOnlyList<FillAnswerKeyResponse> answers) =>
        new(version.ContentRevision, ToResponse(version), sections, questions, options, answers);

    private static ExamVersionDetailResponse ToResponse(ExamVersion version) => new(
        version.Id, version.ExamId, version.VersionNumber, version.Status, version.Title,
        version.Description, version.Instructions, version.DurationMinutes, version.TotalScore,
        version.ContentRevision, version.CreatedByUserId, version.PublishedAtUtc, version.RetiredAtUtc,
        version.CreatedAtUtc, version.UpdatedAtUtc);

    private static ExamSectionDetailResponse ToResponse(ExamSection section) => new(
        section.Id, section.ExamVersionId, section.Kind, section.Title, section.DisplayOrder,
        section.Questions.Count, section.Questions.Where(question => question.Type != QuestionType.Group).Sum(question => question.Points),
        section.CreatedAtUtc, section.UpdatedAtUtc, section.Instructions, section.StimulusText, section.MediaUrl);

    private static QuestionDetailResponse ToResponse(Question question) => new(
        question.Id, question.ExamSectionId, question.ParentQuestionId, question.Type, question.Prompt,
        question.Explanation, question.Points, question.DisplayOrder, question.ChildQuestions.Count,
        question.Options.Count, question.FillAnswerKeys.Count, IsComplete(question), question.CreatedAtUtc,
        question.UpdatedAtUtc, question.Options.OrderBy(option => option.DisplayOrder).Select(ToResponse).ToList(),
        question.FillAnswerKeys.OrderBy(answer => answer.DisplayOrder).Select(ToResponse).ToList(),
        question.ChildQuestions.Count == 0 ? null : question.ChildQuestions.OrderBy(child => child.DisplayOrder).Select(ToResponse).ToList());

    private static bool IsComplete(Question question) => question.Type switch
    {
        QuestionType.Group => question.ChildQuestions.Count > 0,
        QuestionType.FillBlank => question.FillAnswerKeys.Count > 0,
        QuestionType.MultipleChoiceSingle => question.Options.Count >= 2 && question.Options.Count(option => option.IsCorrect) == 1,
        QuestionType.MultipleChoiceMultiple => question.Options.Count >= 2 && question.Options.Any(option => option.IsCorrect),
        _ => false
    };

    private static QuestionOptionResponse ToResponse(QuestionOption option) => new(
        option.Id, option.QuestionId, option.Label, option.Text, option.IsCorrect, option.DisplayOrder,
        option.Explanation, option.CreatedAtUtc, option.UpdatedAtUtc);

    private static FillAnswerKeyResponse ToResponse(FillAnswerKey answer) => new(
        answer.Id, answer.QuestionId, answer.BlankKey, answer.AcceptedAnswer, answer.IsCaseSensitive,
        answer.CreatedAtUtc, answer.UpdatedAtUtc);

    private static Result<BulkUpdateExamVersionContentResponse, BulkUpdateExamVersionContentError> Success(
        BulkUpdateExamVersionContentResponse response) =>
        Result<BulkUpdateExamVersionContentResponse, BulkUpdateExamVersionContentError>.Success(response);

    private static Result<BulkUpdateExamVersionContentResponse, BulkUpdateExamVersionContentError> Failure(
        BulkUpdateExamVersionContentError error,
        object? additionalData = null) =>
        Result<BulkUpdateExamVersionContentResponse, BulkUpdateExamVersionContentError>.Failure(error, additionalData);

    private sealed record NormalizedRequest(
        IReadOnlyList<PatchOperation> VersionPatch,
        IReadOnlyList<SectionPatchTarget?> Sections,
        IReadOnlyList<QuestionPatchTarget?> Questions,
        IReadOnlyList<QuestionOptionPatchTarget?> Options,
        IReadOnlyList<FillAnswerKeyPatchTarget?> Answers);
}