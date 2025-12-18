// Settings types
export interface UserSettings {
    // General settings
    theme: 'light' | 'dark' | 'system';
    language: string;
    autoSave: boolean;
    autoSaveInterval: number; // in milliseconds

    // Editor settings
    fontSize: number;
    fontFamily: string;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
    lineNumbers: boolean;
    formatOnSave: boolean;

    // Appearance settings
    sidebarPosition: 'left' | 'right';
    compactMode: boolean;
    showLineNumbers: boolean;
    highlightActiveLine: boolean;

    // Query settings
    queryTimeout: number; // in seconds
    maxRows: number;
    autoComplete: boolean;

    // Accessibility
    reducedMotion: boolean;
    highContrast: boolean;
    screenReaderOptimized: boolean;
}

export interface KeyboardShortcut {
    id: string;
    name: string;
    description: string;
    keys: string[];
    category: 'general' | 'editor' | 'query' | 'navigation';
    action: string;
    enabled: boolean;
}

export interface WorkspaceSession {
    openTabs: Array<{
        id: string;
        type: 'query' | 'table' | 'schema';
        connectionId: number;
        data: any;
    }>;
    activeTabId: string | null;
    sidebarCollapsed: boolean;
    rightSidebarCollapsed: boolean;
    lastSavedAt: string;
}

export interface SettingResponse {
    key: string;
    value: any;
}

export interface UpdateSettingRequest {
    value: any;
}

// Default settings
export const DEFAULT_SETTINGS: UserSettings = {
    theme: 'system',
    language: 'en',
    autoSave: true,
    autoSaveInterval: 10000, // 10 seconds

    fontSize: 14,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    tabSize: 2,
    wordWrap: true,
    minimap: false,
    lineNumbers: true,
    formatOnSave: false,

    sidebarPosition: 'left',
    compactMode: false,
    showLineNumbers: true,
    highlightActiveLine: true,

    queryTimeout: 30,
    maxRows: 1000,
    autoComplete: true,

    reducedMotion: false,
    highContrast: false,
    screenReaderOptimized: false,
};

// Default keyboard shortcuts
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
    // General
    {
        id: 'new-query',
        name: 'New Query',
        description: 'Open a new query tab',
        keys: ['Mod', 'N'],
        category: 'general',
        action: 'newQuery',
        enabled: true,
    },
    {
        id: 'save-query',
        name: 'Save Query',
        description: 'Save the current query',
        keys: ['Mod', 'S'],
        category: 'general',
        action: 'saveQuery',
        enabled: true,
    },
    {
        id: 'open-settings',
        name: 'Open Settings',
        description: 'Open preferences window',
        keys: ['Mod', ','],
        category: 'general',
        action: 'openSettings',
        enabled: true,
    },
    {
        id: 'close-tab',
        name: 'Close Tab',
        description: 'Close the current tab',
        keys: ['Mod', 'W'],
        category: 'general',
        action: 'closeTab',
        enabled: true,
    },

    // Editor
    {
        id: 'execute-query',
        name: 'Execute Query',
        description: 'Run the current query',
        keys: ['Mod', 'Enter'],
        category: 'editor',
        action: 'executeQuery',
        enabled: true,
    },
    {
        id: 'format-query',
        name: 'Format Query',
        description: 'Format the current SQL query',
        keys: ['Mod', 'Shift', 'F'],
        category: 'editor',
        action: 'formatQuery',
        enabled: true,
    },
    {
        id: 'comment-line',
        name: 'Toggle Comment',
        description: 'Comment/uncomment the current line',
        keys: ['Mod', '/'],
        category: 'editor',
        action: 'commentLine',
        enabled: true,
    },

    // Query
    {
        id: 'explain-query',
        name: 'Explain Query',
        description: 'Show query execution plan',
        keys: ['Mod', 'E'],
        category: 'query',
        action: 'explainQuery',
        enabled: true,
    },
    {
        id: 'export-results',
        name: 'Export Results',
        description: 'Export query results',
        keys: ['Mod', 'Shift', 'E'],
        category: 'query',
        action: 'exportResults',
        enabled: true,
    },

    // Navigation
    {
        id: 'next-tab',
        name: 'Next Tab',
        description: 'Switch to the next tab',
        keys: ['Mod', 'Shift', ']'],
        category: 'navigation',
        action: 'nextTab',
        enabled: true,
    },
    {
        id: 'prev-tab',
        name: 'Previous Tab',
        description: 'Switch to the previous tab',
        keys: ['Mod', 'Shift', '['],
        category: 'navigation',
        action: 'prevTab',
        enabled: true,
    },
    {
        id: 'toggle-sidebar',
        name: 'Toggle Sidebar',
        description: 'Show/hide the left sidebar',
        keys: ['Mod', 'B'],
        category: 'navigation',
        action: 'toggleSidebar',
        enabled: true,
    },
];
