using ExamForge.Domain.Exams;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public sealed class ExamTagMappingConfiguration : IEntityTypeConfiguration<ExamTagMapping>
{
    public void Configure(EntityTypeBuilder<ExamTagMapping> builder)
    {
        builder.ToTable("exam_tag_mappings");

        builder.HasKey(mapping => new { mapping.ExamId, mapping.ExamTagId });

        builder.Property(mapping => mapping.CreatedAtUtc)
            .IsRequired();

        builder.HasOne(mapping => mapping.Exam)
            .WithMany(exam => exam.ExamTagMappings)
            .HasForeignKey(mapping => mapping.ExamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(mapping => mapping.Tag)
            .WithMany()
            .HasForeignKey(mapping => mapping.ExamTagId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(mapping => new { mapping.ExamTagId, mapping.ExamId });
    }
}