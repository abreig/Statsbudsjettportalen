using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Statsbudsjettportalen.Api.Models;

public class DepartmentListSection
{
    [Key]
    public Guid Id { get; set; }

    public Guid DepartmentListId { get; set; }
    public DepartmentList DepartmentList { get; set; } = null!;

    public Guid TemplateSectionId { get; set; }
    public DepartmentListTemplateSection TemplateSection { get; set; } = null!;

    public Guid? ParentId { get; set; }
    public DepartmentListSection? Parent { get; set; }

    [MaxLength(500)]
    public string? Title { get; set; } // Resolved title (with department name filled in)

    public int SortOrder { get; set; }

    [Column(TypeName = "jsonb")]
    public string? ContentJson { get; set; } // TipTap JSON for fixed_content/freetext sections

    // Navigation
    public ICollection<DepartmentListSection> Children { get; set; } = new List<DepartmentListSection>();
    public ICollection<DepartmentListCaseEntry> CaseEntries { get; set; } = new List<DepartmentListCaseEntry>();
}
