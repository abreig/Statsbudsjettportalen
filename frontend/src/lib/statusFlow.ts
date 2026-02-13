export const STATUS_LABELS: Record<string, string> = {
  draft: 'Utkast',
  under_arbeid: 'Under arbeid',
  til_avklaring: 'Til avklaring i fagavdeling',
  klarert: 'Klar til budsjettenhet',
  godkjent_pol: 'Godkjent av POL',
  sendt_til_fin: 'Sendt til FIN',
  under_vurdering_fin: 'Under vurdering (FIN)',
  returnert_til_fag: 'Returnert til FAG',
  ferdigbehandlet_fin: 'Ferdigbehandlet (FIN)',
  sendt_til_regjeringen: 'Sendt til regjeringen',
  regjeringsbehandlet: 'Regjeringsbehandlet',
};

export type StatusVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral' | 'alt1' | 'alt3';

export const STATUS_VARIANTS: Record<string, StatusVariant> = {
  draft: 'neutral',
  under_arbeid: 'info',
  til_avklaring: 'warning',
  klarert: 'alt1',
  godkjent_pol: 'success',
  sendt_til_fin: 'info',
  under_vurdering_fin: 'alt1',
  returnert_til_fag: 'error',
  ferdigbehandlet_fin: 'success',
  sendt_til_regjeringen: 'alt3',
  regjeringsbehandlet: 'success',
};

export const FAG_STATUS_FLOW = ['draft', 'under_arbeid', 'til_avklaring', 'klarert', 'godkjent_pol', 'sendt_til_fin'];
export const FIN_STATUS_FLOW = ['sendt_til_fin', 'under_vurdering_fin', 'ferdigbehandlet_fin'];
export const POST_FIN_FLOW = ['ferdigbehandlet_fin', 'sendt_til_regjeringen', 'regjeringsbehandlet'];
export const ALL_STATUSES = [
  'draft', 'under_arbeid', 'til_avklaring', 'klarert', 'godkjent_pol',
  'sendt_til_fin', 'under_vurdering_fin', 'returnert_til_fag', 'ferdigbehandlet_fin',
  'sendt_til_regjeringen', 'regjeringsbehandlet',
];

// Statuses where FAG cannot see FIN fields
export const FIN_FIELDS_HIDDEN_FROM_FAG = [
  'sendt_til_fin', 'under_vurdering_fin', 'returnert_til_fag', 'ferdigbehandlet_fin',
];

// Statuses where FAG CAN see FIN fields
export const FIN_FIELDS_VISIBLE_TO_FAG = ['sendt_til_regjeringen', 'regjeringsbehandlet'];

// Statuses that represent "at FIN" for the FAG separate view (punkt 10)
export const AT_FIN_STATUSES = [
  'sendt_til_fin', 'under_vurdering_fin', 'ferdigbehandlet_fin',
];
