using ExamForge.Domain.ExamClassifications;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public sealed class ExamCategoryConfiguration : IEntityTypeConfiguration<ExamCategory>
{
    public void Configure(EntityTypeBuilder<ExamCategory> builder)
    {
        builder.ToTable("exam_categories");

        builder.HasKey(category => category.Id);

        builder.Property(category => category.Name)
            .HasMaxLength(ExamClassificationConstraints.NameMaxLength)
            .IsRequired();

        builder.Property(category => category.Slug)
            .HasMaxLength(ExamClassificationConstraints.SlugMaxLength)
            .IsRequired();

        builder.Property(category => category.Description)
            .HasMaxLength(ExamClassificationConstraints.DescriptionMaxLength)
            .IsRequired();

        builder.Property(category => category.MatchMode)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(category => category.IsFeatured)
            .IsRequired();

        builder.Property(category => category.IsArchived)
            .IsRequired();

        builder.Property(category => category.DisplayOrder)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(category => category.CreatedAtUtc)
            .IsRequired();

        builder.Property(category => category.UpdatedAtUtc);

        builder.HasIndex(category => category.Slug)
            .IsUnique();

        builder.HasIndex(category => new
        {
            category.IsArchived,
            category.DisplayOrder
        });

        builder.HasIndex(category => new
        {
            category.IsArchived,
            category.IsFeatured,
            category.DisplayOrder
        });
    }
}
