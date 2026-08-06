using ExamForge.Domain.Exams;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public sealed class QuestionConfiguration : IEntityTypeConfiguration<Question>
{
    public void Configure(EntityTypeBuilder<Question> builder)
    {
        builder.ToTable("questions");
        builder.HasKey(question => question.Id);

        builder.Property(question => question.Type)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(question => question.Prompt)
            .HasMaxLength(QuestionConstraints.PromptMaxLength)
            .IsRequired();

        builder.Property(question => question.Explanation)
            .HasMaxLength(QuestionConstraints.ExplanationMaxLength);

        builder.Property(question => question.Points)
            .HasColumnType("decimal(8,2)")
            .IsRequired();

        builder.Property(question => question.DisplayOrder).IsRequired();
        builder.Property(question => question.MetadataJson).HasColumnType("jsonb");
        builder.Property(question => question.CreatedAtUtc).IsRequired();
        builder.Property(question => question.UpdatedAtUtc);

        builder.HasOne(question => question.ExamSection)
            .WithMany(section => section.Questions)
            .HasForeignKey(question => question.ExamSectionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(question => question.ParentQuestion)
            .WithMany(parent => parent.ChildQuestions)
            .HasForeignKey(question => question.ParentQuestionId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(question => new { question.ExamSectionId, question.DisplayOrder })
            .IsUnique()
            .HasDatabaseName("ux_questions_top_level_order")
            .HasFilter("\"ParentQuestionId\" IS NULL");

        builder.HasIndex(question => new { question.ParentQuestionId, question.DisplayOrder })
            .IsUnique()
            .HasDatabaseName("ux_questions_child_order")
            .HasFilter("\"ParentQuestionId\" IS NOT NULL");

        builder.HasIndex(question => new { question.ExamSectionId, question.Type });
    }
}