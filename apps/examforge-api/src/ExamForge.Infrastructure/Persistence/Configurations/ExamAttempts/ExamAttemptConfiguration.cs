using ExamForge.Domain.ExamAttempts;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public sealed class ExamAttemptConfiguration : IEntityTypeConfiguration<ExamAttempt>
{
    public void Configure(EntityTypeBuilder<ExamAttempt> builder)
    {
        builder.ToTable("exam_attempts");
        builder.HasKey(attempt => attempt.Id);

        builder.Property(attempt => attempt.StudentId).IsRequired();
        builder.Property(attempt => attempt.ExamId).IsRequired();
        builder.Property(attempt => attempt.ExamVersionId).IsRequired();

        builder.Property(attempt => attempt.Mode)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(attempt => attempt.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(attempt => attempt.StartedAtUtc).IsRequired();
        builder.Property(attempt => attempt.ExpiresAtUtc);
        builder.Property(attempt => attempt.SubmittedAtUtc);
        builder.Property(attempt => attempt.AbandonedAtUtc);

        builder.Property(attempt => attempt.Score)
            .HasColumnType("decimal(18,6)");
        builder.Property(attempt => attempt.MaximumScore)
            .HasColumnType("decimal(18,6)");

        builder.Property(attempt => attempt.Revision)
            .HasDefaultValue(1L)
            .IsConcurrencyToken()
            .IsRequired();

        builder.Property(attempt => attempt.CreatedAtUtc).IsRequired();
        builder.Property(attempt => attempt.UpdatedAtUtc).IsRequired();

        builder.HasIndex(attempt => attempt.ExamVersionId);
        builder.HasIndex(attempt => new { attempt.StudentId, attempt.ExamVersionId })
            .IsUnique()
            .HasDatabaseName("ux_exam_attempts_one_in_progress")
            .HasFilter("\"Status\" = 'InProgress'");
        builder.HasIndex(attempt => new
        {
            attempt.StudentId,
            attempt.Status,
            attempt.UpdatedAtUtc,
            attempt.Id
        })
            .HasDatabaseName("ix_exam_attempts_student_status_history");
        builder.HasIndex(attempt => new
        {
            attempt.StudentId,
            attempt.CreatedAtUtc,
            attempt.Id
        })
            .HasDatabaseName("ix_exam_attempts_student_created_at_id");
        builder.HasIndex(attempt => new
        {
            attempt.ExamId,
            attempt.CreatedAtUtc,
            attempt.Id
        })
            .HasDatabaseName("ix_exam_attempts_exam_created_at_id");
        builder.HasIndex(attempt => new
        {
            attempt.Status,
            attempt.ExpiresAtUtc,
            attempt.Id
        })
            .HasDatabaseName("ix_exam_attempts_status_expires_at_id");

        builder.HasOne(attempt => attempt.Student)
            .WithMany()
            .HasForeignKey(attempt => attempt.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(attempt => attempt.Exam)
            .WithMany(exam => exam.Attempts)
            .HasForeignKey(attempt => attempt.ExamId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(attempt => attempt.ExamVersion)
            .WithMany(version => version.Attempts)
            .HasForeignKey(attempt => attempt.ExamVersionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}