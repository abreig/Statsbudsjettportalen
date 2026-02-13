using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

/// <summary>
/// Represents a request for opinion (uttalelse) on a case.
/// This is a parallel side-step in the workflow.
/// </summary>
public class CaseOpinion
{
    [Key]
    public Guid Id { get; set; }

    public Guid CaseId { get; set; }
    public Case Case { get; set; } = null!;

    public Guid RequestedBy { get; set; } // Who sent it for opinion

    public Guid AssignedTo { get; set; } // User who should give opinion

    [MaxLength(30)]
    public string Status { get; set; } = "pending"; // pending, given, declined

    public string? OpinionText { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
