import { Paper, Typography, Box } from "@mui/material";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Bar,
  Line,
} from "recharts";

interface MonthlyProductionData {
  month: string;
  quantity: number;
  isPast: boolean;
}

interface ProductionTimelineChartProps {
  productionByMonth: MonthlyProductionData[];
  ordersCount: number;
  activeOrdersCount: number;
  completedOrdersCount: number;
  totalVolume: number;
}

const ProductionTimelineChart = ({
  productionByMonth,
  ordersCount,
  activeOrdersCount,
  completedOrdersCount,
  totalVolume,
}: ProductionTimelineChartProps) => (
  <Paper sx={{ p: 2 }}>
    <Typography variant="h6" gutterBottom>
      Production Timeline
    </Typography>
    <Box sx={{ height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={productionByMonth}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" angle={-45} textAnchor="end" height={60} />
          <YAxis />
          <RechartsTooltip formatter={value => [`${value} units`, "Quantity"]} />
          <Legend />
          <Bar dataKey="quantity" fill="#8884d8" />
          <Line type="monotone" dataKey="quantity" stroke="#ff7300" />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Production Insights
      </Typography>
      <Box component="ul" sx={{ pl: 4 }}>
        <li>Total orders in system: {ordersCount}</li>
        <li>Active orders: {activeOrdersCount}</li>
        <li>Completed orders: {completedOrdersCount}</li>
        <li>Total production volume: {totalVolume} units</li>
      </Box>
    </Box>
  </Paper>
);

export default ProductionTimelineChart;
