import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import { ReplaceStep, ReplaceAroundStep, AddMarkStep, RemoveMarkStep } from '@tiptap/pm/transform';
import type { Mark as PMMark, Node as PMNode } from '@tiptap/pm/model';

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
 * Collect all tracked changes from the document for the sidebar panel.
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

          // Collect ranges in reverse order to avoid position shifts
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

          // Process in reverse to maintain positions
          ranges.sort((a, b) => b.from - a.from);

          for (const range of ranges) {
            if (range.type === 'insertion') {
              // Accept insertion: remove the mark, keep the text
              tr.removeMark(range.from, range.to, range.mark);
              found = true;
            } else if (range.type === 'deletion') {
              // Accept deletion: actually delete the text
              tr.delete(range.from, range.to);
              found = true;
            } else if (range.type === 'formatChange') {
              // Accept format change: remove the mark, keep new format
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
              // Reject insertion: delete the inserted text
              tr.delete(range.from, range.to);
              found = true;
            } else if (range.type === 'deletion') {
              // Reject deletion: remove the mark, text reappears
              tr.removeMark(range.from, range.to, range.mark);
              found = true;
            } else if (range.type === 'formatChange') {
              // Reject format change: restore original format
              tr.removeMark(range.from, range.to, range.mark);

              // Remove current formatting marks and restore originals
              if (range.originalFormat) {
                try {
                  const original = JSON.parse(range.originalFormat) as string[];
                  const schema = editor.state.schema;

                  // Remove all formatting marks first
                  for (const markName of ['bold', 'italic', 'underline']) {
                    const markType = schema.marks[markName];
                    if (markType) {
                      tr.removeMark(range.from, range.to, markType);
                    }
                  }

                  // Re-add original marks
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
          // Accept in reverse order to maintain positions
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
          // Skip if tracking is disabled or not in editing mode
          if (!extensionStorage.enabled || extensionStorage.mode !== 'editing') return null;

          // Skip if no document changes or if this is an accept/reject operation
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
                // Format change tracking
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
