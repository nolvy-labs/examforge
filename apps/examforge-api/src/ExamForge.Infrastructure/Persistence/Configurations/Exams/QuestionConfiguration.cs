using ExamForge.Domain.Exams;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public class QuestionConfiguration : IEntityTypeConfiguration<Question>
{
    public void Configure(EntityTypeBuilder<Question> builder)
    {
        builder.ToTable("questions");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.ExamSectionId)
            .IsRequired();

        builder.Property(e => e.ParentQuestionId);

        builder.Property(e => e.Type)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(e => e.Prompt)
            .IsRequired();

        builder.Property(e => e.Explanation);

        builder.Property(e => e.Points)
            .IsRequired()
            .HasColumnType("decimal(8,2)")
            .HasDefaultValue(1);

        builder.Property(e => e.DisplayOrder)
            .IsRequired();

        builder.Property(e => e.MetadataJson)
            .HasColumnType("jsonb");

        builder.Property(e => e.CreatedAtUtc)
            .IsRequired();

        builder.Property(e => e.UpdatedAtUtc);

        builder.HasIndex(e => new { e.ExamSectionId, e.ParentQuestionId, e.DisplayOrder });

        builder.HasIndex(e => e.ParentQuestionId);

        builder.HasIndex(e => new { e.ExamSectionId, e.Type });

        builder.HasOne(e => e.ExamSection)
            .WithMany(s => s.Questions)
            .HasForeignKey(e => e.ExamSectionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.ParentQuestion)
            .WithMany(p => p.ChildQuestions)
            .HasForeignKey(e => e.ParentQuestionId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}