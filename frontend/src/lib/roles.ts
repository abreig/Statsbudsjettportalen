export const ROLE_LABELS: Record<string, string> = {
  saksbehandler_fag: 'Saksbehandler FAG',
  budsjettenhet_fag: 'Budsjettenhet FAG',
  leder_fag: 'Leder FAG',
  saksbehandler_fin: 'Saksbehandler FIN',
  underdirektor_fin: 'Underdirektør FIN',
  leder_fin: 'Leder FIN',
  administrator: 'Administrator',
};

export function isFagRole(role: string): boolean {
  return role === 'saksbehandler_fag' || role === 'budsjettenhet_fag' || role === 'leder_fag';
}

export function isFinRole(role: string): boolean {
  return role === 'saksbehandler_fin' || role === 'underdirektor_fin' || role === 'leder_fin';
}

export function isAdmin(role: string): boolean {
  return role === 'administrator';
}

export function isLeaderRole(role: string): boolean {
  return role === 'leder_fag' || role === 'leder_fin';
}

export function canCreateCase(role: string): boolean {
  return isFagRole(role);
}

export function canSubmitToFin(role: string): boolean {
  return role === 'budsjettenhet_fag' || role === 'leder_fag';
}

export function canAssessFin(role: string): boolean {
  return role === 'saksbehandler_fin' || role === 'leder_fin';
}

export function canReturnToFag(role: string): boolean {
  return role === 'saksbehandler_fin' || role === 'leder_fin';
}

export function canAskQuestion(role: string): boolean {
  return isFinRole(role);
}

export function canAnswerQuestion(role: string): boolean {
  return isFagRole(role);
}

export function canChangeResponsible(role: string, userId: string, assignedTo: string | null): boolean {
  if (assignedTo === userId) return true;
  return role === 'leder_fag' || role === 'leder_fin' || role === 'budsjettenhet_fag' || role === 'administrator';
}
