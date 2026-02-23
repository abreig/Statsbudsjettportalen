using System.ComponentModel.DataAnnotations;

namespace Statsbudsjettportalen.Api.DTOs;

/// SIKKERHETSFIKSING: Lagt til [MaxLength] og [Required] validering på alle inndata-DTOer
/// for å hindre lagring av ubegrensede strenger og potensielt DoS via store payloads.

public record CaseCreateDto(
    Guid BudgetRoundId,
    [Required][MaxLength(300)] string CaseName,
    [Required][MaxLength(50)] string CaseType,
    [MaxLength(20)] string? Chapter,
    [MaxLength(20)] string? Post,
    long? Amount,
    // Initial content fields
    [MaxLength(100_000)] string? ProposalText,
    [MaxLength(100_000)] string? Justification,
    [MaxLength(100_000)] string? VerbalConclusion,
    [MaxLength(100_000)] string? SocioeconomicAnalysis,
    [MaxLength(100_000)] string? GoalIndicator,
    [MaxLength(100_000)] string? BenefitPlan,
    [MaxLength(100_000)] string? Comment
);

public record CaseUpdateDto(
    [MaxLength(300)] string? CaseName,
    [MaxLength(20)] string? Chapter,
    [MaxLength(20)] string? Post,
    long? Amount,
    [MaxLength(10)] string? FinListPlacement,
    int? PriorityNumber
);

public record CaseContentUpdateDto(
    [MaxLength(300)] string? CaseName,
    [MaxLength(20)] string? Chapter,
    [MaxLength(20)] string? Post,
    long? Amount,
    long? FinAmount,
    long? GovAmount,
    [MaxLength(100_000)] string? ProposalText,
    [MaxLength(100_000)] string? Justification,
    [MaxLength(100_000)] string? VerbalConclusion,
    [MaxLength(100_000)] string? SocioeconomicAnalysis,
    [MaxLength(100_000)] string? GoalIndicator,
    [MaxLength(100_000)] string? BenefitPlan,
    [MaxLength(100_000)] string? Comment,
    [MaxLength(100_000)] string? FinAssessment,
    [MaxLength(100_000)] string? FinVerbal,
    [MaxLength(100_000)] string? FinRConclusion
);

public record StatusChangeDto(
    [Required][MaxLength(50)] string Status,
    [MaxLength(5_000)] string? Reason,
    [MaxLength(5_000)] string? Comment
);

public record CaseResponseDto(
    Guid Id,
    Guid BudgetRoundId,
    Guid DepartmentId,
    string DepartmentCode,
    string CaseName,
    string? Chapter,
    string? Post,
    long? Amount,
    long? FinAmount,
    long? GovAmount,
    string CaseType,
    string Status,
    Guid? AssignedTo,
    string? AssignedToName,
    Guid? FinAssignedTo,
    string? FinAssignedToName,
    Guid CreatedBy,
    string CreatedByName,
    string Origin,
    string? ResponsibleDivision,
    string? FinListPlacement,
    int? PriorityNumber,
    int Version,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    CaseContentDto? CurrentContent,
    List<CaseOpinionDto>? Opinions
);

// Opinion (uttalelse/godkjenning) DTOs
public record CaseOpinionDto(
    Guid Id,
    Guid CaseId,
    string Type,
    Guid RequestedBy,
    string RequestedByName,
    Guid AssignedTo,
    string AssignedToName,
    string Status,
    string? OpinionText,
    string? RequestComment,
    Guid? ForwardedFromId,
    Guid? OriginalOpinionId,
    DateTime CreatedAt,
    DateTime? ResolvedAt
);

public record CreateOpinionDto(
    [Required][MaxLength(300)] string AssignedTo,
    [MaxLength(20)] string Type = "uttalelse",
    [MaxLength(5_000)] string? Comment = null
);

public record ForwardApprovalDto(
    Guid ForwardTo
);

public record ChangeResponsibleDto(
    Guid NewAssignedTo
);

public record ResolveOpinionDto(
    [Required][MaxLength(20)] string Status,   // "given" or "declined"
    [MaxLength(100_000)] string? OpinionText
);

public record CaseContentDto(
    Guid Id,
    int Version,
    string? CaseName,
    string? Chapter,
    string? Post,
    long? Amount,
    long? FinAmount,
    long? GovAmount,
    string? Status,
    string? ProposalText,
    string? Justification,
    string? VerbalConclusion,
    string? SocioeconomicAnalysis,
    string? GoalIndicator,
    string? BenefitPlan,
    string? Comment,
    string? FinAssessment,
    string? FinVerbal,
    string? FinRConclusion,
    Guid CreatedBy,
    string CreatedByName,
    DateTime CreatedAt,
    string? ContentJson = null,
    bool TrackChangesActive = false
);

/// <summary>
/// DTO for saving the full ProseMirror document (Fase 2).
/// The backend splits the document into individual fields for backwards compatibility.
/// SIKKERHETSFIKSING: Lagt til MaxLength(5_000_000) på ContentJson (5 MB grense).
/// </summary>
public record DocumentSaveDto(
    [Required][MaxLength(5_000_000)] string ContentJson,
    [MaxLength(300)] string? CaseName = null,
    [MaxLength(20)] string? Chapter = null,
    [MaxLength(20)] string? Post = null,
    long? Amount = null,
    long? FinAmount = null,
    long? GovAmount = null,
    bool TrackChangesActive = false,
    int? ExpectedVersion = null
);

public record CaseEventDto(
    Guid Id,
    string EventType,
    string? EventData,
    Guid UserId,
    string UserName,
    DateTime CreatedAt
);

/// <summary>
/// Lightweight DTO for case list endpoints — excludes content_json to reduce payload.
/// Typically 1 KB per case vs 5-50 KB with full content.
/// </summary>
public record CaseListItemDto(
    Guid Id,
    Guid BudgetRoundId,
    Guid DepartmentId,
    string DepartmentCode,
    string CaseName,
    string? Chapter,
    string? Post,
    long? Amount,
    long? FinAmount,
    long? GovAmount,
    string CaseType,
    string Status,
    Guid? AssignedTo,
    string? AssignedToName,
    Guid? FinAssignedTo,
    string? FinAssignedToName,
    Guid CreatedBy,
    string CreatedByName,
    string Origin,
    string? ResponsibleDivision,
    string? FinListPlacement,
    int? PriorityNumber,
    int Version,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

/// <summary>
/// DTO for export job status polling.
/// </summary>
public record ExportJobDto(
    Guid Id,
    string JobType,
    string Status,
    string? ResultUrl,
    string? ErrorMessage,
    DateTime CreatedAt,
    DateTime? StartedAt,
    DateTime? CompletedAt
);
