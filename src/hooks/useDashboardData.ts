import { useDashboard } from "../context/DashboardContext";
import { useMemo } from "react";

export const useDashboardData = () => {
  const { stats, refreshStats, lastUpdated } = useDashboard();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formattedStats = useMemo(
    () => ({
      ordersCompletionRate: `${stats.ordersCompletionRate}%`,
      onTimeDeliveryRate: `${stats.onTimeDeliveryRate}%`,
      revenueThisMonth: formatCurrency(stats.revenueThisMonth),
      completedOrdersCount: stats.completedOrdersCount.toString(),
    }),
    [stats]
  );

  const lastUpdatedString = useMemo(() => {
    if (!lastUpdated) return "Never";

    const now = new Date();
    const isToday = lastUpdated.toDateString() === now.toDateString();

    if (isToday) {
      return `Today, ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }

    return `${lastUpdated.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }, [lastUpdated]);

  return {
    stats: formattedStats,
    rawStats: stats,
    refreshStats,
    lastUpdatedString,
    isLoading: stats.isLoading,
  };
};
