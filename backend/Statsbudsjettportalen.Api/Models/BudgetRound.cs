using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

public class BudgetRound
{
    [Key]
    public Guid Id { get; set; }

    [Required, MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Type { get; set; } = string.Empty;

    public int Year { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "open";

    public DateTime? Deadline { get; set; }

    public DateTime? ClosedAt { get; set; }

    public ICollection<Case> Cases { get; set; } = new List<Case>();
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
    public ICollection<RoundFieldOverride> FieldOverrides { get; set; } = new List<RoundFieldOverride>();
}
