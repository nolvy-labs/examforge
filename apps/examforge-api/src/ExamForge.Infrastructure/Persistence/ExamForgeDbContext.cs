using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Persistence;

public sealed class ExamForgeDbContext : DbContext
{
    public ExamForgeDbContext(DbContextOptions<ExamForgeDbContext> options) : base(options)
    {

    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("examforge");
    }
}
