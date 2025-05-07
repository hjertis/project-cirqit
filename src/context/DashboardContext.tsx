// src/context/DashboardContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";

// Define types for our dashboard data
interface DashboardStats {
  ordersCompletionRate: number;
  onTimeDeliveryRate: number;
  completedOrdersCount: number;
  isLoading: boolean;
  averageLeadTime?: number;
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
    completedOrdersCount: 0,
    isLoading: true,
    averageLeadTime: 0,
  },
  refreshStats: async () => {},
  lastUpdated: null,
});

// Provider component
interface DashboardProviderProps {
  children: ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  const [stats, setStats] = useState<DashboardStats>({
    ordersCompletionRate: 0,
    onTimeDeliveryRate: 0,
    completedOrdersCount: 0,
    isLoading: true,
    averageLeadTime: 0,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch dashboard stats from Firestore
  const fetchDashboardStats = async (): Promise<DashboardStats & { averageLeadTime: number }> => {
    try {
      // Fetch orders from both active and archived collections
      const [activeSnap, archivedSnap] = await Promise.all([
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "archivedOrders")),
      ]);
      const allOrders = [
        ...activeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...archivedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ];
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      // Completed orders: status Finished or Done
      const completed = allOrders.filter(o => ["Finished", "Done"].includes(o.status));
      // Orders completion rate: % completed out of all
      const ordersCompletionRate =
        allOrders.length > 0 ? Math.round((completed.length / allOrders.length) * 100) : 0;
      // On-time delivery: completed where (finishedDate or updated or end) <= planned end
      let onTimeCount = 0;
      let totalLeadTime = 0;
      let leadTimeCount = 0;
      completed.forEach(order => {
        let plannedEnd = order.end instanceof Timestamp ? order.end.toDate() : new Date(order.end);
        let actualEnd = order.finishedDate
          ? order.finishedDate instanceof Timestamp
            ? order.finishedDate.toDate()
            : new Date(order.finishedDate)
          : order.updated
            ? order.updated instanceof Timestamp
              ? order.updated.toDate()
              : new Date(order.updated)
            : plannedEnd;
        let start = order.start instanceof Timestamp ? order.start.toDate() : new Date(order.start);
        if (plannedEnd && actualEnd && actualEnd <= plannedEnd) onTimeCount++;
        if (start && actualEnd && !isNaN(start.getTime()) && !isNaN(actualEnd.getTime())) {
          const diffDays = (actualEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays >= 0) {
            totalLeadTime += diffDays;
            leadTimeCount++;
          }
        }
      });
      const onTimeDeliveryRate =
        completed.length > 0 ? Math.round((onTimeCount / completed.length) * 100) : 0;
      // Average lead time in days
      const averageLeadTime = leadTimeCount > 0 ? totalLeadTime / leadTimeCount : 0;
      return {
        ordersCompletionRate,
        onTimeDeliveryRate,
        revenueThisMonth: 0, // deprecated, not used
        completedOrdersCount: completed.length,
        isLoading: false,
        averageLeadTime,
      };
    } catch (err) {
      console.error("Error fetching dashboard stats from Firestore", err);
      return {
        ordersCompletionRate: 0,
        onTimeDeliveryRate: 0,
        completedOrdersCount: 0,
        isLoading: false,
        averageLeadTime: 0,
      };
    }
  };

  const refreshStats = async () => {
    try {
      setStats({ ...stats, isLoading: true });
      const newStats = await fetchDashboardStats();
      // Remove revenueThisMonth, add averageLeadTime
      setStats({
        ordersCompletionRate: newStats.ordersCompletionRate,
        onTimeDeliveryRate: newStats.onTimeDeliveryRate,
        completedOrdersCount: newStats.completedOrdersCount,
        isLoading: false,
        averageLeadTime: newStats.averageLeadTime,
      } as any);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error refreshing dashboard stats:", error);
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
        lastUpdated,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

// Custom hook to use the dashboard context
export const useDashboard = () => useContext(DashboardContext);
