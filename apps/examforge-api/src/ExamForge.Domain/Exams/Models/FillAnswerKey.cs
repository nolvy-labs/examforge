namespace ExamForge.Domain.Exams;

public sealed class FillAnswerKey
{
    private FillAnswerKey() { }

    public FillAnswerKey(
        Guid questionId,
        string acceptedAnswer,
        bool isCaseSensitive,
        int displayOrder)
    {
        Validate(acceptedAnswer);
        Id = Guid.NewGuid();
        QuestionId = questionId;
        BlankKey = FillAnswerKeyConstraints.DefaultBlankKey;
        AcceptedAnswer = FillAnswerNormalizer.Normalize(acceptedAnswer, caseSensitive: true);
        NormalizedAnswer = FillAnswerNormalizer.Normalize(acceptedAnswer, isCaseSensitive);
        IsCaseSensitive = isCaseSensitive;
        DisplayOrder = displayOrder;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid QuestionId { get; private set; }
    public string BlankKey { get; private set; } = FillAnswerKeyConstraints.DefaultBlankKey;
    public string AcceptedAnswer { get; private set; } = string.Empty;
    public string NormalizedAnswer { get; private set; } = string.Empty;
    public bool IsCaseSensitive { get; private set; }
    public int DisplayOrder { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? UpdatedAtUtc { get; private set; }

    public Question Question { get; private set; } = null!;

    public static FillAnswerKey CreateClone(
        Guid questionId,
        string acceptedAnswer,
        string normalizedAnswer,
        bool isCaseSensitive,
        int displayOrder)
    {
        Validate(acceptedAnswer);

        if (string.IsNullOrWhiteSpace(normalizedAnswer) ||
            normalizedAnswer.Length > FillAnswerKeyConstraints.AcceptedAnswerMaxLength)
        {
            throw new ArgumentException("Normalized answer is invalid.", nameof(normalizedAnswer));
        }

        var clone = new FillAnswerKey(
            questionId,
            acceptedAnswer,
            isCaseSensitive,
            displayOrder);
        clone.NormalizedAnswer = normalizedAnswer;
        return clone;
    }

    public bool Update(string acceptedAnswer, bool isCaseSensitive)
    {
        Validate(acceptedAnswer);
        var normalizedAcceptedAnswer = FillAnswerNormalizer.Normalize(
            acceptedAnswer,
            caseSensitive: true);
        var normalizedAnswer = FillAnswerNormalizer.Normalize(
            acceptedAnswer,
            isCaseSensitive);

        if (AcceptedAnswer == normalizedAcceptedAnswer &&
            NormalizedAnswer == normalizedAnswer &&
            IsCaseSensitive == isCaseSensitive)
        {
            return false;
        }

        AcceptedAnswer = normalizedAcceptedAnswer;
        NormalizedAnswer = normalizedAnswer;
        IsCaseSensitive = isCaseSensitive;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
        return true;
    }

    private static void Validate(string acceptedAnswer)
    {
        if (string.IsNullOrWhiteSpace(acceptedAnswer) ||
            FillAnswerNormalizer.Normalize(acceptedAnswer, caseSensitive: true).Length >
                FillAnswerKeyConstraints.AcceptedAnswerMaxLength)
        {
            throw new ArgumentException("Accepted answer is invalid.", nameof(acceptedAnswer));
        }
    }
}
