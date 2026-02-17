using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Statsbudsjettportalen.Api.Models;

public class ExportJob
{
    [Key]
    public Guid Id { get; set; }

    [Required, MaxLength(30)]
    public string JobType { get; set; } = string.Empty; // "department_list_word", "case_list_excel", etc.

    [Required, MaxLength(20)]
    public string Status { get; set; } = "queued"; // "queued", "processing", "completed", "failed"

    public Guid RequestedBy { get; set; }

    [Column(TypeName = "jsonb")]
    public string Parameters { get; set; } = "{}";

    [MaxLength(500)]
    public string? ResultUrl { get; set; }

    public string? ErrorMessage { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
