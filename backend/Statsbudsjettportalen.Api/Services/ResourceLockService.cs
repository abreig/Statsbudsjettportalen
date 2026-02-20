using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Data;
using Statsbudsjettportalen.Api.Models;

namespace Statsbudsjettportalen.Api.Services;

public class ResourceLockService
{
    private readonly AppDbContext _db;
    private readonly TimeSpan _lockDuration = TimeSpan.FromMinutes(5);

    public ResourceLockService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Try to acquire a lock on a resource. Returns the lock if successful,
    /// or the existing lock info if someone else holds it.
    /// </summary>
    public async Task<(ResourceLock? acquired, ResourceLock? existing)> TryAcquireAsync(
        string resourceType, Guid resourceId, Guid userId)
    {
        // Clean up expired locks first
        await CleanupExpiredAsync();

        var existing = await _db.ResourceLocks
            .FirstOrDefaultAsync(l => l.ResourceType == resourceType && l.ResourceId == resourceId);

        if (existing != null)
        {
            // Same user already has the lock — refresh it
            if (existing.LockedBy == userId)
            {
                existing.ExpiresAt = DateTime.UtcNow.Add(_lockDuration);
                existing.LastHeartbeat = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return (existing, null);
            }
            // Another user holds it
            return (null, existing);
        }

        var newLock = new ResourceLock
        {
            Id = Guid.NewGuid(),
            ResourceType = resourceType,
            ResourceId = resourceId,
            LockedBy = userId,
            LockedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.Add(_lockDuration),
            LastHeartbeat = DateTime.UtcNow,
        };

        _db.ResourceLocks.Add(newLock);

        try
        {
            await _db.SaveChangesAsync();
            return (newLock, null);
        }
        catch (DbUpdateException)
        {
            // Unique constraint violation — someone else acquired it concurrently
            _db.Entry(newLock).State = EntityState.Detached;
            existing = await _db.ResourceLocks
                .FirstOrDefaultAsync(l => l.ResourceType == resourceType && l.ResourceId == resourceId);
            return (null, existing);
        }
    }

    /// <summary>
    /// Renew the lock's expiry (heartbeat).
    /// </summary>
    public async Task<bool> HeartbeatAsync(Guid lockId, Guid userId)
    {
        var lck = await _db.ResourceLocks.FindAsync(lockId);
        if (lck == null || lck.LockedBy != userId) return false;

        lck.ExpiresAt = DateTime.UtcNow.Add(_lockDuration);
        lck.LastHeartbeat = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Release a lock explicitly.
    /// </summary>
    public async Task<bool> ReleaseAsync(Guid lockId, Guid userId)
    {
        var lck = await _db.ResourceLocks.FindAsync(lockId);
        if (lck == null) return true; // Already gone
        if (lck.LockedBy != userId) return false; // Not yours

        _db.ResourceLocks.Remove(lck);
        await _db.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Release a lock by resource (for beacon-based cleanup which may not have the lock ID).
    /// </summary>
    public async Task ReleaseByResourceAsync(string resourceType, Guid resourceId, Guid userId)
    {
        var lck = await _db.ResourceLocks
            .FirstOrDefaultAsync(l => l.ResourceType == resourceType
                                      && l.ResourceId == resourceId
                                      && l.LockedBy == userId);
        if (lck != null)
        {
            _db.ResourceLocks.Remove(lck);
            await _db.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Get the current lock on a resource, if any.
    /// </summary>
    public async Task<ResourceLock?> GetLockAsync(string resourceType, Guid resourceId)
    {
        await CleanupExpiredAsync();
        return await _db.ResourceLocks
            .FirstOrDefaultAsync(l => l.ResourceType == resourceType && l.ResourceId == resourceId);
    }

    /// <summary>
    /// Remove all expired locks.
    /// </summary>
    public async Task CleanupExpiredAsync()
    {
        var expired = await _db.ResourceLocks
            .Where(l => l.ExpiresAt < DateTime.UtcNow)
            .ToListAsync();

        if (expired.Count > 0)
        {
            _db.ResourceLocks.RemoveRange(expired);
            await _db.SaveChangesAsync();
        }
    }
}
