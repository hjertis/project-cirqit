import { useState, useEffect } from "react";
import { Typography, Paper, CircularProgress, Alert } from "@mui/material";
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
// import { fetchFaults } from '../../services/faultService'; // Assuming this service exists

interface FaultData {
  faultType: string;
  count: number;
  cumulativePercentage: number;
}

const FaultParetoChart = () => {
  const [chartData, setChartData] = useState<FaultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch raw fault records (replace with actual service call)
        // const rawFaults = await fetchFaults();
        const rawFaults = [
          // Sample Raw Data
          { faultType: "Solder Bridge" },
          { faultType: "Missing Component" },
          { faultType: "Solder Bridge" },
          { faultType: "Wrong Polarity" },
          { faultType: "Solder Bridge" },
          { faultType: "Missing Component" },
          { faultType: "Test Failure" },
          { faultType: "Solder Bridge" },
          { faultType: "Cosmetic Defect" },
          { faultType: "Missing Component" },
        ];

        // 2. Aggregate counts by faultType
        const counts: Record<string, number> = {};
        rawFaults.forEach(fault => {
          counts[fault.faultType] = (counts[fault.faultType] || 0) + 1;
        });

        // 3. Sort by count descending
        const sortedFaults = Object.entries(counts)
          .map(([faultType, count]) => ({ faultType, count }))
          .sort((a, b) => b.count - a.count);

        // 4. Calculate cumulative percentage
        const totalCount = rawFaults.length;
        let cumulativeCount = 0;
        const processedData = sortedFaults.map(fault => {
          cumulativeCount += fault.count;
          return {
            ...fault,
            cumulativePercentage: Math.round((cumulativeCount / totalCount) * 100),
          };
        });

        setChartData(processedData);
      } catch (err) {
        setError("Failed to load fault data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (chartData.length === 0) {
    return <Typography>No fault data available for analysis.</Typography>;
  }

  return (
    <Paper sx={{ p: 2, height: 400 }}>
      <Typography variant="h6" gutterBottom>
        Fault Pareto Analysis
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 50 }} // Increased bottom margin for labels
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="faultType"
            angle={-45} // Angle labels for better readability
            textAnchor="end"
            height={60} // Adjust height if needed
            interval={0} // Show all labels
            tick={{ fontSize: 10 }} // Smaller font size
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
    </Paper>
  );
};

export default FaultParetoChart;
