import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Layout, Trash2 } from 'lucide-react';
import api from '../services/api';
import CreateDashboardModal from './CreateDashboardModal';

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
}

export default function DashboardList() {
  const { connectionId } = useParams();
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchDashboards = async () => {
    try {
      const response = await api.get(`/api/connections/${connectionId}/dashboards`);
      setDashboards(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboards:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboards();
  }, [connectionId]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this dashboard?')) return;
    
    try {
      await api.delete(`/api/connections/${connectionId}/dashboards/${id}`);
      setDashboards(dashboards.filter(d => d.id !== id));
    } catch (error) {
      console.error('Failed to delete dashboard:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-0">
      <CreateDashboardModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={fetchDashboards} 
      />
      
      <div className="p-4 border-b border-border flex justify-between items-center bg-bg-1">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Layout size={20} /> Dashboards
        </h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1 bg-accent hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium"
        >
          <Plus size={16} />
          New Dashboard
        </button>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
        {loading ? (
          <div className="text-text-secondary">Loading dashboards...</div>
        ) : dashboards.length === 0 ? (
          <div className="col-span-full text-center py-10 text-text-secondary">
            No dashboards found. Create one to get started!
          </div>
        ) : (
          dashboards.map(dashboard => (
            <div
              key={dashboard.id}
              onClick={() => navigate(`/workspace/${connectionId}/dashboards/${dashboard.id}`)}
              className="bg-bg-1 border border-border rounded-lg p-4 cursor-pointer hover:border-accent transition-colors group"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-text-primary text-lg">{dashboard.name}</h3>
                <button
                  onClick={(e) => handleDelete(e, dashboard.id)}
                  className="text-text-secondary hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {dashboard.description && (
                <p className="text-text-secondary text-sm mb-3 line-clamp-2">{dashboard.description}</p>
              )}
              <div className="text-xs text-text-secondary">
                Updated {new Date(dashboard.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
