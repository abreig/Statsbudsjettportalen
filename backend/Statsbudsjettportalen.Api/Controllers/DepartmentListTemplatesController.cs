using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Data;
using Statsbudsjettportalen.Api.DTOs;
using Statsbudsjettportalen.Api.Middleware;
using Statsbudsjettportalen.Api.Models;

namespace Statsbudsjettportalen.Api.Controllers;

[ApiController]
[Route("api/department-list-templates")]
[Authorize]
public class DepartmentListTemplatesController : ControllerBase
{
    private readonly AppDbContext _db;

    public DepartmentListTemplatesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<TemplateResponseDto>>> GetAll(
        [FromQuery] string? budget_round_type,
        [FromQuery] bool? is_active)
    {
        var query = _db.DepartmentListTemplates
            .Include(t => t.Sections)
            .AsQueryable();

        if (!string.IsNullOrEmpty(budget_round_type))
            query = query.Where(t => t.BudgetRoundType == budget_round_type);

        if (is_active.HasValue)
            query = query.Where(t => t.IsActive == is_active.Value);

        var templates = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();

        return Ok(templates.Select(MapTemplateToDto).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TemplateResponseDto>> GetById(Guid id)
    {
        var template = await _db.DepartmentListTemplates
            .Include(t => t.Sections)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template == null) return NotFound();

        return Ok(MapTemplateToDto(template));
    }

    [HttpPost]
    public async Task<ActionResult<TemplateResponseDto>> Create([FromBody] TemplateCreateDto dto)
    {
        var userId = MockAuth.GetUserId(User);
        var userRole = MockAuth.GetUserRole(User);

        if (userRole != "administrator" && userRole != "leder_fin")
            return Forbid();

        var template = new DepartmentListTemplate
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            BudgetRoundType = dto.BudgetRoundType,
            DepartmentNamePlaceholder = dto.DepartmentNamePlaceholder ?? "XX",
            ClassificationText = dto.ClassificationText,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.DepartmentListTemplates.Add(template);

        if (dto.Sections != null)
        {
            AddSectionsRecursive(template.Id, null, dto.Sections);
        }

        await _db.SaveChangesAsync();

        // Reload with sections
        var saved = await _db.DepartmentListTemplates
            .Include(t => t.Sections)
            .FirstAsync(t => t.Id == template.Id);

        return CreatedAtAction(nameof(GetById), new { id = template.Id }, MapTemplateToDto(saved));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TemplateResponseDto>> Update(Guid id, [FromBody] TemplateUpdateDto dto)
    {
        var userRole = MockAuth.GetUserRole(User);
        if (userRole != "administrator" && userRole != "leder_fin")
            return Forbid();

        var template = await _db.DepartmentListTemplates.FindAsync(id);
        if (template == null) return NotFound();

        if (dto.Name != null) template.Name = dto.Name;
        if (dto.BudgetRoundType != null) template.BudgetRoundType = dto.BudgetRoundType;
        if (dto.DepartmentNamePlaceholder != null) template.DepartmentNamePlaceholder = dto.DepartmentNamePlaceholder;
        if (dto.ClassificationText != null) template.ClassificationText = dto.ClassificationText;
        if (dto.IsActive.HasValue) template.IsActive = dto.IsActive.Value;
        template.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var saved = await _db.DepartmentListTemplates
            .Include(t => t.Sections)
            .FirstAsync(t => t.Id == id);

        return Ok(MapTemplateToDto(saved));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userRole = MockAuth.GetUserRole(User);
        if (userRole != "administrator")
            return Forbid();

        var template = await _db.DepartmentListTemplates.FindAsync(id);
        if (template == null) return NotFound();

        _db.DepartmentListTemplates.Remove(template);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // ===== Section Management =====

    [HttpPost("{templateId}/sections")]
    public async Task<ActionResult<TemplateSectionResponseDto>> AddSection(
        Guid templateId, [FromBody] TemplateSectionCreateDto dto)
    {
        var userRole = MockAuth.GetUserRole(User);
        if (userRole != "administrator" && userRole != "leder_fin")
            return Forbid();

        var template = await _db.DepartmentListTemplates.FindAsync(templateId);
        if (template == null) return NotFound();

        var section = new DepartmentListTemplateSection
        {
            Id = Guid.NewGuid(),
            TemplateId = templateId,
            TitleTemplate = dto.TitleTemplate,
            HeadingStyle = dto.HeadingStyle,
            SectionType = dto.SectionType,
            SortOrder = dto.SortOrder,
            Config = dto.Config,
        };

        _db.DepartmentListTemplateSections.Add(section);

        if (dto.Children != null)
        {
            AddSectionsRecursive(templateId, section.Id, dto.Children);
        }

        template.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = templateId },
            MapSectionToDto(section, new List<DepartmentListTemplateSection>()));
    }

    [HttpPut("{templateId}/sections/{sectionId}")]
    public async Task<ActionResult<TemplateSectionResponseDto>> UpdateSection(
        Guid templateId, Guid sectionId, [FromBody] TemplateSectionUpdateDto dto)
    {
        var userRole = MockAuth.GetUserRole(User);
        if (userRole != "administrator" && userRole != "leder_fin")
            return Forbid();

        var section = await _db.DepartmentListTemplateSections
            .FirstOrDefaultAsync(s => s.Id == sectionId && s.TemplateId == templateId);
        if (section == null) return NotFound();

        if (dto.TitleTemplate != null) section.TitleTemplate = dto.TitleTemplate;
        if (dto.HeadingStyle != null) section.HeadingStyle = dto.HeadingStyle;
        if (dto.SectionType != null) section.SectionType = dto.SectionType;
        if (dto.SortOrder.HasValue) section.SortOrder = dto.SortOrder.Value;
        if (dto.Config != null) section.Config = dto.Config;

        var template = await _db.DepartmentListTemplates.FindAsync(templateId);
        if (template != null) template.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(MapSectionToDto(section, new List<DepartmentListTemplateSection>()));
    }

    [HttpDelete("{templateId}/sections/{sectionId}")]
    public async Task<IActionResult> DeleteSection(Guid templateId, Guid sectionId)
    {
        var userRole = MockAuth.GetUserRole(User);
        if (userRole != "administrator" && userRole != "leder_fin")
            return Forbid();

        var section = await _db.DepartmentListTemplateSections
            .FirstOrDefaultAsync(s => s.Id == sectionId && s.TemplateId == templateId);
        if (section == null) return NotFound();

        _db.DepartmentListTemplateSections.Remove(section);

        var template = await _db.DepartmentListTemplates.FindAsync(templateId);
        if (template != null) template.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Replace all sections in a template at once (for bulk editing from the admin UI).
    /// Sections with a known Id are updated in-place (preserving DepartmentListSection FK links).
    /// Sections without Id are created new. Sections removed from the list are deleted.
    /// After upserting, cascades Title updates to all DepartmentListSection rows.
    /// </summary>
    [HttpPut("{templateId}/sections")]
    public async Task<ActionResult<TemplateResponseDto>> ReplaceSections(
        Guid templateId, [FromBody] List<TemplateSectionCreateDto> sections)
    {
        var userRole = MockAuth.GetUserRole(User);
        if (userRole != "administrator" && userRole != "leder_fin")
            return Forbid();

        var template = await _db.DepartmentListTemplates
            .Include(t => t.Sections)
            .FirstOrDefaultAsync(t => t.Id == templateId);
        if (template == null) return NotFound();

        // Collect all submitted IDs (recursively) to detect which existing sections are removed
        var submittedIds = CollectSubmittedIds(sections);

        // Delete existing sections NOT in the submitted set (cascade-deletes their DepartmentListSection rows)
        var toDelete = template.Sections
            .Where(s => !submittedIds.Contains(s.Id))
            .ToList();
        _db.DepartmentListTemplateSections.RemoveRange(toDelete);

        // Upsert submitted sections
        var existingById = template.Sections.ToDictionary(s => s.Id);
        UpsertSectionsRecursive(templateId, null, sections, existingById);

        template.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Reload updated template sections
        var updatedSections = await _db.DepartmentListTemplateSections
            .Where(s => s.TemplateId == templateId)
            .ToListAsync();

        // Cascade: update Title on DepartmentListSection rows for each updated template section
        await CascadeTitleUpdatesAsync(updatedSections);

        // Reload
        var saved = await _db.DepartmentListTemplates
            .Include(t => t.Sections)
            .FirstAsync(t => t.Id == templateId);

        return Ok(MapTemplateToDto(saved));
    }

    private static HashSet<Guid> CollectSubmittedIds(List<TemplateSectionCreateDto> sections)
    {
        var ids = new HashSet<Guid>();
        foreach (var s in sections)
        {
            if (s.Id.HasValue) ids.Add(s.Id.Value);
            if (s.Children != null) ids.UnionWith(CollectSubmittedIds(s.Children));
        }
        return ids;
    }

    private void UpsertSectionsRecursive(
        Guid templateId,
        Guid? parentId,
        List<TemplateSectionCreateDto> sections,
        Dictionary<Guid, DepartmentListTemplateSection> existingById)
    {
        foreach (var dto in sections)
        {
            if (dto.Id.HasValue && existingById.TryGetValue(dto.Id.Value, out var existing))
            {
                // Update in place — preserves the ID so DepartmentListSection FK links survive
                existing.TitleTemplate = dto.TitleTemplate;
                existing.HeadingStyle = dto.HeadingStyle;
                existing.SectionType = dto.SectionType;
                existing.SortOrder = dto.SortOrder;
                existing.Config = dto.Config;
                existing.ParentId = parentId;
            }
            else
            {
                // New section
                var newSection = new DepartmentListTemplateSection
                {
                    Id = Guid.NewGuid(),
                    TemplateId = templateId,
                    ParentId = parentId,
                    TitleTemplate = dto.TitleTemplate,
                    HeadingStyle = dto.HeadingStyle,
                    SectionType = dto.SectionType,
                    SortOrder = dto.SortOrder,
                    Config = dto.Config,
                };
                _db.DepartmentListTemplateSections.Add(newSection);
                existing = newSection;
            }

            if (dto.Children != null && dto.Children.Count > 0)
            {
                UpsertSectionsRecursive(templateId, existing.Id, dto.Children, existingById);
            }
        }
    }

    private async Task CascadeTitleUpdatesAsync(List<DepartmentListTemplateSection> templateSections)
    {
        var templateSectionIds = templateSections.Select(s => s.Id).ToList();

        // Load all DepartmentListSection rows referencing these template sections, with their DepartmentList and Department
        var depListSections = await _db.DepartmentListSections
            .Include(s => s.DepartmentList)
                .ThenInclude(dl => dl.Department)
            .Where(s => templateSectionIds.Contains(s.TemplateSectionId))
            .ToListAsync();

        // Build lookup: templateSectionId -> TitleTemplate
        var titleTemplateById = templateSections.ToDictionary(s => s.Id, s => s.TitleTemplate);

        foreach (var dls in depListSections)
        {
            if (!titleTemplateById.TryGetValue(dls.TemplateSectionId, out var titleTemplate)) continue;
            var dept = dls.DepartmentList?.Department;
            var resolvedTitle = titleTemplate
                .Replace("{department_name}", dept?.Name ?? "")
                .Replace("{department_abbrev}", dept?.Code ?? "");
            dls.Title = resolvedTitle;
        }

        if (depListSections.Count > 0)
            await _db.SaveChangesAsync();
    }

    // ===== Helpers =====

    private void AddSectionsRecursive(
        Guid templateId, Guid? parentId, List<TemplateSectionCreateDto> sections)
    {
        foreach (var sectionDto in sections)
        {
            var section = new DepartmentListTemplateSection
            {
                Id = Guid.NewGuid(),
                TemplateId = templateId,
                ParentId = parentId,
                TitleTemplate = sectionDto.TitleTemplate,
                HeadingStyle = sectionDto.HeadingStyle,
                SectionType = sectionDto.SectionType,
                SortOrder = sectionDto.SortOrder,
                Config = sectionDto.Config,
            };
            _db.DepartmentListTemplateSections.Add(section);

            if (sectionDto.Children != null && sectionDto.Children.Count > 0)
            {
                AddSectionsRecursive(templateId, section.Id, sectionDto.Children);
            }
        }
    }

    private static TemplateResponseDto MapTemplateToDto(DepartmentListTemplate template)
    {
        var allSections = template.Sections?.ToList() ?? new List<DepartmentListTemplateSection>();
        var rootSections = allSections.Where(s => s.ParentId == null).OrderBy(s => s.SortOrder).ToList();

        return new TemplateResponseDto(
            template.Id,
            template.Name,
            template.BudgetRoundType,
            template.DepartmentNamePlaceholder,
            template.IsActive,
            template.ClassificationText,
            template.CreatedBy,
            template.CreatedAt,
            template.UpdatedAt,
            rootSections.Select(s => MapSectionToDto(s, allSections)).ToList()
        );
    }

    private static TemplateSectionResponseDto MapSectionToDto(
        DepartmentListTemplateSection section,
        List<DepartmentListTemplateSection> allSections)
    {
        var children = allSections
            .Where(s => s.ParentId == section.Id)
            .OrderBy(s => s.SortOrder)
            .Select(s => MapSectionToDto(s, allSections))
            .ToList();

        return new TemplateSectionResponseDto(
            section.Id,
            section.TemplateId,
            section.ParentId,
            section.TitleTemplate,
            section.HeadingStyle,
            section.SectionType,
            section.SortOrder,
            section.Config,
            children
        );
    }
}
