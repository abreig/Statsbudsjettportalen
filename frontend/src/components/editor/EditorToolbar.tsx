import type { Editor } from '@tiptap/react';
import { Button, ToggleGroup } from '@navikt/ds-react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  GitCompareArrows,
  Check,
  X,
} from 'lucide-react';
import type { TrackMode } from './TrackChangesExtension';
import { getChangeAtCursor, type TrackedChange } from './TrackChangesExtension';

interface EditorToolbarProps {
  editor: Editor | null;
  trackingEnabled?: boolean;
  trackMode?: TrackMode;
  onToggleTracking?: () => void;
  onSetTrackMode?: (mode: TrackMode) => void;
}

function getActiveChange(editor: Editor): TrackedChange | null {
  const { from } = editor.state.selection;
  return getChangeAtCursor(editor.state.doc, from);
}

export function EditorToolbar({
  editor,
  trackingEnabled = false,
  trackMode = 'editing',
  onToggleTracking,
  onSetTrackMode,
}: EditorToolbarProps) {
  if (!editor) return null;

  const activeChange = trackingEnabled ? getActiveChange(editor) : null;

  const toolbarItems = [
    {
      icon: <Bold size={16} />,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
      title: 'Fet (Ctrl+B)',
    },
    {
      icon: <Italic size={16} />,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
      title: 'Kursiv (Ctrl+I)',
    },
    {
      icon: <Underline size={16} />,
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive('underline'),
      title: 'Understreking (Ctrl+U)',
    },
    'separator',
    {
      icon: <List size={16} />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
      title: 'Punktliste',
    },
    {
      icon: <ListOrdered size={16} />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
      title: 'Nummerert liste',
    },
    'separator',
    {
      icon: <Undo2 size={16} />,
      action: () => editor.chain().focus().undo().run(),
      isActive: false,
      disabled: !editor.can().undo(),
      title: 'Angre (Ctrl+Z)',
    },
    {
      icon: <Redo2 size={16} />,
      action: () => editor.chain().focus().redo().run(),
      isActive: false,
      disabled: !editor.can().redo(),
      title: 'Gjør om (Ctrl+Shift+Z)',
    },
  ] as const;

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-3 py-2 rounded-t-lg sticky top-0 z-10 flex-wrap">
      {toolbarItems.map((item, idx) => {
        if (item === 'separator') {
          return (
            <div
              key={`sep-${idx}`}
              className="mx-1 h-5 w-px bg-gray-300"
            />
          );
        }
        return (
          <Button
            key={item.title}
            type="button"
            variant="tertiary"
            size="xsmall"
            icon={item.icon}
            onClick={item.action}
            title={item.title}
            disabled={'disabled' in item ? item.disabled : false}
            className={
              item.isActive
                ? 'bg-blue-100 text-blue-700 rounded'
                : 'rounded'
            }
          />
        );
      })}

      {/* Track Changes section */}
      {onToggleTracking && (
        <>
          <div className="mx-1 h-5 w-px bg-gray-300" />

          <Button
            type="button"
            variant="tertiary"
            size="xsmall"
            icon={<GitCompareArrows size={16} />}
            onClick={onToggleTracking}
            title={trackingEnabled ? 'Slå av spor endringer' : 'Slå på spor endringer'}
            className={
              trackingEnabled
                ? 'bg-green-100 text-green-700 rounded'
                : 'rounded'
            }
          >
            Spor endringer
          </Button>

          {/* Inline accept/reject when cursor is on a tracked change */}
          {trackingEnabled && activeChange && (
            <>
              <div className="mx-1 h-5 w-px bg-gray-300" />
              <Button
                type="button"
                variant="tertiary"
                size="xsmall"
                icon={<Check size={14} />}
                onClick={() => editor.commands.acceptChange(activeChange.changeId)}
                className="text-green-700 rounded"
              >
                Godta endring
              </Button>
              <Button
                type="button"
                variant="tertiary"
                size="xsmall"
                icon={<X size={14} />}
                onClick={() => editor.commands.rejectChange(activeChange.changeId)}
                className="text-red-700 rounded"
              >
                Avvis endring
              </Button>
            </>
          )}

          {trackingEnabled && onSetTrackMode && (
            <ToggleGroup
              size="small"
              value={trackMode}
              onChange={(val) => onSetTrackMode(val as TrackMode)}
              className="ml-2"
            >
              <ToggleGroup.Item value="editing">Redigering</ToggleGroup.Item>
              <ToggleGroup.Item value="review">Gjennomgang</ToggleGroup.Item>
              <ToggleGroup.Item value="final">Endelig</ToggleGroup.Item>
            </ToggleGroup>
          )}
        </>
      )}
    </div>
  );
}
