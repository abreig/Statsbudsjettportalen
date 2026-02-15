using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.Models;

public class CaseComment
{
    [Key]
    public Guid Id { get; set; }

    public Guid CaseId { get; set; }
    public Case Case { get; set; } = null!;

    /// <summary>
    /// The ProseMirror mark commentId (UUID) linking this comment to text in the document.
    /// </summary>
    [MaxLength(50)]
    public string CommentId { get; set; } = string.Empty;

    /// <summary>
    /// The comment text.
    /// </summary>
    public string CommentText { get; set; } = string.Empty;

    /// <summary>
    /// Snapshot of the anchor text at the time the comment was created.
    /// </summary>
    public string? AnchorText { get; set; }

    /// <summary>
    /// Comment status: open, resolved, closed.
    /// </summary>
    [MaxLength(20)]
    public string Status { get; set; } = "open";

    /// <summary>
    /// Parent comment ID for threading (null for root comments).
    /// </summary>
    public Guid? ParentCommentId { get; set; }
    public CaseComment? ParentComment { get; set; }

    public ICollection<CaseComment> Replies { get; set; } = new List<CaseComment>();

    public Guid AuthorId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ResolvedAt { get; set; }
    public Guid? ResolvedBy { get; set; }
}
