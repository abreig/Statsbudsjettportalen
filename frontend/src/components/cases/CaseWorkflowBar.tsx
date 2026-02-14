import { STATUS_LABELS } from '../../lib/statusFlow.ts';
import { CheckCircle2, Circle, ArrowRight, ArrowDown, ArrowUp } from 'lucide-react';
import type { CaseOpinion } from '../../lib/types.ts';

interface CaseWorkflowBarProps {
  currentStatus: string;
  opinions?: CaseOpinion[] | null;
}

const FAG_STEPS = ['draft', 'under_arbeid', 'til_avklaring', 'klarert', 'godkjent_pol'];
const FIN_STEPS = ['sendt_til_fin', 'under_vurdering_fin', 'ferdigbehandlet_fin'];
const POST_STEPS = ['sendt_til_regjeringen', 'regjeringsbehandlet'];

export function CaseWorkflowBar({ currentStatus, opinions }: CaseWorkflowBarProps) {
  const allSteps = [...FAG_STEPS, ...FIN_STEPS, ...POST_STEPS];
  const currentIndex = allSteps.indexOf(currentStatus);
  const isReturned = currentStatus === 'returnert_til_fag';
  const hasPendingOpinion = opinions?.some(o => o.status === 'pending');

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          FAG-prosess
        </span>
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          FIN-prosess
        </span>
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Regjering
        </span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto">
        {allSteps.map((step, index) => {
          const isComplete = currentIndex > index;
          const isCurrent = currentStatus === step;
          const isFag = FAG_STEPS.includes(step);
          const isPost = POST_STEPS.includes(step);

          return (
            <div key={step} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                  isCurrent
                    ? isFag
                      ? 'bg-[var(--color-fag)] text-white'
                      : isPost
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[var(--color-fin)] text-white'
                    : isComplete
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <Circle size={14} />
                )}
                {STATUS_LABELS[step]}
              </div>
              {index < allSteps.length - 1 && (
                <ArrowRight size={14} className="mx-0.5 shrink-0 text-gray-400" />
              )}
            </div>
          );
        })}
      </div>

      {hasPendingOpinion && (
        <div className="mt-2 flex items-center gap-2">
          <ArrowDown size={14} className="text-amber-500" />
          <div className="rounded bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            Sendt til uttalelse ({opinions?.filter(o => o.status === 'pending').length} ventende)
          </div>
          <ArrowUp size={14} className="text-amber-500" />
        </div>
      )}

      {isReturned && (
        <div className="mt-2 rounded bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
          Saken er returnert til FAG for revisjon
        </div>
      )}
    </div>
  );
}
