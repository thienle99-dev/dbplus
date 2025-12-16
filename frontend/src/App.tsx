import { Routes, Route, useParams } from 'react-router-dom';
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

const WorkspacePage = () => {
  useKeyboardShortcuts();
  const { connectionId } = useParams();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [defInfo, setDefInfo] = useState<{ open: boolean, name: string, schema: string, type: 'view' | 'function' }>({
    open: false, name: '', schema: '', type: 'view'
  });

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

  return (
    <SelectedRowProvider>
      <TablePageProvider>
        <SkipToContent targetId="main-content" />
        <div className="flex h-screen bg-bg-0 text-text-primary overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 bg-bg-0 h-full pb-[60px]">
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
  const { theme } = useSettingsStore();

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
