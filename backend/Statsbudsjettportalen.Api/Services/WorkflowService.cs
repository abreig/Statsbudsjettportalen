namespace Statsbudsjettportalen.Api.Services;

public class WorkflowService
{
    // Main workflow: draft → ... → ferdigbehandlet_fin → sendt_til_regjeringen → regjeringsbehandlet
    private static readonly Dictionary<string, List<string>> ValidTransitions = new()
    {
        ["draft"] = ["under_arbeid"],
        ["under_arbeid"] = ["til_avklaring", "draft"],
        ["til_avklaring"] = ["klarert", "under_arbeid"],
        ["klarert"] = ["godkjent_pol", "under_arbeid"],
        ["godkjent_pol"] = ["sendt_til_fin", "under_arbeid"],
        ["sendt_til_fin"] = ["under_vurdering_fin"],
        ["under_vurdering_fin"] = ["returnert_til_fag", "ferdigbehandlet_fin"],
        ["returnert_til_fag"] = ["under_arbeid"],
        ["ferdigbehandlet_fin"] = ["sendt_til_regjeringen"],
        ["sendt_til_regjeringen"] = ["regjeringsbehandlet"],
    };

    private static readonly HashSet<string> FagRoles = ["saksbehandler_fag", "budsjettenhet_fag", "leder_fag"];
    private static readonly HashSet<string> FinRoles = ["saksbehandler_fin", "underdirektor_fin", "leder_fin"];

    private static readonly Dictionary<string, HashSet<string>> RoleTransitions = new()
    {
        ["saksbehandler_fag"] = [
            "draft->under_arbeid", "under_arbeid->til_avklaring", "under_arbeid->draft",
        ],
        ["budsjettenhet_fag"] = [
            "draft->under_arbeid", "under_arbeid->til_avklaring", "under_arbeid->draft",
            "til_avklaring->klarert", "til_avklaring->under_arbeid",
            "klarert->godkjent_pol", "klarert->under_arbeid",
            "godkjent_pol->sendt_til_fin", "godkjent_pol->under_arbeid",
        ],
        ["saksbehandler_fin"] = [
            "sendt_til_fin->under_vurdering_fin",
            "under_vurdering_fin->returnert_til_fag",
            "under_vurdering_fin->ferdigbehandlet_fin",
            "ferdigbehandlet_fin->sendt_til_regjeringen",
        ],
        ["underdirektor_fin"] = [
            "under_vurdering_fin->ferdigbehandlet_fin",
            "ferdigbehandlet_fin->sendt_til_regjeringen",
            "sendt_til_regjeringen->regjeringsbehandlet",
        ],
        ["leder_fag"] = [
            "draft->under_arbeid", "under_arbeid->til_avklaring", "under_arbeid->draft",
            "til_avklaring->klarert", "til_avklaring->under_arbeid",
            "klarert->godkjent_pol", "klarert->under_arbeid",
            "godkjent_pol->sendt_til_fin", "godkjent_pol->under_arbeid",
        ],
        ["leder_fin"] = [
            "sendt_til_fin->under_vurdering_fin",
            "under_vurdering_fin->ferdigbehandlet_fin",
            "under_vurdering_fin->returnert_til_fag",
            "ferdigbehandlet_fin->sendt_til_regjeringen",
            "sendt_til_regjeringen->regjeringsbehandlet",
        ],
        ["administrator"] = [
            "draft->under_arbeid", "under_arbeid->til_avklaring",
            "til_avklaring->klarert", "klarert->godkjent_pol",
            "godkjent_pol->sendt_til_fin", "sendt_til_fin->under_vurdering_fin",
            "under_vurdering_fin->returnert_til_fag", "under_vurdering_fin->ferdigbehandlet_fin",
            "returnert_til_fag->under_arbeid",
            "ferdigbehandlet_fin->sendt_til_regjeringen",
            "sendt_til_regjeringen->regjeringsbehandlet",
        ],
    };

    /// <summary>Statuses where FIN fields should be hidden from FAG users.</summary>
    public static readonly HashSet<string> FinFieldsHiddenFromFag = [
        "sendt_til_fin", "under_vurdering_fin", "returnert_til_fag", "ferdigbehandlet_fin",
    ];

    /// <summary>Statuses where FAG can see FIN's completed assessments.</summary>
    public static readonly HashSet<string> FinFieldsVisibleToFag = [
        "sendt_til_regjeringen", "regjeringsbehandlet",
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

    public bool IsFagEditableStatus(string status) =>
        status is "draft" or "under_arbeid" or "returnert_til_fag";

    public bool IsFinEditableStatus(string status) =>
        status is "under_vurdering_fin";

    /// <summary>Whether FIN fields should be visible in the response for this role+status combo.</summary>
    public bool ShouldShowFinFields(string role, string status)
    {
        if (IsFinRole(role) || role == "administrator") return true;
        // FAG can see FIN fields only after "sendt_til_regjeringen"
        return FinFieldsVisibleToFag.Contains(status);
    }

    public bool IsCaseClosedStatus(string status) =>
        status is "regjeringsbehandlet";

    /// <summary>Check if user can change the responsible handler for a case.</summary>
    public bool CanChangeResponsible(string userRole, Guid userId, Guid? currentAssignedTo)
    {
        if (currentAssignedTo.HasValue && currentAssignedTo.Value == userId) return true;
        return userRole is "leder_fag" or "leder_fin" or "budsjettenhet_fag" or "administrator";
    }

    /// <summary>Check if case is locked by pending sub-processes (opinions/approvals).</summary>
    public static bool IsCaseLockedBySubProcess(ICollection<Models.CaseOpinion>? opinions)
    {
        if (opinions == null || opinions.Count == 0) return false;
        return opinions.Any(o => o.Status == "pending");
    }
}
