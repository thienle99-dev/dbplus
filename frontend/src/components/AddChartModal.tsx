import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import api from '../services/api';
import { AddChartModalProps, SavedQuery } from '../types';
import Select from './ui/Select';

export default function AddChartModal({ isOpen, onClose, onSuccess, dashboardId }: AddChartModalProps) {
  const { connectionId } = useParams();
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [name, setName] = useState('');
  const [selectedQueryId, setSelectedQueryId] = useState('');
  const [chartType, setChartType] = useState('bar');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [loading, setLoading] = useState(false);
  const [queriesLoading, setQueriesLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      api.get(`/api/connections/${connectionId}/saved-queries`)
        .then(res => setSavedQueries(res.data))
        .catch((err: unknown) => console.error(err))
        .finally(() => setQueriesLoading(false));
    }
  }, [isOpen, connectionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedQueryId) return;

    setLoading(true);
    try {
      await api.post(`/api/connections/${connectionId}/dashboards/${dashboardId}/charts`, {
        saved_query_id: selectedQueryId,
        name,
        chart_type: chartType,
        config: { xAxis, yAxis },
        layout: {} // Default layout
      });
      onSuccess();
      onClose();
      // Reset form
      setName('');
      setSelectedQueryId('');
      setChartType('bar');
      setXAxis('');
      setYAxis('');
    } catch (err: unknown) {
      console.error('Failed to add chart:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-1 rounded-lg shadow-xl w-[600px] border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Add Chart</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Chart Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-text-primary focus:border-accent outline-none"
              placeholder="e.g. Monthly Sales"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Data Source (Saved Query)</label>
            <Select
              value={selectedQueryId}
              onChange={(val) => setSelectedQueryId(val)}
              options={[
                { value: '', label: 'Select a query...' },
                ...savedQueries.map(q => ({ value: q.id, label: q.name }))
              ]}
              searchable
            />
            {queriesLoading && <div className="text-xs text-text-secondary mt-1">Loading queries...</div>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Chart Type</label>
              <Select
                value={chartType}
                onChange={(val) => setChartType(val)}
                options={[
                  { value: 'bar', label: 'Bar Chart' },
                  { value: 'line', label: 'Line Chart' },
                  { value: 'area', label: 'Area Chart' },
                  { value: 'pie', label: 'Pie Chart' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">X Axis Key (Optional)</label>
              <input
                type="text"
                value={xAxis}
                onChange={(e) => setXAxis(e.target.value)}
                className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-text-primary focus:border-accent outline-none"
                placeholder="Column name for X axis"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Y Axis Key (Optional)</label>
              <input
                type="text"
                value={yAxis}
                onChange={(e) => setYAxis(e.target.value)}
                className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-text-primary focus:border-accent outline-none"
                placeholder="Column name for Y axis"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-2 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !selectedQueryId}
              className="px-4 py-2 text-sm font-medium bg-accent hover:bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Chart'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
