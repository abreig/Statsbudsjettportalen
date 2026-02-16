import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useEffect } from 'react';

interface DepListContentEditorProps {
  initialContent: string | null; // JSON string
  editable?: boolean;
  onUpdate?: (json: string) => void;
  className?: string;
}

export function DepListContentEditor({
  initialContent,
  editable = true,
  onUpdate,
  className = '',
}: DepListContentEditorProps) {
  const parsedContent = (() => {
    if (!initialContent) return { type: 'doc', content: [{ type: 'paragraph' }] };
    try {
      return JSON.parse(initialContent);
    } catch {
      return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: initialContent }] }] };
    }
  })();

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: parsedContent,
    editable,
    onUpdate: ({ editor: ed }) => {
      onUpdate?.(JSON.stringify(ed.getJSON()));
    },
  });

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return null;

  return (
    <div className={`dl-editable-area ${className}`}>
      <EditorContent editor={editor} className="dl-body" />
    </div>
  );
}
