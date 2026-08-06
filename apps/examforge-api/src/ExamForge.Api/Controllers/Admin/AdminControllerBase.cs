using ExamForge.Api.Common.Constants;
using ExamForge.Domain.Users;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Admin;

[ApiController]
[Route(ApiRoutes.Admin)]
[Authorize(Roles = nameof(UserRole.Admin))]
public abstract class AdminBaseController : ControllerBase
{

}