import { useRef, useEffect, useReducer } from 'react';
import type { Editor } from '@tiptap/react';
import { Button } from '@navikt/ds-react';
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
  MessageSquarePlus,
  ImagePlus,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { TrackMode } from './TrackChangesExtension';
import { getChangeAtCursor, getChangeIdsInRange, type TrackedChange } from './TrackChangesExtension';
import { getCommentAtCursor, type CommentInfo } from './CommentsExtension';

interface EditorToolbarProps {
  editor: Editor | null;
  trackingEnabled?: boolean;
  trackMode?: TrackMode;
  onToggleTracking?: () => void;
  onSetTrackMode?: (mode: TrackMode) => void;
  onImageUpload?: (file: File) => Promise<string>;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
}

function getActiveChange(editor: Editor): TrackedChange | null {
  const { from } = editor.state.selection;
  return getChangeAtCursor(editor.state.doc, from);
}

function getActiveComment(editor: Editor): CommentInfo | null {
  const { from } = editor.state.selection;
  return getCommentAtCursor(editor.state.doc, from);
}

export function EditorToolbar({
  editor,
  trackingEnabled = false,
  trackMode = 'editing',
  onToggleTracking,
  onSetTrackMode,
  onImageUpload,
  focusMode = false,
  onToggleFocusMode,
}: EditorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Force re-render on cursor movement so activeChange reflects the current position.
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!editor) return;
    editor.on('selectionUpdate', forceUpdate);
    return () => { editor.off('selectionUpdate', forceUpdate); };
  }, [editor]);

  // Remember the last non-final mode so "Vis spor" can restore it correctly.
  const prevNonFinalModeRef = useRef<TrackMode>(trackMode !== 'final' ? trackMode : 'editing');
  useEffect(() => {
    if (trackMode !== 'final') prevNonFinalModeRef.current = trackMode;
  }, [trackMode]);

  if (!editor) return null;

  // Compute active change regardless of trackingEnabled so accept/reject
  // remain available for existing marks even when new tracking is off.
  const activeChange = getActiveChange(editor);
  const { from, to } = editor.state.selection;
  const hasSelection = from !== to;
  const selectionHasChanges = hasSelection
    ? getChangeIdsInRange(editor.state.doc, from, to).length > 0
    : false;
  const hasAnyChange = !!activeChange || selectionHasChanges;
  const acceptRejectDisabled = !hasAnyChange;
  const activeComment = getActiveComment(editor);

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
    <div className="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-3 py-2 rounded-t-lg sticky top-0 z-10 flex-wrap" role="toolbar" aria-label="Formateringsverktøy">
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
                ? '!bg-blue-600 !text-white rounded'
                : 'rounded'
            }
          >
            Spor endringer
          </Button>

          {/* Accept/reject — visible when tracking is on OR there are existing marks at cursor/selection */}
          {(trackingEnabled || hasAnyChange) && (
            <>
              <div className="mx-1 h-5 w-px bg-gray-300" />
              <Button
                type="button"
                variant="tertiary"
                size="xsmall"
                icon={<Check size={14} />}
                disabled={acceptRejectDisabled}
                onClick={() => {
                  if (hasSelection) {
                    editor.commands.acceptChangesInRange();
                  } else if (activeChange) {
                    editor.commands.acceptChange(activeChange.changeId);
                  }
                }}
                className="text-green-700 rounded"
              >
                Godta endringer
              </Button>
              <Button
                type="button"
                variant="tertiary"
                size="xsmall"
                icon={<X size={14} />}
                disabled={acceptRejectDisabled}
                onClick={() => {
                  if (hasSelection) {
                    editor.commands.rejectChangesInRange();
                  } else if (activeChange) {
                    editor.commands.rejectChange(activeChange.changeId);
                  }
                }}
                className="text-red-700 rounded"
              >
                Avvis endringer
              </Button>
            </>
          )}

          {/* Show/hide tracked changes markup toggle — restores previous non-final mode */}
          {onSetTrackMode && (
            <>
              <div className="mx-1 h-5 w-px bg-gray-300" />
              <Button
                type="button"
                variant="tertiary"
                size="xsmall"
                icon={trackMode === 'final' ? <Eye size={16} /> : <EyeOff size={16} />}
                onClick={() => onSetTrackMode(trackMode === 'final' ? prevNonFinalModeRef.current : 'final')}
                title={trackMode === 'final' ? 'Vis sporendringer' : 'Skjul sporendringer'}
                className={trackMode !== 'final' ? 'bg-blue-100 text-blue-700 rounded' : 'rounded'}
              >
                {trackMode === 'final' ? 'Vis spor' : 'Skjul spor'}
              </Button>
            </>
          )}
        </>
      )}

      {/* Image upload */}
      {onImageUpload && (
        <>
          <div className="mx-1 h-5 w-px bg-gray-300" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              e.target.value = '';
              try {
                const url = await onImageUpload(file);
                editor.chain().focus().setImage({ src: url }).run();
              } catch {
                // silent — user can retry
              }
            }}
          />
          <Button
            type="button"
            variant="tertiary"
            size="xsmall"
            icon={<ImagePlus size={16} />}
            onClick={() => fileInputRef.current?.click()}
            title="Sett inn bilde"
            className="rounded"
          >
            Bilde
          </Button>
        </>
      )}

      {/* Comment section */}
      <div className="mx-1 h-5 w-px bg-gray-300" />
      <Button
        type="button"
        variant="tertiary"
        size="xsmall"
        icon={<MessageSquarePlus size={16} />}
        onMouseDown={(e) => {
          e.preventDefault();
          const { from, to } = editor.state.selection;
          if (from === to) return;
          window.dispatchEvent(
            new CustomEvent('editor:add-comment', {
              detail: {
                from,
                to,
                text: editor.state.doc.textBetween(from, to, ' '),
              },
            })
          );
        }}
        title="Legg til kommentar (Ctrl+Shift+C)"
        className="rounded"
      >
        Kommentar
      </Button>

      {/* Active comment indicator */}
      {activeComment && !activeComment.resolved && (
        <>
          <Button
            type="button"
            variant="tertiary"
            size="xsmall"
            icon={<Check size={14} />}
            onClick={() => editor.commands.resolveCommentMark(activeComment.commentId)}
            className="text-green-700 rounded"
          >
            Løs kommentar
          </Button>
        </>
      )}

      {/* Focus mode toggle */}
      {onToggleFocusMode && (
        <>
          <div className="mx-1 h-5 w-px bg-gray-300" />
          <Button
            type="button"
            variant="tertiary"
            size="xsmall"
            icon={focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            onClick={onToggleFocusMode}
            title={focusMode ? 'Avslutt fokusmodus (Esc)' : 'Fokusmodus (F11)'}
            className="rounded"
          />
        </>
      )}
    </div>
  );
}
