namespace ExamForge.Application.Abstractions;

public interface ICurrentUserContext
{
    Guid? UserId { get; }
}