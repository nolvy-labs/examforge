namespace ExamForge.Application.Abstractions;

public sealed class PersistenceConflictException : Exception
{
    public PersistenceConflictException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}