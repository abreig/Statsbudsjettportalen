import { useRef, useState } from 'react';
import { Button, Modal, Textarea } from '@navikt/ds-react';

interface ReturnCaseModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function ReturnCaseModal({ open, onClose, onConfirm, loading }: ReturnCaseModalProps) {
  const [reason, setReason] = useState('');
  const ref = useRef<HTMLDialogElement>(null);

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
      header={{ heading: 'Avvis sak - returner til FAG', closeButton: true }}
    >
      <Modal.Body>
        <Textarea
          label="Begrunnelse for avvisning"
          description="Forklar hvorfor saken avvises og returneres til fagdepartementet."
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
        >
          Avvis sak
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
