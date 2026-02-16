import { useState } from 'react';
import { Button, TextField } from '@navikt/ds-react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { CaseConclusion } from '../../lib/types';

interface DepListConclusionListProps {
  conclusions: CaseConclusion[];
  editable?: boolean;
  onAdd?: (text: string) => void;
  onUpdate?: (id: string, text: string) => void;
  onDelete?: (id: string) => void;
}

export function DepListConclusionList({
  conclusions,
  editable = false,
  onAdd,
  onUpdate,
  onDelete,
}: DepListConclusionListProps) {
  const [newText, setNewText] = useState('');

  const sorted = [...conclusions].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      {sorted.length > 0 && (
        <div className="dl-body" style={{ fontWeight: 700, marginBottom: 4 }}>
          Konklusjon:
        </div>
      )}
      <ol className="dl-conclusion-list">
        {sorted.map((c) => (
          <li key={c.id} className="dl-conclusion-item">
            {editable ? (
              <div className="flex items-start gap-2">
                <GripVertical size={14} className="mt-1 shrink-0 text-gray-400" />
                <input
                  type="text"
                  className="flex-1 border-b border-transparent bg-transparent text-sm font-bold hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                  value={c.text}
                  onChange={(e) => onUpdate?.(c.id, e.target.value)}
                />
                <button
                  type="button"
                  className="shrink-0 text-gray-400 hover:text-red-500"
                  onClick={() => onDelete?.(c.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              c.text
            )}
          </li>
        ))}
      </ol>
      {editable && (
        <div className="mt-2 flex items-center gap-2">
          <TextField
            label=""
            hideLabel
            size="small"
            placeholder="Nytt konklusjonspunkt..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newText.trim()) {
                onAdd?.(newText.trim());
                setNewText('');
              }
            }}
            className="flex-1"
          />
          <Button
            size="xsmall"
            variant="tertiary"
            icon={<Plus size={14} />}
            disabled={!newText.trim()}
            onClick={() => {
              if (newText.trim()) {
                onAdd?.(newText.trim());
                setNewText('');
              }
            }}
          >
            Legg til
          </Button>
        </div>
      )}
    </div>
  );
}
