import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import { useEffect, useContext } from 'react';
import apiClient from '../../api/client';

import { InsertionMark } from '../editor/marks/InsertionMark';
import { DeletionMark } from '../editor/marks/DeletionMark';
import { FormatChangeMark } from '../editor/marks/FormatChangeMark';
import { CommentMark } from '../editor/marks/CommentMark';
import { TrackChangesExtension } from '../editor/TrackChangesExtension';
import { CommentsExtension } from '../editor/CommentsExtension';
import { useAuthStore } from '../../stores/authStore';
import { DepListEditorContext } from './DepListEditorContext';

import '../editor/trackChanges.css';
import '../editor/comments.css';

interface DepListContentEditorProps {
  initialContent: string | null; // JSON string
  editable?: boolean;
  onUpdate?: (json: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
  className?: string;
}

export function DepListContentEditor({
  initialContent,
  editable = true,
  onUpdate,
  onEditorReady,
  className = '',
}: DepListContentEditorProps) {
  const user = useAuthStore((s) => s.user);
  const currentUser = user ? { id: user.id, name: user.fullName } : undefined;

  const ctx = useContext(DepListEditorContext);
  const trackingEnabled = ctx?.trackingEnabled ?? false;
  const trackMode = ctx?.trackMode ?? 'editing';

  const parsedContent = (() => {
    if (!initialContent) return { type: 'doc', content: [{ type: 'paragraph' }] };
    try {
      return JSON.parse(initialContent);
    } catch {
      return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: initialContent }] }] };
    }
  })();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: false, allowBase64: false }),
      InsertionMark,
      DeletionMark,
      FormatChangeMark,
      CommentMark,
      TrackChangesExtension,
      CommentsExtension,
    ],
    content: parsedContent,
    editable,
    onUpdate: ({ editor: ed }) => {
      onUpdate?.(JSON.stringify(ed.getJSON()));
    },
    onFocus: ({ editor: ed }) => {
      ctx?.setActiveEditor(ed as Editor);
    },
  });

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (editor) editor.commands.setTrackingEnabled(trackingEnabled);
  }, [editor, trackingEnabled]);

  useEffect(() => {
    if (editor) editor.commands.setTrackMode(trackMode);
  }, [editor, trackMode]);

  useEffect(() => {
    if (editor && currentUser) {
      editor.commands.setTrackAuthor(currentUser.id, currentUser.name);
    }
  }, [editor, currentUser?.id, currentUser?.name]);

  useEffect(() => {
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  const modeClass = `track-mode-${trackMode}`;

  return (
    <div className={`dl-editable-area rounded-lg border border-gray-200 bg-white ${modeClass} ${className}`}>
      <div className="px-4 py-3">
        <EditorContent editor={editor} className="dl-body" />
      </div>
    </div>
  );
}

export async function uploadDepListImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<{ url: string }>('/uploads/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}
