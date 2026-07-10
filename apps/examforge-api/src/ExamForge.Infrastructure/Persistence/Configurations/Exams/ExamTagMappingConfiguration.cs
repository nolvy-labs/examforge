using ExamForge.Domain.Exams;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ExamForge.Infrastructure.Persistence.Configurations;

public class ExamTagMappingConfiguration : IEntityTypeConfiguration<ExamTagMapping>
{
    public void Configure(EntityTypeBuilder<ExamTagMapping> builder)
    {
        builder.ToTable("exam_tag_mapping");

        builder.HasKey(e => new { e.ExamId, e.ExamTagId });

        builder.Property(e => e.ExamTagId)
            .IsRequired();

        builder.Property(e => e.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.HasIndex(e => e.ExamTagId);

        builder.HasOne(e => e.Exam)
            .WithMany(e => e.ExamTagMappings)
            .HasForeignKey(e => e.ExamId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
