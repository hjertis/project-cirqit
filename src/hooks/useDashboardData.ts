// src/hooks/useDashboardData.ts
// This is a simple hook that uses the dashboard context and provides some derived data
import { useDashboard } from '../context/DashboardContext';
import { useMemo } from 'react';

export const useDashboardData = () => {
  const { stats, refreshStats, lastUpdated } = useDashboard();

  // Format currency to USD
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Derive formatted values from stats
  const formattedStats = useMemo(() => ({
    ordersCompletionRate: `${stats.ordersCompletionRate}%`,
    onTimeDeliveryRate: `${stats.onTimeDeliveryRate}%`,
    revenueThisMonth: formatCurrency(stats.revenueThisMonth),
    completedOrdersCount: stats.completedOrdersCount.toString()
  }), [stats]);
  
  // Format last updated string
  const lastUpdatedString = useMemo(() => {
    if (!lastUpdated) return 'Never';
    
    // Format as "Today, 12:34 PM" or "Apr 12, 2023 12:34 PM"
    const now = new Date();
    const isToday = lastUpdated.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today, ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return `${lastUpdated.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [lastUpdated]);
  
  return {
    stats: formattedStats,
    rawStats: stats,
    refreshStats,
    lastUpdatedString,
    isLoading: stats.isLoading
  };
};