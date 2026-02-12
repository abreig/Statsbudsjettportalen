namespace Statsbudsjettportalen.Api.DTOs;

public record SubmissionCreateDto(
    Guid BudgetRoundId,
    List<Guid> CaseIds,
    bool IsSupplement = false
);

public record SubmissionDto(
    Guid Id,
    Guid BudgetRoundId,
    string BudgetRoundName,
    Guid DepartmentId,
    string DepartmentCode,
    Guid SubmittedBy,
    string SubmittedByName,
    bool IsSupplement,
    DateTime SubmittedAt,
    List<SubmissionCaseDto> Cases
);

public record SubmissionCaseDto(
    Guid CaseId,
    string CaseName,
    string CaseType,
    string Status,
    long? Amount
);
