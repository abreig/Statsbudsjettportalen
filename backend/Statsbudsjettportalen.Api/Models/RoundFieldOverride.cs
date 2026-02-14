using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

/// <summary>
/// Tracks which content fields are considered "FIN fields" for a specific budget round + case type.
/// This preserves historical configuration: when fields change between rounds,
/// closed rounds keep their original FIN field definitions.
/// </summary>
public class RoundFieldOverride
{
    [Key]
    public Guid Id { get; set; }

    public Guid BudgetRoundId { get; set; }
    public BudgetRound BudgetRound { get; set; } = null!;

    [Required, MaxLength(50)]
    public string CaseTypeCode { get; set; } = "";

    /// <summary>
    /// JSON array of FIN field keys, e.g. ["finAssessment","finVerbal","finRConclusion"]
    /// </summary>
    [Required]
    public string FinFieldKeysJson { get; set; } = "[]";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
