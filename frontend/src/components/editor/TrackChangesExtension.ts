import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection, type Transaction } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import { ReplaceStep, ReplaceAroundStep, AddMarkStep, RemoveMarkStep } from '@tiptap/pm/transform';
import type { Mark as PMMark, Node as PMNode, ResolvedPos } from '@tiptap/pm/model';

export type TrackMode = 'editing' | 'review' | 'final';

export interface TrackedChange {
  changeId: string;
  type: 'insertion' | 'deletion' | 'formatChange';
  authorId: string;
  authorName: string;
  timestamp: string;
  from: number;
  to: number;
  text: string;
}

interface TrackChangesStorage {
  enabled: boolean;
  mode: TrackMode;
  authorId: string;
  authorName: string;
}

const trackChangesPluginKey = new PluginKey('trackChanges');

function generateChangeId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Find the tracked change mark at a given cursor position.
 * Returns null if cursor is not on a tracked change.
 */
export function getChangeAtCursor(doc: PMNode, pos: number): TrackedChange | null {
  const $pos = doc.resolve(pos);
  const parent = $pos.parent;
  if (!parent.isTextblock) return null;

  // Check the text node at cursor position
  const index = $pos.index();
  if (index >= parent.childCount) return null;

  const node = parent.child(index);
  if (!node.isText) return null;

  const markTypes = ['insertion', 'deletion', 'formatChange'] as const;
  for (const markType of markTypes) {
    const mark = node.marks.find((m) => m.type.name === markType);
    if (mark) {
      // Calculate absolute position of this text node
      let nodeStart = $pos.start();
      for (let i = 0; i < index; i++) {
        nodeStart += parent.child(i).nodeSize;
      }
      return {
        changeId: mark.attrs.changeId ?? '',
        type: markType,
        authorId: mark.attrs.authorId ?? '',
        authorName: mark.attrs.authorName ?? '',
        timestamp: mark.attrs.timestamp ?? '',
        from: nodeStart,
        to: nodeStart + node.nodeSize,
        text: node.text ?? '',
      };
    }
  }

  return null;
}

/**
 * Collect all tracked changes from the document.
 */
export function collectTrackedChanges(doc: PMNode): TrackedChange[] {
  const changes: TrackedChange[] = [];
  const seen = new Set<string>();

  doc.descendants((node, pos) => {
    if (!node.isText) return;

    const markTypes = ['insertion', 'deletion', 'formatChange'] as const;

    for (const markType of markTypes) {
      const mark = node.marks.find((m) => m.type.name === markType);
      if (!mark) continue;

      const changeId = mark.attrs.changeId as string;
      if (!changeId || seen.has(`${changeId}-${pos}`)) continue;
      seen.add(`${changeId}-${pos}`);

      changes.push({
        changeId,
        type: markType,
        authorId: mark.attrs.authorId ?? '',
        authorName: mark.attrs.authorName ?? '',
        timestamp: mark.attrs.timestamp ?? '',
        from: pos,
        to: pos + node.nodeSize,
        text: node.text ?? '',
      });
    }
  });

  // Group contiguous ranges with the same changeId
  const grouped = new Map<string, TrackedChange>();
  for (const change of changes) {
    const existing = grouped.get(change.changeId);
    if (existing) {
      existing.from = Math.min(existing.from, change.from);
      existing.to = Math.max(existing.to, change.to);
      existing.text += change.text;
    } else {
      grouped.set(change.changeId, { ...change });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.from - b.from);
}

/**
 * Check if a range of text has a specific mark type.
 */
function rangeHasMark(doc: PMNode, from: number, to: number, markName: string): boolean {
  let found = false;
  doc.nodesBetween(from, to, (node) => {
    if (node.isText && node.marks.some((m) => m.type.name === markName)) {
      found = true;
    }
  });
  return found;
}

/**
 * Get the boundary of the text node before the cursor (for Backspace).
 */
function charBefore($pos: ResolvedPos): { from: number; to: number } | null {
  const { parent, parentOffset } = $pos;
  if (parentOffset === 0) return null;

  // Walk backwards through text to find character boundary
  let offset = 0;
  for (let i = 0; i < parent.childCount; i++) {
    const child = parent.child(i);
    const nextOffset = offset + child.nodeSize;
    if (nextOffset >= parentOffset && child.isText) {
      const charFrom = $pos.start() + parentOffset - 1;
      const charTo = $pos.start() + parentOffset;
      return { from: charFrom, to: charTo };
    }
    offset = nextOffset;
  }
  return null;
}

/**
 * Get the boundary of the text node after the cursor (for Delete).
 */
function charAfter($pos: ResolvedPos): { from: number; to: number } | null {
  const { parent, parentOffset } = $pos;
  let offset = 0;
  for (let i = 0; i < parent.childCount; i++) {
    const child = parent.child(i);
    const nextOffset = offset + child.nodeSize;
    if (offset >= parentOffset && child.isText) {
      const charFrom = $pos.start() + parentOffset;
      const charTo = $pos.start() + parentOffset + 1;
      if (charTo <= $pos.start() + parent.content.size) {
        return { from: charFrom, to: charTo };
      }
      return null;
    }
    if (nextOffset > parentOffset && child.isText) {
      const charFrom = $pos.start() + parentOffset;
      const charTo = $pos.start() + parentOffset + 1;
      if (charTo <= $pos.start() + parent.content.size) {
        return { from: charFrom, to: charTo };
      }
      return null;
    }
    offset = nextOffset;
  }
  return null;
}

export const TrackChangesExtension = Extension.create<Record<string, never>, TrackChangesStorage>({
  name: 'trackChanges',

  addStorage() {
    return {
      enabled: false,
      mode: 'editing' as TrackMode,
      authorId: '',
      authorName: '',
    };
  },

  addKeyboardShortcuts() {
    const ext = this;

    return {
      Backspace: ({ editor }) => {
        if (!ext.storage.enabled || ext.storage.mode === 'final') return false;

        const { state } = editor;
        const { from, to, empty } = state.selection;

        if (empty) {
          // Single character deletion (backspace)
          const $pos = state.doc.resolve(from);
          const range = charBefore($pos);
          if (!range) return false;

          return markRangeAsDeleted(editor, range.from, range.to, ext.storage);
        } else {
          // Selection deletion
          return markRangeAsDeleted(editor, from, to, ext.storage);
        }
      },

      Delete: ({ editor }) => {
        if (!ext.storage.enabled || ext.storage.mode === 'final') return false;

        const { state } = editor;
        const { from, to, empty } = state.selection;

        if (empty) {
          const $pos = state.doc.resolve(from);
          const range = charAfter($pos);
          if (!range) return false;

          return markRangeAsDeleted(editor, range.from, range.to, ext.storage);
        } else {
          return markRangeAsDeleted(editor, from, to, ext.storage);
        }
      },
    };
  },

  addCommands() {
    return {
      setTrackingEnabled:
        (enabled: boolean) =>
        ({ editor }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const storage = (editor.storage as any).trackChanges as TrackChangesStorage;
          storage.enabled = enabled;
          return true;
        },

      setTrackMode:
        (mode: TrackMode) =>
        ({ editor }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const storage = (editor.storage as any).trackChanges as TrackChangesStorage;
          storage.mode = mode;
          return true;
        },

      setTrackAuthor:
        (authorId: string, authorName: string) =>
        ({ editor }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const storage = (editor.storage as any).trackChanges as TrackChangesStorage;
          storage.authorId = authorId;
          storage.authorName = authorName;
          return true;
        },

      acceptChange:
        (changeId: string) =>
        ({ editor, tr, dispatch }) => {
          const doc = editor.state.doc;
          let found = false;

          const ranges: { from: number; to: number; type: string; mark: PMMark }[] = [];

          doc.descendants((node, pos) => {
            if (!node.isText) return;
            for (const mark of node.marks) {
              if (
                (mark.type.name === 'insertion' || mark.type.name === 'deletion' || mark.type.name === 'formatChange') &&
                mark.attrs.changeId === changeId
              ) {
                ranges.push({ from: pos, to: pos + node.nodeSize, type: mark.type.name, mark });
              }
            }
          });

          if (ranges.length === 0) return false;

          ranges.sort((a, b) => b.from - a.from);

          for (const range of ranges) {
            if (range.type === 'insertion') {
              tr.removeMark(range.from, range.to, range.mark);
              found = true;
            } else if (range.type === 'deletion') {
              tr.delete(range.from, range.to);
              found = true;
            } else if (range.type === 'formatChange') {
              tr.removeMark(range.from, range.to, range.mark);
              found = true;
            }
          }

          if (found && dispatch) {
            tr.setMeta('trackChangesAccept', true);
            dispatch(tr);
          }
          return found;
        },

      rejectChange:
        (changeId: string) =>
        ({ editor, tr, dispatch }) => {
          const doc = editor.state.doc;
          let found = false;

          const ranges: { from: number; to: number; type: string; mark: PMMark; originalFormat?: string }[] = [];

          doc.descendants((node, pos) => {
            if (!node.isText) return;
            for (const mark of node.marks) {
              if (
                (mark.type.name === 'insertion' || mark.type.name === 'deletion' || mark.type.name === 'formatChange') &&
                mark.attrs.changeId === changeId
              ) {
                ranges.push({
                  from: pos,
                  to: pos + node.nodeSize,
                  type: mark.type.name,
                  mark,
                  originalFormat: mark.attrs.originalFormat,
                });
              }
            }
          });

          if (ranges.length === 0) return false;

          ranges.sort((a, b) => b.from - a.from);

          for (const range of ranges) {
            if (range.type === 'insertion') {
              tr.delete(range.from, range.to);
              found = true;
            } else if (range.type === 'deletion') {
              tr.removeMark(range.from, range.to, range.mark);
              found = true;
            } else if (range.type === 'formatChange') {
              tr.removeMark(range.from, range.to, range.mark);

              if (range.originalFormat) {
                try {
                  const original = JSON.parse(range.originalFormat) as string[];
                  const schema = editor.state.schema;

                  for (const markName of ['bold', 'italic', 'underline']) {
                    const markType = schema.marks[markName];
                    if (markType) {
                      tr.removeMark(range.from, range.to, markType);
                    }
                  }

                  for (const markName of original) {
                    const markType = schema.marks[markName];
                    if (markType) {
                      tr.addMark(range.from, range.to, markType.create());
                    }
                  }
                } catch {
                  // If parsing fails, just remove the formatChange mark
                }
              }
              found = true;
            }
          }

          if (found && dispatch) {
            tr.setMeta('trackChangesReject', true);
            dispatch(tr);
          }
          return found;
        },

      acceptAllChanges:
        () =>
        ({ editor }) => {
          const changes = collectTrackedChanges(editor.state.doc);
          for (const change of [...changes].reverse()) {
            editor.commands.acceptChange(change.changeId);
          }
          return true;
        },

      rejectAllChanges:
        () =>
        ({ editor }) => {
          const changes = collectTrackedChanges(editor.state.doc);
          for (const change of [...changes].reverse()) {
            editor.commands.rejectChange(change.changeId);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extensionStorage = this.storage;

    return [
      new Plugin({
        key: trackChangesPluginKey,

        appendTransaction(transactions: readonly Transaction[], oldState: EditorState, newState: EditorState) {
          if (!extensionStorage.enabled || extensionStorage.mode === 'final') return null;

          const hasDocChange = transactions.some((tr) => tr.docChanged);
          const isAcceptReject = transactions.some(
            (tr) => tr.getMeta('trackChangesAccept') || tr.getMeta('trackChangesReject') || tr.getMeta('trackChangesInternal')
          );
          if (!hasDocChange || isAcceptReject) return null;

          const tr = newState.tr;
          let modified = false;

          const changeId = generateChangeId();
          const timestamp = new Date().toISOString();
          const { authorId, authorName } = extensionStorage;

          for (const transaction of transactions) {
            for (const step of transaction.steps) {
              if (step instanceof ReplaceStep || step instanceof ReplaceAroundStep) {
                const stepMap = step.getMap();

                stepMap.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                  // Text was inserted (newEnd > newStart with content in new state)
                  if (newEnd > newStart) {
                    const insertionMark = newState.schema.marks.insertion?.create({
                      changeId,
                      authorId,
                      authorName,
                      timestamp,
                    });

                    if (insertionMark) {
                      tr.addMark(newStart, newEnd, insertionMark);
                      modified = true;
                    }
                  }
                });
              } else if (step instanceof AddMarkStep || step instanceof RemoveMarkStep) {
                const formatMark = newState.schema.marks.formatChange?.create({
                  changeId,
                  authorId,
                  authorName,
                  timestamp,
                  originalFormat: JSON.stringify(
                    getFormattingMarks(oldState, (step as AddMarkStep | RemoveMarkStep).from, (step as AddMarkStep | RemoveMarkStep).to)
                  ),
                });

                if (formatMark) {
                  tr.addMark(
                    (step as AddMarkStep | RemoveMarkStep).from,
                    (step as AddMarkStep | RemoveMarkStep).to,
                    formatMark
                  );
                  modified = true;
                }
              }
            }
          }

          if (modified) {
            tr.setMeta('trackChangesInternal', true);
            return tr;
          }

          return null;
        },
      }),
    ];
  },
});

/**
 * Mark a range of text as deleted. If the text already has an insertion mark,
 * actually delete it (it was never in the original document).
 * If it already has a deletion mark, skip past it (move cursor).
 */
function markRangeAsDeleted(
  editor: import('@tiptap/core').Editor,
  from: number,
  to: number,
  storage: TrackChangesStorage
): boolean {
  const { state } = editor;
  const { doc, schema } = state;

  // Check if all text in range already has deletion mark — skip
  if (rangeHasMark(doc, from, to, 'deletion')) {
    // Move cursor past the deleted text
    editor.commands.setTextSelection(from > 0 ? from - 1 : to + 1);
    return true;
  }

  // Check if text has insertion mark — actually delete it (undo the insert)
  if (rangeHasMark(doc, from, to, 'insertion')) {
    const tr = state.tr;
    tr.delete(from, to);
    tr.setMeta('trackChangesInternal', true);
    editor.view.dispatch(tr);
    return true;
  }

  // Normal tracked deletion: mark as deleted instead of removing
  const deletionMark = schema.marks.deletion?.create({
    changeId: generateChangeId(),
    authorId: storage.authorId,
    authorName: storage.authorName,
    timestamp: new Date().toISOString(),
  });

  if (deletionMark) {
    const tr = state.tr;
    tr.addMark(from, to, deletionMark);
    tr.setMeta('trackChangesInternal', true);
    // Move cursor to indicate deletion happened
    tr.setSelection(TextSelection.near(tr.doc.resolve(from)));
    editor.view.dispatch(tr);
    return true;
  }

  return false;
}

/**
 * Get the current formatting marks on a range for tracking original format.
 */
function getFormattingMarks(state: EditorState, from: number, to: number): string[] {
  const marks: Set<string> = new Set();
  const formatMarkNames = ['bold', 'italic', 'underline'];

  state.doc.nodesBetween(from, to, (node) => {
    if (node.isText) {
      for (const mark of node.marks) {
        if (formatMarkNames.includes(mark.type.name)) {
          marks.add(mark.type.name);
        }
      }
    }
  });

  return Array.from(marks);
}

// Augment TipTap command types
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trackChanges: {
      setTrackingEnabled: (enabled: boolean) => ReturnType;
      setTrackMode: (mode: TrackMode) => ReturnType;
      setTrackAuthor: (authorId: string, authorName: string) => ReturnType;
      acceptChange: (changeId: string) => ReturnType;
      rejectChange: (changeId: string) => ReturnType;
      acceptAllChanges: () => ReturnType;
      rejectAllChanges: () => ReturnType;
    };
  }
}
