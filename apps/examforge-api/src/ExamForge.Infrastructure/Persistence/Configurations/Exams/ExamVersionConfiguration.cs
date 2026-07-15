using ExamForge.Domain.Exams;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public sealed class ExamVersionConfiguration : IEntityTypeConfiguration<ExamVersion>
{
    public void Configure(EntityTypeBuilder<ExamVersion> builder)
    {
        builder.ToTable("exam_versions");
        builder.HasKey(version => version.Id);

        builder.Property(version => version.VersionNumber)
            .IsRequired();

        builder.Property(version => version.Status)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(version => version.Title)
            .HasMaxLength(ExamVersionConstraints.TitleMaxLength)
            .IsRequired();

        builder.Property(version => version.Description)
            .HasMaxLength(ExamVersionConstraints.DescriptionMaxLength)
            .IsRequired();

        builder.Property(version => version.Instructions)
            .HasMaxLength(ExamVersionConstraints.InstructionsMaxLength)
            .IsRequired();

        builder.Property(version => version.DurationMinutes);

        builder.Property(version => version.TotalScore)
            .HasColumnType("decimal(8,2)")
            .HasDefaultValue(0m)
            .IsRequired();

        builder.Property(version => version.PublishedAtUtc);
        builder.Property(version => version.RetiredAtUtc);
        builder.Property(version => version.CreatedByUserId);

        builder.Property(version => version.CreatedAtUtc)
            .IsRequired();

        builder.Property(version => version.UpdatedAtUtc);

        builder.HasOne(version => version.Exam)
            .WithMany(exam => exam.Versions)
            .HasForeignKey(version => version.ExamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(version => version.CreatedByUser)
            .WithMany()
            .HasForeignKey(version => version.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(version => version.CreatedByUserId);

        builder.HasIndex(version => new { version.ExamId, version.VersionNumber })
            .IsUnique();

        builder.HasIndex(version => new { version.ExamId, version.Status });
        builder.HasIndex(version => new { version.ExamId, version.CreatedAtUtc, version.Id });
        builder.HasIndex(version => new { version.Status, version.PublishedAtUtc });

        builder.HasIndex(version => version.ExamId)
            .IsUnique()
            .HasDatabaseName("ux_exam_versions_one_published_per_exam")
            .HasFilter("\"Status\" = 'Published'");
    }
}