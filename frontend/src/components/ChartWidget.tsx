import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import api from '../services/api';
import { useSavedQueries } from '../hooks/useQuery';

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

  // 1. Get saved queries to find the SQL
  const { data: savedQueries } = useSavedQueries(connectionId);
  const savedQuery = savedQueries?.find(q => q.id === chart.saved_query_id);

  // 2. Fetch chart data using the SQL
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['chartData', connectionId, chart.id, savedQuery?.id],
    queryFn: async () => {
      if (!savedQuery) throw new Error("Saved query not found");

      const { data: resultData } = await api.post(`/api/connections/${connectionId}/execute`, { query: savedQuery.sql });

      // Transform rows array to object array for Recharts
      const columns = resultData.columns;
      const rows = resultData.rows;
      return rows.map((row: unknown[]) => {
        const obj: Record<string, any> = {};
        columns.forEach((col: string, i: number) => {
          obj[col] = row[i];
        });
        return obj;
      });
    },
    enabled: !!connectionId && !!savedQuery,
    refetchOnWindowFocus: false, // Don't refetch automatically for charts
  });

  // Extract error message string
  const error = queryError instanceof Error ? queryError.message : (queryError ? String(queryError) : null);

  const renderChart = () => {
    if (!data) return null;

    const { type, config } = chart;
    const { xAxis, yAxis } = config;

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
          <button onClick={() => refetch()} className="text-text-secondary hover:text-text-primary p-1">
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
        ) : !data || data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-secondary">No data available</div>
        ) : (
          renderChart()
        )}
      </div>
    </div>
  );
}
