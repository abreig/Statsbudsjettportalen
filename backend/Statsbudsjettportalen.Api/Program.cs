using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
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

// Redis distributed cache
var redisConnectionString = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrEmpty(redisConnectionString))
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnectionString;
        options.InstanceName = "statsbudsjett:";
    });
}
else
{
    // Fallback to in-memory distributed cache for local dev without Redis
    builder.Services.AddDistributedMemoryCache();
}

// Services
builder.Services.AddSingleton<WorkflowService>();
builder.Services.AddSingleton<WordExportService>();
builder.Services.AddScoped<ResourceLockService>();
builder.Services.AddScoped<DepartmentListService>();
builder.Services.AddScoped<CacheService>();
builder.Services.AddSingleton<ExportJobService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<ExportJobService>());

// Response compression (gzip + brotli)
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
    {
        "application/json",
        "application/javascript",
        "text/css",
    });
});

// Rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Export endpoints: 5 req/min per user
    options.AddPolicy("export", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            MockAuth.GetUserIdString(context.HttpContext.User),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
            }));

    // Save endpoints: 30 req/min per user
    options.AddPolicy("save", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            MockAuth.GetUserIdString(context.HttpContext.User),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
            }));

    // General API: 120 req/min per user
    options.AddPolicy("general", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            MockAuth.GetUserIdString(context.HttpContext.User),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
            }));
});

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

// Port binding – always bind 0.0.0.0 so port forwarding works in Codespaces / Docker
if (builder.Environment.IsDevelopment())
{
    builder.WebHost.UseUrls("http://0.0.0.0:5000");
}
else
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
        try
        {
            await db.Database.MigrateAsync();
        }
        catch (Exception ex) when (app.Environment.IsDevelopment())
        {
            // Migration error in dev: drop and recreate (safe for POC — never in production).
            logger.LogWarning(ex, "Migration failed in development mode. Dropping and recreating database...");
            await db.Database.EnsureDeletedAsync();
            await db.Database.MigrateAsync();
        }
        logger.LogInformation("Database migration completed successfully");

        // RESET_DATABASE=true → wipe all data and re-seed (useful after testing)
        var resetDb = Environment.GetEnvironmentVariable("RESET_DATABASE");
        if (string.Equals(resetDb, "true", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning("RESET_DATABASE=true detected - wiping and re-seeding...");
            await SeedData.ResetAndReseedAsync(db);
            logger.LogInformation("Database reset and reseed completed");
        }
        else
        {
            await SeedData.SeedAsync(db);
        }
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

// Response compression (before routing)
app.UseResponseCompression();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Rate limiting
app.UseRateLimiter();

// Serve React frontend from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

// Enhanced health check (checks DB + Redis connectivity)
app.MapGet("/api/health", async (AppDbContext db, Microsoft.Extensions.Caching.Distributed.IDistributedCache cache) =>
{
    var checks = new Dictionary<string, object>();
    var healthy = true;

    // Database check
    try
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        await db.Database.ExecuteSqlRawAsync("SELECT 1");
        sw.Stop();
        checks["database"] = new { status = "ok", responseTimeMs = sw.ElapsedMilliseconds };
    }
    catch (Exception ex)
    {
        healthy = false;
        checks["database"] = new { status = "error", message = ex.Message };
    }

    // Redis check
    try
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        await cache.SetStringAsync("_health", "ok", new Microsoft.Extensions.Caching.Distributed.DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(5),
        });
        var val = await cache.GetStringAsync("_health");
        sw.Stop();
        checks["redis"] = new { status = val == "ok" ? "ok" : "degraded", responseTimeMs = sw.ElapsedMilliseconds };
    }
    catch (Exception ex)
    {
        // Redis is optional — degrade gracefully
        checks["redis"] = new { status = "unavailable", message = ex.Message };
    }

    return Results.Ok(new
    {
        status = healthy ? "ok" : "degraded",
        timestamp = DateTime.UtcNow,
        environment = app.Environment.EnvironmentName,
        checks,
    });
});

app.MapControllers();

// SPA fallback: any non-API, non-file route returns index.html
app.MapFallbackToFile("index.html");

app.Run();
