// src/context/DashboardContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define types for our dashboard data
interface DashboardStats {
  ordersCompletionRate: number;
  onTimeDeliveryRate: number;
  revenueThisMonth: number;
  completedOrdersCount: number;
  isLoading: boolean;
}

interface DashboardContextType {
  stats: DashboardStats;
  refreshStats: () => Promise<void>;
  lastUpdated: Date | null;
}

// Create context with default values
const DashboardContext = createContext<DashboardContextType>({
  stats: {
    ordersCompletionRate: 0,
    onTimeDeliveryRate: 0,
    revenueThisMonth: 0,
    completedOrdersCount: 0,
    isLoading: true
  },
  refreshStats: async () => {},
  lastUpdated: null
});

// Provider component
interface DashboardProviderProps {
  children: ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  const [stats, setStats] = useState<DashboardStats>({
    ordersCompletionRate: 0,
    onTimeDeliveryRate: 0,
    revenueThisMonth: 0,
    completedOrdersCount: 0,
    isLoading: true
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Simulate fetching dashboard stats from the server
  const fetchDashboardStats = async (): Promise<DashboardStats> => {
    // In a real app, this would be an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ordersCompletionRate: 78,
          onTimeDeliveryRate: 92,
          revenueThisMonth: 45200,
          completedOrdersCount: 123,
          isLoading: false
        });
      }, 1000);
    });
  };

  const refreshStats = async () => {
    try {
      setStats({ ...stats, isLoading: true });
      const newStats = await fetchDashboardStats();
      setStats(newStats);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing dashboard stats:', error);
      setStats({ ...stats, isLoading: false });
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    refreshStats();
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        stats,
        refreshStats,
        lastUpdated
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

// Custom hook to use the dashboard context
export const useDashboard = () => useContext(DashboardContext);