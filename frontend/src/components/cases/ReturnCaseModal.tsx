import { useRef, useState } from 'react';
import { Button, Modal, Textarea } from '@navikt/ds-react';

interface ReturnCaseModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
  variant?: 'return' | 'reject';
}

export function ReturnCaseModal({ open, onClose, onConfirm, loading, variant = 'return' }: ReturnCaseModalProps) {
  const [reason, setReason] = useState('');
  const ref = useRef<HTMLDialogElement>(null);

  const isReject = variant === 'reject';
  const heading = isReject ? 'Avvis forslag' : 'Returner sak til FAG';
  const description = isReject
    ? 'Forklar hvorfor forslaget avvises permanent.'
    : 'Forklar hvorfor saken returneres til fagdepartementet for revisjon.';
  const confirmLabel = isReject ? 'Avvis forslag' : 'Returner til FAG';

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason('');
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal
      ref={ref}
      open={open}
      onClose={handleClose}
      header={{ heading, closeButton: true }}
    >
      <Modal.Body>
        <Textarea
          label="Begrunnelse"
          description={description}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minRows={3}
          resize="vertical"
        />
      </Modal.Body>
      <Modal.Footer>
        <Button
          onClick={handleConfirm}
          disabled={!reason.trim() || loading}
          loading={loading}
          variant={isReject ? 'danger' : 'primary'}
        >
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
