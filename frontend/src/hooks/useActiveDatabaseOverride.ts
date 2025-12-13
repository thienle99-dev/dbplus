import { useWorkspaceTabsStore } from '../store/workspaceTabsStore';

export function useActiveDatabaseOverride(connectionId: string | undefined) {
  const { tabs, activeTabId } = useWorkspaceTabsStore();
  const active = tabs.find((t) => t.id === activeTabId);
  if (!connectionId) return undefined;
  if (!active) return undefined;
  if (active.connectionId !== connectionId) return undefined;
  return active.database;
}

