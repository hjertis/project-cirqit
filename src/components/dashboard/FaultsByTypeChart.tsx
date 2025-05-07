import { useState, useEffect } from "react";
import { CircularProgress, Alert } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import ChartWrapper from "../common/ChartWrapper";
import { useQuery } from "@tanstack/react-query";

interface FaultsByTypeData {
  faultType: string;
  count: number;
}

const COLORS = [
  "#3f51b5",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#4caf50",
  "#e91e63",
  "#9c27b0",
  "#2196f3",
  "#ff9800",
];

const FaultsByTypeChart = () => {
  const fetchFaultsByType = async () => {
    const snapshot = await getDocs(collection(db, "faults"));
    const rawFaults = snapshot.docs.map(doc => doc.data());
    const counts: Record<string, number> = {};
    rawFaults.forEach(fault => {
      const type = fault.faultType || "Unknown";
      counts[type] = (counts[type] || 0) + 1;
    });
    const chartData = Object.entries(counts)
      .map(([faultType, count]) => ({ faultType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Top 15 types
    return chartData;
  };

  const {
    data = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["faultsByTypeChart"],
    queryFn: fetchFaultsByType,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) return <CircularProgress />;
  if (isError)
    return <Alert severity="error">{error instanceof Error ? error.message : String(error)}</Alert>;
  if (data.length === 0) return <Alert severity="info">No fault data available by type.</Alert>;

  return (
    <ChartWrapper title="Faults by Type" description="Most common types of reported faults.">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            label={{ value: "Fault Count", position: "insideBottom", offset: -10 }}
          />
          <YAxis type="category" dataKey="faultType" width={120} />
          <Tooltip
            formatter={(value: number) => [value, "Faults"]}
            labelFormatter={label => `Type: ${label}`}
          />
          <Legend />
          <Bar dataKey="count" name="Faults" fill="#3f51b5">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

export default FaultsByTypeChart;
