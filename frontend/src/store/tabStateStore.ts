import { create } from 'zustand';
import { QueryResult, EditState } from '../types';

interface TabState {
  // Query Tab State
  queryResult?: QueryResult | null;
  executionPlan?: any;
  resultDiff?: any;
  bottomTab?: 'results' | 'plan' | 'comparison';
  analyzeEnabled?: boolean;
  
  // Table Tab State
  tableData?: QueryResult | null;
  tableEdits?: EditState;
  tablePage?: number;
  tableActiveView?: 'data' | 'structure' | 'info';
  tableScrollTop?: number; 
}

interface TabStateStore {
  states: Record<string, TabState>;
  setTabState: (tabId: string, state: Partial<TabState>) => void;
  getTabState: (tabId: string) => TabState | undefined;
  clearTabState: (tabId: string) => void;
}

export const useTabStateStore = create<TabStateStore>((set, get) => ({
  states: {},
  setTabState: (tabId, newState) => set((state) => ({
    states: {
      ...state.states,
      [tabId]: { ...state.states[tabId], ...newState }
    }
  })),
  getTabState: (tabId) => get().states[tabId],
  clearTabState: (tabId) => set((state) => {
    const { [tabId]: _, ...rest } = state.states;
    return { states: rest };
  })
}));
