using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Data;

namespace Statsbudsjettportalen.Api.Controllers;

[ApiController]
[Route("api/departments")]
[Authorize]
public class DepartmentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public DepartmentsController(AppDbContext db) => _db = db;

    public record DepartmentDto(Guid Id, string Code, string Name);

    [HttpGet]
    public async Task<ActionResult<List<DepartmentDto>>> GetAll()
    {
        var departments = await _db.Departments
            .OrderBy(d => d.Code)
            .Select(d => new DepartmentDto(d.Id, d.Code, d.Name))
            .ToListAsync();

        return Ok(departments);
    }
}
