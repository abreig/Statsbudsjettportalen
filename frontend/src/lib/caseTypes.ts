export interface CaseFieldConfig {
  key: string;
  label: string;
  required?: boolean;
}

export const CASE_TYPE_LABELS: Record<string, string> = {
  satsingsforslag: 'Satsingsforslag',
  budsjettiltak: 'Budsjettiltak',
  teknisk_justering: 'Teknisk justering',
  andre_saker: 'Andre saker',
};

export const CASE_TYPE_DESCRIPTIONS: Record<string, string> = {
  satsingsforslag: 'Nytt initiativ eller vesentlig styrking. Alle felt tilgjengelige.',
  budsjettiltak: 'Endring i eksisterende bevilgning. Forenklet skjema.',
  teknisk_justering: 'Teknisk justering av bevilgning. Minimalt skjema.',
  andre_saker: 'Forslag til budsjettet som ikke innebærer endring av bevilgning.',
};

export const CASE_TYPE_FIELDS: Record<string, CaseFieldConfig[]> = {
  satsingsforslag: [
    { key: 'proposalText', label: 'Forslag til omtale i materialet', required: true },
    { key: 'justification', label: 'Begrunnelse for forslaget', required: true },
    { key: 'verbalConclusion', label: 'FAGs forslag til verbalkonklusjon' },
    { key: 'socioeconomicAnalysis', label: 'Samfunnsøkonomisk analyse' },
    { key: 'goalIndicator', label: 'Mål og resultatindikator' },
    { key: 'benefitPlan', label: 'Gevinstrealiseringsplan' },
    { key: 'comment', label: 'Kommentar (intern)' },
  ],
  budsjettiltak: [
    { key: 'proposalText', label: 'Forslag til omtale', required: true },
    { key: 'justification', label: 'Begrunnelse', required: true },
    { key: 'comment', label: 'Kommentar' },
  ],
  teknisk_justering: [
    { key: 'justification', label: 'Begrunnelse', required: true },
    { key: 'comment', label: 'Kommentar' },
  ],
  andre_saker: [
    { key: 'proposalText', label: 'Beskrivelse av saken', required: true },
    { key: 'justification', label: 'Begrunnelse', required: true },
    { key: 'verbalConclusion', label: 'Forslag til verbal omtale' },
    { key: 'comment', label: 'Kommentar (intern)' },
  ],
};

export const FIN_FIELDS: CaseFieldConfig[] = [
  { key: 'finAssessment', label: 'FINs vurdering' },
  { key: 'finVerbal', label: 'FINs forslag til verbalkonklusjon' },
];

export const GOV_CONCLUSION_FIELD: CaseFieldConfig =
  { key: 'finRConclusion', label: 'Regjeringens konklusjon' };
