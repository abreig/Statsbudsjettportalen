import { Alert, Button, BodyShort } from '@navikt/ds-react';
import { Lock, RefreshCw } from 'lucide-react';
import { formatDate } from '../../lib/formatters';

interface LockBannerProps {
  holderName: string;
  lockedAt: string;
  onRetry?: () => void;
}

export function LockBanner({ holderName, lockedAt, onRetry }: LockBannerProps) {
  return (
    <Alert variant="warning" size="small" className="mb-4">
      <div className="flex items-center gap-3">
        <Lock size={16} />
        <BodyShort size="small">
          <strong>{holderName}</strong> redigerer denne saken (siden {formatDate(lockedAt)}).
          Du kan se innholdet, men ikke gjøre endringer.
        </BodyShort>
        {onRetry && (
          <Button
            type="button"
            variant="tertiary"
            size="xsmall"
            icon={<RefreshCw size={14} />}
            onClick={onRetry}
          >
            Prøv igjen
          </Button>
        )}
      </div>
    </Alert>
  );
}
