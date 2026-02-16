import { Alert, Button, BodyShort } from '@navikt/ds-react';
import { Clock } from 'lucide-react';

interface IdleWarningDialogProps {
  secondsLeft: number;
  onStayActive: () => void;
}

export function IdleWarningDialog({ secondsLeft, onStayActive }: IdleWarningDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="mx-4 w-full max-w-md rounded-lg border border-amber-300 bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <Clock size={24} className="text-amber-600" />
          <BodyShort className="text-lg font-semibold">Inaktivitetsvarsel</BodyShort>
        </div>
        <Alert variant="warning" size="small" className="mb-4">
          Du har vært inaktiv i lengre tid. Saken lukkes for redigering om{' '}
          <strong>{secondsLeft} {secondsLeft === 1 ? 'sekund' : 'sekunder'}</strong>.
          Eventuelle ulagrede endringer vil bli forsøkt lagret automatisk.
        </Alert>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            size="small"
            onClick={onStayActive}
          >
            Forbli aktiv
          </Button>
        </div>
      </div>
    </div>
  );
}
