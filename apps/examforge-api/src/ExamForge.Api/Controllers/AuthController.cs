using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

using ExamForge.Api.Common.Constants;
using ExamForge.Api.Configuration;
using ExamForge.Api.Extensions;
using ExamForge.Application.Abstractions;
using ExamForge.Application.Auth;
using ExamForge.Domain.Users;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace ExamForge.Api.Controllers;

[ApiController]
[Route(ApiRoutes.Auth)]
public sealed class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly AuthHostingSettings _hostingSettings;

    public AuthController(
        AuthService authService,
        IOptions<AuthHostingSettings> hostingSettings)
    {
        _authService = authService;
        _hostingSettings = hostingSettings.Value;
    }

    [EnableRateLimiting(RateLimitingExtensions.AuthenticationPolicy)]
    [HttpPost("register")]
    public async Task<ActionResult<UserProfileResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        if (!_hostingSettings.AllowPublicRegistration)
        {
            return NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Not Found",
                Detail = "The requested resource was not found.",
                Instance = HttpContext.Request.Path
            });
        }

        var result = await _authService.RegisterAsync(request, cancellationToken);

        if (result.Error == AuthError.EmailAlreadyExists)
        {
            return Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Conflict",
                Detail = "Email is already registered.",
                Instance = HttpContext.Request.Path
            });
        }

        var response = result.Value!;

        SetAuthCookies(response);

        return Ok(response.User);
    }

    [EnableRateLimiting(RateLimitingExtensions.AuthenticationPolicy)]
    [HttpPost("login")]
    public async Task<ActionResult<UserProfileResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(request, cancellationToken);

        if (!result.IsSuccess)
        {
            return result.Error switch
            {
                AuthError.InvalidCredentials => Unauthorized(new ProblemDetails
                {
                    Status = StatusCodes.Status401Unauthorized,
                    Title = "Unauthorized",
                    Detail = "Invalid email or password.",
                    Instance = HttpContext.Request.Path
                }),

                _ => BadRequest()
            };
        }

        var response = result.Value!;

        SetAuthCookies(response);

        return Ok(response.User);
    }

    [EnableRateLimiting(RateLimitingExtensions.RefreshPolicy)]
    [HttpPost("refresh")]
    public async Task<ActionResult<UserProfileResponse>> Refresh(CancellationToken cancellationToken)
    {
        var refreshToken = Request.Cookies[AuthCookieNames.RefreshToken];

        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return Unauthorized();
        }

        var result = await _authService.RefreshAsync(
            new RefreshTokenRequest(refreshToken),
            cancellationToken
        );

        if (result.Error == AuthError.InvalidRefreshToken)
        {
            DeleteAuthCookies();

            return Unauthorized(new ProblemDetails
            {
                Status = StatusCodes.Status401Unauthorized,
                Title = "Unauthorized",
                Detail = "Invalid refresh token.",
                Instance = HttpContext.Request.Path
            });
        }

        var response = result.Value!;

        SetAuthCookies(response);

        return Ok(response.User);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var refreshToken = Request.Cookies[AuthCookieNames.RefreshToken];

        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            await _authService.RevokeRefreshTokenAsync(refreshToken, cancellationToken);
        }

        DeleteAuthCookies();

        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public ActionResult<UserProfileResponse> Me()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        var email = User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Email);
        var displayName = User.FindFirstValue(ClaimTypes.Name)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Name);
        var roleValue = User.FindFirstValue(ClaimTypes.Role)
            ?? User.FindFirstValue("role");

        if (!Guid.TryParse(userIdValue, out var userId) ||
            string.IsNullOrWhiteSpace(email) ||
            !Enum.TryParse<UserRole>(roleValue, out var role) ||
            !Enum.IsDefined(role))
        {
            return Unauthorized();
        }

        return Ok(new UserProfileResponse(userId, email, displayName, role));
    }

    private void SetAuthCookies(AuthResponse response)
    {
        Response.Cookies.Append(
            AuthCookieNames.AccessToken,
            response.AccessToken,
            CreateAccessTokenCookieOptions(response.AccessTokenExpiresAtUtc));

        Response.Cookies.Append(
            AuthCookieNames.RefreshToken,
            response.RefreshToken,
            CreateRefreshTokenCookieOptions(response.RefreshTokenExpiresAtUtc));
    }

    private CookieOptions CreateAccessTokenCookieOptions(DateTimeOffset expiresAtUtc)
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = expiresAtUtc
        };
    }

    private CookieOptions CreateRefreshTokenCookieOptions(DateTimeOffset expiresAtUtc)
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = ApiRoutes.Auth,
            Expires = expiresAtUtc
        };
    }

    private void DeleteAuthCookies()
    {
        Response.Cookies.Delete(AuthCookieNames.AccessToken, new CookieOptions
        {
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = "/",
        });

        Response.Cookies.Delete(AuthCookieNames.RefreshToken, new CookieOptions
        {
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = ApiRoutes.Auth,
        });
    }
}
