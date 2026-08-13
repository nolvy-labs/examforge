using ExamForge.Application.Student.ExamClassifications.Dtos;
using ExamForge.Application.Student.ExamClassifications.Services;

using Microsoft.AspNetCore.Mvc;

namespace ExamForge.Api.Controllers.Student.ExamClassifications;

public sealed class ExamCategoriesController : StudentBaseController
{
    private readonly StudentExamDiscoveryService _service;

    public ExamCategoriesController(StudentExamDiscoveryService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StudentExamCategoryResponse>>> GetList(
        [FromQuery] bool featuredOnly = false,
        CancellationToken cancellationToken = default)
    {
        var categories = await _service.GetCategoriesAsync(
            featuredOnly,
            cancellationToken);
        return Ok(categories);
    }

}
