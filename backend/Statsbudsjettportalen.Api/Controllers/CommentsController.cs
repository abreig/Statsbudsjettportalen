using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Data;
using Statsbudsjettportalen.Api.DTOs;
using Statsbudsjettportalen.Api.Middleware;
using Statsbudsjettportalen.Api.Models;

namespace Statsbudsjettportalen.Api.Controllers;

[ApiController]
[Route("api/cases/{caseId}/comments")]
[Authorize]
public class CommentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public CommentsController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Get all comments for a case, with replies nested.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<CaseCommentDto>>> GetComments(Guid caseId)
    {
        var caseExists = await _db.Cases.AnyAsync(c => c.Id == caseId);
        if (!caseExists) return NotFound();

        var comments = await _db.CaseComments
            .Where(c => c.CaseId == caseId && c.ParentCommentId == null)
            .Include(c => c.Replies)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        var userIds = comments
            .SelectMany(c => new[] { c.AuthorId, c.ResolvedBy }
                .Concat(c.Replies.Select(r => (Guid?)r.AuthorId)))
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        var users = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(comments.Select(c => MapToDto(c, users)).ToList());
    }

    /// <summary>
    /// Create a new comment on a case.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<CaseCommentDto>> CreateComment(Guid caseId, [FromBody] CreateCommentDto dto)
    {
        var userId = MockAuth.GetUserId(User);
        var caseExists = await _db.Cases.AnyAsync(c => c.Id == caseId);
        if (!caseExists) return NotFound();

        var comment = new CaseComment
        {
            Id = Guid.NewGuid(),
            CaseId = caseId,
            CommentId = dto.CommentId,
            CommentText = dto.CommentText,
            AnchorText = dto.AnchorText,
            Status = "open",
            AuthorId = userId,
            CreatedAt = DateTime.UtcNow,
        };

        _db.CaseComments.Add(comment);
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);
        var users = new Dictionary<Guid, string>();
        if (user != null) users[userId] = user.FullName;

        return Ok(MapToDto(comment, users));
    }

    /// <summary>
    /// Reply to an existing comment.
    /// </summary>
    [HttpPost("{commentDbId}/replies")]
    public async Task<ActionResult<CaseCommentDto>> ReplyToComment(
        Guid caseId, Guid commentDbId, [FromBody] ReplyCommentDto dto)
    {
        var userId = MockAuth.GetUserId(User);
        var parent = await _db.CaseComments.FindAsync(commentDbId);
        if (parent == null || parent.CaseId != caseId) return NotFound();

        var reply = new CaseComment
        {
            Id = Guid.NewGuid(),
            CaseId = caseId,
            CommentId = parent.CommentId, // Same ProseMirror mark
            CommentText = dto.CommentText,
            AnchorText = parent.AnchorText,
            Status = "open",
            ParentCommentId = commentDbId,
            AuthorId = userId,
            CreatedAt = DateTime.UtcNow,
        };

        _db.CaseComments.Add(reply);
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);
        var users = new Dictionary<Guid, string>();
        if (user != null) users[userId] = user.FullName;

        return Ok(MapToDto(reply, users));
    }

    /// <summary>
    /// Resolve a comment (mark as resolved).
    /// </summary>
    [HttpPatch("{commentDbId}/resolve")]
    public async Task<IActionResult> ResolveComment(Guid caseId, Guid commentDbId)
    {
        var userId = MockAuth.GetUserId(User);
        var comment = await _db.CaseComments.FindAsync(commentDbId);
        if (comment == null || comment.CaseId != caseId) return NotFound();

        comment.Status = "resolved";
        comment.ResolvedAt = DateTime.UtcNow;
        comment.ResolvedBy = userId;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Kommentar løst" });
    }

    /// <summary>
    /// Reopen a resolved comment.
    /// </summary>
    [HttpPatch("{commentDbId}/reopen")]
    public async Task<IActionResult> ReopenComment(Guid caseId, Guid commentDbId)
    {
        var comment = await _db.CaseComments.FindAsync(commentDbId);
        if (comment == null || comment.CaseId != caseId) return NotFound();

        comment.Status = "open";
        comment.ResolvedAt = null;
        comment.ResolvedBy = null;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Kommentar gjenåpnet" });
    }

    /// <summary>
    /// Delete a comment (only by author).
    /// </summary>
    [HttpDelete("{commentDbId}")]
    public async Task<IActionResult> DeleteComment(Guid caseId, Guid commentDbId)
    {
        var userId = MockAuth.GetUserId(User);
        var comment = await _db.CaseComments
            .Include(c => c.Replies)
            .FirstOrDefaultAsync(c => c.Id == commentDbId);

        if (comment == null || comment.CaseId != caseId) return NotFound();
        if (comment.AuthorId != userId) return Forbid();

        // Delete replies first
        _db.CaseComments.RemoveRange(comment.Replies);
        _db.CaseComments.Remove(comment);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Kommentar slettet" });
    }

    private static CaseCommentDto MapToDto(CaseComment comment, Dictionary<Guid, string> users)
    {
        return new CaseCommentDto(
            comment.Id,
            comment.CaseId,
            comment.CommentText,
            comment.AnchorText,
            comment.CommentId,
            comment.AuthorId.ToString(),
            users.GetValueOrDefault(comment.AuthorId, ""),
            comment.Status,
            comment.ParentCommentId,
            comment.CreatedAt,
            comment.ResolvedAt,
            comment.ResolvedBy.HasValue ? users.GetValueOrDefault(comment.ResolvedBy.Value, "") : null,
            comment.Replies
                .OrderBy(r => r.CreatedAt)
                .Select(r => MapToDto(r, users))
                .ToList()
        );
    }
}
