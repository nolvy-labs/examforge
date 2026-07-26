using ExamForge.Domain.ExamAttempts;
using ExamForge.Domain.Exams;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public sealed class ExamAttemptAnswerConfiguration : IEntityTypeConfiguration<ExamAttemptAnswer>
{
    public void Configure(EntityTypeBuilder<ExamAttemptAnswer> builder)
    {
        builder.ToTable("exam_attempt_answers");
        builder.HasKey(answer => answer.Id);

        builder.Property(answer => answer.ExamAttemptId).IsRequired();
        builder.Property(answer => answer.QuestionId).IsRequired();
        builder.Property(answer => answer.TextAnswer)
            .HasMaxLength(FillAnswerKeyConstraints.AcceptedAnswerMaxLength);
        builder.Property(answer => answer.AwardedScore)
            .HasColumnType("decimal(18,6)");
        builder.Property(answer => answer.MaximumScore)
            .HasColumnType("decimal(18,6)");
        builder.Property(answer => answer.GradingStatus)
            .HasConversion<string>()
            .HasMaxLength(32);
        builder.Property(answer => answer.CreatedAtUtc).IsRequired();
        builder.Property(answer => answer.UpdatedAtUtc);

        builder.HasIndex(answer => new { answer.ExamAttemptId, answer.QuestionId })
            .IsUnique();
        builder.HasIndex(answer => answer.QuestionId);

        builder.HasOne(answer => answer.ExamAttempt)
            .WithMany(attempt => attempt.Answers)
            .HasForeignKey(answer => answer.ExamAttemptId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(answer => answer.Question)
            .WithMany()
            .HasForeignKey(answer => answer.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
