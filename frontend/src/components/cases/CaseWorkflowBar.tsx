import { useRef, useLayoutEffect, useState } from 'react';
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
  const pendingOpinions = opinions?.filter(o => o.status === 'pending') ?? [];
  const hasPending = pendingOpinions.length > 0;

  // Track position of current step for vertical branch alignment
  const stepRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [branchLeft, setBranchLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!hasPending) return;
    const currentStepEl = stepRefs.current[currentStatus];
    const containerEl = containerRef.current;
    if (currentStepEl && containerEl) {
      const containerRect = containerEl.getBoundingClientRect();
      const stepRect = currentStepEl.getBoundingClientRect();
      setBranchLeft(stepRect.left - containerRect.left + stepRect.width / 2);
    }
  }, [currentStatus, hasPending]);

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

      {/* Main workflow row */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {allSteps.map((step, index) => {
          const isComplete = currentIndex > index;
          const isCurrent = currentStatus === step;
          const isFag = FAG_STEPS.includes(step);
          const isPost = POST_STEPS.includes(step);

          // Current step turns amber/yellow when sub-processes are pending
          let pillClass: string;
          if (isCurrent && hasPending) {
            pillClass = 'bg-amber-500 text-white';
          } else if (isCurrent) {
            pillClass = isFag
              ? 'bg-[var(--color-fag)] text-white'
              : isPost
              ? 'bg-emerald-600 text-white'
              : 'bg-[var(--color-fin)] text-white';
          } else if (isComplete) {
            pillClass = 'bg-green-100 text-green-800';
          } else {
            pillClass = 'bg-gray-100 text-gray-500';
          }

          return (
            <div key={step} className="flex items-center">
              <div
                ref={(el) => { stepRefs.current[step] = el; }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${pillClass}`}
              >
                {isComplete ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                {STATUS_LABELS[step]}
              </div>
              {index < allSteps.length - 1 && (
                <ArrowRight size={14} className="mx-0.5 shrink-0 text-gray-400" />
              )}
            </div>
          );
        })}
      </div>

      {/* Vertical branch: sub-process pills below current step, same style as main pills */}
      {hasPending && branchLeft != null && (
        <div className="relative mt-0.5" style={{ paddingLeft: `${branchLeft - 10}px` }}>
          <ArrowDown size={16} className="ml-0.5 text-gray-400" />
          <div className="flex flex-col gap-1">
            {pendingOpinions.map((op) => {
              const label = op.type === 'godkjenning'
                ? (op.forwardedFromId ? 'Videresendt' : 'Godkjenning')
                : 'Uttalelse';
              return (
                <div
                  key={op.id}
                  className="flex w-fit items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap"
                >
                  <Circle size={14} />
                  {label}: {op.assignedToName}
                </div>
              );
            })}
          </div>
          <ArrowUp size={16} className="ml-0.5 text-gray-400" />
        </div>
      )}

      {isReturned && (
        <div className="mt-2 rounded bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
          Saken er avvist av FIN
        </div>
      )}
    </div>
  );
}
