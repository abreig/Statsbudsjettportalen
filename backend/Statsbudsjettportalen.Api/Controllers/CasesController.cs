using System.Text.Json;
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
[Route("api/cases")]
[Authorize]
public class CasesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly WorkflowService _workflow;

    public CasesController(AppDbContext db, WorkflowService workflow)
    {
        _db = db;
        _workflow = workflow;
    }

    [HttpGet]
    public async Task<ActionResult<List<CaseResponseDto>>> GetAll(
        [FromQuery] Guid? budget_round_id,
        [FromQuery] Guid? department_id,
        [FromQuery] string? status,
        [FromQuery] string? case_type,
        [FromQuery] string? search,
        [FromQuery] string? division,
        [FromQuery] bool? my_departments)
    {
        var userRole = MockAuth.GetUserRole(User);
        var userDeptId = MockAuth.GetDepartmentId(User);
        var userId = MockAuth.GetUserId(User);

        var query = _db.Cases
            .Include(c => c.Department)
            .Include(c => c.ContentVersions)
            .Include(c => c.Opinions)
            .AsQueryable();

        // Role-based filtering: FAG sees only own department
        if (_workflow.IsFagRole(userRole))
        {
            query = query.Where(c => c.DepartmentId == userDeptId);
        }
        // FIN: only see cases at sendt_til_fin or later
        else if (_workflow.IsFinRole(userRole))
        {
            query = query.Where(c => WorkflowService.FinVisibleStatuses.Contains(c.Status));

            // Default filter by assigned departments (can be turned off)
            if ((my_departments ?? true) && !department_id.HasValue)
            {
                var assignedDeptIds = await _db.UserDepartmentAssignments
                    .Where(a => a.UserId == userId)
                    .Select(a => a.DepartmentId)
                    .ToListAsync();

                if (assignedDeptIds.Count > 0)
                    query = query.Where(c => assignedDeptIds.Contains(c.DepartmentId));
            }
        }

        if (budget_round_id.HasValue)
            query = query.Where(c => c.BudgetRoundId == budget_round_id.Value);

        if (department_id.HasValue)
            query = query.Where(c => c.DepartmentId == department_id.Value);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(c => c.Status == status);

        if (!string.IsNullOrEmpty(case_type))
            query = query.Where(c => c.CaseType == case_type);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(c => c.CaseName.ToLower().Contains(search.ToLower()));

        if (!string.IsNullOrEmpty(division))
            query = query.Where(c => c.ResponsibleDivision == division);

        var cases = await query
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync();

        var userIds = cases.SelectMany(c => new[] { c.CreatedBy, c.AssignedTo, c.FinAssignedTo })
            .Where(id => id.HasValue || id != null)
            .Select(id => id ?? Guid.Empty)
            .Concat(cases.Select(c => c.CreatedBy))
            .Distinct()
            .ToList();

        var users = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        var result = cases.Select(c =>
        {
            var currentContent = c.ContentVersions.MaxBy(cv => cv.Version);
            return MapToDto(c, currentContent, users, userRole: userRole);
        }).ToList();

        return Ok(result);
    }

    // History endpoint: cases across all closed rounds (punkt 9)
    [HttpGet("history")]
    public async Task<ActionResult<List<CaseResponseDto>>> GetHistory(
        [FromQuery] string? chapter,
        [FromQuery] string? post,
        [FromQuery] Guid? department_id,
        [FromQuery] int? year)
    {
        var query = _db.Cases
            .Include(c => c.Department)
            .Include(c => c.ContentVersions)
            .Include(c => c.BudgetRound)
            .Where(c => c.BudgetRound.Status == "closed")
            .AsQueryable();

        if (department_id.HasValue)
            query = query.Where(c => c.DepartmentId == department_id.Value);
        if (!string.IsNullOrEmpty(chapter))
            query = query.Where(c => c.Chapter == chapter);
        if (!string.IsNullOrEmpty(post))
            query = query.Where(c => c.Post == post);
        if (year.HasValue)
            query = query.Where(c => c.BudgetRound.Year == year.Value);

        var cases = await query.OrderByDescending(c => c.UpdatedAt).ToListAsync();
        var userIds = cases.Select(c => c.CreatedBy).Distinct().ToList();
        var users = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(cases.Select(c =>
        {
            var currentContent = c.ContentVersions.MaxBy(cv => cv.Version);
            return MapToDto(c, currentContent, users, userRole: "administrator"); // history shows all fields
        }).ToList());
    }

    [HttpGet("my-cases")]
    public async Task<ActionResult<List<CaseResponseDto>>> GetMyCases([FromQuery] Guid? budget_round_id)
    {
        var userId = MockAuth.GetUserId(User);
        var userRole = MockAuth.GetUserRole(User);

        var query = _db.Cases
            .Include(c => c.Department)
            .Include(c => c.ContentVersions)
            .Include(c => c.Opinions)
            .AsQueryable();

        if (_workflow.IsFinRole(userRole))
        {
            // FIN saksbehandler: cases where FinAssignedTo == me
            // FIN leaders: also cases in my assigned departments with FIN-visible status
            if (_workflow.IsFinLeader(userRole))
            {
                var assignedDeptIds = await _db.UserDepartmentAssignments
                    .Where(a => a.UserId == userId)
                    .Select(a => a.DepartmentId)
                    .ToListAsync();

                query = query.Where(c =>
                    c.FinAssignedTo == userId
                    || (assignedDeptIds.Contains(c.DepartmentId)
                        && WorkflowService.FinVisibleStatuses.Contains(c.Status)));
            }
            else
            {
                query = query.Where(c => c.FinAssignedTo == userId);
            }
        }
        else
        {
            // FAG users: cases assigned to me
            query = query.Where(c => c.AssignedTo == userId);
        }

        if (budget_round_id.HasValue)
            query = query.Where(c => c.BudgetRoundId == budget_round_id.Value);

        var cases = await query.OrderByDescending(c => c.UpdatedAt).ToListAsync();

        var userIds = cases.SelectMany(c => new[] { c.CreatedBy, c.AssignedTo, c.FinAssignedTo })
            .Where(id => id.HasValue || id != null)
            .Select(id => id ?? Guid.Empty)
            .Concat(cases.Select(c => c.CreatedBy))
            .Distinct().ToList();

        var users = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(cases.Select(c =>
        {
            var currentContent = c.ContentVersions.MaxBy(cv => cv.Version);
            return MapToDto(c, currentContent, users, userRole: userRole);
        }).ToList());
    }

    [HttpGet("my-tasks")]
    public async Task<ActionResult<List<CaseOpinionDto>>> GetMyTasks()
    {
        var userId = MockAuth.GetUserId(User);

        var pendingOpinions = await _db.CaseOpinions
            .Include(o => o.Case)
            .Where(o => o.AssignedTo == userId && o.Status == "pending")
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var userIds = pendingOpinions.SelectMany(o => new[] { o.RequestedBy, o.AssignedTo }).Distinct().ToList();
        var users = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(pendingOpinions.Select(o => new CaseOpinionDto(
            o.Id, o.CaseId, o.Type, o.RequestedBy,
            users.GetValueOrDefault(o.RequestedBy, ""),
            o.AssignedTo, users.GetValueOrDefault(o.AssignedTo, ""),
            o.Status, o.OpinionText, o.RequestComment, o.ForwardedFromId, o.OriginalOpinionId,
            o.CreatedAt, o.ResolvedAt
        )).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CaseResponseDto>> GetById(Guid id)
    {
        var userRole = MockAuth.GetUserRole(User);
        var c = await _db.Cases
            .Include(c => c.Department)
            .Include(c => c.ContentVersions)
            .Include(c => c.Opinions)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (c == null) return NotFound();

        var currentContent = c.ContentVersions.MaxBy(cv => cv.Version);
        var userIds = new List<Guid> { c.CreatedBy };
        if (c.AssignedTo.HasValue) userIds.Add(c.AssignedTo.Value);
        if (c.FinAssignedTo.HasValue) userIds.Add(c.FinAssignedTo.Value);
        if (currentContent != null) userIds.Add(currentContent.CreatedBy);
        userIds.AddRange(c.Opinions.Select(o => o.RequestedBy));
        userIds.AddRange(c.Opinions.Select(o => o.AssignedTo));

        var users = await _db.Users
            .Where(u => userIds.Distinct().Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(MapToDto(c, currentContent, users, userRole: userRole));
    }

    [HttpPost]
    public async Task<ActionResult<CaseResponseDto>> Create([FromBody] CaseCreateDto dto)
    {
        var userId = MockAuth.GetUserId(User);
        var deptId = MockAuth.GetDepartmentId(User);
        var creator = await _db.Users.FindAsync(userId);

        var newCase = new Case
        {
            Id = Guid.NewGuid(),
            BudgetRoundId = dto.BudgetRoundId,
            DepartmentId = deptId,
            CaseName = dto.CaseName,
            Chapter = dto.Chapter,
            Post = dto.Post,
            Amount = dto.Amount,
            CaseType = dto.CaseType,
            Status = "draft",
            CreatedBy = userId,
            AssignedTo = userId,
            ResponsibleDivision = creator?.Division,
            Version = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Cases.Add(newCase);

        // Create initial content version
        var content = new CaseContent
        {
            Id = Guid.NewGuid(),
            CaseId = newCase.Id,
            Version = 1,
            CaseName = dto.CaseName,
            Chapter = dto.Chapter,
            Post = dto.Post,
            Amount = dto.Amount,
            Status = "draft",
            ProposalText = dto.ProposalText,
            Justification = dto.Justification,
            VerbalConclusion = dto.VerbalConclusion,
            SocioeconomicAnalysis = dto.SocioeconomicAnalysis,
            GoalIndicator = dto.GoalIndicator,
            BenefitPlan = dto.BenefitPlan,
            Comment = dto.Comment,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
        };
        _db.CaseContents.Add(content);

        // Log creation event
        _db.CaseEvents.Add(new CaseEvent
        {
            Id = Guid.NewGuid(),
            CaseId = newCase.Id,
            EventType = "created",
            UserId = userId,
            EventData = JsonSerializer.Serialize(new { case_name = dto.CaseName, case_type = dto.CaseType }),
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();

        var dept = await _db.Departments.FindAsync(deptId);
        var user = await _db.Users.FindAsync(userId);
        var users = new Dictionary<Guid, string> { [userId] = user!.FullName };

        return CreatedAtAction(nameof(GetById), new { id = newCase.Id },
            MapToDto(newCase, content, users, dept?.Code));
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> ChangeStatus(Guid id, [FromBody] StatusChangeDto dto)
    {
        var userId = MockAuth.GetUserId(User);
        var userRole = MockAuth.GetUserRole(User);
        var c = await _db.Cases.Include(c => c.Opinions).FirstOrDefaultAsync(c => c.Id == id);
        if (c == null) return NotFound();

        // Block status change if there are pending sub-processes
        if (WorkflowService.IsCaseLockedBySubProcess(c.Opinions))
            return BadRequest(new { message = "Saken er låst – det finnes ventende uttalelser eller godkjenninger som må behandles først." });

        if (!_workflow.CanUserTransition(c.Status, dto.Status, userRole))
            return BadRequest(new { message = $"Ugyldig statusovergang fra '{c.Status}' til '{dto.Status}' for rollen '{userRole}'" });

        if (dto.Status == "returnert_til_fag" && string.IsNullOrEmpty(dto.Reason))
            return BadRequest(new { message = "Begrunnelse er påkrevd ved avvisning av sak" });

        var oldStatus = c.Status;
        c.Status = dto.Status;
        c.UpdatedAt = DateTime.UtcNow;

        // Auto-assign FIN saksbehandler when entering sendt_til_fin
        if (dto.Status == "sendt_til_fin" && !c.FinAssignedTo.HasValue)
        {
            var finHandler = await _db.Users
                .Where(u => u.Role == "saksbehandler_fin")
                .Where(u => u.DepartmentAssignments.Any(a => a.DepartmentId == c.DepartmentId))
                .FirstOrDefaultAsync();
            if (finHandler != null)
                c.FinAssignedTo = finHandler.Id;
        }

        // Clear FinAssignedTo when moving back to pre-FIN status
        if (WorkflowService.PreFinStatuses.Contains(dto.Status))
        {
            c.FinAssignedTo = null;
        }

        _db.CaseEvents.Add(new CaseEvent
        {
            Id = Guid.NewGuid(),
            CaseId = id,
            EventType = "status_changed",
            UserId = userId,
            EventData = JsonSerializer.Serialize(new { from = oldStatus, to = dto.Status, reason = dto.Reason, comment = dto.Comment }),
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();

        // Auto-close round when all cases are "regjeringsbehandlet" (punkt 8)
        if (dto.Status == "regjeringsbehandlet")
        {
            var round = await _db.BudgetRounds
                .Include(r => r.Cases)
                .FirstOrDefaultAsync(r => r.Id == c.BudgetRoundId);
            if (round != null && round.Cases.All(rc => rc.Status == "regjeringsbehandlet"))
            {
                round.Status = "closed";
                round.ClosedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
        }

        return Ok(new { message = $"Status endret til '{dto.Status}'", status = dto.Status });
    }

    [HttpPatch("{id}/assign")]
    public async Task<IActionResult> ChangeResponsible(Guid id, [FromBody] ChangeResponsibleDto dto)
    {
        var userId = MockAuth.GetUserId(User);
        var userRole = MockAuth.GetUserRole(User);
        var c = await _db.Cases.FindAsync(id);
        if (c == null) return NotFound();

        if (!_workflow.CanChangeResponsible(userRole, userId, c.AssignedTo))
            return Forbid();

        var newAssignee = await _db.Users.FindAsync(dto.NewAssignedTo);
        if (newAssignee == null) return BadRequest(new { message = "Bruker ikke funnet" });

        var oldAssignedTo = c.AssignedTo;
        c.AssignedTo = dto.NewAssignedTo;
        c.UpdatedAt = DateTime.UtcNow;

        _db.CaseEvents.Add(new CaseEvent
        {
            Id = Guid.NewGuid(),
            CaseId = id,
            EventType = "responsible_changed",
            UserId = userId,
            EventData = JsonSerializer.Serialize(new { from = oldAssignedTo, to = dto.NewAssignedTo, new_name = newAssignee.FullName }),
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Ansvarlig saksbehandler endret", assignedTo = dto.NewAssignedTo, assignedToName = newAssignee.FullName });
    }

    [HttpPatch("{id}/fin-assign")]
    public async Task<IActionResult> ChangeFinResponsible(Guid id, [FromBody] ChangeResponsibleDto dto)
    {
        var userId = MockAuth.GetUserId(User);
        var userRole = MockAuth.GetUserRole(User);
        var c = await _db.Cases.FindAsync(id);
        if (c == null) return NotFound();

        // Only FIN leaders, current FIN handler, or admin can change FIN-saksbehandler
        var canChange = userRole == "administrator"
            || _workflow.IsFinLeader(userRole)
            || (c.FinAssignedTo.HasValue && c.FinAssignedTo.Value == userId);
        if (!canChange) return Forbid();

        var newAssignee = await _db.Users.FindAsync(dto.NewAssignedTo);
        if (newAssignee == null) return BadRequest(new { message = "Bruker ikke funnet" });

        var oldFinAssigned = c.FinAssignedTo;
        c.FinAssignedTo = dto.NewAssignedTo;
        c.UpdatedAt = DateTime.UtcNow;

        _db.CaseEvents.Add(new CaseEvent
        {
            Id = Guid.NewGuid(),
            CaseId = id,
            EventType = "fin_responsible_changed",
            UserId = userId,
            EventData = JsonSerializer.Serialize(new { from = oldFinAssigned, to = dto.NewAssignedTo, new_name = newAssignee.FullName }),
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "FIN-saksbehandler endret", finAssignedTo = dto.NewAssignedTo, finAssignedToName = newAssignee.FullName });
    }

    [HttpPost("{id}/content")]
    public async Task<ActionResult<CaseContentDto>> SaveContent(Guid id, [FromBody] CaseContentUpdateDto dto)
    {
        var userId = MockAuth.GetUserId(User);
        var c = await _db.Cases.FindAsync(id);
        if (c == null) return NotFound();

        var currentMaxVersion = await _db.CaseContents
            .Where(cc => cc.CaseId == id)
            .MaxAsync(cc => (int?)cc.Version) ?? 0;

        var newVersion = currentMaxVersion + 1;

        var content = new CaseContent
        {
            Id = Guid.NewGuid(),
            CaseId = id,
            Version = newVersion,
            // Snapshot case-level fields
            CaseName = dto.CaseName ?? c.CaseName,
            Chapter = dto.Chapter ?? c.Chapter,
            Post = dto.Post ?? c.Post,
            Amount = dto.Amount ?? c.Amount,
            Status = c.Status,
            // Content fields
            ProposalText = dto.ProposalText,
            Justification = dto.Justification,
            VerbalConclusion = dto.VerbalConclusion,
            SocioeconomicAnalysis = dto.SocioeconomicAnalysis,
            GoalIndicator = dto.GoalIndicator,
            BenefitPlan = dto.BenefitPlan,
            Comment = dto.Comment,
            FinAssessment = dto.FinAssessment,
            FinVerbal = dto.FinVerbal,
            FinRConclusion = dto.FinRConclusion,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
        };
        _db.CaseContents.Add(content);

        // Keep Case-level fields in sync
        if (dto.CaseName != null) c.CaseName = dto.CaseName;
        if (dto.Chapter != null) c.Chapter = dto.Chapter;
        if (dto.Post != null) c.Post = dto.Post;
        if (dto.Amount.HasValue) c.Amount = dto.Amount;
        c.Version = newVersion;
        c.UpdatedAt = DateTime.UtcNow;

        _db.CaseEvents.Add(new CaseEvent
        {
            Id = Guid.NewGuid(),
            CaseId = id,
            EventType = "updated",
            UserId = userId,
            EventData = JsonSerializer.Serialize(new { version = newVersion }),
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);
        return Ok(new CaseContentDto(
            content.Id, content.Version,
            content.CaseName, content.Chapter, content.Post, content.Amount, content.Status,
            content.ProposalText, content.Justification, content.VerbalConclusion,
            content.SocioeconomicAnalysis, content.GoalIndicator, content.BenefitPlan,
            content.Comment, content.FinAssessment, content.FinVerbal, content.FinRConclusion,
            content.CreatedBy, user?.FullName ?? "", content.CreatedAt,
            content.ContentJson, content.TrackChangesActive
        ));
    }

    /// <summary>
    /// Save the full ProseMirror document (Fase 2).
    /// Receives the document JSON, stores it in content_json, and extracts flat fields for backwards compatibility.
    /// </summary>
    [HttpPut("{id}/document")]
    public async Task<ActionResult<CaseContentDto>> SaveDocument(Guid id, [FromBody] DocumentSaveDto dto)
    {
        var userId = MockAuth.GetUserId(User);
        var c = await _db.Cases.FindAsync(id);
        if (c == null) return NotFound();

        var currentMaxVersion = await _db.CaseContents
            .Where(cc => cc.CaseId == id)
            .MaxAsync(cc => (int?)cc.Version) ?? 0;

        var newVersion = currentMaxVersion + 1;

        // Parse the document JSON to extract individual field values for backwards compatibility
        string? proposalText = null, justification = null, verbalConclusion = null;
        string? socioeconomicAnalysis = null, goalIndicator = null, benefitPlan = null;
        string? comment = null, finAssessment = null, finVerbal = null, finRConclusion = null;

        try
        {
            using var doc = JsonDocument.Parse(dto.ContentJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("content", out var sections))
            {
                foreach (var section in sections.EnumerateArray())
                {
                    if (!section.TryGetProperty("attrs", out var attrs)) continue;
                    if (!attrs.TryGetProperty("fieldKey", out var fieldKeyProp)) continue;
                    var fieldKey = fieldKeyProp.GetString();
                    if (string.IsNullOrEmpty(fieldKey)) continue;

                    var text = ExtractTextFromSection(section);

                    switch (fieldKey)
                    {
                        case "proposalText": proposalText = text; break;
                        case "justification": justification = text; break;
                        case "verbalConclusion": verbalConclusion = text; break;
                        case "socioeconomicAnalysis": socioeconomicAnalysis = text; break;
                        case "goalIndicator": goalIndicator = text; break;
                        case "benefitPlan": benefitPlan = text; break;
                        case "comment": comment = text; break;
                        case "finAssessment": finAssessment = text; break;
                        case "finVerbal": finVerbal = text; break;
                        case "finRConclusion": finRConclusion = text; break;
                    }
                }
            }
        }
        catch (JsonException)
        {
            return BadRequest(new { message = "Ugyldig JSON-dokument" });
        }

        var content = new CaseContent
        {
            Id = Guid.NewGuid(),
            CaseId = id,
            Version = newVersion,
            CaseName = dto.CaseName ?? c.CaseName,
            Chapter = dto.Chapter ?? c.Chapter,
            Post = dto.Post ?? c.Post,
            Amount = dto.Amount ?? c.Amount,
            Status = c.Status,
            ContentJson = dto.ContentJson,
            TrackChangesActive = dto.TrackChangesActive,
            ProposalText = proposalText,
            Justification = justification,
            VerbalConclusion = verbalConclusion,
            SocioeconomicAnalysis = socioeconomicAnalysis,
            GoalIndicator = goalIndicator,
            BenefitPlan = benefitPlan,
            Comment = comment,
            FinAssessment = finAssessment,
            FinVerbal = finVerbal,
            FinRConclusion = finRConclusion,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
        };
        _db.CaseContents.Add(content);

        if (dto.CaseName != null) c.CaseName = dto.CaseName;
        if (dto.Chapter != null) c.Chapter = dto.Chapter;
        if (dto.Post != null) c.Post = dto.Post;
        if (dto.Amount.HasValue) c.Amount = dto.Amount;
        c.Version = newVersion;
        c.UpdatedAt = DateTime.UtcNow;

        _db.CaseEvents.Add(new CaseEvent
        {
            Id = Guid.NewGuid(),
            CaseId = id,
            EventType = "document_saved",
            UserId = userId,
            EventData = JsonSerializer.Serialize(new { version = newVersion }),
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();

        var docUser = await _db.Users.FindAsync(userId);
        return Ok(new CaseContentDto(
            content.Id, content.Version,
            content.CaseName, content.Chapter, content.Post, content.Amount, content.Status,
            content.ProposalText, content.Justification, content.VerbalConclusion,
            content.SocioeconomicAnalysis, content.GoalIndicator, content.BenefitPlan,
            content.Comment, content.FinAssessment, content.FinVerbal, content.FinRConclusion,
            content.CreatedBy, docUser?.FullName ?? "", content.CreatedAt,
            content.ContentJson, content.TrackChangesActive
        ));
    }

    [HttpGet("{id}/content")]
    public async Task<ActionResult<List<CaseContentDto>>> GetContentVersions(Guid id)
    {
        var contents = await _db.CaseContents
            .Where(cc => cc.CaseId == id)
            .OrderByDescending(cc => cc.Version)
            .ToListAsync();

        var userIds = contents.Select(c => c.CreatedBy).Distinct().ToList();
        var users = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(contents.Select(c => new CaseContentDto(
            c.Id, c.Version, c.CaseName, c.Chapter, c.Post, c.Amount, c.Status,
            c.ProposalText, c.Justification, c.VerbalConclusion,
            c.SocioeconomicAnalysis, c.GoalIndicator, c.BenefitPlan, c.Comment,
            c.FinAssessment, c.FinVerbal, c.FinRConclusion,
            c.CreatedBy, users.GetValueOrDefault(c.CreatedBy, ""), c.CreatedAt,
            c.ContentJson, c.TrackChangesActive
        )).ToList());
    }

    [HttpGet("{id}/content/{version}")]
    public async Task<ActionResult<CaseContentDto>> GetContentVersion(Guid id, int version)
    {
        var content = await _db.CaseContents
            .FirstOrDefaultAsync(cc => cc.CaseId == id && cc.Version == version);

        if (content == null) return NotFound();

        var user = await _db.Users.FindAsync(content.CreatedBy);
        return Ok(new CaseContentDto(
            content.Id, content.Version, content.CaseName, content.Chapter, content.Post, content.Amount, content.Status,
            content.ProposalText, content.Justification, content.VerbalConclusion,
            content.SocioeconomicAnalysis, content.GoalIndicator, content.BenefitPlan, content.Comment,
            content.FinAssessment, content.FinVerbal, content.FinRConclusion,
            content.CreatedBy, user?.FullName ?? "", content.CreatedAt,
            content.ContentJson, content.TrackChangesActive
        ));
    }

    [HttpGet("{id}/events")]
    public async Task<ActionResult<List<CaseEventDto>>> GetEvents(Guid id)
    {
        var events = await _db.CaseEvents
            .Where(e => e.CaseId == id)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        var userIds = events.Select(e => e.UserId).Distinct().ToList();
        var users = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(events.Select(e => new CaseEventDto(
            e.Id, e.EventType, e.EventData,
            e.UserId, users.GetValueOrDefault(e.UserId, ""), e.CreatedAt
        )).ToList());
    }

    // ─── Opinion (uttalelse) endpoints ─────────────────

    [HttpPost("{id}/opinions")]
    public async Task<ActionResult<CaseOpinionDto>> CreateOpinion(Guid id, [FromBody] CreateOpinionDto dto)
    {
        var userId = MockAuth.GetUserId(User);
        var userRole = MockAuth.GetUserRole(User);
        var c = await _db.Cases.FindAsync(id);
        if (c == null) return NotFound();

        // Responsible handler OR leaders can send for opinion/approval
        var isResponsible = c.AssignedTo == userId || c.FinAssignedTo == userId;
        var isLeader = _workflow.IsLeader(userRole) || userRole == "administrator";
        if (!isResponsible && !isLeader)
            return BadRequest(new { message = "Bare ansvarlig saksbehandler eller ledere kan sende til uttalelse/godkjenning." });

        // Validate type
        if (dto.Type != "uttalelse" && dto.Type != "godkjenning")
            return BadRequest(new { message = "Ugyldig type. Må være 'uttalelse' eller 'godkjenning'." });

        // Resolve assignee: accept GUID or email
        Guid assigneeId;
        if (!Guid.TryParse(dto.AssignedTo, out assigneeId))
        {
            var targetUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.AssignedTo);
            if (targetUser == null)
                return BadRequest(new { message = $"Bruker ikke funnet: {dto.AssignedTo}" });
            assigneeId = targetUser.Id;
        }

        var opinion = new CaseOpinion
        {
            Id = Guid.NewGuid(),
            CaseId = id,
            Type = dto.Type,
            RequestedBy = userId,
            AssignedTo = assigneeId,
            Status = "pending",
            RequestComment = dto.Comment,
            CreatedAt = DateTime.UtcNow,
        };
        _db.CaseOpinions.Add(opinion);

        var eventType = dto.Type == "godkjenning" ? "approval_requested" : "opinion_requested";
        _db.CaseEvents.Add(new CaseEvent
        {
            Id = Guid.NewGuid(),
            CaseId = id,
            EventType = eventType,
            UserId = userId,
            EventData = JsonSerializer.Serialize(new { assigned_to = assigneeId, type = dto.Type }),
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();

        var users = await _db.Users
            .Where(u => u.Id == userId || u.Id == assigneeId)
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(new CaseOpinionDto(
            opinion.Id, opinion.CaseId, opinion.Type, opinion.RequestedBy,
            users.GetValueOrDefault(opinion.RequestedBy, ""),
            opinion.AssignedTo, users.GetValueOrDefault(opinion.AssignedTo, ""),
            opinion.Status, opinion.OpinionText, opinion.RequestComment, opinion.ForwardedFromId, opinion.OriginalOpinionId,
            opinion.CreatedAt, opinion.ResolvedAt
        ));
    }

    [HttpPatch("opinions/{opinionId}")]
    public async Task<ActionResult<CaseOpinionDto>> ResolveOpinion(Guid opinionId, [FromBody] ResolveOpinionDto dto)
    {
        var userId = MockAuth.GetUserId(User);
        var opinion = await _db.CaseOpinions.FindAsync(opinionId);
        if (opinion == null) return NotFound();
        if (opinion.AssignedTo != userId)
            return Forbid();

        // Validate status based on opinion type
        var validStatuses = opinion.Type == "godkjenning"
            ? new[] { "approved", "rejected" }
            : new[] { "given", "declined" };
        if (!validStatuses.Contains(dto.Status))
            return BadRequest(new { message = $"Ugyldig status '{dto.Status}' for type '{opinion.Type}'." });

        opinion.Status = dto.Status;
        opinion.OpinionText = dto.OpinionText;
        opinion.ResolvedAt = DateTime.UtcNow;

        var eventType = opinion.Type == "godkjenning"
            ? (dto.Status == "approved" ? "approval_approved" : "approval_rejected")
            : (dto.Status == "given" ? "opinion_given" : "opinion_declined");

        _db.CaseEvents.Add(new CaseEvent
        {
            Id = Guid.NewGuid(),
            CaseId = opinion.CaseId,
            EventType = eventType,
            UserId = userId,
            EventData = JsonSerializer.Serialize(new { opinion_id = opinionId, type = opinion.Type }),
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();

        var users = await _db.Users
            .Where(u => u.Id == opinion.RequestedBy || u.Id == opinion.AssignedTo)
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(new CaseOpinionDto(
            opinion.Id, opinion.CaseId, opinion.Type, opinion.RequestedBy,
            users.GetValueOrDefault(opinion.RequestedBy, ""),
            opinion.AssignedTo, users.GetValueOrDefault(opinion.AssignedTo, ""),
            opinion.Status, opinion.OpinionText, opinion.RequestComment, opinion.ForwardedFromId, opinion.OriginalOpinionId,
            opinion.CreatedAt, opinion.ResolvedAt
        ));
    }

    [HttpPost("opinions/{opinionId}/forward")]
    public async Task<ActionResult<CaseOpinionDto>> ForwardApproval(Guid opinionId, [FromBody] ForwardApprovalDto dto)
    {
        var userId = MockAuth.GetUserId(User);
        var opinion = await _db.CaseOpinions.FindAsync(opinionId);
        if (opinion == null) return NotFound();
        if (opinion.AssignedTo != userId)
            return Forbid();
        if (opinion.Type != "godkjenning")
            return BadRequest(new { message = "Bare godkjenninger kan videresendes." });
        if (opinion.Status != "pending")
            return BadRequest(new { message = "Kan bare videresende ventende godkjenninger." });

        var forwardTo = await _db.Users.FindAsync(dto.ForwardTo);
        if (forwardTo == null) return BadRequest(new { message = "Bruker ikke funnet." });

        // Mark the current opinion as forwarded
        opinion.Status = "forwarded";
        opinion.ResolvedAt = DateTime.UtcNow;

        // Create new forwarded opinion
        var originalId = opinion.OriginalOpinionId ?? opinion.Id;
        var forwarded = new CaseOpinion
        {
            Id = Guid.NewGuid(),
            CaseId = opinion.CaseId,
            Type = "godkjenning",
            RequestedBy = opinion.RequestedBy,
            AssignedTo = dto.ForwardTo,
            Status = "pending",
            ForwardedFromId = opinion.Id,
            OriginalOpinionId = originalId,
            CreatedAt = DateTime.UtcNow,
        };
        _db.CaseOpinions.Add(forwarded);

        _db.CaseEvents.Add(new CaseEvent
        {
            Id = Guid.NewGuid(),
            CaseId = opinion.CaseId,
            EventType = "approval_forwarded",
            UserId = userId,
            EventData = JsonSerializer.Serialize(new { from_opinion = opinionId, to_user = dto.ForwardTo, new_opinion = forwarded.Id }),
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();

        var users = await _db.Users
            .Where(u => u.Id == forwarded.RequestedBy || u.Id == forwarded.AssignedTo)
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(new CaseOpinionDto(
            forwarded.Id, forwarded.CaseId, forwarded.Type, forwarded.RequestedBy,
            users.GetValueOrDefault(forwarded.RequestedBy, ""),
            forwarded.AssignedTo, users.GetValueOrDefault(forwarded.AssignedTo, ""),
            forwarded.Status, forwarded.OpinionText, forwarded.RequestComment, forwarded.ForwardedFromId, forwarded.OriginalOpinionId,
            forwarded.CreatedAt, forwarded.ResolvedAt
        ));
    }

    // ─── Helpers ─────────────────────────────────────

    /// <summary>
    /// Extracts plain text from a ProseMirror caseSection node by finding
    /// the sectionContent child and concatenating all paragraph text.
    /// </summary>
    private static string? ExtractTextFromSection(JsonElement section)
    {
        if (!section.TryGetProperty("content", out var children)) return null;

        foreach (var child in children.EnumerateArray())
        {
            if (!child.TryGetProperty("type", out var typeProp)) continue;
            if (typeProp.GetString() != "sectionContent") continue;

            if (!child.TryGetProperty("content", out var blocks)) return null;

            var lines = new List<string>();
            foreach (var block in blocks.EnumerateArray())
            {
                if (!block.TryGetProperty("content", out var inlines))
                {
                    lines.Add(""); // empty paragraph
                    continue;
                }

                var lineText = new System.Text.StringBuilder();
                foreach (var inline in inlines.EnumerateArray())
                {
                    // Skip text nodes with deletion marks (track changes)
                    if (inline.TryGetProperty("marks", out var marks))
                    {
                        bool hasDeletion = false;
                        foreach (var mark in marks.EnumerateArray())
                        {
                            if (mark.TryGetProperty("type", out var markType) && markType.GetString() == "deletion")
                            {
                                hasDeletion = true;
                                break;
                            }
                        }
                        if (hasDeletion) continue;
                    }

                    if (inline.TryGetProperty("text", out var textProp))
                        lineText.Append(textProp.GetString());
                }
                lines.Add(lineText.ToString());
            }

            var result = string.Join("\n", lines);
            return string.IsNullOrWhiteSpace(result) ? null : result;
        }

        return null;
    }

    private static CaseResponseDto MapToDto(Case c, CaseContent? content, Dictionary<Guid, string> users, string? deptCode = null, string userRole = "administrator")
    {
        // Determine if FIN fields should be visible (punkt 3)
        var showFinFields = userRole == "administrator"
            || userRole.Contains("_fin")
            || WorkflowService.FinFieldsVisibleToFag.Contains(c.Status);

        CaseContentDto? contentDto = null;
        if (content != null)
        {
            contentDto = new CaseContentDto(
                content.Id, content.Version,
                content.CaseName, content.Chapter, content.Post, content.Amount, content.Status,
                content.ProposalText, content.Justification,
                content.VerbalConclusion, content.SocioeconomicAnalysis, content.GoalIndicator,
                content.BenefitPlan, content.Comment,
                showFinFields ? content.FinAssessment : null,
                showFinFields ? content.FinVerbal : null,
                showFinFields ? content.FinRConclusion : null,
                content.CreatedBy,
                users.GetValueOrDefault(content.CreatedBy, ""), content.CreatedAt,
                content.ContentJson, content.TrackChangesActive
            );
        }

        var opinions = c.Opinions?.Select(o => new CaseOpinionDto(
            o.Id, o.CaseId, o.Type, o.RequestedBy,
            users.GetValueOrDefault(o.RequestedBy, ""),
            o.AssignedTo, users.GetValueOrDefault(o.AssignedTo, ""),
            o.Status, o.OpinionText, o.RequestComment, o.ForwardedFromId, o.OriginalOpinionId,
            o.CreatedAt, o.ResolvedAt
        )).ToList();

        return new CaseResponseDto(
            c.Id, c.BudgetRoundId, c.DepartmentId,
            deptCode ?? c.Department?.Code ?? "",
            c.CaseName, c.Chapter, c.Post, c.Amount,
            c.CaseType, c.Status, c.AssignedTo,
            c.AssignedTo.HasValue ? users.GetValueOrDefault(c.AssignedTo.Value, "") : null,
            c.FinAssignedTo,
            c.FinAssignedTo.HasValue ? users.GetValueOrDefault(c.FinAssignedTo.Value, "") : null,
            c.CreatedBy, users.GetValueOrDefault(c.CreatedBy, ""),
            c.Origin, c.ResponsibleDivision, c.Version, c.CreatedAt, c.UpdatedAt,
            contentDto, opinions
        );
    }
}
