using Microsoft.EntityFrameworkCore;

using ExamForge.Domain.Users;

namespace ExamForge.Infrastructure.Persistence;

public sealed class ExamForgeDbContext : DbContext
{
    public ExamForgeDbContext(DbContextOptions<ExamForgeDbContext> options) : base(options)
    {

    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasDefaultSchema("examforge");

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ExamForgeDbContext).Assembly);
    }
}
