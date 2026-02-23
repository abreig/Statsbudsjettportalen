using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Data;
using Statsbudsjettportalen.Api.DTOs;
using Statsbudsjettportalen.Api.Middleware;
using Statsbudsjettportalen.Api.Models;

namespace Statsbudsjettportalen.Api.Controllers;

/// SIKKERHETSFIKSING: Lagt til [Authorize] på kontroller-nivå.
/// GET-endepunkter var tidligere [AllowAnonymous] - sakstypedefinisjoner bør kreve autentisering.
[ApiController]
[Route("api/case-types")]
[Authorize]
public class CaseTypesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CaseTypesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<CaseTypeDto>>> GetAll([FromQuery] bool includeInactive = false)
    {
        var query = _db.CaseTypeDefinitions.AsQueryable();
        if (!includeInactive)
            query = query.Where(ct => ct.IsActive);

        var types = await query.OrderBy(ct => ct.SortOrder).ToListAsync();

        return Ok(types.Select(MapToDto).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CaseTypeDto>> GetById(Guid id)
    {
        var ct = await _db.CaseTypeDefinitions.FindAsync(id);
        if (ct == null) return NotFound();
        return Ok(MapToDto(ct));
    }

    [HttpPost]
    public async Task<ActionResult<CaseTypeDto>> Create([FromBody] CaseTypeCreateDto dto)
    {
        var userRole = MockAuth.GetUserRole(User);
        if (userRole != "administrator")
            return Forbid();

        if (await _db.CaseTypeDefinitions.AnyAsync(ct => ct.Code == dto.Code))
            return Conflict(new { message = $"Sakstype med kode '{dto.Code}' finnes allerede" });

        var ct = new CaseTypeDefinition
        {
            Id = Guid.NewGuid(),
            Code = dto.Code,
            Name = dto.Name,
            Description = dto.Description,
            SortOrder = dto.SortOrder,
            FieldsJson = JsonSerializer.Serialize(dto.Fields),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.CaseTypeDefinitions.Add(ct);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = ct.Id }, MapToDto(ct));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CaseTypeDto>> Update(Guid id, [FromBody] CaseTypeUpdateDto dto)
    {
        var userRole = MockAuth.GetUserRole(User);
        if (userRole != "administrator")
            return Forbid();

        var ct = await _db.CaseTypeDefinitions.FindAsync(id);
        if (ct == null) return NotFound();

        if (dto.Name != null) ct.Name = dto.Name;
        if (dto.Description != null) ct.Description = dto.Description;
        if (dto.IsActive.HasValue) ct.IsActive = dto.IsActive.Value;
        if (dto.SortOrder.HasValue) ct.SortOrder = dto.SortOrder.Value;
        if (dto.Fields != null) ct.FieldsJson = JsonSerializer.Serialize(dto.Fields);
        ct.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(MapToDto(ct));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userRole = MockAuth.GetUserRole(User);
        if (userRole != "administrator")
            return Forbid();

        var ct = await _db.CaseTypeDefinitions.FindAsync(id);
        if (ct == null) return NotFound();

        ct.IsActive = false;
        ct.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Sakstype '{ct.Name}' deaktivert" });
    }

    private static CaseTypeDto MapToDto(CaseTypeDefinition ct)
    {
        var fields = JsonSerializer.Deserialize<List<CaseTypeFieldDto>>(ct.FieldsJson,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
            ?? [];

        return new CaseTypeDto(ct.Id, ct.Code, ct.Name, ct.Description, ct.IsActive, ct.SortOrder, fields);
    }
}
