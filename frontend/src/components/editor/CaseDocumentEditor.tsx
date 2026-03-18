import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import type { JSONContent } from '@tiptap/core';
import { FocusModeOverlay } from './FocusModeOverlay';

import { CaseDocument, CaseSection, SectionTitle, SectionContent } from './CaseDocumentSchema';
import { InsertionMark } from './marks/InsertionMark';
import { DeletionMark } from './marks/DeletionMark';
import { FormatChangeMark } from './marks/FormatChangeMark';
import { CommentMark } from './marks/CommentMark';
import { TrackChangesExtension, type TrackMode } from './TrackChangesExtension';
import { CommentsExtension } from './CommentsExtension';
import { EditorToolbar } from './EditorToolbar';

import './caseDocument.css';
import './trackChanges.css';
import './comments.css';

interface CaseDocumentEditorProps {
  initialContent: JSONContent;
  editable: boolean;
  onUpdate?: (doc: JSONContent) => void;
  onActivity?: () => void;
  trackChangesEnabled?: boolean;
  trackMode?: TrackMode;
  onToggleTracking?: () => void;
  onSetTrackMode?: (mode: TrackMode) => void;
  currentUser?: { id: string; name: string };
  onEditorReady?: (editor: import('@tiptap/react').Editor) => void;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  onSave?: () => void;
  saving?: boolean;
}

export function CaseDocumentEditor({
  initialContent,
  editable,
  onUpdate,
  onActivity,
  trackChangesEnabled = false,
  trackMode = 'editing',
  onToggleTracking,
  onSetTrackMode,
  currentUser,
  onEditorReady,
  focusMode = false,
  onToggleFocusMode,
  onSave,
  saving = false,
}: CaseDocumentEditorProps) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const editor = useEditor({
    extensions: [
      CaseDocument,
      CaseSection,
      SectionTitle,
      SectionContent,
      StarterKit.configure({
        document: false,
        heading: false,
        dropcursor: false,
        gapcursor: false,
      }),
      Underline,
      InsertionMark,
      DeletionMark,
      FormatChangeMark,
      CommentMark,
      TrackChangesExtension,
      CommentsExtension,
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      onUpdateRef.current?.(editor.getJSON());
      onActivity?.();
    },
    onSelectionUpdate: () => {
      onActivity?.();
    },
    editorProps: {
      attributes: {
        class: 'case-document-editor focus:outline-none',
      },
      handleKeyDown: (_view, event) => {
        // Prevent editing section titles
        const selection = window.getSelection();
        if (selection && selection.focusNode) {
          const el = selection.focusNode.parentElement?.closest('[data-type="section-title"]');
          if (el && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
            return true; // block character input inside section titles
          }
          if (el && (event.key === 'Backspace' || event.key === 'Delete')) {
            return true; // block deletion inside section titles
          }
        }
        return false;
      },
    },
  });

  // Notify parent about editor instance
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Sync tracking enabled state
  useEffect(() => {
    if (editor) {
      editor.commands.setTrackingEnabled(trackChangesEnabled);
    }
  }, [editor, trackChangesEnabled]);

  // Sync track mode
  useEffect(() => {
    if (editor) {
      editor.commands.setTrackMode(trackMode);
      editor.setEditable(editable);
    }
  }, [editor, trackMode, editable]);

  // Sync author info
  useEffect(() => {
    if (editor && currentUser) {
      editor.commands.setTrackAuthor(currentUser.id, currentUser.name);
    }
  }, [editor, currentUser?.id, currentUser?.name]);

  // Update editable state when prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Update content when initialContent changes (e.g., after server reload)
  const contentKey = useRef<string>('');
  const trackChangesEnabledRef = useRef(trackChangesEnabled);
  trackChangesEnabledRef.current = trackChangesEnabled;
  useEffect(() => {
    if (!editor) return;
    const newKey = JSON.stringify(initialContent);
    if (newKey !== contentKey.current) {
      contentKey.current = newKey;
      // Only update if the editor content differs (avoid cursor jumps)
      const currentJson = JSON.stringify(editor.getJSON());
      if (currentJson !== newKey) {
        // Temporarily disable tracking so setContent doesn't mark the entire
        // document as an "insertion" via appendTransaction
        editor.commands.setTrackingEnabled(false);
        editor.commands.setContent(initialContent, false);
        if (trackChangesEnabledRef.current) {
          editor.commands.setTrackingEnabled(true);
        }
      }
    }
  }, [editor, initialContent]);

  // CSS class for track mode — applied regardless of whether tracking is on,
  // so that existing marks in the document can be shown/hidden via mode.
  const modeClass = `track-mode-${trackMode}`;

  return (
    <FocusModeOverlay
      active={focusMode}
      onExit={onToggleFocusMode ?? (() => {})}
      onSave={onSave}
      saving={saving}
      maxWidth="860px"
    >
      <div className={`case-document-wrapper rounded-lg border border-gray-200 bg-white ${modeClass}`}>
        {editable && (
          <EditorToolbar
            editor={editor}
            trackingEnabled={trackChangesEnabled}
            trackMode={trackMode}
            onToggleTracking={onToggleTracking}
            onSetTrackMode={onSetTrackMode}
            focusMode={focusMode}
            onToggleFocusMode={onToggleFocusMode}
          />
        )}
        <div className="px-8 py-6">
          <EditorContent editor={editor} />
        </div>
      </div>
    </FocusModeOverlay>
  );
}
