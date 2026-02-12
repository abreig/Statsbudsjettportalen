export const ROLE_LABELS: Record<string, string> = {
  saksbehandler_fag: 'Saksbehandler FAG',
  budsjettenhet_fag: 'Budsjettenhet FAG',
  saksbehandler_fin: 'Saksbehandler FIN',
  underdirektor_fin: 'Underdirektør FIN',
  administrator: 'Administrator',
};

export function isFagRole(role: string): boolean {
  return role === 'saksbehandler_fag' || role === 'budsjettenhet_fag';
}

export function isFinRole(role: string): boolean {
  return role === 'saksbehandler_fin' || role === 'underdirektor_fin';
}

export function isAdmin(role: string): boolean {
  return role === 'administrator';
}

export function canCreateCase(role: string): boolean {
  return isFagRole(role);
}

export function canSubmitToFin(role: string): boolean {
  return role === 'budsjettenhet_fag';
}

export function canAssessFin(role: string): boolean {
  return role === 'saksbehandler_fin';
}

export function canReturnToFag(role: string): boolean {
  return role === 'saksbehandler_fin';
}

export function canAskQuestion(role: string): boolean {
  return isFinRole(role);
}

export function canAnswerQuestion(role: string): boolean {
  return isFagRole(role);
}
