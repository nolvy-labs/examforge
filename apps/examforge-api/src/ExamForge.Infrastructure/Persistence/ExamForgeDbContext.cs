using ExamForge.Domain.Users;
using ExamForge.Domain.ExamClassifications;
using ExamForge.Domain.Exams;
using ExamForge.Domain.ExamAttempts;

using Microsoft.EntityFrameworkCore;

namespace ExamForge.Infrastructure.Persistence;

public sealed class ExamForgeDbContext : DbContext
{
    public ExamForgeDbContext(DbContextOptions<ExamForgeDbContext> options) : base(options)
    {

    }

    // Users
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    // Exam Classifications
    public DbSet<ExamTag> ExamTags => Set<ExamTag>();
    public DbSet<ExamCategory> ExamCategories => Set<ExamCategory>();
    public DbSet<ExamCategoryTag> ExamCategoryTags => Set<ExamCategoryTag>();

    // Exams
    public DbSet<Exam> Exams => Set<Exam>();
    public DbSet<ExamVersion> ExamVersions => Set<ExamVersion>();
    public DbSet<ExamSection> ExamSections => Set<ExamSection>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();
    public DbSet<FillAnswerKey> FillAnswerKeys => Set<FillAnswerKey>();
    public DbSet<ExamTagMapping> ExamTagMappings => Set<ExamTagMapping>();

    // Exam Attempts
    public DbSet<ExamAttempt> ExamAttempts => Set<ExamAttempt>();
    public DbSet<ExamAttemptAnswer> ExamAttemptAnswers => Set<ExamAttemptAnswer>();
    public DbSet<ExamAttemptSelectedOption> ExamAttemptSelectedOptions => Set<ExamAttemptSelectedOption>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasDefaultSchema("examforge");

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ExamForgeDbContext).Assembly);
    }
}
