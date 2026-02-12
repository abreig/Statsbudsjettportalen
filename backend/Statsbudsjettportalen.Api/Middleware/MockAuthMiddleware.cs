using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Statsbudsjettportalen.Api.Middleware;

public static class MockAuth
{
    public const string DefaultSecretKey = "poc-secret-key-not-for-production-use-only-minimum-32-chars";

    private static string? _configuredSecret;

    public static void Configure(string secret) => _configuredSecret = secret;

    public static string SecretKey => _configuredSecret ?? DefaultSecretKey;

    public static string GenerateToken(Guid userId, string email, string role, Guid departmentId)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, role),
            new Claim("department_id", departmentId.ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: "statsbudsjettportalen-poc",
            audience: "statsbudsjettportalen-poc",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException());

    public static string GetUserRole(ClaimsPrincipal user) =>
        user.FindFirst(ClaimTypes.Role)?.Value ?? throw new UnauthorizedAccessException();

    public static Guid GetDepartmentId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirst("department_id")?.Value ?? throw new UnauthorizedAccessException());
}
