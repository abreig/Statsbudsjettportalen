using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Data;
using Statsbudsjettportalen.Api.DTOs;
using Statsbudsjettportalen.Api.Middleware;

namespace Statsbudsjettportalen.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuthController(AppDbContext db) => _db = db;

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await _db.Users
            .Include(u => u.Department)
            .Include(u => u.DepartmentAssignments)
                .ThenInclude(a => a.Department)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null)
            return NotFound(new { message = "Bruker ikke funnet" });

        var token = MockAuth.GenerateToken(user.Id, user.Email, user.Role, user.DepartmentId,
            user.JobTitle, user.LeaderLevel);

        return Ok(new LoginResponse(token, MapUserDto(user)));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetMe()
    {
        var userId = MockAuth.GetUserId(User);
        var user = await _db.Users
            .Include(u => u.Department)
            .Include(u => u.DepartmentAssignments)
                .ThenInclude(a => a.Department)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return NotFound();

        return Ok(MapUserDto(user));
    }

    [HttpGet("users")]
    [AllowAnonymous]
    public async Task<ActionResult<List<UserDto>>> GetUsers()
    {
        var users = await _db.Users
            .Include(u => u.Department)
            .Include(u => u.DepartmentAssignments)
                .ThenInclude(a => a.Department)
            .Where(u => u.IsActive)
            .ToListAsync();

        return Ok(users.Select(MapUserDto).ToList());
    }

    private static UserDto MapUserDto(Models.User u)
    {
        var assignments = u.DepartmentAssignments?.Count > 0
            ? u.DepartmentAssignments.Select(a => new AssignedDepartmentDto(
                a.DepartmentId, a.Department.Code, a.Department.Name, a.IsPrimary
            )).ToList()
            : null;

        return new UserDto(
            u.Id, u.Email, u.FullName,
            u.DepartmentId, u.Department.Code, u.Department.Name,
            u.Role, u.Division, u.Section,
            u.JobTitle, u.LeaderLevel, assignments
        );
    }
}
