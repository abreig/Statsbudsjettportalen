using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Statsbudsjettportalen.Api.Models;

public class DepartmentListTemplateSection
{
    [Key]
    public Guid Id { get; set; }

    public Guid TemplateId { get; set; }
    public DepartmentListTemplate Template { get; set; } = null!;

    public Guid? ParentId { get; set; }
    public DepartmentListTemplateSection? Parent { get; set; }

    [MaxLength(500)]
    public string TitleTemplate { get; set; } = string.Empty;

    [MaxLength(40)]
    public string HeadingStyle { get; set; } = string.Empty; // "Deplisteoverskrift1", etc.

    [Required, MaxLength(40)]
    public string SectionType { get; set; } = string.Empty; // "department_header", "fixed_content", etc.

    public int SortOrder { get; set; }

    [Column(TypeName = "jsonb")]
    public string? Config { get; set; } // Section-specific JSONB configuration

    // Navigation
    public ICollection<DepartmentListTemplateSection> Children { get; set; } = new List<DepartmentListTemplateSection>();
}
