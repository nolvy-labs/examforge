using System.Security.Claims;

using ExamForge.Api.Auth;
using ExamForge.Api.Routing;
using ExamForge.Application.Auth;
using ExamForge.Infrastructure.Auth;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace ExamForge.Api.Controllers;

[ApiController]
[Route(ApiRoutes.Auth)]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly JwtOptions _jwtOptions;

    public AuthController(
        IAuthService authService,
        IOptions<JwtOptions> jwtOptions)
    {
        _authService = authService;
        _jwtOptions = jwtOptions.Value;
    }

    [HttpPost("register")]
    public async Task<ActionResult<UserProfileResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
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
    public async Task<ActionResult<UserProfileResponse>> Me(CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (!Guid.TryParse(userIdValue, out var userId))
        {
            return Unauthorized();
        }

        var user = await _authService.GetMeAsync(userId, cancellationToken);

        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(user);
    }

    private void SetAuthCookies(AuthResponse response)
    {
        Response.Cookies.Append(
            AuthCookieNames.AccessToken,
            response.AccessToken,
            CreateAccessTokenCookieOptions(response.AccessTokenExpiresAtUtc)
        );

        Response.Cookies.Append(
            AuthCookieNames.RefreshToken,
            response.RefreshToken,
            CreateRefreshTokenCookieOptions()
        );
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

    private CookieOptions CreateRefreshTokenCookieOptions()
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = ApiRoutes.Auth,
            Expires = DateTimeOffset.UtcNow.AddDays(_jwtOptions.RefreshTokenDays)
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