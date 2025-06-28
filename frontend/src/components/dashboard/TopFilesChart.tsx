'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TopFileData {
  fileName: string;
  views: number;
  color: string;
}

interface TopFilesChartProps {
  data: Array<{
    fileName: string;
    fileKey: string;
    views: number;
  }>;
}

export default function TopFilesChart({ data }: TopFilesChartProps) {
  const colors = [
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan  
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#10b981', // Emerald
  ];

  const chartData: TopFileData[] = data.slice(0, 5).map((item, index) => ({
    fileName: item.fileName.length > 20 ? item.fileName.substring(0, 20) + '...' : item.fileName,
    views: item.views,
    color: colors[index % colors.length]
  }));

  const maxViews = Math.max(...chartData.map(d => d.views));

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length && label) {
      const originalFile = data.find(f => 
        f.fileName.startsWith(label.replace('...', ''))
      );
      
      return (
        <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 shadow-2xl">
          <p className="text-white font-semibold">{originalFile?.fileName || label}</p>
          <p className="text-purple-400 text-sm">
            {payload[0].value} views
          </p>
        </div>
      );
    }
    return null;
  };



  if (chartData.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4 mx-auto">
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-gray-400">No file performance data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="horizontal"
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          
          <XAxis 
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            domain={[0, maxViews * 1.1]}
          />
          
          <YAxis 
            type="category"
            dataKey="fileName"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            width={120}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Bar 
            dataKey="views" 
            fill="#8b5cf6"
            radius={[0, 6, 6, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Performance Indicators */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-400">{chartData[0]?.views || 0}</p>
          <p className="text-xs text-gray-400">Top Performer</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-400">
            {Math.round(chartData.reduce((sum, item) => sum + item.views, 0) / chartData.length) || 0}
          </p>
          <p className="text-xs text-gray-400">Average Views</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-400">{chartData.length}</p>
          <p className="text-xs text-gray-400">Files Tracked</p>
        </div>
      </div>
    </div>
  );
}

// Re-export Cell for the Bar chart
import { Cell } from 'recharts'; 