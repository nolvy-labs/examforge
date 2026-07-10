using ExamForge.Domain.Exams;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public class QuestionOptionConfiguration : IEntityTypeConfiguration<QuestionOption>
{
    public void Configure(EntityTypeBuilder<QuestionOption> builder)
    {
        builder.ToTable("question_options");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.QuestionId)
            .IsRequired();

        builder.Property(e => e.Label)
            .HasMaxLength(50);

        builder.Property(e => e.Text)
            .IsRequired();

        builder.Property(e => e.IsCorrect)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(e => e.DisplayOrder)
            .IsRequired();

        builder.Property(e => e.Explanation);

        builder.Property(e => e.CreatedAtUtc)
            .IsRequired();

        builder.Property(e => e.UpdatedAtUtc);

        builder.HasIndex(e => new { e.QuestionId, e.DisplayOrder })
            .IsUnique();

        builder.HasIndex(e => new { e.QuestionId, e.IsCorrect });

        builder.HasOne(e => e.Question)
            .WithMany(q => q.Options)
            .HasForeignKey(e => e.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
