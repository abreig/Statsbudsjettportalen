import { createContext, useContext } from 'react';
import type { Editor } from '@tiptap/react';
import type { TrackMode } from '../editor/TrackChangesExtension';

interface DepListEditorContextValue {
  activeEditor: Editor | null;
  setActiveEditor: (editor: Editor | null) => void;
  trackingEnabled: boolean;
  setTrackingEnabled: (enabled: boolean) => void;
  trackMode: TrackMode;
  setTrackMode: (mode: TrackMode) => void;
  activeCaseId: string | null;
  setActiveCaseId: (id: string | null) => void;
}

export const DepListEditorContext = createContext<DepListEditorContextValue | null>(null);

export function useDepListEditor() {
  const ctx = useContext(DepListEditorContext);
  if (!ctx) throw new Error('useDepListEditor must be used within DepListEditorContext.Provider');
  return ctx;
}
