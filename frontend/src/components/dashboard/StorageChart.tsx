'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface StorageData {
  name: string;
  value: number;
  color: string;
  count: number;
  size: number;
}

interface StorageItem {
  type: string;
  size: number;
  count: number;
  percentage?: string;
}

interface StorageChartProps {
  data: StorageItem[];
  formatFileSize: (bytes: number) => string;
}

export default function StorageChart({ data, formatFileSize }: StorageChartProps) {
  const colors = [
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#10b981', // Emerald
    '#f97316', // Orange
    '#3b82f6', // Blue
    '#ec4899', // Pink
  ];

  // Check if we have any actual file sizes
  const totalSize = data.reduce((sum, item) => sum + (item.size || 0), 0);
  const totalCount = data.reduce((sum, item) => sum + (item.count || 0), 0);
  
  // Use file count if all sizes are 0, otherwise use sizes
  const useCount = totalSize === 0 && totalCount > 0;
  
  const chartData: StorageData[] = data
    .filter(item => (item.count || 0) > 0) // Only show types with files
    .map((item, index) => ({
      name: item.type || 'Unknown',
      value: useCount ? (item.count || 0) : (item.size || 0),
      color: colors[index % colors.length],
      count: item.count || 0,
      size: item.size || 0
    }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: StorageData }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
      
      return (
        <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 shadow-2xl">
          <p className="text-white font-semibold">{data.name}</p>
          <p className="text-gray-300 text-sm">
            Files: {data.count} ({percentage}%)
          </p>
          {data.size > 0 && (
            <p className="text-gray-300 text-sm">
              Size: {formatFileSize(data.size)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: { 
    cx?: number; 
    cy?: number; 
    midAngle?: number; 
    innerRadius?: number; 
    outerRadius?: number; 
    percent?: number; 
  }) => {
    if (!percent || !cx || !cy || !midAngle || !innerRadius || !outerRadius || percent < 0.08) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4 mx-auto">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-gray-400">No files uploaded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <div className="mb-2 text-center">
        <p className="text-sm text-gray-400">
          {useCount ? 'File Distribution by Type' : 'Storage Usage by Type'}
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={100}
            innerRadius={40}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                stroke={entry.color}
                strokeWidth={2}
                className="hover:opacity-80 transition-opacity duration-200"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Custom Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-2">
        {chartData.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm text-gray-300">
              {entry.name} ({entry.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}