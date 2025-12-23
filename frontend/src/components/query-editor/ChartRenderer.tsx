import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartConfigData } from './ChartConfig';

interface ChartRendererProps {
  data: any[];
  config: ChartConfigData;
}

const COLORS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
];

export const ChartRenderer: React.FC<ChartRendererProps> = ({ data, config }) => {
  if (!config.xAxis || !config.yAxis?.length) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
        Connect columns to generate chart
      </div>
    );
  }

  // Ensure data is valid for chart
  const sanitizedData = data.map(row => {
    // Recharts handles dates best as strings or timestamps
    return row;
  });

  if (config.type === 'pie') {
    const dataKey = config.yAxis[0];
    const nameKey = config.xAxis;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={sanitizedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {sanitizedData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
            itemStyle={{ color: 'var(--text-primary)' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (config.type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sanitizedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" opacity={0.5} />
          <XAxis 
            dataKey={config.xAxis} 
            stroke="var(--text-secondary)" 
            fontSize={12} 
            tickLine={false}
            axisLine={{ stroke: 'var(--border-light)' }}
          />
          <YAxis 
            stroke="var(--text-secondary)" 
            fontSize={12} 
            tickLine={false}
            axisLine={{ stroke: 'var(--border-light)' }}
          />
          <Tooltip 
            cursor={{ fill: 'var(--bg-2)', opacity: 0.5 }}
            contentStyle={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
            itemStyle={{ color: 'var(--text-primary)' }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          {config.yAxis.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={COLORS[index % COLORS.length]}
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={sanitizedData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" opacity={0.5} />
        <XAxis 
            dataKey={config.xAxis} 
            stroke="var(--text-secondary)" 
            fontSize={12} 
            tickLine={false}
            axisLine={{ stroke: 'var(--border-light)' }}
          />
          <YAxis 
            stroke="var(--text-secondary)" 
            fontSize={12} 
            tickLine={false}
            axisLine={{ stroke: 'var(--border-light)' }}
          />
        <Tooltip 
            contentStyle={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
            itemStyle={{ color: 'var(--text-primary)' }}
          />
        <Legend wrapperStyle={{ paddingTop: '10px' }} />
        {config.yAxis.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS[index % COLORS.length] }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};
