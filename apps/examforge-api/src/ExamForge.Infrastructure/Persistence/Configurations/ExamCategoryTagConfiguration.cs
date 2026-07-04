using ExamForge.Domain.ExamClassifications;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public sealed class ExamCategoryTagConfiguration : IEntityTypeConfiguration<ExamCategoryTag>
{
    public void Configure(EntityTypeBuilder<ExamCategoryTag> builder)
    {
        builder.ToTable("exam_category_tags");

        builder.HasKey(category_tag => new
        {
            category_tag.ExamCategoryId,
            category_tag.ExamTagId
        });

        builder.Property(category_tag => category_tag.ExamCategoryId)
            .IsRequired();

        builder.Property(category_tag => category_tag.ExamTagId)
            .IsRequired();

        builder.Property(category_tag => category_tag.CreatedAtUtc)
            .IsRequired();

        builder.HasOne(categoryTag => categoryTag.ExamCategory)
            .WithMany(category => category.ExamCategoryTags)
            .HasForeignKey(categoryTag => categoryTag.ExamCategoryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(categoryTag => categoryTag.ExamTag)
            .WithMany(tag => tag.ExamCategoryTags)
            .HasForeignKey(categoryTag => categoryTag.ExamTagId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(categoryTag => new
        {
            categoryTag.ExamTagId,
            categoryTag.ExamCategoryId
        });
    }
}
