using ExamForge.Domain.Exams;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public class ExamSectionConfiguration : IEntityTypeConfiguration<ExamSection>
{
    public void Configure(EntityTypeBuilder<ExamSection> builder)
    {
        builder.ToTable("exam_sections");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.ExamVersionId)
            .IsRequired();

        builder.Property(e => e.Kind)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(e => e.Title)
            .IsRequired()
            .HasDefaultValue(string.Empty)
            .HasMaxLength(255);

        builder.Property(e => e.Instructions)
            .IsRequired()
            .HasDefaultValue(string.Empty);

        builder.Property(e => e.StimulusText);

        builder.Property(e => e.MediaUrl)
            .HasMaxLength(1024);

        builder.Property(e => e.DisplayOrder)
            .IsRequired();

        builder.Property(e => e.MetadataJson)
            .HasColumnType("jsonb");

        builder.Property(e => e.CreatedAtUtc)
            .IsRequired();

        builder.Property(e => e.UpdatedAtUtc);

        builder.HasIndex(e => new { e.ExamVersionId, e.DisplayOrder })
            .IsUnique();

        builder.HasIndex(e => new { e.ExamVersionId, e.Kind, e.DisplayOrder });

        builder.HasOne(e => e.ExamVersion)
            .WithMany(e => e.Sections)
            .HasForeignKey(e => e.ExamVersionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
