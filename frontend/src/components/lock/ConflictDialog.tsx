import { Alert, Button, BodyShort } from '@navikt/ds-react';
import { AlertTriangle } from 'lucide-react';

interface ConflictDialogProps {
  currentVersion: number;
  yourVersion: number;
  onDismiss: () => void;
  onReload: () => void;
}

export function ConflictDialog({
  currentVersion,
  yourVersion,
  onDismiss,
  onReload,
}: ConflictDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="mx-4 w-full max-w-md rounded-lg border border-red-300 bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={24} className="text-red-600" />
          <BodyShort className="text-lg font-semibold">Versjonskonflikt</BodyShort>
        </div>
        <Alert variant="error" size="small" className="mb-4">
          Endringene dine kunne ikke lagres fordi en annen bruker har lagret en ny versjon
          (versjon {currentVersion}) siden du startet redigeringen (versjon {yourVersion}).
        </Alert>
        <BodyShort size="small" className="mb-4 text-gray-600">
          Last inn den nye versjonen for å se endringene. Du kan deretter kopiere
          dine endringer manuelt.
        </BodyShort>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="tertiary" size="small" onClick={onDismiss}>
            Lukk
          </Button>
          <Button type="button" variant="primary" size="small" onClick={onReload}>
            Last inn ny versjon
          </Button>
        </div>
      </div>
    </div>
  );
}
