namespace Statsbudsjettportalen.Api.DTOs;

public record LoginRequest(string Email);

public record LoginResponse(string Token, UserDto User);

public record UserDto(
    Guid Id,
    string Email,
    string FullName,
    Guid DepartmentId,
    string DepartmentCode,
    string DepartmentName,
    string Role,
    string? Division,
    string? Section,
    string? JobTitle,
    string? LeaderLevel,
    List<AssignedDepartmentDto>? AssignedDepartments
);

public record AssignedDepartmentDto(
    Guid DepartmentId,
    string DepartmentCode,
    string DepartmentName,
    bool IsPrimary
);
