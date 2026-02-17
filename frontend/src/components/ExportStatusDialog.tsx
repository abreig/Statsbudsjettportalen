import { useState, useEffect, useRef } from 'react';
import { Modal, Button, Loader, Alert } from '@navikt/ds-react';
import { Download, X } from 'lucide-react';
import { getExportJobStatus, type ExportJobStatus } from '../api/exportJobs';

interface ExportStatusDialogProps {
  jobId: string | null;
  onClose: () => void;
}

export function ExportStatusDialog({ jobId, onClose }: ExportStatusDialogProps) {
  const [job, setJob] = useState<ExportJobStatus | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId) return;

    // Poll every 2 seconds
    const poll = async () => {
      try {
        const status = await getExportJobStatus(jobId);
        setJob(status);

        if (status.status === 'completed' || status.status === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        // Ignore polling errors
      }
    };

    void poll();
    intervalRef.current = setInterval(poll, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId]);

  if (!jobId) return null;

  const isTerminal = job?.status === 'completed' || job?.status === 'failed';
  const statusLabel = {
    queued: 'I kø...',
    processing: 'Genererer dokument...',
    completed: 'Ferdig!',
    failed: 'Feil ved generering',
  }[job?.status ?? 'queued'];

  return (
    <Modal open onClose={onClose} header={{ heading: 'Eksport' }}>
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
          {!isTerminal && <Loader size="xlarge" title="Genererer..." />}

          <p style={{ fontWeight: 600 }}>{statusLabel}</p>

          {job?.status === 'completed' && job.resultUrl && (
            <Button
              as="a"
              href={job.resultUrl}
              download
              variant="primary"
              icon={<Download size={18} />}
            >
              Last ned
            </Button>
          )}

          {job?.status === 'failed' && (
            <Alert variant="error" size="small">
              {job.errorMessage || 'Ukjent feil oppstod under eksport.'}
            </Alert>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="tertiary" onClick={onClose} icon={<X size={16} />}>
          Lukk
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
