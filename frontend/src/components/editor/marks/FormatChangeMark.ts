import { Mark, mergeAttributes } from '@tiptap/core';

export const FormatChangeMark = Mark.create({
  name: 'formatChange',

  addAttributes() {
    return {
      changeId: { default: null },
      authorId: { default: null },
      authorName: { default: null },
      timestamp: { default: null },
      originalFormat: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-format-change]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          return {
            changeId: el.getAttribute('data-change-id'),
            authorId: el.getAttribute('data-author-id'),
            authorName: el.getAttribute('data-author-name'),
            timestamp: el.getAttribute('data-timestamp'),
            originalFormat: el.getAttribute('data-original-format'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-format-change': '',
        'data-change-id': HTMLAttributes.changeId,
        'data-author-id': HTMLAttributes.authorId,
        'data-author-name': HTMLAttributes.authorName,
        'data-timestamp': HTMLAttributes.timestamp,
        'data-original-format': HTMLAttributes.originalFormat,
        class: 'tracked-format-change',
      }),
      0,
    ];
  },
});
