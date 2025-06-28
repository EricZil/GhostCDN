'use client';

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface ViewsData {
  date: string;
  views: number;
  downloads: number;
}

interface ViewsChartProps {
  data: Array<Record<string, unknown>>;
  period: string;
}

export default function ViewsChart({ data, period }: ViewsChartProps) {
  // Check if we have any data
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">No view data available</p>
          <p className="text-gray-500 text-xs mt-1">Upload some files to see analytics</p>
        </div>
      </div>
    );
  }

  // Process the data to create a proper time series
  const processData = (): ViewsData[] => {
    const now = new Date();
    let days = 7;
    
    switch (period) {
      case '24h':
        days = 1;
        break;
      case '7d':
        days = 7;
        break;
      case '30d':
        days = 30;
        break;
      case '90d':
        days = 90;
        break;
    }

    const startDate = subDays(now, days);
    const dateRange = eachDayOfInterval({ start: startDate, end: now });
    
    // Create a map of dates to view counts
    const viewsByDate = new Map<string, number>();
    
    data.forEach(item => {
      // Type guard to ensure item has the expected structure
      if (item && typeof item === 'object' && 'createdAt' in item && '_count' in item) {
        const createdAt = item.createdAt;
        const count = item._count;
        
        if (typeof createdAt === 'string' && count && typeof count === 'object' && 'id' in count) {
          const date = format(new Date(createdAt), 'yyyy-MM-dd');
          const idCount = typeof count.id === 'number' ? count.id : 0;
          viewsByDate.set(date, (viewsByDate.get(date) || 0) + idCount);
        }
      }
    });

    return dateRange.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const displayDate = period === '24h' 
        ? format(date, 'HH:mm')
        : period === '7d' 
        ? format(date, 'EEE')
        : format(date, 'MMM dd');
        
      return {
        date: displayDate,
        views: viewsByDate.get(dateStr) || 0,
        downloads: 0 // Remove mock downloads - we don't track downloads yet
      };
    });
  };

  const chartData = processData();

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="downloadsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            className="text-gray-400"
          />
          
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            className="text-gray-400"
          />
          
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid rgba(107, 114, 128, 0.3)',
              borderRadius: '12px',
              color: '#f9fafb',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            labelStyle={{ color: '#d1d5db' }}
            formatter={(value: number, name: string) => [
              value,
              name === 'views' ? 'Views' : 'Downloads'
            ]}
          />
          
          <Area
            type="monotone"
            dataKey="views"
            stroke="#8b5cf6"
            strokeWidth={3}
            fill="url(#viewsGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Chart Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span className="text-sm text-gray-300">Views</span>
        </div>
      </div>
    </div>
  );
} 