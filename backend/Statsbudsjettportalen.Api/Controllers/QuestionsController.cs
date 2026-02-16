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
[Authorize]
public class QuestionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public QuestionsController(AppDbContext db) => _db = db;

    [HttpGet("api/cases/{caseId}/questions")]
    public async Task<ActionResult<List<QuestionDto>>> GetQuestions(Guid caseId)
    {
        var questions = await _db.Questions
            .Where(q => q.CaseId == caseId)
            .OrderBy(q => q.CreatedAt)
            .ToListAsync();

        var userIds = questions
            .SelectMany(q => new[] { q.AskedBy, q.AnsweredBy ?? Guid.Empty })
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        var users = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(questions.Select(q => new QuestionDto(
            q.Id, q.CaseId, q.AskedBy,
            users.GetValueOrDefault(q.AskedBy, ""),
            q.QuestionText, q.AnswerText, q.AnswerJson,
            q.AnsweredBy,
            q.AnsweredBy.HasValue ? users.GetValueOrDefault(q.AnsweredBy.Value, "") : null,
            q.CreatedAt, q.AnsweredAt
        )).ToList());
    }

    [HttpPost("api/cases/{caseId}/questions")]
    public async Task<ActionResult<QuestionDto>> CreateQuestion(Guid caseId, [FromBody] QuestionCreateDto dto)
    {
        var userId = MockAuth.GetUserId(User);

        var question = new Question
        {
            Id = Guid.NewGuid(),
            CaseId = caseId,
            AskedBy = userId,
            QuestionText = dto.QuestionText,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Questions.Add(question);

        _db.CaseEvents.Add(new CaseEvent
        {
            Id = Guid.NewGuid(),
            CaseId = caseId,
            EventType = "question_asked",
            UserId = userId,
            EventData = JsonSerializer.Serialize(new { question_id = question.Id }),
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);
        return CreatedAtAction(nameof(GetQuestions), new { caseId },
            new QuestionDto(question.Id, caseId, userId, user?.FullName ?? "",
                question.QuestionText, null, null, null, null, question.CreatedAt, null));
    }

    [HttpPatch("api/questions/{id}/answer")]
    public async Task<ActionResult<QuestionDto>> AnswerQuestion(Guid id, [FromBody] QuestionAnswerDto dto)
    {
        var userId = MockAuth.GetUserId(User);
        var question = await _db.Questions.FindAsync(id);
        if (question == null) return NotFound();

        question.AnswerText = dto.AnswerText;
        question.AnswerJson = dto.AnswerJson;
        question.AnsweredBy = userId;
        question.AnsweredAt = DateTime.UtcNow;

        _db.CaseEvents.Add(new CaseEvent
        {
            Id = Guid.NewGuid(),
            CaseId = question.CaseId,
            EventType = "question_answered",
            UserId = userId,
            EventData = JsonSerializer.Serialize(new { question_id = question.Id }),
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();

        var userIds = new List<Guid> { question.AskedBy, userId };
        var users = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(new QuestionDto(
            question.Id, question.CaseId, question.AskedBy,
            users.GetValueOrDefault(question.AskedBy, ""),
            question.QuestionText, question.AnswerText, question.AnswerJson,
            question.AnsweredBy, users.GetValueOrDefault(userId, ""),
            question.CreatedAt, question.AnsweredAt
        ));
    }

    [HttpGet("api/questions/my-pending")]
    public async Task<ActionResult<List<QuestionWithCaseDto>>> GetMyPendingQuestions()
    {
        var userId = MockAuth.GetUserId(User);

        // Find unanswered questions on cases where the current user is AssignedTo or FinAssignedTo
        var questions = await _db.Questions
            .Include(q => q.Case)
            .Where(q => q.AnswerText == null
                && (q.Case.AssignedTo == userId || q.Case.FinAssignedTo == userId))
            .OrderByDescending(q => q.CreatedAt)
            .ToListAsync();

        var askerIds = questions.Select(q => q.AskedBy).Distinct().ToList();
        var users = await _db.Users
            .Where(u => askerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(questions.Select(q => new QuestionWithCaseDto(
            q.Id, q.CaseId, q.Case.CaseName,
            q.AskedBy, users.GetValueOrDefault(q.AskedBy, ""),
            q.QuestionText, q.CreatedAt
        )).ToList());
    }
}
