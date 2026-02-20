using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Data;
using Statsbudsjettportalen.Api.Models;

namespace Statsbudsjettportalen.Api.Services;

/// <summary>
/// Manages async export jobs: enqueue, process, poll status.
/// Uses a simple background timer instead of Hangfire for the POC.
/// </summary>
public class ExportJobService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ExportJobService> _logger;
    private static readonly SemaphoreSlim _concurrency = new(3); // max 3 concurrent exports

    public ExportJobService(IServiceScopeFactory scopeFactory, ILogger<ExportJobService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task<Guid> EnqueueAsync(AppDbContext db, string jobType, Guid requestedBy, object parameters)
    {
        var job = new ExportJob
        {
            Id = Guid.NewGuid(),
            JobType = jobType,
            Status = "queued",
            RequestedBy = requestedBy,
            Parameters = JsonSerializer.Serialize(parameters),
            CreatedAt = DateTime.UtcNow,
        };

        db.ExportJobs.Add(job);
        await db.SaveChangesAsync();
        return job.Id;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingJobsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in export job processing loop");
            }

            await Task.Delay(2000, stoppingToken); // poll every 2 seconds
        }
    }

    private async Task ProcessPendingJobsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var pendingJobs = await db.ExportJobs
            .Where(j => j.Status == "queued")
            .OrderBy(j => j.CreatedAt)
            .Take(5)
            .ToListAsync(ct);

        var tasks = pendingJobs.Select(job => ProcessJobAsync(job.Id, ct));
        await Task.WhenAll(tasks);
    }

    private async Task ProcessJobAsync(Guid jobId, CancellationToken ct)
    {
        await _concurrency.WaitAsync(ct);
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var job = await db.ExportJobs.FindAsync(new object[] { jobId }, ct);
            if (job == null || job.Status != "queued") return;

            job.Status = "processing";
            job.StartedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            try
            {
                var resultUrl = await RunExportAsync(db, job, scope.ServiceProvider, ct);
                job.Status = "completed";
                job.ResultUrl = resultUrl;
                job.CompletedAt = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Export job {JobId} failed", jobId);
                job.Status = "failed";
                job.ErrorMessage = ex.Message;
                job.CompletedAt = DateTime.UtcNow;
            }

            await db.SaveChangesAsync(ct);
        }
        finally
        {
            _concurrency.Release();
        }
    }

    private async Task<string> RunExportAsync(AppDbContext db, ExportJob job, IServiceProvider sp, CancellationToken ct)
    {
        var parameters = JsonSerializer.Deserialize<JsonElement>(job.Parameters);

        switch (job.JobType)
        {
            case "department_list_word":
            {
                var listId = parameters.GetProperty("departmentListId").GetGuid();
                var dl = await db.DepartmentLists
                    .Include(d => d.Template)
                    .Include(d => d.Department)
                    .Include(d => d.Sections)
                        .ThenInclude(s => s.TemplateSection)
                    .Include(d => d.Sections)
                        .ThenInclude(s => s.CaseEntries)
                            .ThenInclude(e => e.Case)
                    .FirstOrDefaultAsync(d => d.Id == listId, ct);

                if (dl == null) throw new InvalidOperationException("Department list not found");

                var caseIds = dl.Sections.SelectMany(s => s.CaseEntries).Select(e => e.CaseId).Distinct().ToList();
                var conclusions = await db.CaseConclusions
                    .Where(c => caseIds.Contains(c.CaseId))
                    .OrderBy(c => c.SortOrder)
                    .ToListAsync(ct);
                var conclusionsByCaseId = conclusions.GroupBy(c => c.CaseId).ToDictionary(g => g.Key, g => g.ToList());

                var exportService = new DepListWordExportService();
                var docxBytes = exportService.GenerateDocx(dl, conclusionsByCaseId);

                // Save to wwwroot/exports
                var exportsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "exports");
                Directory.CreateDirectory(exportsDir);
                var fileName = $"{job.Id}.docx";
                await File.WriteAllBytesAsync(Path.Combine(exportsDir, fileName), docxBytes, ct);

                return $"/exports/{fileName}";
            }

            default:
                throw new NotSupportedException($"Export type '{job.JobType}' is not supported");
        }
    }
}
