using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Data;
using Statsbudsjettportalen.Api.DTOs;
using Statsbudsjettportalen.Api.Middleware;
using Statsbudsjettportalen.Api.Models;

namespace Statsbudsjettportalen.Api.Controllers;

[ApiController]
[Route("api/cases/{caseId}/conclusions")]
[Authorize]
public class CaseConclusionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public CaseConclusionsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<CaseConclusionResponseDto>>> GetAll(Guid caseId)
    {
        var conclusions = await _db.CaseConclusions
            .Where(c => c.CaseId == caseId)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();

        return Ok(conclusions.Select(c => new CaseConclusionResponseDto(
            c.Id, c.CaseId, c.SortOrder, c.Text, c.CreatedBy, c.CreatedAt
        )).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<CaseConclusionResponseDto>> Create(
        Guid caseId, [FromBody] CaseConclusionCreateDto dto)
    {
        var userId = MockAuth.GetUserId(User);

        var caseEntity = await _db.Cases.FindAsync(caseId);
        if (caseEntity == null) return NotFound();

        var conclusion = new CaseConclusion
        {
            Id = Guid.NewGuid(),
            CaseId = caseId,
            SortOrder = dto.SortOrder,
            Text = dto.Text,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
        };

        _db.CaseConclusions.Add(conclusion);
        await _db.SaveChangesAsync();

        return Created("", new CaseConclusionResponseDto(
            conclusion.Id, conclusion.CaseId, conclusion.SortOrder,
            conclusion.Text, conclusion.CreatedBy, conclusion.CreatedAt
        ));
    }

    [HttpPut("{conclusionId}")]
    public async Task<ActionResult<CaseConclusionResponseDto>> Update(
        Guid caseId, Guid conclusionId, [FromBody] CaseConclusionUpdateDto dto)
    {
        var conclusion = await _db.CaseConclusions
            .FirstOrDefaultAsync(c => c.Id == conclusionId && c.CaseId == caseId);
        if (conclusion == null) return NotFound();

        if (dto.Text != null) conclusion.Text = dto.Text;
        if (dto.SortOrder.HasValue) conclusion.SortOrder = dto.SortOrder.Value;

        await _db.SaveChangesAsync();

        return Ok(new CaseConclusionResponseDto(
            conclusion.Id, conclusion.CaseId, conclusion.SortOrder,
            conclusion.Text, conclusion.CreatedBy, conclusion.CreatedAt
        ));
    }

    [HttpDelete("{conclusionId}")]
    public async Task<IActionResult> Delete(Guid caseId, Guid conclusionId)
    {
        var conclusion = await _db.CaseConclusions
            .FirstOrDefaultAsync(c => c.Id == conclusionId && c.CaseId == caseId);
        if (conclusion == null) return NotFound();

        _db.CaseConclusions.Remove(conclusion);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Replace all conclusions for a case at once (for bulk reordering).
    /// </summary>
    [HttpPut]
    public async Task<ActionResult<List<CaseConclusionResponseDto>>> ReplaceAll(
        Guid caseId, [FromBody] List<CaseConclusionCreateDto> dtos)
    {
        var userId = MockAuth.GetUserId(User);

        var caseEntity = await _db.Cases.FindAsync(caseId);
        if (caseEntity == null) return NotFound();

        // Remove existing
        var existing = await _db.CaseConclusions.Where(c => c.CaseId == caseId).ToListAsync();
        _db.CaseConclusions.RemoveRange(existing);

        // Add new
        var conclusions = dtos.Select(dto => new CaseConclusion
        {
            Id = Guid.NewGuid(),
            CaseId = caseId,
            SortOrder = dto.SortOrder,
            Text = dto.Text,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
        }).ToList();

        _db.CaseConclusions.AddRange(conclusions);
        await _db.SaveChangesAsync();

        return Ok(conclusions.Select(c => new CaseConclusionResponseDto(
            c.Id, c.CaseId, c.SortOrder, c.Text, c.CreatedBy, c.CreatedAt
        )).ToList());
    }
}
