using ExamForge.Domain.ExamAttempts;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public class ExamAttemptSelectedOptionConfiguration : IEntityTypeConfiguration<ExamAttemptSelectedOption>
{
    public void Configure(EntityTypeBuilder<ExamAttemptSelectedOption> builder)
    {
        builder.ToTable("exam_attempt_selected_options");
        builder.HasKey(e => new { e.ExamAttemptAnswerId, e.QuestionOptionId });

        builder.Property(e => e.ExamAttemptAnswerId)
            .IsRequired();

        builder.Property(e => e.QuestionOptionId)
            .IsRequired();

        builder.HasIndex(e => e.QuestionOptionId);

        builder.HasOne(e => e.ExamAttemptAnswer)
            .WithMany(a => a.SelectedOptions)
            .HasForeignKey(e => e.ExamAttemptAnswerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.QuestionOption)
            .WithMany()
            .HasForeignKey(e => e.QuestionOptionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}