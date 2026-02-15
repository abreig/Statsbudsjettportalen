import { useMemo } from 'react';
import type { Editor } from '@tiptap/react';
import { Button, Tag } from '@navikt/ds-react';
import { Check, X, Plus, Minus, Type } from 'lucide-react';
import { collectTrackedChanges, type TrackedChange } from './TrackChangesExtension';

interface TrackedChangesPanelProps {
  editor: Editor | null;
}

function formatTimestamp(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function changeTypeLabel(type: TrackedChange['type']): string {
  switch (type) {
    case 'insertion': return 'Lagt til';
    case 'deletion': return 'Slettet';
    case 'formatChange': return 'Formatert';
  }
}

function changeTypeVariant(type: TrackedChange['type']): 'success' | 'error' | 'alt3' {
  switch (type) {
    case 'insertion': return 'success';
    case 'deletion': return 'error';
    case 'formatChange': return 'alt3';
  }
}

function ChangeIcon({ type }: { type: TrackedChange['type'] }) {
  switch (type) {
    case 'insertion': return <Plus size={14} />;
    case 'deletion': return <Minus size={14} />;
    case 'formatChange': return <Type size={14} />;
  }
}

export function TrackedChangesPanel({ editor }: TrackedChangesPanelProps) {
  const changes = useMemo(() => {
    if (!editor) return [];
    return collectTrackedChanges(editor.state.doc);
  }, [editor, editor?.state.doc]);

  if (!editor) return null;

  const handleAccept = (changeId: string) => {
    editor.commands.acceptChange(changeId);
  };

  const handleReject = (changeId: string) => {
    editor.commands.rejectChange(changeId);
  };

  const handleAcceptAll = () => {
    editor.commands.acceptAllChanges();
  };

  const handleRejectAll = () => {
    editor.commands.rejectAllChanges();
  };

  const handleScrollTo = (change: TrackedChange) => {
    // Scroll to the change position in the editor
    try {
      const domAtPos = editor.view.domAtPos(change.from);
      const el = domAtPos.node instanceof HTMLElement
        ? domAtPos.node
        : domAtPos.node.parentElement;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Select the change range
      editor.commands.setTextSelection({ from: change.from, to: change.to });
    } catch {
      // Position may be stale after edits
    }
  };

  if (changes.length === 0) {
    return (
      <div className="tracked-changes-panel p-3">
        <h4 className="text-sm font-semibold mb-2 text-gray-700">Sporede endringer</h4>
        <p className="text-xs text-gray-500">Ingen endringer å vise.</p>
      </div>
    );
  }

  return (
    <div className="tracked-changes-panel">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">
          Sporede endringer
          <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 min-w-[1.25rem]">
            {changes.length}
          </span>
        </h4>
      </div>

      <div className="flex gap-1 mb-3">
        <Button
          type="button"
          variant="tertiary"
          size="xsmall"
          onClick={handleAcceptAll}
          icon={<Check size={14} />}
        >
          Godkjenn alle
        </Button>
        <Button
          type="button"
          variant="tertiary"
          size="xsmall"
          onClick={handleRejectAll}
          icon={<X size={14} />}
        >
          Avvis alle
        </Button>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {changes.map((change) => (
          <div
            key={change.changeId}
            className="tracked-change-item rounded border border-gray-200 p-2 hover:bg-gray-50 cursor-pointer"
            onClick={() => handleScrollTo(change)}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <ChangeIcon type={change.type} />
              <Tag variant={changeTypeVariant(change.type)} size="xsmall">
                {changeTypeLabel(change.type)}
              </Tag>
              <span className="text-xs text-gray-500 ml-auto">
                {formatTimestamp(change.timestamp)}
              </span>
            </div>

            <p className="text-xs text-gray-700 truncate mb-1.5" title={change.text}>
              {change.authorName && (
                <span className="font-medium">{change.authorName}: </span>
              )}
              &ldquo;{change.text.slice(0, 60)}{change.text.length > 60 ? '...' : ''}&rdquo;
            </p>

            <div className="flex gap-1">
              <Button
                type="button"
                variant="tertiary"
                size="xsmall"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAccept(change.changeId);
                }}
                icon={<Check size={12} />}
              >
                Godkjenn
              </Button>
              <Button
                type="button"
                variant="tertiary"
                size="xsmall"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReject(change.changeId);
                }}
                icon={<X size={12} />}
              >
                Avvis
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
