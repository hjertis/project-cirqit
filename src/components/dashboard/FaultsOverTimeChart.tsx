import { useState, useEffect } from "react";
import { CircularProgress, Alert } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import ChartWrapper from "../common/ChartWrapper";
import dayjs from "dayjs";

interface FaultsOverTimeData {
  week: string; // e.g. '2025-W18'
  count: number;
}

const FaultsOverTimeChart = () => {
  const [data, setData] = useState<FaultsOverTimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const snapshot = await getDocs(collection(db, "faults"));
        const rawFaults = snapshot.docs.map(doc => doc.data());
        // Group by week (ISO week number)
        const weekCounts: Record<string, number> = {};
        rawFaults.forEach(fault => {
          let date: Date | null = null;
          if (fault.addDate instanceof Timestamp) {
            date = fault.addDate.toDate();
          } else if (fault.addDate) {
            date = new Date(fault.addDate);
          }
          if (!date || isNaN(date.getTime())) return;
          const week = dayjs(date).format("YYYY-[W]WW");
          weekCounts[week] = (weekCounts[week] || 0) + 1;
        });
        const chartData = Object.entries(weekCounts)
          .map(([week, count]) => ({ week, count }))
          .sort((a, b) => a.week.localeCompare(b.week));
        setData(chartData);
      } catch (err) {
        setError("Failed to load fault data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (data.length === 0) return <Alert severity="info">No fault data available over time.</Alert>;

  return (
    <ChartWrapper title="Faults Over Time" description="Weekly trend of reported faults.">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" angle={-45} textAnchor="end" height={60} />
          <YAxis
            allowDecimals={false}
            label={{ value: "Faults", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            formatter={(value: number) => [value, "Faults"]}
            labelFormatter={label => `Week: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="count"
            name="Faults"
            stroke="#3f51b5"
            strokeWidth={2}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

export default FaultsOverTimeChart;
