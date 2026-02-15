// === Rolle-IDer ===
export const ROLE_LABELS: Record<string, string> = {
  saksbehandler_fag: 'Saksbehandler FAG',
  budsjettenhet_fag: 'Budsjettenhet FAG',
  underdirektor_fag: 'Underdirektør FAG',
  avdelingsdirektor_fag: 'Avdelingsdirektør FAG',
  ekspedisjonssjef_fag: 'Ekspedisjonssjef FAG',
  departementsraad_fag: 'Departementsråd FAG',
  saksbehandler_fin: 'Saksbehandler FIN',
  underdirektor_fin: 'Underdirektør FIN',
  avdelingsdirektor_fin: 'Avdelingsdirektør FIN',
  ekspedisjonssjef_fin: 'Ekspedisjonssjef FIN',
  departementsraad_fin: 'Departementsråd FIN',
  administrator: 'Administrator',
};

const FAG_ROLES = new Set([
  'saksbehandler_fag', 'budsjettenhet_fag',
  'underdirektor_fag', 'avdelingsdirektor_fag',
  'ekspedisjonssjef_fag', 'departementsraad_fag',
]);

const FIN_ROLES = new Set([
  'saksbehandler_fin', 'underdirektor_fin',
  'avdelingsdirektor_fin', 'ekspedisjonssjef_fin',
  'departementsraad_fin',
]);

const FAG_LEADER_ROLES = new Set([
  'underdirektor_fag', 'avdelingsdirektor_fag',
  'ekspedisjonssjef_fag', 'departementsraad_fag',
]);

const FIN_LEADER_ROLES = new Set([
  'underdirektor_fin', 'avdelingsdirektor_fin',
  'ekspedisjonssjef_fin', 'departementsraad_fin',
]);

export function isFagRole(role: string): boolean { return FAG_ROLES.has(role); }
export function isFinRole(role: string): boolean { return FIN_ROLES.has(role); }
export function isAdmin(role: string): boolean { return role === 'administrator'; }
export function isFagLeader(role: string): boolean { return FAG_LEADER_ROLES.has(role); }
export function isFinLeader(role: string): boolean { return FIN_LEADER_ROLES.has(role); }
export function isLeaderRole(role: string): boolean { return isFagLeader(role) || isFinLeader(role); }

export function canCreateCase(role: string): boolean { return isFagRole(role); }

export function canSubmitToFin(role: string): boolean {
  return role === 'budsjettenhet_fag' || isFagLeader(role);
}

export function canAssessFin(role: string): boolean {
  return isFinRole(role);
}

export function canReturnToFag(role: string): boolean {
  return isFinRole(role);
}

export function canAskQuestion(role: string): boolean {
  return isFinRole(role);
}

export function canAnswerQuestion(role: string): boolean {
  return isFagRole(role);
}

export function canChangeResponsible(role: string, userId: string, assignedTo: string | null): boolean {
  if (assignedTo === userId) return true;
  return role === 'budsjettenhet_fag' || isFagLeader(role) || isFinLeader(role) || role === 'administrator';
}

export function canSendOpinion(role: string, userId: string, assignedTo: string | null, finAssignedTo: string | null): boolean {
  if (assignedTo === userId || finAssignedTo === userId) return true;
  return isLeaderRole(role) || role === 'budsjettenhet_fag' || role === 'administrator';
}
