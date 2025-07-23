import React from 'react';
import ApiKeyAnalytics from '../ApiKeyAnalytics';

interface AnalyticsData {
  averageViewsPerFile?: number;
  peakTrafficHour?: string | null;
  mostPopularFormat?: string | null;
  totalEvents?: number;
}

interface AnalyticsTabProps {
  analytics: AnalyticsData | null;
  analyticsPeriod: string;
  handleAnalyticsPeriodChange: (period: string) => void;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  analyticsPeriod,
  handleAnalyticsPeriodChange
}) => {
  return (
    <ApiKeyAnalytics
      period={analyticsPeriod}
      onPeriodChange={handleAnalyticsPeriodChange}
    />
  );
};