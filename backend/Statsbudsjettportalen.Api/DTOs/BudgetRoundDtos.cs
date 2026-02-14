namespace Statsbudsjettportalen.Api.DTOs;

public record BudgetRoundDto(
    Guid Id,
    string Name,
    string Type,
    int Year,
    string Status,
    DateTime? Deadline,
    DateTime? ClosedAt,
    int CaseCount
);

public record RoundFieldOverrideDto(
    Guid Id,
    Guid BudgetRoundId,
    string CaseTypeCode,
    List<string> FinFieldKeys,
    DateTime UpdatedAt
);

public record UpdateRoundFieldOverrideDto(
    string CaseTypeCode,
    List<string> FinFieldKeys
);
