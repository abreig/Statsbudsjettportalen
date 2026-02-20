using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Data;
using Statsbudsjettportalen.Api.DTOs;
using Statsbudsjettportalen.Api.Middleware;
using Statsbudsjettportalen.Api.Services;

namespace Statsbudsjettportalen.Api.Controllers;

[ApiController]
[Route("api/export")]
[Authorize]
public class ExportJobsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ExportJobService _exportService;

    public ExportJobsController(AppDbContext db, ExportJobService exportService)
    {
        _db = db;
        _exportService = exportService;
    }

    /// <summary>
    /// Enqueue a department list Word export as a background job.
    /// Returns immediately with a job ID for status polling.
    /// </summary>
    [HttpPost("department-list/word")]
    public async Task<IActionResult> EnqueueDepListExport([FromBody] DepListExportRequest request)
    {
        var userId = MockAuth.GetUserId(User);
        var jobId = await _exportService.EnqueueAsync(
            _db, "department_list_word", userId,
            new { departmentListId = request.DepartmentListId });

        return Accepted(new { jobId });
    }

    /// <summary>
    /// Poll for export job status. Returns status, resultUrl when completed.
    /// </summary>
    [HttpGet("jobs/{jobId}")]
    public async Task<ActionResult<ExportJobDto>> GetJobStatus(Guid jobId)
    {
        var job = await _db.ExportJobs.FindAsync(jobId);
        if (job == null) return NotFound();

        return Ok(new ExportJobDto(
            job.Id, job.JobType, job.Status,
            job.ResultUrl, job.ErrorMessage,
            job.CreatedAt, job.StartedAt, job.CompletedAt));
    }

    /// <summary>
    /// List recent export jobs for the current user.
    /// </summary>
    [HttpGet("jobs")]
    public async Task<ActionResult<List<ExportJobDto>>> GetMyJobs()
    {
        var userId = MockAuth.GetUserId(User);
        var jobs = await _db.ExportJobs
            .Where(j => j.RequestedBy == userId)
            .OrderByDescending(j => j.CreatedAt)
            .Take(20)
            .ToListAsync();

        return Ok(jobs.Select(j => new ExportJobDto(
            j.Id, j.JobType, j.Status,
            j.ResultUrl, j.ErrorMessage,
            j.CreatedAt, j.StartedAt, j.CompletedAt
        )).ToList());
    }
}

public record DepListExportRequest(Guid DepartmentListId);
