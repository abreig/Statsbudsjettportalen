export const STATUS_LABELS: Record<string, string> = {
  draft: 'Utkast',
  under_arbeid: 'Under arbeid',
  til_avklaring: 'Til avklaring',
  klarert: 'Klarert',
  sendt_til_fin: 'Sendt til FIN',
  under_vurdering_fin: 'Under vurdering (FIN)',
  returnert_til_fag: 'Returnert til FAG',
  ferdigbehandlet_fin: 'Ferdigbehandlet (FIN)',
};

export type StatusVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral' | 'alt1' | 'alt3';

export const STATUS_VARIANTS: Record<string, StatusVariant> = {
  draft: 'neutral',
  under_arbeid: 'info',
  til_avklaring: 'warning',
  klarert: 'success',
  sendt_til_fin: 'info',
  under_vurdering_fin: 'alt1',
  returnert_til_fag: 'error',
  ferdigbehandlet_fin: 'success',
};

export const FAG_STATUS_FLOW = ['draft', 'under_arbeid', 'til_avklaring', 'klarert', 'sendt_til_fin'];
export const FIN_STATUS_FLOW = ['sendt_til_fin', 'under_vurdering_fin', 'ferdigbehandlet_fin'];
export const ALL_STATUSES = ['draft', 'under_arbeid', 'til_avklaring', 'klarert', 'sendt_til_fin', 'under_vurdering_fin', 'returnert_til_fag', 'ferdigbehandlet_fin'];
