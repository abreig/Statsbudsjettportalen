namespace Statsbudsjettportalen.Api.Services;

public class WorkflowService
{
    // Main workflow with both forward and backward transitions
    private static readonly Dictionary<string, List<string>> ValidTransitions = new()
    {
        ["draft"] = ["under_arbeid"],
        ["under_arbeid"] = ["til_avklaring", "draft"],
        ["til_avklaring"] = ["klarert", "under_arbeid"],
        ["klarert"] = ["godkjent_pol", "under_arbeid", "til_avklaring"],
        ["godkjent_pol"] = ["sendt_til_fin", "under_arbeid", "til_avklaring", "klarert"],
        ["sendt_til_fin"] = ["under_vurdering_fin", "godkjent_pol", "klarert"],
        ["under_vurdering_fin"] = ["returnert_til_fag", "avvist_av_fin", "ferdigbehandlet_fin", "sendt_til_fin"],
        ["returnert_til_fag"] = ["under_arbeid"],
        ["avvist_av_fin"] = [],
        ["ferdigbehandlet_fin"] = ["sendt_til_regjeringen", "under_vurdering_fin"],
        ["sendt_til_regjeringen"] = ["regjeringsbehandlet", "ferdigbehandlet_fin"],
    };

    private static readonly HashSet<string> FagRoles =
    [
        "saksbehandler_fag", "budsjettenhet_fag",
        "underdirektor_fag", "avdelingsdirektor_fag",
        "ekspedisjonssjef_fag", "departementsraad_fag",
    ];

    private static readonly HashSet<string> FinRoles =
    [
        "saksbehandler_fin", "underdirektor_fin",
        "avdelingsdirektor_fin", "ekspedisjonssjef_fin",
        "departementsraad_fin",
    ];

    private static readonly HashSet<string> FagLeaderRoles =
    [
        "budsjettenhet_fag", "underdirektor_fag", "avdelingsdirektor_fag",
        "ekspedisjonssjef_fag", "departementsraad_fag",
    ];

    private static readonly HashSet<string> FinLeaderRoles =
    [
        "underdirektor_fin", "avdelingsdirektor_fin",
        "ekspedisjonssjef_fin", "departementsraad_fin",
    ];

    // Shared FAG leader transitions (same as budsjettenhet_fag)
    private static readonly HashSet<string> FagLeaderTransitions =
    [
        "draft->under_arbeid", "under_arbeid->til_avklaring", "under_arbeid->draft",
        "til_avklaring->klarert", "til_avklaring->under_arbeid",
        "klarert->godkjent_pol", "klarert->under_arbeid", "klarert->til_avklaring",
        "godkjent_pol->sendt_til_fin", "godkjent_pol->under_arbeid", "godkjent_pol->til_avklaring", "godkjent_pol->klarert",
        "sendt_til_fin->godkjent_pol",
    ];

    // Shared FIN leader transitions
    private static readonly HashSet<string> FinLeaderTransitions =
    [
        "sendt_til_fin->under_vurdering_fin",
        "sendt_til_fin->klarert",
        "under_vurdering_fin->ferdigbehandlet_fin",
        "under_vurdering_fin->returnert_til_fag",
        "under_vurdering_fin->avvist_av_fin",
        "under_vurdering_fin->sendt_til_fin",
        "ferdigbehandlet_fin->sendt_til_regjeringen",
        "ferdigbehandlet_fin->under_vurdering_fin",
        "sendt_til_regjeringen->regjeringsbehandlet",
        "sendt_til_regjeringen->ferdigbehandlet_fin",
    ];

    private static readonly Dictionary<string, HashSet<string>> RoleTransitions = new()
    {
        ["saksbehandler_fag"] = [
            "draft->under_arbeid", "under_arbeid->til_avklaring", "under_arbeid->draft",
        ],
        ["budsjettenhet_fag"] = FagLeaderTransitions,
        ["underdirektor_fag"] = FagLeaderTransitions,
        ["avdelingsdirektor_fag"] = FagLeaderTransitions,
        ["ekspedisjonssjef_fag"] = FagLeaderTransitions,
        ["departementsraad_fag"] = FagLeaderTransitions,
        ["saksbehandler_fin"] = [
            "sendt_til_fin->under_vurdering_fin",
            "sendt_til_fin->klarert",
            "under_vurdering_fin->returnert_til_fag",
            "under_vurdering_fin->avvist_av_fin",
            "under_vurdering_fin->ferdigbehandlet_fin",
            "under_vurdering_fin->sendt_til_fin",
            "ferdigbehandlet_fin->sendt_til_regjeringen",
            "ferdigbehandlet_fin->under_vurdering_fin",
        ],
        ["underdirektor_fin"] = [
            "sendt_til_fin->klarert",
            "under_vurdering_fin->ferdigbehandlet_fin",
            "ferdigbehandlet_fin->sendt_til_regjeringen",
            "ferdigbehandlet_fin->under_vurdering_fin",
            "sendt_til_regjeringen->regjeringsbehandlet",
            "sendt_til_regjeringen->ferdigbehandlet_fin",
        ],
        ["avdelingsdirektor_fin"] = FinLeaderTransitions,
        ["ekspedisjonssjef_fin"] = FinLeaderTransitions,
        ["departementsraad_fin"] = FinLeaderTransitions,
        ["administrator"] = [
            "draft->under_arbeid", "under_arbeid->til_avklaring", "under_arbeid->draft",
            "til_avklaring->klarert", "til_avklaring->under_arbeid",
            "klarert->godkjent_pol", "klarert->under_arbeid", "klarert->til_avklaring",
            "godkjent_pol->sendt_til_fin", "godkjent_pol->under_arbeid", "godkjent_pol->til_avklaring", "godkjent_pol->klarert",
            "sendt_til_fin->under_vurdering_fin", "sendt_til_fin->godkjent_pol", "sendt_til_fin->klarert",
            "under_vurdering_fin->returnert_til_fag", "under_vurdering_fin->avvist_av_fin", "under_vurdering_fin->ferdigbehandlet_fin", "under_vurdering_fin->sendt_til_fin",
            "returnert_til_fag->under_arbeid",
            "ferdigbehandlet_fin->sendt_til_regjeringen", "ferdigbehandlet_fin->under_vurdering_fin",
            "sendt_til_regjeringen->regjeringsbehandlet", "sendt_til_regjeringen->ferdigbehandlet_fin",
        ],
    };

    /// <summary>Statuses where FIN fields should be hidden from FAG users.</summary>
    public static readonly HashSet<string> FinFieldsHiddenFromFag = [
        "sendt_til_fin", "under_vurdering_fin", "returnert_til_fag", "avvist_av_fin", "ferdigbehandlet_fin",
    ];

    /// <summary>Statuses where FAG can see FIN's completed assessments.</summary>
    public static readonly HashSet<string> FinFieldsVisibleToFag = [
        "sendt_til_regjeringen", "regjeringsbehandlet",
    ];

    /// <summary>Statuses visible to FIN users (sendt_til_fin and later).</summary>
    public static readonly HashSet<string> FinVisibleStatuses = [
        "sendt_til_fin", "under_vurdering_fin", "returnert_til_fag", "avvist_av_fin",
        "ferdigbehandlet_fin", "sendt_til_regjeringen", "regjeringsbehandlet",
    ];

    /// <summary>Pre-FIN statuses: if case moves here, clear FinAssignedTo.</summary>
    public static readonly HashSet<string> PreFinStatuses = [
        "draft", "under_arbeid", "til_avklaring", "klarert", "godkjent_pol",
    ];

    public bool IsValidTransition(string currentStatus, string newStatus)
    {
        return ValidTransitions.TryGetValue(currentStatus, out var allowed) && allowed.Contains(newStatus);
    }

    public bool CanUserTransition(string currentStatus, string newStatus, string userRole)
    {
        if (!IsValidTransition(currentStatus, newStatus)) return false;
        var key = $"{currentStatus}->{newStatus}";
        return RoleTransitions.TryGetValue(userRole, out var transitions) && transitions.Contains(key);
    }

    public List<string> GetAllowedTransitions(string currentStatus, string userRole)
    {
        if (!ValidTransitions.TryGetValue(currentStatus, out var allAllowed)) return [];
        if (!RoleTransitions.TryGetValue(userRole, out var roleTransitions)) return [];
        return allAllowed.Where(s => roleTransitions.Contains($"{currentStatus}->{s}")).ToList();
    }

    public bool IsFagRole(string role) => FagRoles.Contains(role);
    public bool IsFinRole(string role) => FinRoles.Contains(role);
    public bool IsFagLeader(string role) => FagLeaderRoles.Contains(role);
    public bool IsFinLeader(string role) => FinLeaderRoles.Contains(role);
    public bool IsLeader(string role) => IsFagLeader(role) || IsFinLeader(role);

    /// <summary>Whether FIN fields should be visible in the response for this role+status combo.</summary>
    public bool ShouldShowFinFields(string role, string status)
    {
        if (IsFinRole(role) || role == "administrator") return true;
        return FinFieldsVisibleToFag.Contains(status);
    }

    public bool IsCaseClosedStatus(string status) =>
        status is "regjeringsbehandlet" or "avvist_av_fin";

    /// <summary>Check if user can change the responsible handler for a case.</summary>
    public bool CanChangeResponsible(string userRole, Guid userId, Guid? currentAssignedTo)
    {
        if (currentAssignedTo.HasValue && currentAssignedTo.Value == userId) return true;
        return userRole is "budsjettenhet_fag"
            or "underdirektor_fag" or "avdelingsdirektor_fag"
            or "ekspedisjonssjef_fag" or "departementsraad_fag"
            or "underdirektor_fin" or "avdelingsdirektor_fin"
            or "ekspedisjonssjef_fin" or "departementsraad_fin"
            or "administrator";
    }

    /// <summary>Check if case is locked by pending sub-processes (opinions/approvals).</summary>
    public static bool IsCaseLockedBySubProcess(ICollection<Models.CaseOpinion>? opinions)
    {
        if (opinions == null || opinions.Count == 0) return false;
        return opinions.Any(o => o.Status == "pending");
    }
}
