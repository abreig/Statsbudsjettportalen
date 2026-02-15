import { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import type { JSONContent } from '@tiptap/core';

import { CaseDocument, CaseSection, SectionTitle, SectionContent } from './CaseDocumentSchema';
import { EditorToolbar } from './EditorToolbar';

import './caseDocument.css';

interface CaseDocumentEditorProps {
  initialContent: JSONContent;
  editable: boolean;
  onUpdate?: (doc: JSONContent) => void;
}

export function CaseDocumentEditor({
  initialContent,
  editable,
  onUpdate,
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
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      onUpdateRef.current?.(editor.getJSON());
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

  // Update editable state when prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Update content when initialContent changes (e.g., after server reload)
  const contentKey = useRef<string>('');
  useEffect(() => {
    if (!editor) return;
    const newKey = JSON.stringify(initialContent);
    if (newKey !== contentKey.current) {
      contentKey.current = newKey;
      // Only update if the editor content differs (avoid cursor jumps)
      const currentJson = JSON.stringify(editor.getJSON());
      if (currentJson !== newKey) {
        editor.commands.setContent(initialContent);
      }
    }
  }, [editor, initialContent]);

  return (
    <div className="case-document-wrapper rounded-lg border border-gray-200 bg-white">
      {editable && <EditorToolbar editor={editor} />}
      <div className="px-8 py-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
