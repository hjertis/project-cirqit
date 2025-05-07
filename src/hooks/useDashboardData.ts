import { useDashboard } from "../context/DashboardContext";
import { useMemo } from "react";

export const useDashboardData = () => {
  const { stats, refreshStats, lastUpdated } = useDashboard();

  const formatLeadTime = (days: number) => {
    if (days === 0) return "N/A";
    if (days < 1) return `${(days * 24).toFixed(1)} hrs`;
    return `${days.toFixed(1)} days`;
  };

  const formattedStats = useMemo(
    () => ({
      ordersCompletionRate: `${stats.ordersCompletionRate}%`,
      onTimeDeliveryRate: `${stats.onTimeDeliveryRate}%`,
      averageLeadTime: formatLeadTime(stats.averageLeadTime ?? 0),
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
