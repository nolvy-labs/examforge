using ExamForge.Domain.Exams;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public sealed class ExamConfiguration : IEntityTypeConfiguration<Exam>
{
    public void Configure(EntityTypeBuilder<Exam> builder)
    {
        builder.ToTable("exams");

        builder.HasKey(exam => exam.Id);

        builder.Property(exam => exam.Title)
            .HasMaxLength(ExamConstraints.TitleMaxLength)
            .IsRequired();

        builder.Property(exam => exam.Slug)
            .HasMaxLength(ExamConstraints.SlugMaxLength)
            .IsRequired();

        builder.Property(exam => exam.Description)
            .HasMaxLength(ExamConstraints.DescriptionMaxLength)
            .IsRequired();

        builder.Property(exam => exam.Type)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(exam => exam.IsArchived)
            .IsRequired();

        builder.Property(exam => exam.CreatedAtUtc)
            .IsRequired();

        builder.Property(exam => exam.UpdatedAtUtc);

        builder.HasIndex(exam => exam.Slug)
            .IsUnique();

        builder.HasIndex(exam => new { exam.IsArchived, exam.CreatedAtUtc, exam.Id });
        builder.HasIndex(exam => new { exam.Type, exam.IsArchived });
    }
}