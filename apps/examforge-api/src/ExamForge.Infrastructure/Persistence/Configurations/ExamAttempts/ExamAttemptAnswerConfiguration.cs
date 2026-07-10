using ExamForge.Domain.ExamAttempts;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public class ExamAttemptAnswerConfiguration : IEntityTypeConfiguration<ExamAttemptAnswer>
{
    public void Configure(EntityTypeBuilder<ExamAttemptAnswer> builder)
    {
        builder.ToTable("exam_attempt_answers");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.ExamAttemptId)
            .IsRequired();

        builder.Property(e => e.QuestionId)
            .IsRequired();

        builder.Property(e => e.TextAnswer);

        builder.Property(e => e.IsCorrect);

        builder.Property(e => e.Score)
            .HasColumnType("decimal(8,2)");

        builder.Property(e => e.CreatedAtUtc)
            .IsRequired();

        builder.Property(e => e.UpdatedAtUtc);

        builder.HasIndex(e => new { e.ExamAttemptId, e.QuestionId })
            .IsUnique();

        builder.HasIndex(e => e.QuestionId);

        builder.HasOne(e => e.ExamAttempt)
            .WithMany(a => a.Answers)
            .HasForeignKey(e => e.ExamAttemptId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Question)
            .WithMany()
            .HasForeignKey(e => e.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
