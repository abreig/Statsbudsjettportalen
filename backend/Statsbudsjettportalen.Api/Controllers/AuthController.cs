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
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext db, ILogger<AuthController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// POC-innlogging uten passord. MÅ erstattes med Entra ID-integrasjon før produksjon.
    /// </summary>
    [Obsolete("POC-only: Erstatt med Entra ID-integrasjon (Microsoft.Identity.Web) før produksjon")]
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        _logger.LogWarning("ADVARSEL: Passordløs POC-innlogging brukt for {Email}. " +
            "Denne autentiseringsmetoden MÅ erstattes med Entra ID før produksjonsdeployment.", request.Email);

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

    /// <summary>
    /// SIKKERHETSFIKSING: Endret fra [AllowAnonymous] til [Authorize].
    /// Anonyme brukere skal ikke kunne liste alle brukere med roller og departementstilhørighet.
    /// </summary>
    [HttpGet("users")]
    [Authorize]
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
