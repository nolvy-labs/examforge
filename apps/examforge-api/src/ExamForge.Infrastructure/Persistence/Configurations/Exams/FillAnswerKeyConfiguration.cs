using ExamForge.Domain.Exams;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public class FillAnswerKeyConfiguration : IEntityTypeConfiguration<FillAnswerKey>
{
    public void Configure(EntityTypeBuilder<FillAnswerKey> builder)
    {
        builder.ToTable("fill_answer_keys");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.QuestionId)
            .IsRequired();

        builder.Property(e => e.BlankKey)
            .IsRequired()
            .HasMaxLength(255)
            .HasDefaultValue("answer");

        builder.Property(e => e.AcceptedAnswer)
            .IsRequired();

        builder.Property(e => e.NormalizedAnswer)
            .IsRequired();

        builder.Property(e => e.IsCaseSensitive)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(e => e.DisplayOrder)
            .IsRequired();

        builder.Property(e => e.CreatedAtUtc)
            .IsRequired();

        builder.HasIndex(e => new { e.QuestionId, e.BlankKey, e.NormalizedAnswer })
            .IsUnique();

        builder.HasIndex(e => new { e.QuestionId, e.BlankKey, e.DisplayOrder });

        builder.HasOne(e => e.Question)
            .WithMany(q => q.FillAnswerKeys)
            .HasForeignKey(e => e.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
