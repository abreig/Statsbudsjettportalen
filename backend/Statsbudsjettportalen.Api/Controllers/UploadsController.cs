using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Statsbudsjettportalen.Api.Helpers;

namespace Statsbudsjettportalen.Api.Controllers;

[ApiController]
[Route("api/uploads")]
[Authorize]
public class UploadsController : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];
    private readonly IWebHostEnvironment _env;

    public UploadsController(IWebHostEnvironment env)
    {
        _env = env;
    }

    [HttpPost("image")]
    public async Task<ActionResult<ImageUploadResponseDto>> UploadImage(IFormFile file)
    {
        if (file.Length == 0)
            return BadRequest("Ingen fil");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest($"Filtype ikke tillatt. Gyldige typer: {string.Join(", ", AllowedExtensions)}");

        if (file.Length > 10 * 1024 * 1024)
            return BadRequest("Filen er for stor. Maks 10 MB.");

        var imagesDir = Path.Combine(_env.WebRootPath, "uploads", "images");
        Directory.CreateDirectory(imagesDir);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(imagesDir, fileName);

        if (ext == ".svg")
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var rawSvg = await reader.ReadToEndAsync();
            string sanitized;
            try { sanitized = SvgSanitizer.Sanitize(rawSvg); }
            catch (InvalidOperationException) { return BadRequest("Ugyldig SVG-fil."); }
            await System.IO.File.WriteAllTextAsync(filePath, sanitized);
        }
        else
        {
            await using var stream = System.IO.File.Create(filePath);
            await file.CopyToAsync(stream);
        }

        var url = $"/uploads/images/{fileName}";
        return Ok(new ImageUploadResponseDto(url));
    }
}

public record ImageUploadResponseDto(string Url);
