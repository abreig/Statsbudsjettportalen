using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

public class DepartmentListTemplate
{
    [Key]
    public Guid Id { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string BudgetRoundType { get; set; } = string.Empty; // "mars", "august", "rnb"

    [MaxLength(50)]
    public string DepartmentNamePlaceholder { get; set; } = "XX";

    public bool IsActive { get; set; } = true;

    public string? ClassificationText { get; set; }

    public Guid CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<DepartmentListTemplateSection> Sections { get; set; } = new List<DepartmentListTemplateSection>();
}
