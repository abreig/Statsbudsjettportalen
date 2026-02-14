namespace Statsbudsjettportalen.Api.Services;

public static class RoleResolver
{
    private static readonly HashSet<string> SaksbehandlerTitles = new(StringComparer.OrdinalIgnoreCase)
    {
        "førstekonsulent", "rådgiver", "seniorrådgiver",
        "fagsjef", "fagdirektør", "spesialrådgiver"
    };

    private static readonly Dictionary<string, string> LeaderTitles = new(StringComparer.OrdinalIgnoreCase)
    {
        ["underdirektør"] = "underdirektor",
        ["avdelingsdirektør"] = "avdelingsdirektor",
        ["ekspedisjonssjef"] = "ekspedisjonssjef",
        ["departementsråd"] = "departementsraad"
    };

    public record ResolvedRole(string Role, string? LeaderLevel);

    public static ResolvedRole Resolve(string? jobTitle, string departmentCode, bool isBudsjettenhet = false)
    {
        var side = departmentCode.Equals("FIN", StringComparison.OrdinalIgnoreCase) ? "fin" : "fag";

        // Budsjettenhet overstyrer (kun FAG)
        if (side == "fag" && isBudsjettenhet)
            return new ResolvedRole("budsjettenhet_fag", null);

        var title = jobTitle?.Trim() ?? "";

        if (LeaderTitles.TryGetValue(title, out var level))
            return new ResolvedRole($"{level}_{side}", level);

        if (SaksbehandlerTitles.Contains(title))
            return new ResolvedRole($"saksbehandler_{side}", null);

        // Ukjent tittel → saksbehandler som default
        return new ResolvedRole($"saksbehandler_{side}", null);
    }

    /// <summary>
    /// Seksjon skal være null for ekspedisjonssjef og departementsråd.
    /// Avdeling skal være null for departementsråd.
    /// </summary>
    public static (string? Division, string? Section) CleanOrgFields(string? leaderLevel, string? division, string? section)
    {
        return leaderLevel switch
        {
            "departementsraad" => (null, null),
            "ekspedisjonssjef" => (division, null),
            _ => (division, section)
        };
    }
}
