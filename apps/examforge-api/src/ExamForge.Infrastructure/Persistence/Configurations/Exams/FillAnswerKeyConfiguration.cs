using ExamForge.Domain.Exams;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public sealed class FillAnswerKeyConfiguration : IEntityTypeConfiguration<FillAnswerKey>
{
    public void Configure(EntityTypeBuilder<FillAnswerKey> builder)
    {
        builder.ToTable("fill_answer_keys");
        builder.HasKey(key => key.Id);

        builder.Property(key => key.BlankKey)
            .HasMaxLength(FillAnswerKeyConstraints.BlankKeyMaxLength)
            .IsRequired();

        builder.Property(key => key.AcceptedAnswer)
            .HasMaxLength(FillAnswerKeyConstraints.AcceptedAnswerMaxLength)
            .IsRequired();

        builder.Property(key => key.NormalizedAnswer)
            .HasMaxLength(FillAnswerKeyConstraints.AcceptedAnswerMaxLength)
            .IsRequired();

        builder.Property(key => key.IsCaseSensitive).IsRequired();
        builder.Property(key => key.DisplayOrder).IsRequired();
        builder.Property(key => key.CreatedAtUtc).IsRequired();
        builder.Property(key => key.UpdatedAtUtc);

        builder.HasOne(key => key.Question)
            .WithMany(question => question.FillAnswerKeys)
            .HasForeignKey(key => key.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(key => new { key.QuestionId, key.BlankKey, key.NormalizedAnswer })
            .IsUnique();
        builder.HasIndex(key => new { key.QuestionId, key.DisplayOrder });
    }
}
