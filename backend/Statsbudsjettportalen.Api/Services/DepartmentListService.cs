using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Data;
using Statsbudsjettportalen.Api.Models;

namespace Statsbudsjettportalen.Api.Services;

/// <summary>
/// Service for placing cases into department lists based on template configuration.
/// Handles automatic case-to-section mapping using case type, fin_list_placement, and priority.
/// </summary>
public class DepartmentListService
{
    private readonly AppDbContext _db;

    public DepartmentListService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Place a single case into the correct section of a department list.
    /// Case must be in ferdigbehandlet_fin status.
    /// </summary>
    public async Task<DepartmentListCaseEntry?> PlaceCaseAsync(Guid departmentListId, Guid caseId)
    {
        var c = await _db.Cases.FindAsync(caseId);
        if (c == null || (c.Status != "under_vurdering_fin" && c.Status != "ferdigbehandlet_fin")) return null;

        var dl = await _db.DepartmentLists
            .Include(d => d.Sections)
                .ThenInclude(s => s.TemplateSection)
            .Include(d => d.CaseEntries)
            .FirstOrDefaultAsync(d => d.Id == departmentListId);

        if (dl == null) return null;

        // Check if case already exists in this list
        if (dl.CaseEntries.Any(e => e.CaseId == caseId))
            return null;

        // Find matching section based on case type
        var matchingSection = FindMatchingSection(dl.Sections.ToList(), c.CaseType);
        if (matchingSection == null) return null;

        // Determine subgroup from case's fin_list_placement
        var subgroup = c.FinListPlacement;

        // Calculate sort order (append at end of existing entries in this section)
        var maxSort = dl.CaseEntries
            .Where(e => e.SectionId == matchingSection.Id)
            .Select(e => (int?)e.SortOrder)
            .Max() ?? 0;

        var entry = new DepartmentListCaseEntry
        {
            Id = Guid.NewGuid(),
            DepartmentListId = departmentListId,
            SectionId = matchingSection.Id,
            CaseId = caseId,
            Subgroup = subgroup,
            SortOrder = maxSort + 1,
            IncludedAt = DateTime.UtcNow,
        };

        _db.DepartmentListCaseEntries.Add(entry);
        dl.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return entry;
    }

    /// <summary>
    /// Place all ferdigbehandlet_fin cases from a department into a department list.
    /// Only fully processed cases (ferdigbehandlet_fin) are eligible for placement.
    /// </summary>
    public async Task<int> PlaceAllCasesAsync(Guid departmentListId)
    {
        var dl = await _db.DepartmentLists
            .Include(d => d.Sections)
                .ThenInclude(s => s.TemplateSection)
            .Include(d => d.CaseEntries)
            .FirstOrDefaultAsync(d => d.Id == departmentListId);

        if (dl == null) return 0;

        var cases = await _db.Cases
            .Where(c => c.DepartmentId == dl.DepartmentId
                     && c.BudgetRoundId == dl.BudgetRoundId
                     && (c.Status == "under_vurdering_fin" || c.Status == "ferdigbehandlet_fin"))
            .ToListAsync();

        var existingCaseIds = dl.CaseEntries.Select(e => e.CaseId).ToHashSet();
        var placed = 0;

        foreach (var c in cases)
        {
            if (existingCaseIds.Contains(c.Id)) continue;

            var matchingSection = FindMatchingSection(dl.Sections.ToList(), c.CaseType);
            if (matchingSection == null) continue;

            var maxSort = dl.CaseEntries
                .Where(e => e.SectionId == matchingSection.Id)
                .Select(e => (int?)e.SortOrder)
                .Max() ?? 0;

            var entry = new DepartmentListCaseEntry
            {
                Id = Guid.NewGuid(),
                DepartmentListId = departmentListId,
                SectionId = matchingSection.Id,
                CaseId = c.Id,
                Subgroup = c.FinListPlacement,
                SortOrder = maxSort + placed + 1,
                IncludedAt = DateTime.UtcNow,
            };

            _db.DepartmentListCaseEntries.Add(entry);
            placed++;
        }

        if (placed > 0)
        {
            dl.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return placed;
    }

    /// <summary>
    /// Update case entry subgroup when a case's fin_list_placement changes.
    /// </summary>
    public async Task UpdateCaseSubgroupsAsync(Guid caseId)
    {
        var c = await _db.Cases.FindAsync(caseId);
        if (c == null) return;

        var entries = await _db.DepartmentListCaseEntries
            .Where(e => e.CaseId == caseId)
            .ToListAsync();

        foreach (var entry in entries)
        {
            entry.Subgroup = c.FinListPlacement;
        }

        if (entries.Count > 0)
            await _db.SaveChangesAsync();
    }

    private static DepartmentListSection? FindMatchingSection(
        List<DepartmentListSection> sections, string caseType)
    {
        foreach (var section in sections)
        {
            if (section.TemplateSection == null) continue;

            var sectionType = section.TemplateSection.SectionType;
            if (sectionType != "case_group" && sectionType != "decisions_section" && sectionType != "summary_section")
                continue;

            var config = section.TemplateSection.Config;
            if (string.IsNullOrEmpty(config)) continue;

            try
            {
                using var doc = JsonDocument.Parse(config);
                if (doc.RootElement.TryGetProperty("case_type_filter", out var filterProp))
                {
                    var filter = filterProp.GetString();
                    if (filter == caseType)
                        return section;
                }
            }
            catch (JsonException)
            {
                continue;
            }
        }

        return null;
    }
}
