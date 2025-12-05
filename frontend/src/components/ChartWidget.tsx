import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import api from '../services/api';

interface ChartConfig {
  xAxis?: string;
  yAxis?: string;
  dataKey?: string;
}

interface Chart {
  id: string;
  saved_query_id: string;
  name: string;
  type: string;
  config: ChartConfig;
  layout: Record<string, unknown>;
}

interface ChartWidgetProps {
  chart: Chart;
  onDelete: (id: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ChartWidget({ chart, onDelete }: ChartWidgetProps) {
  const { connectionId } = useParams();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // First fetch the saved query to get the SQL
      // Actually, we can just execute the saved query directly if we had an endpoint for it.
      // But currently we only have execute_query which takes SQL.
      // So we need to fetch the saved query first.
      // Optimization: Backend could have an endpoint to execute saved query by ID.
      // For now, let's fetch the saved query details.
      
      // Wait, we don't have an endpoint to get a single saved query by ID efficiently without listing all?
      // We do: GET /api/connections/:id/saved-queries returns all.
      // We should probably add GET /api/connections/:id/saved-queries/:query_id
      // But for now, let's assume we have the saved_query_id and we need to fetch it.
      // Actually, let's just use the list endpoint and find it, or add a specific endpoint.
      // Adding a specific endpoint is better but for speed let's just use the list for now or assume we passed the SQL?
      // No, chart only has saved_query_id.
      
      // Let's assume we can fetch the query. 
      // Actually, the `list_saved_queries` returns all, we can filter.
      const queriesRes = await api.get(`/api/connections/${connectionId}/saved-queries`);
      const savedQuery = queriesRes.data.find((q: { id: string }) => q.id === chart.saved_query_id);
      
      if (!savedQuery) {
        throw new Error('Saved query not found');
      }

      const resultRes = await api.post(`/api/connections/${connectionId}/execute`, { query: savedQuery.sql });
      
      // Transform rows array to object array for Recharts
      const columns = resultRes.data.columns;
      const rows = resultRes.data.rows;
      const transformedData = rows.map((row: unknown[]) => {
        const obj: Record<string, any> = {};
        columns.forEach((col: string, i: number) => {
          obj[col] = row[i];
        });
        return obj;
      });
      
      setData(transformedData);
    } catch (err: unknown) {
      console.error('Failed to fetch chart data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [chart.saved_query_id, connectionId]);

  const renderChart = () => {
    const { type, config } = chart;
    const { xAxis, yAxis } = config; // Simplified config structure

    // Default keys if not specified
    const xKey = xAxis || (data.length > 0 ? Object.keys(data[0])[0] : '');
    const yKey = yAxis || (data.length > 0 ? Object.keys(data[0])[1] : '');

    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey={xKey} stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
              <Legend />
              <Bar dataKey={yKey} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey={xKey} stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
              <Legend />
              <Line type="monotone" dataKey={yKey} stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey={xKey} stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
              <Legend />
              <Area type="monotone" dataKey={yKey} stroke="#8884d8" fill="#8884d8" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey={yKey}
                nameKey={xKey}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <div className="bg-bg-1 border border-border rounded-lg p-4 h-[300px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-text-primary">{chart.name}</h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="text-text-secondary hover:text-text-primary p-1">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => onDelete(chart.id)} className="text-text-secondary hover:text-error p-1">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center text-text-secondary">Loading data...</div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-error">{error}</div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-secondary">No data available</div>
        ) : (
          renderChart()
        )}
      </div>
    </div>
  );
}
