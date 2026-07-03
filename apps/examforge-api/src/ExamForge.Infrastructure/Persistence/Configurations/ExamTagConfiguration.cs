using ExamForge.Domain.ExamClassifications;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public sealed class ExamTagConfiguration : IEntityTypeConfiguration<ExamTag>
{
    public void Configure(EntityTypeBuilder<ExamTag> builder)
    {
        builder.ToTable("exam_tags");

        builder.HasKey(tag => tag.Id);

        builder.Property(tag => tag.Name)
            .HasMaxLength(ExamClassificationConstraints.NameMaxLength)
            .IsRequired();

        builder.Property(tag => tag.Slug)
            .HasMaxLength(ExamClassificationConstraints.SlugMaxLength)
            .IsRequired();

        builder.Property(tag => tag.Description)
            .HasMaxLength(ExamClassificationConstraints.DescriptionMaxLength);

        builder.Property(tag => tag.Type)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(tag => tag.IsArchived)
            .IsRequired();

        builder.Property(tag => tag.CreatedAtUtc)
            .IsRequired();

        builder.Property(tag => tag.UpdatedAtUtc);

        builder.HasIndex(tag => new { tag.Type, tag.Slug })
            .IsUnique();

        builder.HasIndex(tag => tag.Type);

        builder.HasIndex(tag => tag.IsArchived);
    }
}
