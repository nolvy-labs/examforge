using ExamForge.Domain.Exams;
using ExamForge.Domain.Users;

namespace ExamForge.Domain.ExamAttempts;

public class ExamAttempt
{
    public User User { get; set; } = null!;
    public Exam Exam { get; set; } = null!;
    public ExamVersion ExamVersion { get; set; } = null!;
    public ICollection<ExamAttemptAnswer> Answers { get; set; } = new List<ExamAttemptAnswer>();

    private ExamAttempt() { }

    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ExamId { get; set; }
    public Guid ExamVersionId { get; set; }
    public ExamAttemptStatus Status { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public DateTime? SubmittedAtUtc { get; set; }
    public decimal? TotalScore { get; set; }
    public decimal? MaxScore { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
