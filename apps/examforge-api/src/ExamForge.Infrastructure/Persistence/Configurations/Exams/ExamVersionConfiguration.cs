using ExamForge.Domain.Exams;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public class ExamVersionConfiguration : IEntityTypeConfiguration<ExamVersion>
{
    public void Configure(EntityTypeBuilder<ExamVersion> builder)
    {
        builder.ToTable("exam_versions");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.ExamId)
            .IsRequired();

        builder.Property(e => e.VersionNumber)
            .IsRequired();

        builder.Property(e => e.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(32);

        builder.Property(e => e.Title)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(e => e.Description)
            .IsRequired()
            .HasDefaultValue(string.Empty);

        builder.Property(e => e.Instructions)
            .IsRequired()
            .HasDefaultValue(string.Empty);

        builder.Property(e => e.DurationMinutes);

        builder.Property(e => e.TotalScore)
            .IsRequired()
            .HasColumnType("decimal(8,2)")
            .HasDefaultValue(0);

        builder.Property(e => e.PublishedAtUtc);

        builder.Property(e => e.RetiredAtUtc);

        builder.Property(e => e.CreatedByUserId);

        builder.Property(e => e.CreatedAtUtc)
            .IsRequired();

        builder.Property(e => e.UpdatedAtUtc);

        builder.HasIndex(e => new { e.ExamId, e.VersionNumber })
            .IsUnique();

        builder.HasIndex(e => new { e.ExamId, e.Status });

        builder.HasIndex(e => new { e.Status, e.PublishedAtUtc });

        builder.HasIndex(e => e.ExamId)
            .IsUnique()
            .HasDatabaseName("ux_exam_versions_one_published_per_exam")
            .HasFilter("\"Status\" = 'Published'");
    }
}
