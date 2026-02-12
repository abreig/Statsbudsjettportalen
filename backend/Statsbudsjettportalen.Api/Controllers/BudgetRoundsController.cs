using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Data;
using Statsbudsjettportalen.Api.DTOs;

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
            br.Id, br.Name, br.Type, br.Year, br.Status, br.Deadline,
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
            br.Id, br.Name, br.Type, br.Year, br.Status, br.Deadline,
            br.Cases.Count
        ));
    }
}
