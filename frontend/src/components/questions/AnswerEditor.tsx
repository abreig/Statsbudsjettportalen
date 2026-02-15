import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Button } from '@navikt/ds-react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Undo2,
  Redo2,
} from 'lucide-react';

interface AnswerEditorProps {
  initialContent?: string | null; // JSON string
  editable?: boolean;
  onUpdate?: (json: string, text: string) => void;
}

export function AnswerEditor({
  initialContent,
  editable = true,
  onUpdate,
}: AnswerEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
    ],
    content: initialContent ? JSON.parse(initialContent) : { type: 'doc', content: [{ type: 'paragraph' }] },
    editable,
    onUpdate: ({ editor: ed }) => {
      if (onUpdate) {
        const json = JSON.stringify(ed.getJSON());
        const text = ed.getText();
        onUpdate(json, text);
      }
    },
  });

  if (!editor) return null;

  return (
    <div className={`rounded-lg border ${editable ? 'border-gray-300' : 'border-gray-200'}`}>
      {editable && (
        <div className="flex items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1 rounded-t-lg">
          <Button type="button" variant="tertiary" size="xsmall"
            icon={<Bold size={14} />}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-blue-100 text-blue-700 rounded' : 'rounded'}
            title="Fet"
          />
          <Button type="button" variant="tertiary" size="xsmall"
            icon={<Italic size={14} />}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-blue-100 text-blue-700 rounded' : 'rounded'}
            title="Kursiv"
          />
          <Button type="button" variant="tertiary" size="xsmall"
            icon={<UnderlineIcon size={14} />}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={editor.isActive('underline') ? 'bg-blue-100 text-blue-700 rounded' : 'rounded'}
            title="Understreking"
          />
          <div className="mx-1 h-4 w-px bg-gray-300" />
          <Button type="button" variant="tertiary" size="xsmall"
            icon={<List size={14} />}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700 rounded' : 'rounded'}
            title="Punktliste"
          />
          <Button type="button" variant="tertiary" size="xsmall"
            icon={<ListOrdered size={14} />}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700 rounded' : 'rounded'}
            title="Nummerert liste"
          />
          <div className="mx-1 h-4 w-px bg-gray-300" />
          <Button type="button" variant="tertiary" size="xsmall"
            icon={<Undo2 size={14} />}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Angre"
          />
          <Button type="button" variant="tertiary" size="xsmall"
            icon={<Redo2 size={14} />}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Gjør om"
          />
        </div>
      )}
      <EditorContent
        editor={editor}
        className={`prose prose-sm max-w-none ${editable ? 'min-h-[80px] p-3' : 'p-2'}`}
      />
    </div>
  );
}
