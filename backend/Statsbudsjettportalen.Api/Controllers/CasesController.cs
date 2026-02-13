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
        [FromQuery] string? division)
    {
        var userRole = MockAuth.GetUserRole(User);
        var userDeptId = MockAuth.GetDepartmentId(User);

        var query = _db.Cases
            .Include(c => c.Department)
            .Include(c => c.ContentVersions)
            .AsQueryable();

        // Role-based filtering: FAG sees only own department
        if (_workflow.IsFagRole(userRole))
        {
            query = query.Where(c => c.DepartmentId == userDeptId);
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

        var userIds = cases.SelectMany(c => new[] { c.CreatedBy, c.AssignedTo })
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
        [FromQuery] Guid? department_id)
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

        var cases = await query.OrderByDescending(c => c.UpdatedAt).ToListAsync();
        var userIds = cases.Select(c => c.CreatedBy).Distinct().ToList();
        var users = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(cases.Select(c =>
        {
            var currentContent = c.ContentVersions.MaxBy(cv => cv.Version);
            return MapToDto(c, currentContent, users, userRole: "administrator"); // history shows all fields
        }).ToList());
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

    [HttpPut("{id}")]
    public async Task<ActionResult<CaseResponseDto>> Update(Guid id, [FromBody] CaseUpdateDto dto)
    {
        var c = await _db.Cases.Include(c => c.Department).FirstOrDefaultAsync(c => c.Id == id);
        if (c == null) return NotFound();

        if (dto.CaseName != null) c.CaseName = dto.CaseName;
        if (dto.Chapter != null) c.Chapter = dto.Chapter;
        if (dto.Post != null) c.Post = dto.Post;
        if (dto.Amount.HasValue) c.Amount = dto.Amount;
        c.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Sak oppdatert" });
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> ChangeStatus(Guid id, [FromBody] StatusChangeDto dto)
    {
        var userId = MockAuth.GetUserId(User);
        var userRole = MockAuth.GetUserRole(User);
        var c = await _db.Cases.FindAsync(id);
        if (c == null) return NotFound();

        if (!_workflow.CanUserTransition(c.Status, dto.Status, userRole))
            return BadRequest(new { message = $"Ugyldig statusovergang fra '{c.Status}' til '{dto.Status}' for rollen '{userRole}'" });

        if (dto.Status == "returnert_til_fag" && string.IsNullOrEmpty(dto.Reason))
            return BadRequest(new { message = "Begrunnelse er påkrevd ved retur til FAG" });

        var oldStatus = c.Status;
        c.Status = dto.Status;
        c.UpdatedAt = DateTime.UtcNow;

        _db.CaseEvents.Add(new CaseEvent
        {
            Id = Guid.NewGuid(),
            CaseId = id,
            EventType = "status_changed",
            UserId = userId,
            EventData = JsonSerializer.Serialize(new { from = oldStatus, to = dto.Status, reason = dto.Reason }),
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
            content.ProposalText, content.Justification, content.VerbalConclusion,
            content.SocioeconomicAnalysis, content.GoalIndicator, content.BenefitPlan,
            content.Comment, content.FinAssessment, content.FinVerbal, content.FinRConclusion,
            content.CreatedBy, user?.FullName ?? "", content.CreatedAt
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
            c.Id, c.Version, c.ProposalText, c.Justification, c.VerbalConclusion,
            c.SocioeconomicAnalysis, c.GoalIndicator, c.BenefitPlan, c.Comment,
            c.FinAssessment, c.FinVerbal, c.FinRConclusion,
            c.CreatedBy, users.GetValueOrDefault(c.CreatedBy, ""), c.CreatedAt
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
            content.Id, content.Version, content.ProposalText, content.Justification,
            content.VerbalConclusion, content.SocioeconomicAnalysis, content.GoalIndicator,
            content.BenefitPlan, content.Comment, content.FinAssessment, content.FinVerbal,
            content.FinRConclusion, content.CreatedBy, user?.FullName ?? "", content.CreatedAt
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
        var c = await _db.Cases.FindAsync(id);
        if (c == null) return NotFound();

        var opinion = new CaseOpinion
        {
            Id = Guid.NewGuid(),
            CaseId = id,
            RequestedBy = userId,
            AssignedTo = dto.AssignedTo,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
        };
        _db.CaseOpinions.Add(opinion);

        _db.CaseEvents.Add(new CaseEvent
        {
            Id = Guid.NewGuid(),
            CaseId = id,
            EventType = "opinion_requested",
            UserId = userId,
            EventData = JsonSerializer.Serialize(new { assigned_to = dto.AssignedTo }),
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();

        var users = await _db.Users
            .Where(u => u.Id == userId || u.Id == dto.AssignedTo)
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(new CaseOpinionDto(
            opinion.Id, opinion.CaseId, opinion.RequestedBy,
            users.GetValueOrDefault(opinion.RequestedBy, ""),
            opinion.AssignedTo, users.GetValueOrDefault(opinion.AssignedTo, ""),
            opinion.Status, opinion.OpinionText, opinion.CreatedAt, opinion.ResolvedAt
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

        opinion.Status = dto.Status; // "given" or "declined"
        opinion.OpinionText = dto.OpinionText;
        opinion.ResolvedAt = DateTime.UtcNow;

        _db.CaseEvents.Add(new CaseEvent
        {
            Id = Guid.NewGuid(),
            CaseId = opinion.CaseId,
            EventType = dto.Status == "given" ? "opinion_given" : "opinion_declined",
            UserId = userId,
            EventData = JsonSerializer.Serialize(new { opinion_id = opinionId }),
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();

        var users = await _db.Users
            .Where(u => u.Id == opinion.RequestedBy || u.Id == opinion.AssignedTo)
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(new CaseOpinionDto(
            opinion.Id, opinion.CaseId, opinion.RequestedBy,
            users.GetValueOrDefault(opinion.RequestedBy, ""),
            opinion.AssignedTo, users.GetValueOrDefault(opinion.AssignedTo, ""),
            opinion.Status, opinion.OpinionText, opinion.CreatedAt, opinion.ResolvedAt
        ));
    }

    // ─── Helpers ─────────────────────────────────────

    private static CaseResponseDto MapToDto(Case c, CaseContent? content, Dictionary<Guid, string> users, string? deptCode = null, string userRole = "administrator")
    {
        // Determine if FIN fields should be visible (punkt 3)
        var showFinFields = userRole == "administrator"
            || userRole == "saksbehandler_fin" || userRole == "underdirektor_fin"
            || WorkflowService.FinFieldsVisibleToFag.Contains(c.Status);

        CaseContentDto? contentDto = null;
        if (content != null)
        {
            contentDto = new CaseContentDto(
                content.Id, content.Version, content.ProposalText, content.Justification,
                content.VerbalConclusion, content.SocioeconomicAnalysis, content.GoalIndicator,
                content.BenefitPlan, content.Comment,
                showFinFields ? content.FinAssessment : null,
                showFinFields ? content.FinVerbal : null,
                showFinFields ? content.FinRConclusion : null,
                content.CreatedBy,
                users.GetValueOrDefault(content.CreatedBy, ""), content.CreatedAt
            );
        }

        var opinions = c.Opinions?.Select(o => new CaseOpinionDto(
            o.Id, o.CaseId, o.RequestedBy,
            users.GetValueOrDefault(o.RequestedBy, ""),
            o.AssignedTo, users.GetValueOrDefault(o.AssignedTo, ""),
            o.Status, o.OpinionText, o.CreatedAt, o.ResolvedAt
        )).ToList();

        return new CaseResponseDto(
            c.Id, c.BudgetRoundId, c.DepartmentId,
            deptCode ?? c.Department?.Code ?? "",
            c.CaseName, c.Chapter, c.Post, c.Amount,
            c.CaseType, c.Status, c.AssignedTo,
            c.AssignedTo.HasValue ? users.GetValueOrDefault(c.AssignedTo.Value, "") : null,
            c.CreatedBy, users.GetValueOrDefault(c.CreatedBy, ""),
            c.Origin, c.ResponsibleDivision, c.Version, c.CreatedAt, c.UpdatedAt,
            contentDto, opinions
        );
    }
}
