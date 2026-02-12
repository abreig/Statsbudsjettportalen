using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Statsbudsjettportalen.Api.Data;
using Statsbudsjettportalen.Api.Middleware;
using Statsbudsjettportalen.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Host=localhost;Database=statsbudsjett;Username=statsbudsjett;Password=localdev"));

// Services
builder.Services.AddSingleton<WorkflowService>();

// JWT secret from config (falls back to default for local dev)
var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? MockAuth.DefaultSecretKey;
MockAuth.Configure(jwtSecret);

// Authentication (mock JWT)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "statsbudsjettportalen-poc",
            ValidAudience = "statsbudsjettportalen-poc",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };
    });

builder.Services.AddAuthorization();

// CORS
var isCodespaces = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("CODESPACES"));
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173"];

// In Codespaces, dynamically allow the forwarded frontend origin
if (isCodespaces)
{
    var codespaceName = Environment.GetEnvironmentVariable("CODESPACE_NAME") ?? "";
    var domain = Environment.GetEnvironmentVariable("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN")
        ?? "app.github.dev";
    allowedOrigins =
    [
        ..allowedOrigins,
        $"https://{codespaceName}-5173.{domain}",
        $"https://{codespaceName}-5000.{domain}",
    ];
}

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment() || isCodespaces)
        {
            // In dev/Codespaces: reflect any origin (needed for dynamic Codespaces URLs)
            policy.SetIsOriginAllowed(_ => true)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Port binding
if (isCodespaces)
{
    // Codespaces: bind to 0.0.0.0 so port forwarder can reach the backend
    builder.WebHost.UseUrls("http://0.0.0.0:5000");
}
else if (!builder.Environment.IsDevelopment())
{
    // Azure / production: use PORT env var
    var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

var app = builder.Build();

// Auto-migrate and seed on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();
    try
    {
        await db.Database.MigrateAsync();
        logger.LogInformation("Database migration completed successfully");
        await SeedData.SeedAsync(db);
        logger.LogInformation("Seed data check completed");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database migration/seed failed");
        throw;
    }
}

// Swagger - available in Development or when explicitly enabled
if (app.Environment.IsDevelopment() ||
    builder.Configuration.GetValue<bool>("EnableSwagger"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Serve React frontend from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

// API health check (Azure health probe)
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "ok",
    timestamp = DateTime.UtcNow,
    environment = app.Environment.EnvironmentName
}));

app.MapControllers();

// SPA fallback: any non-API, non-file route returns index.html
app.MapFallbackToFile("index.html");

app.Run();
