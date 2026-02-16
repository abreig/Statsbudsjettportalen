using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

public class ResourceLock
{
    [Key]
    public Guid Id { get; set; }

    [Required, MaxLength(30)]
    public string ResourceType { get; set; } = string.Empty;

    public Guid ResourceId { get; set; }

    public Guid LockedBy { get; set; }
    public User LockedByUser { get; set; } = null!;

    public DateTime LockedAt { get; set; } = DateTime.UtcNow;

    public DateTime ExpiresAt { get; set; }

    public DateTime LastHeartbeat { get; set; } = DateTime.UtcNow;
}
