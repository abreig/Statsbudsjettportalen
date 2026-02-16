using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Data;
using Statsbudsjettportalen.Api.Services;

namespace Statsbudsjettportalen.Api.Controllers;

[ApiController]
[Route("api/cases/{caseId}/export")]
[Authorize]
public class ExportController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly WordExportService _wordExport;

    public ExportController(AppDbContext db, WordExportService wordExport)
    {
        _db = db;
        _wordExport = wordExport;
    }

    /// <summary>
    /// Export the current case document as a Word (.docx) file.
    /// Includes tracked changes as Word revision marks and comments.
    /// </summary>
    [HttpGet("word")]
    public async Task<IActionResult> ExportWord(Guid caseId)
    {
        var c = await _db.Cases
            .Include(c => c.ContentVersions)
            .FirstOrDefaultAsync(c => c.Id == caseId);

        if (c == null) return NotFound();

        var currentContent = c.ContentVersions.MaxBy(cv => cv.Version);
        if (currentContent?.ContentJson == null)
            return BadRequest(new { message = "Saken har ingen dokumentinnhold å eksportere." });

        // Fetch comments for this case
        var dbComments = await _db.CaseComments
            .Where(cc => cc.CaseId == caseId && cc.ParentCommentId == null)
            .Include(cc => cc.Replies)
            .OrderBy(cc => cc.CreatedAt)
            .ToListAsync();

        var userIds = dbComments
            .SelectMany(cc => new[] { (Guid?)cc.AuthorId }
                .Concat(cc.Replies.Select(r => (Guid?)r.AuthorId)))
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        var users = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        var comments = dbComments.Select(cc => new CommentData
        {
            CommentId = cc.CommentId,
            CommentText = cc.CommentText,
            AuthorName = users.GetValueOrDefault(cc.AuthorId, ""),
            CreatedAt = cc.CreatedAt.ToString("O"),
            Replies = cc.Replies.OrderBy(r => r.CreatedAt).Select(r => new CommentReplyData
            {
                CommentText = r.CommentText,
                AuthorName = users.GetValueOrDefault(r.AuthorId, ""),
            }).ToList(),
        }).ToList();

        var docxBytes = _wordExport.GenerateDocx(
            currentContent.ContentJson,
            c.CaseName,
            comments
        );

        var fileName = $"{SanitizeFileName(c.CaseName)}.docx";
        return File(docxBytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            fileName);
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = System.IO.Path.GetInvalidFileNameChars();
        return string.Join("_", name.Split(invalid, StringSplitOptions.RemoveEmptyEntries)).Trim();
    }
}
