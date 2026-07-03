using Microsoft.EntityFrameworkCore;

using ExamForge.Domain.Users;
using ExamForge.Domain.ExamClassifications;

namespace ExamForge.Infrastructure.Persistence;

public sealed class ExamForgeDbContext : DbContext
{
    public ExamForgeDbContext(DbContextOptions<ExamForgeDbContext> options) : base(options)
    {

    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<ExamTag> ExamTags => Set<ExamTag>();
    public DbSet<ExamCategory> ExamCategories => Set<ExamCategory>();
    public DbSet<ExamCategoryTag> ExamCategoryTags => Set<ExamCategoryTag>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasDefaultSchema("examforge");

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ExamForgeDbContext).Assembly);
    }
}
