import { useState, useEffect } from "react";
import { Typography, CircularProgress, Alert } from "@mui/material";
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import ChartWrapper from "../common/ChartWrapper";
import { useQuery } from "@tanstack/react-query";

interface FaultData {
  faultType: string;
  count: number;
  cumulativePercentage: number;
}

const FaultParetoChart = () => {
  const fetchFaultPareto = async () => {
    const snapshot = await getDocs(collection(db, "faults"));
    const rawFaults = snapshot.docs.map(doc => doc.data());
    const counts: Record<string, number> = {};
    rawFaults.forEach(fault => {
      const type = fault.faultType || "Unknown";
      counts[type] = (counts[type] || 0) + 1;
    });
    const sortedFaults = Object.entries(counts)
      .map(([faultType, count]) => ({ faultType, count }))
      .sort((a, b) => b.count - a.count);
    const totalCount = rawFaults.length;
    let cumulativeCount = 0;
    const processedData = sortedFaults.map(fault => {
      cumulativeCount += fault.count;
      return {
        ...fault,
        cumulativePercentage: Math.round((cumulativeCount / totalCount) * 100),
      };
    });
    return processedData;
  };

  const {
    data: chartData = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["faultParetoChart"],
    queryFn: fetchFaultPareto,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return <CircularProgress />;
  }

  if (isError) {
    return <Alert severity="error">{error instanceof Error ? error.message : String(error)}</Alert>;
  }

  if (chartData.length === 0) {
    return <Typography>No fault data available for analysis.</Typography>;
  }

  return (
    <ChartWrapper
      title="Fault Pareto Analysis"
      description="Most frequent fault types and their cumulative impact."
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="faultType"
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
            tick={{ fontSize: 10 }}
          />
          <YAxis yAxisId="left" label={{ value: "Count", angle: -90, position: "insideLeft" }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: "Cumulative %", angle: 90, position: "insideRight" }}
            unit="%"
          />
          <Tooltip />
          <Legend verticalAlign="top" />
          <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Fault Count" />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativePercentage"
            stroke="#ff7300"
            name="Cumulative %"
            dot={false}
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

export default FaultParetoChart;
