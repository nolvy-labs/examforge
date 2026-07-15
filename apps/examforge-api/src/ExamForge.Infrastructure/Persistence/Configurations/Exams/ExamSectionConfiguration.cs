using ExamForge.Domain.Exams;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public sealed class ExamSectionConfiguration : IEntityTypeConfiguration<ExamSection>
{
    public void Configure(EntityTypeBuilder<ExamSection> builder)
    {
        builder.ToTable("exam_sections");
        builder.HasKey(section => section.Id);

        builder.Property(section => section.Kind)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(section => section.Title)
            .HasMaxLength(ExamSectionConstraints.TitleMaxLength)
            .IsRequired();

        builder.Property(section => section.Instructions)
            .HasMaxLength(ExamSectionConstraints.InstructionsMaxLength)
            .IsRequired();

        builder.Property(section => section.StimulusText)
            .HasMaxLength(ExamSectionConstraints.StimulusTextMaxLength);

        builder.Property(section => section.MediaUrl)
            .HasMaxLength(ExamSectionConstraints.MediaUrlMaxLength);

        builder.Property(section => section.DisplayOrder)
            .IsRequired();

        builder.Property(section => section.MetadataJson)
            .HasColumnType("jsonb");

        builder.Property(section => section.CreatedAtUtc)
            .IsRequired();

        builder.Property(section => section.UpdatedAtUtc);

        builder.HasIndex(section => new { section.ExamVersionId, section.DisplayOrder })
            .IsUnique();

        builder.HasIndex(section => new { section.ExamVersionId, section.Kind, section.DisplayOrder });

        builder.HasOne(section => section.ExamVersion)
            .WithMany(version => version.Sections)
            .HasForeignKey(section => section.ExamVersionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}