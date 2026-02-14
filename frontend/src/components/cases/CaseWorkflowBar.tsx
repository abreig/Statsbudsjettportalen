import { useRef, useLayoutEffect, useState } from 'react';
import { STATUS_LABELS } from '../../lib/statusFlow.ts';
import { CheckCircle2, Circle, ArrowRight, ArrowDown, ArrowUp, Lock } from 'lucide-react';
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
  const pendingOpinions = opinions?.filter(o => o.status === 'pending') ?? [];
  const hasPendingOpinion = pendingOpinions.length > 0;

  // Track the position of the current step for the vertical branch
  const stepRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [branchLeft, setBranchLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!hasPendingOpinion) return;
    const currentStepEl = stepRefs.current[currentStatus];
    const containerEl = containerRef.current;
    if (currentStepEl && containerEl) {
      const containerRect = containerEl.getBoundingClientRect();
      const stepRect = currentStepEl.getBoundingClientRect();
      setBranchLeft(stepRect.left - containerRect.left + stepRect.width / 2);
    }
  }, [currentStatus, hasPendingOpinion]);

  // Group pending opinions by type
  const pendingUttalelser = pendingOpinions.filter(o => o.type === 'uttalelse');
  const pendingGodkjenninger = pendingOpinions.filter(o => o.type === 'godkjenning');

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4" ref={containerRef}>
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
                ref={(el) => { stepRefs.current[step] = el; }}
                className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
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
                ) : isCurrent && hasPendingOpinion ? (
                  <Lock size={14} />
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

      {/* Vertical branch for pending sub-processes */}
      {hasPendingOpinion && (
        <div className="relative mt-1" style={{ paddingLeft: branchLeft != null ? `${branchLeft - 8}px` : '0' }}>
          <div className="flex flex-col items-start">
            <ArrowDown size={16} className="ml-1 text-amber-500" />
            <div className="ml-0 space-y-1.5">
              {pendingUttalelser.map((op) => (
                <div key={op.id} className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-1.5">
                  <span className="inline-block rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                    Uttalelse
                  </span>
                  <span className="text-xs font-medium text-amber-800">
                    {op.assignedToName}
                  </span>
                  <span className="text-[10px] text-amber-600">ventende</span>
                </div>
              ))}
              {pendingGodkjenninger.map((op) => (
                <div key={op.id} className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-1.5">
                  <span className="inline-block rounded bg-blue-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-800">
                    {op.forwardedFromId ? 'Videresendt' : 'Godkjenning'}
                  </span>
                  <span className="text-xs font-medium text-blue-800">
                    {op.assignedToName}
                  </span>
                  <span className="text-[10px] text-blue-600">ventende</span>
                </div>
              ))}
            </div>
            <ArrowUp size={16} className="ml-1 text-amber-500" />
          </div>
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
