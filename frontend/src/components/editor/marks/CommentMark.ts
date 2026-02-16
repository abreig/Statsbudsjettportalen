import { Mark, mergeAttributes } from '@tiptap/core';

export const CommentMark = Mark.create({
  name: 'comment',

  addAttributes() {
    return {
      commentId: { default: null },
      authorId: { default: null },
      authorName: { default: null },
      timestamp: { default: null },
      resolved: { default: false },
    };
  },

  // Comments can coexist with track change marks
  excludes: '',

  parseHTML() {
    return [
      {
        tag: 'mark[data-comment-id]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          return {
            commentId: el.getAttribute('data-comment-id'),
            authorId: el.getAttribute('data-author-id'),
            authorName: el.getAttribute('data-author-name'),
            timestamp: el.getAttribute('data-timestamp'),
            resolved: el.getAttribute('data-resolved') === 'true',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      mergeAttributes(HTMLAttributes, {
        'data-comment-id': HTMLAttributes.commentId,
        'data-author-id': HTMLAttributes.authorId,
        'data-author-name': HTMLAttributes.authorName,
        'data-timestamp': HTMLAttributes.timestamp,
        'data-resolved': HTMLAttributes.resolved ? 'true' : 'false',
        class: HTMLAttributes.resolved ? 'comment-mark comment-resolved' : 'comment-mark',
      }),
      0,
    ];
  },
});
