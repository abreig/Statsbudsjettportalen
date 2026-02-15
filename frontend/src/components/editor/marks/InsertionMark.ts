import { Mark, mergeAttributes } from '@tiptap/core';

export const InsertionMark = Mark.create({
  name: 'insertion',

  addAttributes() {
    return {
      changeId: { default: null },
      authorId: { default: null },
      authorName: { default: null },
      timestamp: { default: null },
    };
  },

  excludes: 'deletion',

  parseHTML() {
    return [
      {
        tag: 'ins[data-change-id]',
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
      'ins',
      mergeAttributes(HTMLAttributes, {
        'data-change-id': HTMLAttributes.changeId,
        'data-author-id': HTMLAttributes.authorId,
        'data-author-name': HTMLAttributes.authorName,
        'data-timestamp': HTMLAttributes.timestamp,
        class: 'tracked-insertion',
      }),
      0,
    ];
  },
});
