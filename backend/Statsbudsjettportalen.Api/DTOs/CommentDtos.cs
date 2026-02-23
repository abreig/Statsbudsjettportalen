using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.DTOs;

public record CaseCommentDto(
    Guid Id,
    Guid CaseId,
    string CommentText,
    string? AnchorText,
    string CommentId,
    string AuthorId,
    string AuthorName,
    string Status,
    Guid? ParentCommentId,
    DateTime CreatedAt,
    DateTime? ResolvedAt,
    string? ResolvedByName,
    List<CaseCommentDto> Replies
);

/// SIKKERHETSFIKSING: Lagt til lengdebegrensninger på inndata-felt.
public record CreateCommentDto(
    [Required][MaxLength(10_000)] string CommentText,
    [MaxLength(500)] string? AnchorText,
    [Required][MaxLength(100)] string CommentId
);

public record ReplyCommentDto(
    [Required][MaxLength(10_000)] string CommentText
);
