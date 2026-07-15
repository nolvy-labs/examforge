using ExamForge.Domain.Exams;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public sealed class QuestionOptionConfiguration : IEntityTypeConfiguration<QuestionOption>
{
    public void Configure(EntityTypeBuilder<QuestionOption> builder)
    {
        builder.ToTable("question_options");
        builder.HasKey(option => option.Id);

        builder.Property(option => option.Label)
            .HasMaxLength(QuestionOptionConstraints.LabelMaxLength);

        builder.Property(option => option.Text)
            .HasMaxLength(QuestionOptionConstraints.TextMaxLength)
            .IsRequired();

        builder.Property(option => option.IsCorrect).IsRequired();
        builder.Property(option => option.DisplayOrder).IsRequired();

        builder.Property(option => option.Explanation)
            .HasMaxLength(QuestionOptionConstraints.ExplanationMaxLength);

        builder.Property(option => option.CreatedAtUtc).IsRequired();
        builder.Property(option => option.UpdatedAtUtc);

        builder.HasOne(option => option.Question)
            .WithMany(question => question.Options)
            .HasForeignKey(option => option.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(option => new { option.QuestionId, option.DisplayOrder })
            .IsUnique();
        builder.HasIndex(option => new { option.QuestionId, option.IsCorrect });
    }
}
