using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Data;
using Statsbudsjettportalen.Api.DTOs;
using Statsbudsjettportalen.Api.Middleware;
using Statsbudsjettportalen.Api.Services;

namespace Statsbudsjettportalen.Api.Controllers;

[ApiController]
[Route("api/locks")]
[Authorize]
public class LocksController : ControllerBase
{
    private readonly ResourceLockService _lockService;
    private readonly AppDbContext _db;

    public LocksController(ResourceLockService lockService, AppDbContext db)
    {
        _lockService = lockService;
        _db = db;
    }

    /// <summary>
    /// Acquire a lock on a resource. Returns 200 with lock info on success,
    /// or 409 with the existing lock holder info on conflict.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Acquire([FromBody] AcquireLockDto dto)
    {
        var userId = MockAuth.GetUserId(User);

        var (acquired, existing) = await _lockService.TryAcquireAsync(
            dto.ResourceType, dto.ResourceId, userId);

        if (acquired != null)
        {
            var userName = await _db.Users
                .Where(u => u.Id == userId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync() ?? "";

            return Ok(new LockResponseDto(
                acquired.Id, acquired.ResourceType, acquired.ResourceId,
                acquired.LockedBy, userName,
                acquired.LockedAt, acquired.ExpiresAt));
        }

        if (existing != null)
        {
            var holderName = await _db.Users
                .Where(u => u.Id == existing.LockedBy)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync() ?? "";

            return Conflict(new LockResponseDto(
                existing.Id, existing.ResourceType, existing.ResourceId,
                existing.LockedBy, holderName,
                existing.LockedAt, existing.ExpiresAt));
        }

        return StatusCode(500, new { message = "Uventet feil ved låsing" });
    }

    /// <summary>
    /// Renew lock expiry (heartbeat).
    /// </summary>
    [HttpPut("{id}/heartbeat")]
    public async Task<IActionResult> Heartbeat(Guid id)
    {
        var userId = MockAuth.GetUserId(User);
        var success = await _lockService.HeartbeatAsync(id, userId);
        return success ? Ok() : NotFound();
    }

    /// <summary>
    /// Release a lock explicitly.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Release(Guid id)
    {
        var userId = MockAuth.GetUserId(User);

        // Handle sendBeacon DELETE via query param workaround
        var success = await _lockService.ReleaseAsync(id, userId);
        return success ? Ok() : Forbid();
    }

    /// <summary>
    /// Check the current lock on a resource.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Check(
        [FromQuery] string resourceType, [FromQuery] Guid resourceId)
    {
        var lck = await _lockService.GetLockAsync(resourceType, resourceId);
        if (lck == null) return NoContent();

        var holderName = await _db.Users
            .Where(u => u.Id == lck.LockedBy)
            .Select(u => u.FullName)
            .FirstOrDefaultAsync() ?? "";

        return Ok(new LockResponseDto(
            lck.Id, lck.ResourceType, lck.ResourceId,
            lck.LockedBy, holderName,
            lck.LockedAt, lck.ExpiresAt));
    }
}
