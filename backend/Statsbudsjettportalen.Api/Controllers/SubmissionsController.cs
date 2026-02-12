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
[Route("api/submissions")]
[Authorize]
public class SubmissionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SubmissionsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<SubmissionDto>>> GetAll(
        [FromQuery] Guid? budget_round_id,
        [FromQuery] Guid? department_id)
    {
        var query = _db.Submissions
            .Include(s => s.BudgetRound)
            .Include(s => s.Department)
            .Include(s => s.SubmissionCases)
                .ThenInclude(sc => sc.Case)
            .AsQueryable();

        if (budget_round_id.HasValue)
            query = query.Where(s => s.BudgetRoundId == budget_round_id.Value);
        if (department_id.HasValue)
            query = query.Where(s => s.DepartmentId == department_id.Value);

        var submissions = await query.OrderByDescending(s => s.SubmittedAt).ToListAsync();

        var userIds = submissions.Select(s => s.SubmittedBy).Distinct().ToList();
        var users = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(submissions.Select(s => new SubmissionDto(
            s.Id, s.BudgetRoundId, s.BudgetRound.Name,
            s.DepartmentId, s.Department.Code,
            s.SubmittedBy, users.GetValueOrDefault(s.SubmittedBy, ""),
            s.IsSupplement, s.SubmittedAt,
            s.SubmissionCases.Select(sc => new SubmissionCaseDto(
                sc.CaseId, sc.Case.CaseName, sc.Case.CaseType, sc.Case.Status, sc.Case.Amount
            )).ToList()
        )).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<SubmissionDto>> Create([FromBody] SubmissionCreateDto dto)
    {
        var userId = MockAuth.GetUserId(User);
        var deptId = MockAuth.GetDepartmentId(User);

        // Validate all cases are in 'klarert' status
        var cases = await _db.Cases
            .Where(c => dto.CaseIds.Contains(c.Id))
            .ToListAsync();

        var invalidCases = cases.Where(c => c.Status != "klarert").ToList();
        if (invalidCases.Any())
            return BadRequest(new { message = "Alle saker må ha status 'klarert' før de kan sendes til FIN" });

        var submission = new Submission
        {
            Id = Guid.NewGuid(),
            BudgetRoundId = dto.BudgetRoundId,
            DepartmentId = deptId,
            SubmittedBy = userId,
            IsSupplement = dto.IsSupplement,
            SubmittedAt = DateTime.UtcNow,
        };
        _db.Submissions.Add(submission);

        foreach (var c in cases)
        {
            _db.SubmissionCases.Add(new SubmissionCase
            {
                SubmissionId = submission.Id,
                CaseId = c.Id,
            });

            c.Status = "sendt_til_fin";
            c.UpdatedAt = DateTime.UtcNow;

            _db.CaseEvents.Add(new CaseEvent
            {
                Id = Guid.NewGuid(),
                CaseId = c.Id,
                EventType = "sent_to_fin",
                UserId = userId,
                EventData = JsonSerializer.Serialize(new { submission_id = submission.Id }),
                CreatedAt = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync();

        var dept = await _db.Departments.FindAsync(deptId);
        var round = await _db.BudgetRounds.FindAsync(dto.BudgetRoundId);
        var user = await _db.Users.FindAsync(userId);

        return CreatedAtAction(nameof(GetAll), null,
            new SubmissionDto(
                submission.Id, submission.BudgetRoundId, round?.Name ?? "",
                submission.DepartmentId, dept?.Code ?? "",
                submission.SubmittedBy, user?.FullName ?? "",
                submission.IsSupplement, submission.SubmittedAt,
                cases.Select(c => new SubmissionCaseDto(c.Id, c.CaseName, c.CaseType, c.Status, c.Amount)).ToList()
            ));
    }
}
