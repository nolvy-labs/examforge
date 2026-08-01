namespace ExamForge.Domain.Exams;

public sealed class QuestionOption
{
    private QuestionOption() { }

    public QuestionOption(
        Guid questionId,
        string? text,
        string? label,
        bool isCorrect,
        string? explanation,
        int displayOrder)
    {
        Validate(text, label, explanation);
        Id = Guid.NewGuid();
        QuestionId = questionId;
        Text = text?.Trim() ?? string.Empty;
        Label = label?.Trim();
        IsCorrect = isCorrect;
        Explanation = explanation?.Trim();
        DisplayOrder = displayOrder;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid QuestionId { get; private set; }
    public string? Label { get; private set; }
    public string Text { get; private set; } = string.Empty;
    public bool IsCorrect { get; private set; }
    public int DisplayOrder { get; private set; }
    public string? Explanation { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? UpdatedAtUtc { get; private set; }

    public Question Question { get; private set; } = null!;

    public bool UpdateDetails(
        string? text,
        string? label,
        bool isCorrect,
        string? explanation)
    {
        Validate(text, label, explanation);
        var normalizedText = text?.Trim() ?? string.Empty;
        var normalizedLabel = label?.Trim();
        var normalizedExplanation = explanation?.Trim();

        if (Text == normalizedText &&
            Label == normalizedLabel &&
            IsCorrect == isCorrect &&
            Explanation == normalizedExplanation)
        {
            return false;
        }

        Text = normalizedText;
        Label = normalizedLabel;
        IsCorrect = isCorrect;
        Explanation = normalizedExplanation;
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

    private static void Validate(string? text, string? label, string? explanation)
    {
        if ((text?.Trim().Length ?? 0) > QuestionOptionConstraints.TextMaxLength)
        {
            throw new ArgumentException("Question option text is invalid.", nameof(text));
        }

        if (label is not null &&
            label.Trim().Length > QuestionOptionConstraints.LabelMaxLength)
        {
            throw new ArgumentException("Question option label is invalid.", nameof(label));
        }

        if (explanation is not null &&
            explanation.Trim().Length > QuestionOptionConstraints.ExplanationMaxLength)
        {
            throw new ArgumentException("Question option explanation is invalid.", nameof(explanation));
        }
    }
}