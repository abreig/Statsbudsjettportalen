using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

public class Attachment
{
    [Key]
    public Guid Id { get; set; }

    public Guid CaseId { get; set; }
    public Case Case { get; set; } = null!;

    [Required, MaxLength(500)]
    public string FileName { get; set; } = string.Empty;

    [Required, MaxLength(1000)]
    public string FilePath { get; set; } = string.Empty;

    public long? FileSize { get; set; }

    [MaxLength(100)]
    public string? MimeType { get; set; }

    public Guid UploadedBy { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
