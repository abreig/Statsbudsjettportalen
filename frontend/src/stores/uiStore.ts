import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BudgetRound } from '../lib/types';

interface UiState {
  selectedRound: BudgetRound | null;
  setSelectedRound: (round: BudgetRound) => void;
  clearRound: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      selectedRound: null,
      setSelectedRound: (round) => set({ selectedRound: round }),
      clearRound: () => set({ selectedRound: null }),
    }),
    { name: 'ui-storage' }
  )
);
