export const STATUS_LABELS: Record<string, string> = {
  draft: 'Utkast',
  under_arbeid: 'Under arbeid',
  til_avklaring: 'Til avklaring i fagavdeling',
  klarert: 'Klar til budsjettenhet',
  godkjent_pol: 'Godkjent av POL',
  sendt_til_fin: 'Sendt til FIN',
  under_vurdering_fin: 'Under vurdering (FIN)',
  returnert_til_fag: 'Returnert til FAG',
  avvist_av_fin: 'Avvist av FIN',
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
  returnert_til_fag: 'warning',
  avvist_av_fin: 'error',
  ferdigbehandlet_fin: 'success',
  sendt_til_regjeringen: 'alt3',
  regjeringsbehandlet: 'success',
};

export const FAG_STATUS_FLOW = ['draft', 'under_arbeid', 'til_avklaring', 'klarert', 'godkjent_pol', 'sendt_til_fin'];
export const FIN_STATUS_FLOW = ['sendt_til_fin', 'under_vurdering_fin', 'ferdigbehandlet_fin'];
export const POST_FIN_FLOW = ['ferdigbehandlet_fin', 'sendt_til_regjeringen', 'regjeringsbehandlet'];
export const ALL_STATUSES = [
  'draft', 'under_arbeid', 'til_avklaring', 'klarert', 'godkjent_pol',
  'sendt_til_fin', 'under_vurdering_fin', 'returnert_til_fag', 'avvist_av_fin',
  'ferdigbehandlet_fin', 'sendt_til_regjeringen', 'regjeringsbehandlet',
];

// Statuses where FAG cannot see FIN fields
export const FIN_FIELDS_HIDDEN_FROM_FAG = [
  'sendt_til_fin', 'under_vurdering_fin', 'returnert_til_fag', 'avvist_av_fin', 'ferdigbehandlet_fin',
];

// Statuses where FAG CAN see FIN fields
export const FIN_FIELDS_VISIBLE_TO_FAG = ['sendt_til_regjeringen', 'regjeringsbehandlet'];

// Statuses that represent "at FIN" for the FAG separate view (punkt 10)
export const AT_FIN_STATUSES = [
  'sendt_til_fin', 'under_vurdering_fin', 'ferdigbehandlet_fin',
];

// Statuses visible to FIN users
export const FIN_VISIBLE_STATUSES = [
  'sendt_til_fin', 'under_vurdering_fin', 'returnert_til_fag', 'avvist_av_fin',
  'ferdigbehandlet_fin', 'sendt_til_regjeringen', 'regjeringsbehandlet',
];

// ─── Transition logic (mirrors backend WorkflowService) ────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['under_arbeid'],
  under_arbeid: ['til_avklaring', 'draft'],
  til_avklaring: ['klarert', 'under_arbeid'],
  klarert: ['godkjent_pol', 'under_arbeid', 'til_avklaring'],
  godkjent_pol: ['sendt_til_fin', 'under_arbeid', 'til_avklaring', 'klarert'],
  sendt_til_fin: ['under_vurdering_fin', 'godkjent_pol', 'klarert'],
  under_vurdering_fin: ['returnert_til_fag', 'avvist_av_fin', 'ferdigbehandlet_fin', 'sendt_til_fin'],
  returnert_til_fag: ['under_arbeid'],
  avvist_av_fin: [],
  ferdigbehandlet_fin: ['sendt_til_regjeringen', 'under_vurdering_fin'],
  sendt_til_regjeringen: ['regjeringsbehandlet', 'ferdigbehandlet_fin'],
};

// Shared transition sets
const FAG_LEADER_TRANSITIONS = new Set([
  'draft->under_arbeid', 'under_arbeid->til_avklaring', 'under_arbeid->draft',
  'til_avklaring->klarert', 'til_avklaring->under_arbeid',
  'klarert->godkjent_pol', 'klarert->under_arbeid', 'klarert->til_avklaring',
  'godkjent_pol->sendt_til_fin', 'godkjent_pol->under_arbeid', 'godkjent_pol->til_avklaring', 'godkjent_pol->klarert',
  'sendt_til_fin->godkjent_pol',
]);

const FIN_LEADER_TRANSITIONS = new Set([
  'sendt_til_fin->under_vurdering_fin',
  'sendt_til_fin->klarert',
  'under_vurdering_fin->ferdigbehandlet_fin', 'under_vurdering_fin->returnert_til_fag', 'under_vurdering_fin->avvist_av_fin', 'under_vurdering_fin->sendt_til_fin',
  'ferdigbehandlet_fin->sendt_til_regjeringen', 'ferdigbehandlet_fin->under_vurdering_fin',
  'sendt_til_regjeringen->regjeringsbehandlet', 'sendt_til_regjeringen->ferdigbehandlet_fin',
]);

const ROLE_TRANSITIONS: Record<string, Set<string>> = {
  saksbehandler_fag: new Set([
    'draft->under_arbeid', 'under_arbeid->til_avklaring', 'under_arbeid->draft',
  ]),
  budsjettenhet_fag: FAG_LEADER_TRANSITIONS,
  underdirektor_fag: FAG_LEADER_TRANSITIONS,
  avdelingsdirektor_fag: FAG_LEADER_TRANSITIONS,
  ekspedisjonssjef_fag: FAG_LEADER_TRANSITIONS,
  departementsraad_fag: FAG_LEADER_TRANSITIONS,
  saksbehandler_fin: new Set([
    'sendt_til_fin->under_vurdering_fin',
    'sendt_til_fin->klarert',
    'under_vurdering_fin->returnert_til_fag', 'under_vurdering_fin->avvist_av_fin', 'under_vurdering_fin->ferdigbehandlet_fin', 'under_vurdering_fin->sendt_til_fin',
    'ferdigbehandlet_fin->sendt_til_regjeringen', 'ferdigbehandlet_fin->under_vurdering_fin',
  ]),
  underdirektor_fin: new Set([
    'sendt_til_fin->klarert',
    'under_vurdering_fin->ferdigbehandlet_fin',
    'ferdigbehandlet_fin->sendt_til_regjeringen', 'ferdigbehandlet_fin->under_vurdering_fin',
    'sendt_til_regjeringen->regjeringsbehandlet', 'sendt_til_regjeringen->ferdigbehandlet_fin',
  ]),
  avdelingsdirektor_fin: FIN_LEADER_TRANSITIONS,
  ekspedisjonssjef_fin: FIN_LEADER_TRANSITIONS,
  departementsraad_fin: FIN_LEADER_TRANSITIONS,
  administrator: new Set([
    'draft->under_arbeid', 'under_arbeid->til_avklaring', 'under_arbeid->draft',
    'til_avklaring->klarert', 'til_avklaring->under_arbeid',
    'klarert->godkjent_pol', 'klarert->under_arbeid', 'klarert->til_avklaring',
    'godkjent_pol->sendt_til_fin', 'godkjent_pol->under_arbeid', 'godkjent_pol->til_avklaring', 'godkjent_pol->klarert',
    'sendt_til_fin->under_vurdering_fin', 'sendt_til_fin->godkjent_pol', 'sendt_til_fin->klarert',
    'under_vurdering_fin->returnert_til_fag', 'under_vurdering_fin->avvist_av_fin', 'under_vurdering_fin->ferdigbehandlet_fin', 'under_vurdering_fin->sendt_til_fin',
    'returnert_til_fag->under_arbeid',
    'ferdigbehandlet_fin->sendt_til_regjeringen', 'ferdigbehandlet_fin->under_vurdering_fin',
    'sendt_til_regjeringen->regjeringsbehandlet', 'sendt_til_regjeringen->ferdigbehandlet_fin',
  ]),
};

const MAIN_FLOW = [
  'draft', 'under_arbeid', 'til_avklaring', 'klarert', 'godkjent_pol',
  'sendt_til_fin', 'under_vurdering_fin', 'ferdigbehandlet_fin',
  'sendt_til_regjeringen', 'regjeringsbehandlet',
];

export interface StatusTransition {
  status: string;
  label: string;
  isBackward: boolean;
}

export function getAllowedTransitions(currentStatus: string, userRole: string): StatusTransition[] {
  const allAllowed = VALID_TRANSITIONS[currentStatus] ?? [];
  const roleAllowed = ROLE_TRANSITIONS[userRole];
  if (!roleAllowed) return [];

  const currentIdx = MAIN_FLOW.indexOf(currentStatus);

  return allAllowed
    .filter((s) => roleAllowed.has(`${currentStatus}->${s}`))
    .map((s) => {
      const targetIdx = MAIN_FLOW.indexOf(s);
      const isBackward = targetIdx >= 0 && currentIdx >= 0 && targetIdx < currentIdx;

      let label: string;
      if (s === 'avvist_av_fin') {
        label = 'Avvis forslag';
      } else if (s === 'returnert_til_fag') {
        label = 'Returner til FAG';
      } else if (currentStatus === 'sendt_til_fin' && s === 'klarert') {
        // New "Returner til FAG" action from sendt_til_fin
        label = 'Returner til FAG';
      } else if (isBackward) {
        label = `Flytt tilbake til ${STATUS_LABELS[s]}`;
      } else {
        label = `Flytt til ${STATUS_LABELS[s]}`;
      }

      return { status: s, label, isBackward };
    });
}
