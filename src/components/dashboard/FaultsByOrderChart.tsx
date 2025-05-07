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

interface FaultByOrderData {
  orderId: string;
  partNumber?: string;
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

const FaultsByOrderChart = () => {
  const fetchFaultsByOrder = async () => {
    const snapshot = await getDocs(collection(db, "faults"));
    const rawFaults = snapshot.docs.map(doc => doc.data());
    const counts: Record<string, { count: number; partNumber?: string }> = {};
    rawFaults.forEach(fault => {
      const orderId = fault.orderId || "Unknown";
      if (!counts[orderId]) {
        counts[orderId] = { count: 0, partNumber: fault.partNumber };
      }
      counts[orderId].count += 1;
    });
    const chartData = Object.entries(counts)
      .map(([orderId, { count, partNumber }]) => ({ orderId, partNumber, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Top 15 orders
    return chartData;
  };

  const {
    data = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["faultsByOrderChart"],
    queryFn: fetchFaultsByOrder,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) return <CircularProgress />;
  if (isError)
    return <Alert severity="error">{error instanceof Error ? error.message : String(error)}</Alert>;
  if (data.length === 0) return <Alert severity="info">No fault data available by order.</Alert>;

  return (
    <ChartWrapper title="Faults by Order" description="Top orders with the most reported faults.">
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
          <YAxis
            type="category"
            dataKey="orderId"
            width={120}
            tickFormatter={(value, idx) => {
              const part = data[idx]?.partNumber;
              return part ? `${value} (${part})` : value;
            }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [value, "Faults"]}
            labelFormatter={(label: string) => `Order: ${label}`}
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

export default FaultsByOrderChart;
