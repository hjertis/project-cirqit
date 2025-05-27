import { Paper, Typography, Box } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
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

const ProductionTimelineChart = () => {
  const fetchProductionTimeline = async () => {
    const ordersSnap = await getDocs(collection(db, "orders"));
    const archivedSnap = await getDocs(collection(db, "archivedOrders"));
    const allOrders = [
      ...ordersSnap.docs.map(doc => doc.data()),
      ...archivedSnap.docs.map(doc => doc.data()),
    ];

    // Group by month
    const monthMap = new Map();
    let ordersCount = allOrders.length;
    let activeOrdersCount = 0;
    let completedOrdersCount = 0;
    let totalVolume = 0;

    allOrders.forEach(order => {
      const date = order.start
        ? new Date(order.start.seconds ? order.start.seconds * 1000 : order.start)
        : null;
      if (!date || isNaN(date.getTime())) return;

      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap.has(month)) {
        monthMap.set(month, {
          month,
          plannedQuantity: 0,
          completedQuantity: 0,
          orderCount: 0,
          isPast: date < new Date(),
        });
      }

      const entry = monthMap.get(month);
      const quantity = order.quantity || 0;

      // All orders contribute to planned quantity and order count
      entry.plannedQuantity += quantity;
      entry.orderCount += 1;

      // Only completed orders contribute to completed quantity
      if (order.status === "Done" || order.status === "Finished") {
        entry.completedQuantity += quantity;
        completedOrdersCount++;
      } else {
        activeOrdersCount++;
      }

      totalVolume += quantity;
    });

    const productionByMonth = Array.from(monthMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    return { productionByMonth, ordersCount, activeOrdersCount, completedOrdersCount, totalVolume };
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["productionTimelineChart"],
    queryFn: fetchProductionTimeline,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <span>Loading...</span>
      </Box>
    );
  if (isError)
    return (
      <Box sx={{ p: 2 }}>
        <span style={{ color: "red" }}>
          {error instanceof Error ? error.message : String(error)}
        </span>
      </Box>
    );
  if (!data || data.productionByMonth.length === 0)
    return (
      <Box sx={{ p: 2 }}>
        <span>No production timeline data available.</span>
      </Box>
    );

  const { productionByMonth, ordersCount, activeOrdersCount, completedOrdersCount, totalVolume } =
    data;

  return (
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
            <RechartsTooltip
              formatter={(value, name) => [
                `${value} ${name.includes("Quantity") ? "units" : "orders"}`,
                name,
              ]}
            />
            <Legend />
            <Bar dataKey="plannedQuantity" fill="#8884d8" name="Planned Quantity" />
            <Line
              type="monotone"
              dataKey="completedQuantity"
              stroke="#ff7300"
              name="Completed Quantity"
              strokeWidth={3}
            />
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
};

export default ProductionTimelineChart;
