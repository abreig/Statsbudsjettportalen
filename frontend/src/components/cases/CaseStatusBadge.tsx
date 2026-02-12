import { Tag } from '@navikt/ds-react';
import { STATUS_LABELS, STATUS_VARIANTS } from '../../lib/statusFlow.ts';

interface CaseStatusBadgeProps {
  status: string;
  size?: 'medium' | 'small' | 'xsmall';
}

export function CaseStatusBadge({ status, size = 'small' }: CaseStatusBadgeProps) {
  const variant = STATUS_VARIANTS[status] ?? 'neutral';
  const label = STATUS_LABELS[status] ?? status;

  return (
    <Tag variant={variant} size={size}>
      {label}
    </Tag>
  );
}
