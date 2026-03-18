using System.Xml.Linq;

namespace Statsbudsjettportalen.Api.Helpers;

/// <summary>
/// Strips potentially dangerous elements and attributes from SVG content
/// to prevent stored XSS via uploaded SVG files.
/// </summary>
public static class SvgSanitizer
{
    private static readonly HashSet<string> DangerousElements =
    [
        "script", "use", "iframe", "object", "embed", "foreignobject", "animate",
    ];

    /// <summary>
    /// Parses and sanitizes SVG XML. Throws <see cref="InvalidOperationException"/>
    /// if the content is not valid XML.
    /// </summary>
    public static string Sanitize(string svgContent)
    {
        XDocument doc;
        try
        {
            doc = XDocument.Parse(svgContent);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Ugyldig SVG-fil.", ex);
        }

        // Remove dangerous elements
        var toRemove = doc.Descendants()
            .Where(e => DangerousElements.Contains(e.Name.LocalName.ToLowerInvariant()))
            .ToList();
        foreach (var el in toRemove)
            el.Remove();

        // Remove dangerous attributes from remaining elements
        foreach (var el in doc.Descendants())
        {
            var dangerousAttrs = el.Attributes()
                .Where(a =>
                    // Event handlers: onclick, onload, onmouseover, etc.
                    a.Name.LocalName.StartsWith("on", StringComparison.OrdinalIgnoreCase) ||
                    // href on non-<a> elements (e.g. javascript: URIs on <image>, <svg>)
                    (a.Name.LocalName.Equals("href", StringComparison.OrdinalIgnoreCase) &&
                     !el.Name.LocalName.Equals("a", StringComparison.OrdinalIgnoreCase)) ||
                    // xlink:href (namespaced — legacy SVG linking)
                    (!string.IsNullOrEmpty(a.Name.NamespaceName) &&
                     a.Name.LocalName.Equals("href", StringComparison.OrdinalIgnoreCase)))
                .ToList();

            foreach (var attr in dangerousAttrs)
                attr.Remove();
        }

        return doc.ToString();
    }
}
