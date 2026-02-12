namespace Statsbudsjettportalen.Api.DTOs;

public record BudgetRoundDto(
    Guid Id,
    string Name,
    string Type,
    int Year,
    string Status,
    DateTime? Deadline,
    int CaseCount
);
