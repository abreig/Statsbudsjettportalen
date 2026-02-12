namespace Statsbudsjettportalen.Api.DTOs;

public record CaseCreateDto(
    Guid BudgetRoundId,
    string CaseName,
    string CaseType,
    string? Chapter,
    string? Post,
    long? Amount,
    // Initial content fields
    string? ProposalText,
    string? Justification,
    string? VerbalConclusion,
    string? SocioeconomicAnalysis,
    string? GoalIndicator,
    string? BenefitPlan,
    string? Comment
);

public record CaseUpdateDto(
    string? CaseName,
    string? Chapter,
    string? Post,
    long? Amount
);

public record CaseContentUpdateDto(
    string? ProposalText,
    string? Justification,
    string? VerbalConclusion,
    string? SocioeconomicAnalysis,
    string? GoalIndicator,
    string? BenefitPlan,
    string? Comment,
    string? FinAssessment,
    string? FinVerbal,
    string? FinRConclusion
);

public record StatusChangeDto(
    string Status,
    string? Reason
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
    string CaseType,
    string Status,
    Guid? AssignedTo,
    string? AssignedToName,
    Guid CreatedBy,
    string CreatedByName,
    string Origin,
    int Version,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    CaseContentDto? CurrentContent
);

public record CaseContentDto(
    Guid Id,
    int Version,
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
    DateTime CreatedAt
);

public record CaseEventDto(
    Guid Id,
    string EventType,
    string? EventData,
    Guid UserId,
    string UserName,
    DateTime CreatedAt
);
