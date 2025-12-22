import { Routes, Route, useParams } from 'react-router-dom';
import { WifiOff, RotateCcw, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ConnectionsDashboard } from './components/connections/ConnectionsDashboard';
import Sidebar from './components/Sidebar';
import TableDataView from './components/TableDataView';
import QueryTabs from './components/QueryTabs';
import DashboardList from './components/DashboardList';
import DashboardView from './components/DashboardView';
import RightSidebar from './components/RightSidebar';
import Breadcrumbs from './components/ui/Breadcrumbs';
import EmptyState from './components/EmptyState';
import { SelectedRowProvider } from './context/SelectedRowContext';
import { TablePageProvider } from './context/TablePageContext';
import { BottomPanel } from './components/BottomPanel';
import SkipToContent from './components/ui/SkipToContent';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import CommandPalette from './components/CommandPalette';
import ObjectDefinitionModal from './components/ObjectDefinitionModal';
import ERDiagramView from './components/ERDiagramView';
import { useSettingsStore } from './store/settingsStore';
import { ALL_THEME_CLASS_NAMES, getThemeClassName } from './constants/themes';
import ConnectionTestOverlay from './components/ConnectionTestOverlay';

const WorkspacePage = () => {
  useKeyboardShortcuts();
  const { connectionId } = useParams();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [defInfo, setDefInfo] = useState<{ open: boolean, name: string, schema: string, type: 'view' | 'function' }>({
    open: false, name: '', schema: '', type: 'view'
  });
  const [connectionTested, setConnectionTested] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setDefInfo({
        open: true,
        name: e.detail.name,
        schema: e.detail.schema,
        type: e.detail.type
      });
    };
    window.addEventListener('dbplus:open-definition' as any, handler);
    return () => window.removeEventListener('dbplus:open-definition' as any, handler);
  }, []);

  // Reset test state when connectionId changes
  useEffect(() => {
    setConnectionTested(false);
    setConnectionError(null);
  }, [connectionId]);

  if (!connectionId) {
    return <EmptyState />;
  }

  // Show overlay while testing connection
  if (!connectionTested && !connectionError) {
    return (
      <ConnectionTestOverlay
        connectionId={connectionId}
        onSuccess={() => setConnectionTested(true)}
        onFailure={(error: string) => setConnectionError(error)}
      />
    );
  }

  // Show error state if connection test failed
  if (connectionError) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-0 p-4">
        <div className="max-w-md w-full text-center p-8 bg-bg-1 rounded-2xl border border-border-light shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-error-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-error-50">
            <WifiOff className="w-10 h-10 text-error" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">Connection Failed</h2>
          <p className="text-text-secondary mb-8 leading-relaxed text-sm bg-bg-2 p-3 rounded-lg border border-border-light">
            {connectionError}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-bg-2 hover:bg-bg-3 text-text-primary rounded-xl font-medium transition-all duration-200 border border-border hover:border-text-secondary/30 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <button
              onClick={() => {
                setConnectionError(null);
                setConnectionTested(false);
              }}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-accent hover:opacity-90 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-accent/25 hover:shadow-accent/40 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SelectedRowProvider>
      <TablePageProvider>
        <SkipToContent targetId="main-content" />
        <div className="flex h-screen bg-bg-0 text-text-primary overflow-hidden" data-tauri-drag-region>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 bg-bg-0 h-full pb-[60px] pt-8" data-tauri-drag-region>
            <Breadcrumbs />
            <div
              id="main-content"
              className="flex-1 overflow-auto bg-bg-0 relative"
              tabIndex={-1}
              role="main"
              aria-label="Main content"
            >
              <Routes>
                <Route path="/" element={<EmptyState />} />
                <Route path="/tables/:schema/:table" element={<TableDataView />} />
                <Route path="/query" element={<QueryTabs />} />
                <Route path="/dashboards" element={<DashboardList />} />
                <Route path="/dashboards/:dashboardId" element={<DashboardView />} />
                <Route path="/diagram/:schema" element={<ERDiagramView />} />
              </Routes>
            </div>
          </div>
          <RightSidebar />
          <BottomPanel />
        </div>
        <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} connectionId={connectionId} />
        {connectionId && (
          <ObjectDefinitionModal
            isOpen={defInfo.open}
            onClose={() => setDefInfo(prev => ({ ...prev, open: false }))}
            objectName={defInfo.name}
            schema={defInfo.schema}
            type={defInfo.type}
            connectionId={connectionId}
          />
        )}
      </TablePageProvider>
    </SelectedRowProvider>
  );
};

function App() {
  const { theme, accentColor } = useSettingsStore();

  useEffect(() => {
    // Remove all theme classes using constant
    document.body.classList.remove(...ALL_THEME_CLASS_NAMES);

    // Apply selected theme
    if (theme === 'system') {
      const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.add(systemIsDark ? 'theme-dark' : 'theme-light');
    } else {
      const themeClass = getThemeClassName(theme);
      if (themeClass) {
        document.body.classList.add(themeClass);
      }
    }
  }, [theme]);

  // Apply Accent Color
  useEffect(() => {
    if (accentColor) {
      const root = document.documentElement;

      // Update primary/accent color variables
      root.style.setProperty('--color-primary-default', accentColor);
      root.style.setProperty('--color-primary-hover', accentColor); // Ideally slightly lighter/darker
      root.style.setProperty('--color-primary-active', accentColor);
      root.style.setProperty('--color-text-accent', accentColor);
      root.style.setProperty('--color-border-focus', accentColor);
      root.style.setProperty('--accent', accentColor);

      // Update specific legacy variables if needed
      root.style.setProperty('--color-selection-bg', `${accentColor}33`); // ~20% opacity using hex alpha
    }
  }, [accentColor]);

  return (
    <>
      <Routes>
        <Route path="/" element={<ConnectionsDashboard />} />
        <Route path="/workspace/:connectionId/*" element={<WorkspacePage />} />
      </Routes>
    </>
  );
}

export default App;
