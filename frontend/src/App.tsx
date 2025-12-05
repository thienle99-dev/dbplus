import { Routes, Route } from 'react-router-dom';
import ConnectionList from './components/ConnectionList';
import Sidebar from './components/Sidebar';
import TableDataView from './components/TableDataView';
import QueryTabs from './components/QueryTabs';
import DashboardList from './components/DashboardList';
import DashboardView from './components/DashboardView';

const WorkspacePage = () => (
  <div className="flex h-screen bg-bg-0 text-text-primary">
    <Sidebar />
    <div className="flex-1 overflow-auto bg-bg-0">
      <Routes>
        <Route path="/" element={
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Workspace</h1>
            <p className="text-text-secondary">Select a table from the sidebar to view its structure and data.</p>
          </div>
        } />
        <Route path="/tables/:schema/:table" element={<TableDataView />} />
        <Route path="/query" element={<QueryTabs />} />
        <Route path="/dashboards" element={<DashboardList />} />
        <Route path="/dashboards/:dashboardId" element={<DashboardView />} />
      </Routes>
    </div>
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/" element={<ConnectionList />} />
      <Route path="/workspace/:connectionId/*" element={<WorkspacePage />} />
    </Routes>
  );
}

export default App;
