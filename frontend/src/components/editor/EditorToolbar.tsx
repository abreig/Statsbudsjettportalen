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
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

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
    <div className="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-3 py-2 rounded-t-lg sticky top-0 z-10">
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
    </div>
  );
}
