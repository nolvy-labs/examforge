using ExamForge.Application.Abstractions;

using Microsoft.EntityFrameworkCore;

using Npgsql;

namespace ExamForge.Infrastructure.Persistence;

internal sealed class UnitOfWork : IUnitOfWork
{
    private readonly ExamForgeDbContext _dbContext;

    public UnitOfWork(ExamForgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<T> ExecuteInTransactionAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken = default)
    {
        var strategy = _dbContext.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _dbContext.Database.BeginTransactionAsync(
                cancellationToken);

            try
            {
                var result = await operation(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                return result;
            }
            catch (Exception exception) when (IsConflict(exception))
            {
                await transaction.RollbackAsync(cancellationToken);
                throw new PersistenceConflictException(
                    "A concurrent exam-version operation conflicted with this request.",
                    exception);
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        });
    }

    private static bool IsConflict(Exception exception)
    {
        var postgresException = exception as PostgresException ??
            exception.InnerException as PostgresException;

        return postgresException?.SqlState is
            PostgresErrorCodes.UniqueViolation or
            PostgresErrorCodes.SerializationFailure or
            PostgresErrorCodes.DeadlockDetected;
    }
}