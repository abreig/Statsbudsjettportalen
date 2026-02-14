using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Data;
using Statsbudsjettportalen.Api.DTOs;
using Statsbudsjettportalen.Api.Middleware;
using Statsbudsjettportalen.Api.Models;

namespace Statsbudsjettportalen.Api.Controllers;

[ApiController]
[Route("api/budget-rounds")]
[Authorize]
public class BudgetRoundsController : ControllerBase
{
    private readonly AppDbContext _db;

    public BudgetRoundsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<BudgetRoundDto>>> GetAll()
    {
        var rounds = await _db.BudgetRounds
            .Include(br => br.Cases)
            .OrderByDescending(br => br.Year)
            .ThenBy(br => br.Name)
            .ToListAsync();

        var result = rounds.Select(br => new BudgetRoundDto(
            br.Id, br.Name, br.Type, br.Year, br.Status, br.Deadline, br.ClosedAt,
            br.Cases.Count
        )).ToList();

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BudgetRoundDto>> GetById(Guid id)
    {
        var br = await _db.BudgetRounds
            .Include(b => b.Cases)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (br == null) return NotFound();

        return Ok(new BudgetRoundDto(
            br.Id, br.Name, br.Type, br.Year, br.Status, br.Deadline, br.ClosedAt,
            br.Cases.Count
        ));
    }

    // ─── Round field overrides (punkt 12) ───────────

    [HttpGet("{id}/field-overrides")]
    public async Task<ActionResult<List<RoundFieldOverrideDto>>> GetFieldOverrides(Guid id)
    {
        var overrides = await _db.RoundFieldOverrides
            .Where(o => o.BudgetRoundId == id)
            .ToListAsync();

        return Ok(overrides.Select(o =>
        {
            var keys = JsonSerializer.Deserialize<List<string>>(o.FinFieldKeysJson) ?? [];
            return new RoundFieldOverrideDto(o.Id, o.BudgetRoundId, o.CaseTypeCode, keys, o.UpdatedAt);
        }).ToList());
    }

    [HttpPut("{id}/field-overrides")]
    public async Task<ActionResult<RoundFieldOverrideDto>> SetFieldOverride(Guid id, [FromBody] UpdateRoundFieldOverrideDto dto)
    {
        var userRole = MockAuth.GetUserRole(User);
        if (userRole != "administrator") return Forbid();

        var round = await _db.BudgetRounds.FindAsync(id);
        if (round == null) return NotFound();
        if (round.Status == "closed")
            return BadRequest(new { message = "Kan ikke endre felt-konfigurasjon for lukkede runder" });

        var existing = await _db.RoundFieldOverrides
            .FirstOrDefaultAsync(o => o.BudgetRoundId == id && o.CaseTypeCode == dto.CaseTypeCode);

        if (existing != null)
        {
            existing.FinFieldKeysJson = JsonSerializer.Serialize(dto.FinFieldKeys);
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            existing = new RoundFieldOverride
            {
                Id = Guid.NewGuid(),
                BudgetRoundId = id,
                CaseTypeCode = dto.CaseTypeCode,
                FinFieldKeysJson = JsonSerializer.Serialize(dto.FinFieldKeys),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.RoundFieldOverrides.Add(existing);
        }

        await _db.SaveChangesAsync();
        return Ok(new RoundFieldOverrideDto(existing.Id, existing.BudgetRoundId, existing.CaseTypeCode, dto.FinFieldKeys, existing.UpdatedAt));
    }
}
