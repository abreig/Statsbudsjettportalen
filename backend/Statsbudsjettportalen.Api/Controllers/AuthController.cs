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
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null)
            return NotFound(new { message = "Bruker ikke funnet" });

        var token = MockAuth.GenerateToken(user.Id, user.Email, user.Role, user.DepartmentId);

        return Ok(new LoginResponse(token, new UserDto(
            user.Id, user.Email, user.FullName,
            user.DepartmentId, user.Department.Code, user.Department.Name,
            user.Role
        )));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetMe()
    {
        var userId = MockAuth.GetUserId(User);
        var user = await _db.Users
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return NotFound();

        return Ok(new UserDto(
            user.Id, user.Email, user.FullName,
            user.DepartmentId, user.Department.Code, user.Department.Name,
            user.Role
        ));
    }

    [HttpGet("users")]
    [AllowAnonymous]
    public async Task<ActionResult<List<UserDto>>> GetUsers()
    {
        var users = await _db.Users
            .Include(u => u.Department)
            .Where(u => u.IsActive)
            .Select(u => new UserDto(
                u.Id, u.Email, u.FullName,
                u.DepartmentId, u.Department.Code, u.Department.Name,
                u.Role
            ))
            .ToListAsync();

        return Ok(users);
    }
}
