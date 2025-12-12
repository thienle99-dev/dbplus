import { create } from 'zustand';

export interface WorkspaceTab {
  id: string;
  connectionId: string;
  database?: string;
  lastPath?: string;
}

interface WorkspaceTabsState {
  tabs: WorkspaceTab[];
  activeTabId: string | null;

  openTab: (connectionId: string, database?: string) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  ensureTabForRoute: (connectionId: string, defaultDatabase?: string, lastPath?: string) => string;
  setTabLastPath: (tabId: string, lastPath: string) => void;

  activeDatabase: () => string | undefined;
  activeConnectionId: () => string | undefined;
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function findExistingTab(tabs: WorkspaceTab[], connectionId: string, database?: string) {
  const normalizedDb = database?.trim() || undefined;
  return tabs.find((t) => t.connectionId === connectionId && (t.database?.trim() || undefined) === normalizedDb);
}

export const useWorkspaceTabsStore = create<WorkspaceTabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: (connectionId, database) => {
    const existing = findExistingTab(get().tabs, connectionId, database);
    if (existing) {
      set({ activeTabId: existing.id });
      return existing.id;
    }

    const tab: WorkspaceTab = {
      id: newId(),
      connectionId,
      database: database?.trim() || undefined,
      lastPath: `/workspace/${connectionId}/query`,
    };

    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));

    return tab.id;
  },

  closeTab: (tabId) => {
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === tabId);
      if (idx === -1) return state;

      const nextTabs = state.tabs.filter((t) => t.id !== tabId);
      let nextActive = state.activeTabId;
      if (state.activeTabId === tabId) {
        nextActive = nextTabs[idx - 1]?.id || nextTabs[0]?.id || null;
      }

      return { tabs: nextTabs, activeTabId: nextActive };
    });
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  ensureTabForRoute: (connectionId, defaultDatabase, lastPath) => {
    const active = get().tabs.find((t) => t.id === get().activeTabId);
    if (active && active.connectionId === connectionId) {
      if (lastPath) get().setTabLastPath(active.id, lastPath);
      return active.id;
    }

    const existing = findExistingTab(get().tabs, connectionId, defaultDatabase);
    if (existing) {
      set({ activeTabId: existing.id });
      if (lastPath) get().setTabLastPath(existing.id, lastPath);
      return existing.id;
    }

    const id = get().openTab(connectionId, defaultDatabase);
    if (lastPath) get().setTabLastPath(id, lastPath);
    return id;
  },

  setTabLastPath: (tabId, lastPath) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, lastPath } : t)),
    }));
  },

  activeDatabase: () => {
    const active = get().tabs.find((t) => t.id === get().activeTabId);
    return active?.database;
  },

  activeConnectionId: () => {
    const active = get().tabs.find((t) => t.id === get().activeTabId);
    return active?.connectionId;
  },
}));

