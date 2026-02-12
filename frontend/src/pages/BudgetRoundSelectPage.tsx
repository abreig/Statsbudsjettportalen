import { useNavigate } from 'react-router-dom';
import { Alert, Heading, BodyShort, Loader, Tag } from '@navikt/ds-react';
import { CalendarDays } from 'lucide-react';
import { useBudgetRounds } from '../hooks/useBudgetRounds.ts';
import { useUiStore } from '../stores/uiStore.ts';
import { formatDateShort } from '../lib/formatters.ts';
import type { BudgetRound } from '../lib/types.ts';

const ROUND_TYPE_LABELS: Record<string, string> = {
  saldert: 'Saldert budsjett',
  rnb: 'Revidert nasjonalbudsjett',
  tilleggsproposisjon: 'Tilleggsproposisjon',
  nysaldert: 'Nysaldert budsjett',
};

export function BudgetRoundSelectPage() {
  const { data: rounds, isLoading, error } = useBudgetRounds();
  const setSelectedRound = useUiStore((s) => s.setSelectedRound);
  const navigate = useNavigate();

  const handleSelect = (round: BudgetRound) => {
    setSelectedRound(round);
    navigate('/cases');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="xlarge" title="Laster budsjettrunder..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        Kunne ikke laste budsjettrunder. Proov igjen senere.
      </Alert>
    );
  }

  return (
    <div>
      <Heading size="large" level="1" className="mb-2">
        Velg budsjettrunde
      </Heading>
      <BodyShort className="mb-6 text-gray-600">
        Velg hvilken budsjettrunde du vil arbeide med.
      </BodyShort>

      {rounds && rounds.length === 0 && (
        <Alert variant="info">Ingen budsjettrunder er tilgjengelige.</Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rounds?.map((round) => (
          <button
            key={round.id}
            onClick={() => handleSelect(round)}
            className="cursor-pointer rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-[var(--color-primary)] hover:shadow-md"
          >
            <div className="mb-3 flex items-start justify-between">
              <CalendarDays size={24} className="text-[var(--color-primary)]" />
              <Tag
                variant={round.status === 'active' ? 'success' : 'neutral'}
                size="xsmall"
              >
                {round.status === 'active' ? 'Aktiv' : round.status}
              </Tag>
            </div>
            <Heading size="small" level="2" className="mb-1">
              {round.name}
            </Heading>
            <BodyShort size="small" className="mb-2 text-gray-600">
              {ROUND_TYPE_LABELS[round.type] ?? round.type} &mdash; {round.year}
            </BodyShort>
            {round.deadline && (
              <BodyShort size="small" className="text-gray-500">
                Frist: {formatDateShort(round.deadline)}
              </BodyShort>
            )}
            <BodyShort size="small" className="mt-2 text-gray-500">
              {round.caseCount} saker
            </BodyShort>
          </button>
        ))}
      </div>
    </div>
  );
}
