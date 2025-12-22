import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import api from '../services/api';
import AddChartModal from './AddChartModal';
import ChartWidget from './ChartWidget';
import { useDialog } from '../context/DialogContext';

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
}

interface Chart {
  id: string;
  saved_query_id: string;
  name: string;
  type: string;
  config: { xAxis?: string; yAxis?: string };
  layout: Record<string, unknown>;
}

export default function DashboardView() {
  const { connectionId, dashboardId } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddChartOpen, setIsAddChartOpen] = useState(false);
  const dialog = useDialog();

  const fetchDashboard = async () => {
    try {
      const dbRes = await api.get(`/api/connections/${connectionId}/dashboards/${dashboardId}`);
      setDashboard(dbRes.data);
      
      const chartsRes = await api.get(`/api/connections/${connectionId}/dashboards/${dashboardId}/charts`);
      setCharts(chartsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      navigate(`/workspace/${connectionId}/dashboards`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [connectionId, dashboardId]);

  const handleDeleteChart = async (chartId: string) => {
    const confirmed = await dialog.confirm(
      'Remove Chart',
      'Are you sure you want to remove this chart?',
      { variant: 'danger' }
    );
    if (!confirmed) return;
    try {
      await api.delete(`/api/connections/${connectionId}/dashboards/${dashboardId}/charts/${chartId}`);
      setCharts(charts.filter(c => c.id !== chartId));
    } catch (error) {
      console.error('Failed to delete chart:', error);
    }
  };

  if (loading) return <div className="p-4 text-text-secondary">Loading dashboard...</div>;
  if (!dashboard) return <div className="p-4 text-text-secondary">Dashboard not found</div>;

  return (
    <div className="flex flex-col h-full bg-bg-0">
      <AddChartModal 
        isOpen={isAddChartOpen} 
        onClose={() => setIsAddChartOpen(false)} 
        onSuccess={fetchDashboard}
        dashboardId={dashboardId!}
      />

      <div className="p-4 border-b border-border flex justify-between items-center bg-bg-1">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/workspace/${connectionId}/dashboards`)}
            className="text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{dashboard.name}</h2>
            {dashboard.description && <p className="text-xs text-text-secondary">{dashboard.description}</p>}
          </div>
        </div>
        <button
          onClick={() => setIsAddChartOpen(true)}
          className="flex items-center gap-1 bg-accent hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium"
        >
          <Plus size={16} />
          Add Chart
        </button>
      </div>

      <div className="p-4 overflow-y-auto flex-1">
        {charts.length === 0 ? (
          <div className="text-center py-20 text-text-secondary">
            No charts yet. Click "Add Chart" to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {charts.map(chart => (
              <ChartWidget 
                key={chart.id} 
                chart={chart} 
                onDelete={handleDeleteChart} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
