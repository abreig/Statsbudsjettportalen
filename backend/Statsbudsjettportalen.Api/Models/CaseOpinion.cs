using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

/// <summary>
/// Represents a request for opinion (uttalelse) or approval (godkjenning) on a case.
/// This is a parallel side-step in the workflow.
/// </summary>
public class CaseOpinion
{
    [Key]
    public Guid Id { get; set; }

    public Guid CaseId { get; set; }
    public Case Case { get; set; } = null!;

    [MaxLength(30)]
    public string Type { get; set; } = "uttalelse"; // "uttalelse" or "godkjenning"

    public Guid RequestedBy { get; set; } // Who sent it for opinion/approval

    public Guid AssignedTo { get; set; } // User who should give opinion/approval

    [MaxLength(30)]
    public string Status { get; set; } = "pending";
    // uttalelse: pending, given, declined
    // godkjenning: pending, approved, rejected, forwarded

    public string? OpinionText { get; set; }

    public Guid? ForwardedFromId { get; set; } // Self-reference for delegation chain
    public Guid? OriginalOpinionId { get; set; } // Root of forwarding chain

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
