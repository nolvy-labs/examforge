namespace ExamForge.Domain.Users;

public sealed class User
{
    private User() { }

    public User(
        string email,
        string passwordHash,
        string? displayName,
        UserRole role)
    {
        Id = Guid.NewGuid();
        Email = email;
        NormalizedEmail = NormalizeEmail(email);
        PasswordHash = passwordHash;
        DisplayName = displayName;
        Role = role;
        IsActive = true;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    public Guid Id { get; private set; }

    public string Email { get; private set; } = string.Empty;

    public string NormalizedEmail { get; private set; } = string.Empty;

    public string PasswordHash { get; private set; } = string.Empty;

    public string? DisplayName { get; private set; }

    public UserRole Role { get; private set; }

    public bool IsActive { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; private set; }

    public DateTimeOffset? UpdatedAtUtc { get; private set; }

    public static string NormalizeEmail(string email)
    {
        return email.Trim().ToUpperInvariant();
    }

    public void UpdatePasswordHash(string passwordHash)
    {
        PasswordHash = passwordHash;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }
}
