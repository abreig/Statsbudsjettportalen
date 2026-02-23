using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Statsbudsjettportalen.Api.Data;

namespace Statsbudsjettportalen.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "administrator")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AdminController> _logger;

    public AdminController(AppDbContext db, IWebHostEnvironment env, ILogger<AdminController> logger)
    {
        _db = db;
        _env = env;
        _logger = logger;
    }

    /// <summary>
    /// Resets the database to initial seed data. Development only.
    /// </summary>
    [HttpPost("reset-database")]
    public async Task<IActionResult> ResetDatabase()
    {
        if (!_env.IsDevelopment())
        {
            return NotFound();
        }

        _logger.LogWarning("Database reset requested by {User}", User.Identity?.Name ?? "unknown");

        try
        {
            await SeedData.ResetAndReseedAsync(_db);
            _logger.LogInformation("Database reset and reseed completed successfully");
            return Ok(new { message = "Database er nullstilt og seed-data er gjenskapt.", timestamp = DateTime.UtcNow });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database reset failed");
            // SIKKERHETSFIKSING: Fjernet ex.Message fra HTTP-respons for å unngå lekkasje
            // av intern databaseinformasjon til klienten. Detaljer logges server-side.
            return StatusCode(500, new { message = "Kunne ikke nullstille databasen. Se serverlogger for detaljer." });
        }
    }
}
