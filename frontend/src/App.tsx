import { Routes, Route } from 'react-router-dom';
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

const WorkspacePage = () => (
  <SelectedRowProvider>
    <div className="flex h-screen bg-bg-0 text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-bg-0 h-full">
        <Breadcrumbs />
        <div className="flex-1 overflow-auto bg-bg-0 relative">
          <Routes>
            <Route path="/" element={<EmptyState />} />
            <Route path="/tables/:schema/:table" element={<TableDataView />} />
            <Route path="/query" element={<QueryTabs />} />
            <Route path="/dashboards" element={<DashboardList />} />
            <Route path="/dashboards/:dashboardId" element={<DashboardView />} />
          </Routes>
        </div>
      </div>
      <RightSidebar />
    </div>
  </SelectedRowProvider>
);

import { useEffect } from 'react';
import { useSettingsStore } from './store/settingsStore';
import { LogViewer } from './components/LogViewer';

// ... other imports ...

function App() {
  const { theme } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-solar', 'theme-midnight');

    if (theme === 'system') {
      const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (!systemIsDark) {
        root.classList.add('theme-light');
      }
    } else if (theme !== 'dark') {
      root.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  return (
    <>
      <Routes>
        <Route path="/" element={<ConnectionsDashboard />} />
        <Route path="/workspace/:connectionId/*" element={<WorkspacePage />} />
      </Routes>
      <LogViewer />
    </>
  );
}

export default App;
