import { useRef } from 'react';
import { Button, TextField } from '@navikt/ds-react';
import { Trash2, ImageIcon } from 'lucide-react';

interface DepListFigureProps {
  fileUrl?: string | null;
  caption?: string | null;
  widthPercent?: number;
  editable?: boolean;
  onUpload?: (file: File) => void;
  onCaptionChange?: (caption: string) => void;
  onDelete?: () => void;
}

export function DepListFigure({
  fileUrl,
  caption,
  widthPercent = 100,
  editable = false,
  onUpload,
  onCaptionChange,
  onDelete,
}: DepListFigureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!fileUrl && !editable) return null;

  if (!fileUrl && editable) {
    return (
      <div className="dl-figure-upload" onClick={() => fileInputRef.current?.click()}>
        <ImageIcon size={32} className="mx-auto mb-2 text-gray-400" />
        <div className="text-sm">Klikk for å laste opp figur (PNG/SVG)</div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/svg+xml,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload?.(file);
          }}
        />
      </div>
    );
  }

  return (
    <div className="dl-figure" style={{ maxWidth: `${widthPercent}%`, margin: '16px auto' }}>
      <img src={fileUrl!} alt={caption ?? 'Figur'} style={{ width: '100%' }} />
      {editable ? (
        <div className="mt-2 flex items-center gap-2">
          <TextField
            label=""
            hideLabel
            size="small"
            placeholder="Figurtekst..."
            value={caption ?? ''}
            onChange={(e) => onCaptionChange?.(e.target.value)}
            className="flex-1"
          />
          <Button
            size="xsmall"
            variant="tertiary"
            icon={<Trash2 size={14} />}
            onClick={onDelete}
          />
        </div>
      ) : (
        caption && <div className="dl-fig-title">{caption}</div>
      )}
    </div>
  );
}
