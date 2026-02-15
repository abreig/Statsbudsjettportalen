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

public record CreateCommentDto(
    string CommentText,
    string? AnchorText,
    string CommentId
);

public record ReplyCommentDto(
    string CommentText
);
