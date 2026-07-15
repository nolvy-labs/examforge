using System.Security.Claims;

using ExamForge.Application.Abstractions;

namespace ExamForge.Api.Auth;

public sealed class CurrentUserContext : ICurrentUserContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? UserId
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User.FindFirstValue(
                ClaimTypes.NameIdentifier);

            return Guid.TryParse(value, out var userId) ? userId : null;
        }
    }
}