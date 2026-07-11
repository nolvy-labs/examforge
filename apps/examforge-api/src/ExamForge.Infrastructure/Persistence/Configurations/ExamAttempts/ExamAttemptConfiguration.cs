using ExamForge.Domain.ExamAttempts;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public class ExamAttemptConfiguration : IEntityTypeConfiguration<ExamAttempt>
{
    public void Configure(EntityTypeBuilder<ExamAttempt> builder)
    {
        builder.ToTable("exam_attempts");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.UserId)
            .IsRequired();

        builder.Property(e => e.ExamId)
            .IsRequired();

        builder.Property(e => e.ExamVersionId)
            .IsRequired();

        builder.Property(e => e.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(e => e.StartedAtUtc)
            .IsRequired();

        builder.Property(e => e.SubmittedAtUtc);

        builder.Property(e => e.TotalScore)
            .HasColumnType("decimal(8,2)")
            .HasDefaultValue(0);

        builder.Property(e => e.MaxScore)
            .HasColumnType("decimal(8,2)")
            .HasDefaultValue(0);

        builder.Property(e => e.CreatedAtUtc)
            .IsRequired();

        builder.Property(e => e.UpdatedAtUtc);

        builder.HasIndex(e => new { e.UserId, e.StartedAtUtc });

        builder.HasIndex(e => new { e.ExamId, e.UserId });

        builder.HasIndex(e => e.ExamVersionId);

        builder.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Exam)
            .WithMany(e => e.Attempts)
            .HasForeignKey(e => e.ExamId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.ExamVersion)
            .WithMany(ev => ev.Attempts)
            .HasForeignKey(e => e.ExamVersionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
