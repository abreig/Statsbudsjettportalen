import { Extension } from '@tiptap/core';
import type { Node as PMNode, Mark as PMMark } from '@tiptap/pm/model';

export interface CommentInfo {
  commentId: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  resolved: boolean;
  from: number;
  to: number;
  text: string;
}

/**
 * Collect all comment marks from the document, grouped by commentId.
 */
export function collectCommentMarks(doc: PMNode): CommentInfo[] {
  const commentsMap = new Map<string, CommentInfo>();

  doc.descendants((node, pos) => {
    if (!node.isText) return;

    const commentMark = node.marks.find((m) => m.type.name === 'comment');
    if (!commentMark) return;

    const commentId = commentMark.attrs.commentId as string;
    if (!commentId) return;

    const existing = commentsMap.get(commentId);
    if (existing) {
      // Extend the range
      existing.to = pos + node.nodeSize;
      existing.text += node.text ?? '';
    } else {
      commentsMap.set(commentId, {
        commentId,
        authorId: commentMark.attrs.authorId as string,
        authorName: commentMark.attrs.authorName as string,
        timestamp: commentMark.attrs.timestamp as string,
        resolved: commentMark.attrs.resolved as boolean,
        from: pos,
        to: pos + node.nodeSize,
        text: node.text ?? '',
      });
    }
  });

  // Sort by document position
  return Array.from(commentsMap.values()).sort((a, b) => a.from - b.from);
}

/**
 * Get the comment at the current cursor position.
 */
export function getCommentAtCursor(doc: PMNode, pos: number): CommentInfo | null {
  const resolvedPos = doc.resolve(pos);
  const node = resolvedPos.parent;

  // Check inline nodes at this position
  if (node.isTextblock) {
    let offset = resolvedPos.parentOffset;
    let childIndex = 0;
    let childOffset = 0;
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (childOffset + child.nodeSize > offset) {
        childIndex = i;
        break;
      }
      childOffset += child.nodeSize;
    }

    const child = node.childCount > childIndex ? node.child(childIndex) : null;
    if (child?.isText) {
      const commentMark = child.marks.find((m) => m.type.name === 'comment');
      if (commentMark) {
        const commentId = commentMark.attrs.commentId as string;
        // Find the full range of this comment mark
        const comments = collectCommentMarks(doc);
        return comments.find((c) => c.commentId === commentId) ?? null;
      }
    }
  }

  return null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comments: {
      addComment: (commentId: string, authorId: string, authorName: string) => ReturnType;
      removeCommentMark: (commentId: string) => ReturnType;
      resolveCommentMark: (commentId: string) => ReturnType;
      reopenCommentMark: (commentId: string) => ReturnType;
    };
  }
}

export const CommentsExtension = Extension.create({
  name: 'comments',

  addCommands() {
    return {
      addComment:
        (commentId: string, authorId: string, authorName: string) =>
        ({ editor, tr, dispatch }) => {
          const { from, to } = editor.state.selection;
          if (from === to) return false; // Need a text selection

          const commentMarkType = editor.schema.marks.comment;
          if (!commentMarkType) return false;

          if (dispatch) {
            const mark = commentMarkType.create({
              commentId,
              authorId,
              authorName,
              timestamp: new Date().toISOString(),
              resolved: false,
            });
            tr.addMark(from, to, mark);
          }
          return true;
        },

      removeCommentMark:
        (commentId: string) =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;

          const doc = tr.doc;
          const commentMarkType = editor.schema.marks.comment;
          if (!commentMarkType) return false;

          const ranges: Array<{ from: number; to: number }> = [];

          doc.descendants((node, pos) => {
            if (!node.isText) return;
            const mark = node.marks.find(
              (m) => m.type.name === 'comment' && m.attrs.commentId === commentId
            );
            if (mark) {
              ranges.push({ from: pos, to: pos + node.nodeSize });
            }
          });

          // Remove marks in reverse order to preserve positions
          for (let i = ranges.length - 1; i >= 0; i--) {
            tr.removeMark(ranges[i].from, ranges[i].to, commentMarkType);
          }

          return true;
        },

      resolveCommentMark:
        (commentId: string) =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;

          const doc = tr.doc;
          const commentMarkType = editor.schema.marks.comment;
          if (!commentMarkType) return false;

          const ranges: Array<{ from: number; to: number; mark: PMMark }> = [];

          doc.descendants((node, pos) => {
            if (!node.isText) return;
            const mark = node.marks.find(
              (m) => m.type.name === 'comment' && m.attrs.commentId === commentId
            );
            if (mark) {
              ranges.push({ from: pos, to: pos + node.nodeSize, mark });
            }
          });

          for (let i = ranges.length - 1; i >= 0; i--) {
            const r = ranges[i];
            tr.removeMark(r.from, r.to, commentMarkType);
            tr.addMark(
              r.from,
              r.to,
              commentMarkType.create({
                ...r.mark.attrs,
                resolved: true,
              })
            );
          }

          return true;
        },

      reopenCommentMark:
        (commentId: string) =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;

          const doc = tr.doc;
          const commentMarkType = editor.schema.marks.comment;
          if (!commentMarkType) return false;

          const ranges: Array<{ from: number; to: number; mark: PMMark }> = [];

          doc.descendants((node, pos) => {
            if (!node.isText) return;
            const mark = node.marks.find(
              (m) => m.type.name === 'comment' && m.attrs.commentId === commentId
            );
            if (mark) {
              ranges.push({ from: pos, to: pos + node.nodeSize, mark });
            }
          });

          for (let i = ranges.length - 1; i >= 0; i--) {
            const r = ranges[i];
            tr.removeMark(r.from, r.to, commentMarkType);
            tr.addMark(
              r.from,
              r.to,
              commentMarkType.create({
                ...r.mark.attrs,
                resolved: false,
              })
            );
          }

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-c': () => {
        // Trigger comment creation — the actual dialog is handled by the parent component
        // We dispatch a custom event that the CommentPanel listens to
        const { from, to } = this.editor.state.selection;
        if (from === to) return false;

        window.dispatchEvent(
          new CustomEvent('editor:add-comment', {
            detail: {
              from,
              to,
              text: this.editor.state.doc.textBetween(from, to, ' '),
            },
          })
        );
        return true;
      },
    };
  },
});
