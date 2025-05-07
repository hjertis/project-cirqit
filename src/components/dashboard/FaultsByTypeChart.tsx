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
  const [data, setData] = useState<FaultsByTypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
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
