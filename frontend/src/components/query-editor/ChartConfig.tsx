import React from 'react';
import { BarChart3, LineChart, PieChart, Info } from 'lucide-react';

export interface ChartConfigData {
  type: 'line' | 'bar' | 'pie';
  xAxis: string;
  yAxis: string[];
  colors?: Record<string, string>;
}

interface ChartConfigProps {
  columns: string[];
  config: ChartConfigData;
  onChange: (config: ChartConfigData) => void;
}


export const ChartConfig: React.FC<ChartConfigProps> = ({ columns, config, onChange }) => {

  const handleTypeChange = (type: ChartConfigData['type']) => {
    onChange({ ...config, type });
  };

  const handleXAxisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...config, xAxis: e.target.value });
  };

  const handleYAxisToggle = (col: string) => {
    const current = config.yAxis || [];
    let next: string[];
    
    if (config.type === 'pie') {
      // Pie chart only supports single metric
      next = [col];
    } else {
      if (current.includes(col)) {
        next = current.filter(c => c !== col);
      } else {
        next = [...current, col];
      }
    }
    
    onChange({ ...config, yAxis: next });
  };

  return (
    <div className="p-4 border-b border-border-light bg-bg-1 space-y-4">
      {/* Chart Type Selection */}
      <div className="flex gap-2">
        <button
          onClick={() => handleTypeChange('bar')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            config.type === 'bar'
              ? 'bg-accent text-white border-accent'
              : 'bg-bg-0 text-text-secondary border-border-light hover:border-accent hover:text-text-primary'
          }`}
        >
          <BarChart3 size={14} />
          Bar Chart
        </button>
        <button
          onClick={() => handleTypeChange('line')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            config.type === 'line'
              ? 'bg-accent text-white border-accent'
              : 'bg-bg-0 text-text-secondary border-border-light hover:border-accent hover:text-text-primary'
          }`}
        >
          <LineChart size={14} />
          Line Chart
        </button>
        <button
          onClick={() => handleTypeChange('pie')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            config.type === 'pie'
              ? 'bg-accent text-white border-accent'
              : 'bg-bg-0 text-text-secondary border-border-light hover:border-accent hover:text-text-primary'
          }`}
        >
          <PieChart size={14} />
          Pie Chart
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* X Axis Configuration */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1">
            {config.type === 'pie' ? 'Category (Segment)' : 'X Axis (Group By)'}
          </label>
          <select
            value={config.xAxis}
            onChange={handleXAxisChange}
            className="w-full bg-bg-2 border border-border-light rounded px-2 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="">Select column...</option>
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        {/* Y Axis Configuration */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1">
            {config.type === 'pie' ? 'Value (Metric)' : 'Y Axis (Metrics)'}
            <span className="text-[9px] font-normal text-text-tertiary normal-case ml-auto">
              {config.type === 'pie' ? 'Select one' : 'Select multiple'}
            </span>
          </label>
          <div className="bg-bg-2 border border-border-light rounded p-1.5 max-h-[100px] overflow-y-auto space-y-0.5">
            {columns.map(col => {
              const isActive = (config.yAxis || []).includes(col);
              return (
                <button
                  key={col}
                  onClick={() => handleYAxisToggle(col)}
                  className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                    isActive
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-text-secondary hover:bg-bg-3 hover:text-text-primary'
                  }`}
                >
                  <span className="truncate">{col}</span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {(!config.xAxis || !config.yAxis?.length) && (
        <div className="text-[10px] text-text-tertiary flex items-center gap-1.5 bg-bg-2 p-2 rounded border border-border-light/50">
          <Info size={12} />
          Please select columns for both axes to generate a chart.
        </div>
      )}
    </div>
  );
};
