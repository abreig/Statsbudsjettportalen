import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@navikt/ds-react';
import { Minimize2, Save } from 'lucide-react';

interface FocusModeOverlayProps {
  active: boolean;
  onExit: () => void;
  onSave?: () => void;
  saving?: boolean;
  children: ReactNode;
  maxWidth?: string;
}

export function FocusModeOverlay({
  active,
  onExit,
  onSave,
  saving = false,
  children,
  maxWidth = '900px',
}: FocusModeOverlayProps) {
  // Apply blur to the app root while focus mode is active
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    if (active) {
      root.setAttribute('data-focus-mode', 'true');
    } else {
      root.removeAttribute('data-focus-mode');
    }
    return () => {
      root.removeAttribute('data-focus-mode');
    };
  }, [active]);

  // Escape key exits focus mode
  useEffect(() => {
    if (!active) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [active, onExit]);

  if (!active) return <>{children}</>;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3">
        {onSave ? (
          <Button
            type="button"
            variant="tertiary"
            size="small"
            icon={<Save size={14} />}
            onClick={onSave}
            loading={saving}
            className="text-white/80 hover:bg-white/15 hover:text-white"
          >
            Lagre
          </Button>
        ) : (
          <div />
        )}
        <Button
          type="button"
          variant="tertiary"
          size="small"
          icon={<Minimize2 size={14} />}
          onClick={onExit}
          className="text-white/80 hover:bg-white/15 hover:text-white"
        >
          Avslutt fokusmodus (Esc)
        </Button>
      </div>

      {/* Centered content */}
      <div className="mx-auto px-4 pb-20" style={{ maxWidth }}>
        {children}
      </div>
    </div>,
    document.body
  );
}
