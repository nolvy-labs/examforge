using ExamForge.Domain.Common;

namespace ExamForge.Domain.Exams;

public sealed class Question
{
    private readonly List<Question> _childQuestions = [];
    private readonly List<QuestionOption> _options = [];
    private readonly List<FillAnswerKey> _fillAnswerKeys = [];

    private Question() { }

    public Question(
        Guid examSectionId,
        Guid? parentQuestionId,
        QuestionType type,
        string? prompt,
        string? explanation,
        decimal points,
        int displayOrder,
        string? metadataJson = null)
    {
        ValidateDetails(parentQuestionId, type, prompt, explanation, points);
        Id = Guid.NewGuid();
        ExamSectionId = examSectionId;
        ParentQuestionId = parentQuestionId;
        Type = type;
        Prompt = NormalizeDraftPrompt(prompt);
        Explanation = explanation?.Trim();
        Points = points;
        DisplayOrder = displayOrder;
        MetadataJson = metadataJson;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid ExamSectionId { get; private set; }
    public Guid? ParentQuestionId { get; private set; }
    public QuestionType Type { get; private set; }
    public string Prompt { get; private set; } = string.Empty;
    public string? Explanation { get; private set; }
    public decimal Points { get; private set; }
    public int DisplayOrder { get; private set; }
    public string? MetadataJson { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? UpdatedAtUtc { get; private set; }

    public ExamSection ExamSection { get; private set; } = null!;
    public Question? ParentQuestion { get; private set; }
    public IReadOnlyCollection<Question> ChildQuestions => _childQuestions;
    public IReadOnlyCollection<QuestionOption> Options => _options;
    public IReadOnlyCollection<FillAnswerKey> FillAnswerKeys => _fillAnswerKeys;

    public bool UpdateDetails(
        QuestionType type,
        string? prompt,
        string? explanation,
        decimal points)
    {
        ValidateDetails(ParentQuestionId, type, prompt, explanation, points);
        ValidateContentCompatibility(type);
        var normalizedPrompt = NormalizeDraftPrompt(prompt);
        var normalizedExplanation = explanation?.Trim();

        if (Type == type &&
            Prompt == normalizedPrompt &&
            Explanation == normalizedExplanation &&
            Points == points)
        {
            return false;
        }

        Type = type;
        Prompt = normalizedPrompt;
        Explanation = normalizedExplanation;
        Points = points;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
        return true;
    }

    public bool ChangeDisplayOrder(int displayOrder)
    {
        if (DisplayOrder == displayOrder)
        {
            return false;
        }

        DisplayOrder = displayOrder;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
        return true;
    }

    private void ValidateContentCompatibility(QuestionType type)
    {
        if (type == QuestionType.Group && (_options.Count > 0 || _fillAnswerKeys.Count > 0))
        {
            throw new InvalidOperationException("Group questions cannot contain options or answer keys.");
        }

        if (type != QuestionType.Group && _childQuestions.Count > 0)
        {
            throw new InvalidOperationException("Only Group questions can contain children.");
        }

        if (type == QuestionType.FillBlank && _options.Count > 0)
        {
            throw new InvalidOperationException("FillBlank questions cannot contain options.");
        }

        if (type is QuestionType.MultipleChoiceSingle or QuestionType.MultipleChoiceMultiple &&
            _fillAnswerKeys.Count > 0)
        {
            throw new InvalidOperationException("Multiple-choice questions cannot contain answer keys.");
        }

        if (Type == QuestionType.MultipleChoiceMultiple &&
            type == QuestionType.MultipleChoiceSingle &&
            _options.Count(option => option.IsCorrect) > 1)
        {
            throw new InvalidOperationException(
                "MultipleChoiceMultiple cannot become Single with multiple correct options.");
        }
    }

    private static void ValidateDetails(
        Guid? parentQuestionId,
        QuestionType type,
        string? prompt,
        string? explanation,
        decimal points)
    {
        if (!Enum.IsDefined(type))
        {
            throw new ArgumentException("Question type is required.");
        }

        if (parentQuestionId.HasValue && type == QuestionType.Group)
        {
            throw new ArgumentException("A child question cannot be a Group.");
        }

        if (NormalizeDraftPrompt(prompt).Length > QuestionConstraints.PromptMaxLength ||
            (explanation is not null &&
             explanation.Trim().Length > QuestionConstraints.ExplanationMaxLength))
        {
            throw new ArgumentOutOfRangeException(nameof(prompt));
        }

        var validPoints = type == QuestionType.Group
            ? points == 0m
            : points is >= 0m and <= QuestionConstraints.MaxPoints &&
                decimal.Round(points, QuestionConstraints.PointsScale) == points;

        if (!validPoints)
        {
            throw new ArgumentOutOfRangeException(nameof(points));
        }
    }

    private static string NormalizeDraftPrompt(string? prompt) =>
        string.IsNullOrWhiteSpace(prompt) ? string.Empty : TextNormalizer.NormalizeName(prompt);
}