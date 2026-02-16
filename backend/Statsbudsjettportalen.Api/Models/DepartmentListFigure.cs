using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

public class DepartmentListFigure
{
    [Key]
    public Guid Id { get; set; }

    public Guid DepartmentListId { get; set; }
    public DepartmentList DepartmentList { get; set; } = null!;

    public Guid SectionId { get; set; }
    public DepartmentListSection Section { get; set; } = null!;

    [Required, MaxLength(500)]
    public string FileUrl { get; set; } = string.Empty;

    [MaxLength(10)]
    public string FileType { get; set; } = "png"; // "png", "svg"

    public string? Caption { get; set; }

    public int WidthPercent { get; set; } = 100;

    public int SortOrder { get; set; }

    public Guid UploadedBy { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
