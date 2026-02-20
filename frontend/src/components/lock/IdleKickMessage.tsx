import { Alert, Button } from '@navikt/ds-react';

interface IdleKickMessageProps {
  reason: 'saved' | 'conflict' | 'no_changes';
  onDismiss: () => void;
}

const messages: Record<string, string> = {
  saved: 'Du ble logget ut av redigeringsmodus på grunn av inaktivitet. Endringene dine ble lagret.',
  conflict:
    'Du ble logget ut av redigeringsmodus på grunn av inaktivitet. Endringene dine ble ikke lagret fordi en annen bruker har gjort endringer i mellomtiden.',
  no_changes:
    'Du ble logget ut av redigeringsmodus på grunn av inaktivitet. Det var ingen ulagrede endringer.',
};

export function IdleKickMessage({ reason, onDismiss }: IdleKickMessageProps) {
  const variant = reason === 'conflict' ? 'error' : reason === 'saved' ? 'success' : 'info';

  return (
    <Alert variant={variant} size="small" className="mb-4">
      <div className="flex items-center justify-between gap-4">
        <span>{messages[reason]}</span>
        <Button type="button" variant="tertiary" size="xsmall" onClick={onDismiss}>
          Lukk
        </Button>
      </div>
    </Alert>
  );
}
