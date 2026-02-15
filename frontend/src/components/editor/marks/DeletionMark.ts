import { Mark, mergeAttributes } from '@tiptap/core';

export const DeletionMark = Mark.create({
  name: 'deletion',

  addAttributes() {
    return {
      changeId: { default: null },
      authorId: { default: null },
      authorName: { default: null },
      timestamp: { default: null },
    };
  },

  excludes: 'insertion',

  parseHTML() {
    return [
      {
        tag: 'del[data-change-id]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          return {
            changeId: el.getAttribute('data-change-id'),
            authorId: el.getAttribute('data-author-id'),
            authorName: el.getAttribute('data-author-name'),
            timestamp: el.getAttribute('data-timestamp'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'del',
      mergeAttributes(HTMLAttributes, {
        'data-change-id': HTMLAttributes.changeId,
        'data-author-id': HTMLAttributes.authorId,
        'data-author-name': HTMLAttributes.authorName,
        'data-timestamp': HTMLAttributes.timestamp,
        class: 'tracked-deletion',
      }),
      0,
    ];
  },
});
