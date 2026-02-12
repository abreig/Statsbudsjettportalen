using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

public class Clearance
{
    [Key]
    public Guid Id { get; set; }

    public Guid CaseId { get; set; }
    public Case Case { get; set; } = null!;

    public Guid RequestedBy { get; set; }
    public Guid AssignedTo { get; set; }

    [MaxLength(30)]
    public string? RoleType { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public string? Comment { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
