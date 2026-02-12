namespace Statsbudsjettportalen.Api.Services;

public class WorkflowService
{
    private static readonly Dictionary<string, List<string>> ValidTransitions = new()
    {
        ["draft"] = ["under_arbeid"],
        ["under_arbeid"] = ["til_avklaring", "draft"],
        ["til_avklaring"] = ["klarert", "under_arbeid"],
        ["klarert"] = ["sendt_til_fin", "under_arbeid"],
        ["sendt_til_fin"] = ["under_vurdering_fin"],
        ["under_vurdering_fin"] = ["returnert_til_fag", "ferdigbehandlet_fin"],
        ["returnert_til_fag"] = ["under_arbeid"],
    };

    private static readonly HashSet<string> FagRoles = ["saksbehandler_fag", "budsjettenhet_fag"];
    private static readonly HashSet<string> FinRoles = ["saksbehandler_fin", "underdirektor_fin"];

    private static readonly Dictionary<string, HashSet<string>> RoleTransitions = new()
    {
        ["saksbehandler_fag"] = ["draft->under_arbeid", "under_arbeid->til_avklaring", "under_arbeid->draft"],
        ["budsjettenhet_fag"] = ["draft->under_arbeid", "under_arbeid->til_avklaring", "under_arbeid->draft", "til_avklaring->klarert", "til_avklaring->under_arbeid", "klarert->sendt_til_fin", "klarert->under_arbeid"],
        ["saksbehandler_fin"] = ["sendt_til_fin->under_vurdering_fin", "under_vurdering_fin->returnert_til_fag", "under_vurdering_fin->ferdigbehandlet_fin"],
        ["underdirektor_fin"] = ["under_vurdering_fin->ferdigbehandlet_fin"],
        ["administrator"] = ["draft->under_arbeid", "under_arbeid->til_avklaring", "til_avklaring->klarert", "klarert->sendt_til_fin", "sendt_til_fin->under_vurdering_fin", "under_vurdering_fin->returnert_til_fag", "under_vurdering_fin->ferdigbehandlet_fin", "returnert_til_fag->under_arbeid"],
    };

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
}
