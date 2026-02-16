using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Data;
using Statsbudsjettportalen.Api.DTOs;
using Statsbudsjettportalen.Api.Middleware;
using Statsbudsjettportalen.Api.Models;
using Statsbudsjettportalen.Api.Services;

namespace Statsbudsjettportalen.Api.Controllers;

[ApiController]
[Route("api/department-lists")]
[Authorize]
public class DepartmentListsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly DepartmentListService _depListService;

    public DepartmentListsController(AppDbContext db, DepartmentListService depListService)
    {
        _db = db;
        _depListService = depListService;
    }

    [HttpGet]
    public async Task<ActionResult<List<DepartmentListResponseDto>>> GetAll(
        [FromQuery] Guid? budget_round_id,
        [FromQuery] Guid? department_id)
    {
        var query = _db.DepartmentLists
            .Include(dl => dl.Template)
            .Include(dl => dl.Department)
            .AsQueryable();

        if (budget_round_id.HasValue)
            query = query.Where(dl => dl.BudgetRoundId == budget_round_id.Value);

        if (department_id.HasValue)
            query = query.Where(dl => dl.DepartmentId == department_id.Value);

        var lists = await query.OrderByDescending(dl => dl.CreatedAt).ToListAsync();

        return Ok(lists.Select(dl => MapToDto(dl, false)).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DepartmentListResponseDto>> GetById(Guid id)
    {
        var dl = await _db.DepartmentLists
            .Include(d => d.Template)
            .Include(d => d.Department)
            .Include(d => d.Sections)
                .ThenInclude(s => s.TemplateSection)
            .Include(d => d.Sections)
                .ThenInclude(s => s.CaseEntries)
                    .ThenInclude(e => e.Case)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (dl == null) return NotFound();

        return Ok(MapToDto(dl, true));
    }

    [HttpPost]
    public async Task<ActionResult<DepartmentListResponseDto>> Create([FromBody] DepartmentListCreateDto dto)
    {
        var userId = MockAuth.GetUserId(User);

        // Check template exists
        var template = await _db.DepartmentListTemplates
            .Include(t => t.Sections)
            .FirstOrDefaultAsync(t => t.Id == dto.TemplateId);
        if (template == null)
            return BadRequest(new { message = "Mal ikke funnet" });

        // Check unique constraint
        var existing = await _db.DepartmentLists
            .AnyAsync(dl => dl.BudgetRoundId == dto.BudgetRoundId && dl.DepartmentId == dto.DepartmentId);
        if (existing)
            return Conflict(new { message = "Det finnes allerede en departementsliste for dette departementet i denne budsjettrunden." });

        var department = await _db.Departments.FindAsync(dto.DepartmentId);
        if (department == null) return BadRequest(new { message = "Departement ikke funnet" });

        var depList = new DepartmentList
        {
            Id = Guid.NewGuid(),
            TemplateId = dto.TemplateId,
            BudgetRoundId = dto.BudgetRoundId,
            DepartmentId = dto.DepartmentId,
            Status = "draft",
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.DepartmentLists.Add(depList);

        // Instantiate sections from template
        var templateSections = template.Sections.ToList();
        var idMap = new Dictionary<Guid, Guid>(); // templateSectionId -> newSectionId

        // First pass: create all sections
        foreach (var ts in templateSections.OrderBy(s => s.SortOrder))
        {
            var newId = Guid.NewGuid();
            idMap[ts.Id] = newId;

            var title = ts.TitleTemplate
                .Replace("{department_name}", department.Name)
                .Replace("{department_abbrev}", department.Code);

            var section = new DepartmentListSection
            {
                Id = newId,
                DepartmentListId = depList.Id,
                TemplateSectionId = ts.Id,
                Title = title,
                SortOrder = ts.SortOrder,
            };

            _db.DepartmentListSections.Add(section);
        }

        await _db.SaveChangesAsync();

        // Second pass: set parent IDs
        foreach (var ts in templateSections.Where(s => s.ParentId.HasValue))
        {
            if (idMap.TryGetValue(ts.ParentId!.Value, out var newParentId) &&
                idMap.TryGetValue(ts.Id, out var newId))
            {
                var section = await _db.DepartmentListSections.FindAsync(newId);
                if (section != null)
                {
                    section.ParentId = newParentId;
                }
            }
        }

        await _db.SaveChangesAsync();

        // Reload full entity
        var saved = await _db.DepartmentLists
            .Include(d => d.Template)
            .Include(d => d.Department)
            .Include(d => d.Sections)
                .ThenInclude(s => s.TemplateSection)
            .FirstAsync(d => d.Id == depList.Id);

        return CreatedAtAction(nameof(GetById), new { id = depList.Id }, MapToDto(saved, true));
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult<DepartmentListResponseDto>> UpdateStatus(Guid id, [FromBody] StatusChangeDto dto)
    {
        var dl = await _db.DepartmentLists
            .Include(d => d.Template)
            .Include(d => d.Department)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (dl == null) return NotFound();

        dl.Status = dto.Status;
        dl.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(MapToDto(dl, false));
    }

    // ===== Section Content =====

    [HttpPut("{listId}/sections/{sectionId}")]
    public async Task<IActionResult> UpdateSectionContent(
        Guid listId, Guid sectionId, [FromBody] DepartmentListSectionUpdateDto dto)
    {
        var section = await _db.DepartmentListSections
            .FirstOrDefaultAsync(s => s.Id == sectionId && s.DepartmentListId == listId);
        if (section == null) return NotFound();

        if (dto.Title != null) section.Title = dto.Title;
        if (dto.ContentJson != null) section.ContentJson = dto.ContentJson;

        var dl = await _db.DepartmentLists.FindAsync(listId);
        if (dl != null) dl.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok();
    }

    // ===== Case Entries =====

    [HttpPost("{listId}/case-entries")]
    public async Task<ActionResult<DepartmentListCaseEntryResponseDto>> AddCaseEntry(
        Guid listId, [FromBody] DepartmentListCaseEntryAddDto dto)
    {
        var dl = await _db.DepartmentLists.FindAsync(listId);
        if (dl == null) return NotFound();

        var c = await _db.Cases.FindAsync(dto.CaseId);
        if (c == null) return BadRequest(new { message = "Sak ikke funnet" });

        var entry = new DepartmentListCaseEntry
        {
            Id = Guid.NewGuid(),
            DepartmentListId = listId,
            SectionId = dto.SectionId,
            CaseId = dto.CaseId,
            Subgroup = dto.Subgroup,
            SortOrder = dto.SortOrder,
            IncludedAt = DateTime.UtcNow,
        };

        _db.DepartmentListCaseEntries.Add(entry);
        dl.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Created("", new DepartmentListCaseEntryResponseDto(
            entry.Id, entry.CaseId, c.CaseName, c.CaseType,
            entry.Subgroup, entry.SortOrder,
            c.Amount, c.FinAmount, c.GovAmount,
            entry.OverrideContent));
    }

    [HttpPut("{listId}/case-entries/{entryId}")]
    public async Task<IActionResult> UpdateCaseEntry(
        Guid listId, Guid entryId, [FromBody] DepartmentListCaseEntryUpdateDto dto)
    {
        var entry = await _db.DepartmentListCaseEntries
            .FirstOrDefaultAsync(e => e.Id == entryId && e.DepartmentListId == listId);
        if (entry == null) return NotFound();

        if (dto.Subgroup != null) entry.Subgroup = dto.Subgroup;
        if (dto.SortOrder.HasValue) entry.SortOrder = dto.SortOrder.Value;
        if (dto.OverrideContent != null) entry.OverrideContent = dto.OverrideContent;

        var dl = await _db.DepartmentLists.FindAsync(listId);
        if (dl != null) dl.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok();
    }

    [HttpDelete("{listId}/case-entries/{entryId}")]
    public async Task<IActionResult> RemoveCaseEntry(Guid listId, Guid entryId)
    {
        var entry = await _db.DepartmentListCaseEntries
            .FirstOrDefaultAsync(e => e.Id == entryId && e.DepartmentListId == listId);
        if (entry == null) return NotFound();

        _db.DepartmentListCaseEntries.Remove(entry);

        var dl = await _db.DepartmentLists.FindAsync(listId);
        if (dl != null) dl.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return NoContent();
    }

    // ===== Auto-placement =====

    /// <summary>
    /// Auto-place all eligible cases from the department into the list.
    /// </summary>
    [HttpPost("{listId}/auto-place")]
    public async Task<IActionResult> AutoPlaceCases(Guid listId)
    {
        var count = await _depListService.PlaceAllCasesAsync(listId);
        return Ok(new { placed = count });
    }

    /// <summary>
    /// Place a specific case into the list.
    /// </summary>
    [HttpPost("{listId}/place-case/{caseId}")]
    public async Task<IActionResult> PlaceCase(Guid listId, Guid caseId)
    {
        var entry = await _depListService.PlaceCaseAsync(listId, caseId);
        if (entry == null) return BadRequest(new { message = "Kunne ikke plassere saken. Sjekk at sakstypen matcher en seksjon i malen." });
        return Ok(new { entryId = entry.Id, sectionId = entry.SectionId });
    }

    // ===== Figures =====

    [HttpPost("{listId}/figures")]
    [RequestSizeLimit(10_485_760)] // 10 MB
    public async Task<ActionResult<DepartmentListFigureResponseDto>> UploadFigure(
        Guid listId,
        [FromForm] IFormFile file,
        [FromForm] Guid sectionId,
        [FromForm] string? caption)
    {
        var dl = await _db.DepartmentLists.FindAsync(listId);
        if (dl == null) return NotFound();

        var section = await _db.DepartmentListSections
            .FirstOrDefaultAsync(s => s.Id == sectionId && s.DepartmentListId == listId);
        if (section == null) return BadRequest(new { message = "Seksjon ikke funnet" });

        var userId = MockAuth.GetUserId(User);
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".png" && ext != ".svg" && ext != ".jpg" && ext != ".jpeg")
            return BadRequest(new { message = "Bare PNG, SVG og JPEG er tillatt." });

        // Save file to wwwroot/uploads/figures
        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "figures");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        var fileUrl = $"/uploads/figures/{fileName}";

        var figure = new DepartmentListFigure
        {
            Id = Guid.NewGuid(),
            DepartmentListId = listId,
            SectionId = sectionId,
            FileUrl = fileUrl,
            FileType = ext.TrimStart('.'),
            Caption = caption,
            WidthPercent = 100,
            SortOrder = 0,
            UploadedBy = userId,
            UploadedAt = DateTime.UtcNow,
        };

        _db.DepartmentListFigures.Add(figure);

        // Also update the section's contentJson with the figure URL
        var configJson = section.ContentJson;
        var config = string.IsNullOrEmpty(configJson)
            ? new Dictionary<string, object>()
            : System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(configJson) ?? new();
        config["file_url"] = fileUrl;
        if (caption != null) config["caption"] = caption;
        section.ContentJson = System.Text.Json.JsonSerializer.Serialize(config);

        dl.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Created("", new DepartmentListFigureResponseDto(
            figure.Id, figure.SectionId, figure.FileUrl, figure.FileType,
            figure.Caption, figure.WidthPercent, figure.SortOrder,
            figure.UploadedBy, figure.UploadedAt));
    }

    // ===== Word Export =====

    [HttpGet("{listId}/export/word")]
    public async Task<IActionResult> ExportWord(Guid listId)
    {
        var dl = await _db.DepartmentLists
            .Include(d => d.Template)
            .Include(d => d.Department)
            .Include(d => d.Sections)
                .ThenInclude(s => s.TemplateSection)
            .Include(d => d.Sections)
                .ThenInclude(s => s.CaseEntries)
                    .ThenInclude(e => e.Case)
            .FirstOrDefaultAsync(d => d.Id == listId);

        if (dl == null) return NotFound();

        // Fetch conclusions for all cases in this list
        var caseIds = dl.Sections
            .SelectMany(s => s.CaseEntries)
            .Select(e => e.CaseId)
            .Distinct()
            .ToList();

        var conclusions = await _db.CaseConclusions
            .Where(c => caseIds.Contains(c.CaseId))
            .OrderBy(c => c.SortOrder)
            .ToListAsync();

        var conclusionsByCaseId = conclusions
            .GroupBy(c => c.CaseId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var exportService = new DepListWordExportService();
        var docxBytes = exportService.GenerateDocx(dl, conclusionsByCaseId);

        var fileName = $"Departementsliste_{dl.Department?.Code ?? "dep"}_{DateTime.Now:yyyyMMdd}.docx";
        return File(docxBytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            fileName);
    }

    // ===== Mapping =====

    private static DepartmentListResponseDto MapToDto(DepartmentList dl, bool includeSections)
    {
        List<DepartmentListSectionResponseDto>? sections = null;

        if (includeSections && dl.Sections != null)
        {
            var allSections = dl.Sections.ToList();
            var roots = allSections.Where(s => s.ParentId == null).OrderBy(s => s.SortOrder);
            sections = roots.Select(s => MapSectionToDto(s, allSections)).ToList();
        }

        return new DepartmentListResponseDto(
            dl.Id,
            dl.TemplateId,
            dl.Template?.Name ?? "",
            dl.BudgetRoundId,
            dl.DepartmentId,
            dl.Department?.Code ?? "",
            dl.Department?.Name ?? "",
            dl.Status,
            dl.CreatedBy,
            dl.CreatedAt,
            dl.UpdatedAt,
            sections
        );
    }

    private static DepartmentListSectionResponseDto MapSectionToDto(
        DepartmentListSection section,
        List<DepartmentListSection> allSections)
    {
        var children = allSections
            .Where(s => s.ParentId == section.Id)
            .OrderBy(s => s.SortOrder)
            .Select(s => MapSectionToDto(s, allSections))
            .ToList();

        var caseEntries = section.CaseEntries?
            .OrderBy(e => e.SortOrder)
            .Select(e => new DepartmentListCaseEntryResponseDto(
                e.Id, e.CaseId,
                e.Case?.CaseName ?? "", e.Case?.CaseType ?? "",
                e.Subgroup, e.SortOrder,
                e.Case?.Amount, e.Case?.FinAmount, e.Case?.GovAmount,
                e.OverrideContent))
            .ToList() ?? new List<DepartmentListCaseEntryResponseDto>();

        return new DepartmentListSectionResponseDto(
            section.Id,
            section.DepartmentListId,
            section.TemplateSectionId,
            section.ParentId,
            section.Title,
            section.SortOrder,
            section.ContentJson,
            section.TemplateSection?.SectionType ?? "",
            section.TemplateSection?.HeadingStyle ?? "",
            children,
            caseEntries
        );
    }
}
