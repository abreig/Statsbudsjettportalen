namespace Statsbudsjettportalen.Api.DTOs;

public record AcquireLockDto(
    string ResourceType,
    Guid ResourceId
);

public record LockResponseDto(
    Guid Id,
    string ResourceType,
    Guid ResourceId,
    Guid LockedBy,
    string LockedByName,
    DateTime LockedAt,
    DateTime ExpiresAt
);
