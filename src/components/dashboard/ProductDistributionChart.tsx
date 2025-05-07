import { Paper, Typography, Box } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartTooltip,
  Legend,
  Bar,
  Cell,
} from "recharts";

interface ProductData {
  partNo: string;
  count: number;
  totalQuantity: number;
  description: string;
}

const COLORS = ["#3f51b5", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const ProductDistributionChart = () => {
  const fetchProductDistribution = async () => {
    const ordersSnap = await getDocs(collection(db, "orders"));
    const archivedSnap = await getDocs(collection(db, "archivedOrders"));
    const allOrders = [
      ...ordersSnap.docs.map(doc => doc.data()),
      ...archivedSnap.docs.map(doc => doc.data()),
    ];
    const productMap = new Map();
    allOrders.forEach(order => {
      const key = order.partNo || "Unknown";
      if (!productMap.has(key)) {
        productMap.set(key, {
          partNo: key,
          description: order.description || key,
          count: 0,
          totalQuantity: 0,
        });
      }
      const entry = productMap.get(key);
      entry.count += 1;
      entry.totalQuantity += order.quantity || 0;
    });
    return Array.from(productMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 15); // Top 15 products
  };

  const {
    data: topProducts = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["productDistributionChart"],
    queryFn: fetchProductDistribution,
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
  if (topProducts.length === 0)
    return (
      <Box sx={{ p: 2 }}>
        <span>No product distribution data available.</span>
      </Box>
    );

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Product Distribution
      </Typography>
      <Box sx={{ height: 500 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topProducts}
            layout="vertical"
            margin={{ top: 20, right: 50, left: 180, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              label={{
                value: "Units Produced",
                position: "insideBottom",
                offset: -10,
              }}
            />
            <YAxis
              type="category"
              dataKey="description"
              width={170}
              tickFormatter={value => (value.length > 40 ? value.substring(0, 40) + "..." : value)}
            />
            <RechartTooltip
              formatter={(value: number, name: string) => [`${value} units`, "Quantity"]}
              labelFormatter={(label: string) => `Product: ${label}`}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #ccc",
                        padding: "10px",
                        borderRadius: "4px",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                      }}
                    >
                      <p style={{ margin: 0 }}>
                        <strong>Product:</strong> {data.description}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Part No:</strong> {data.partNo}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Total Quantity:</strong> {data.totalQuantity} units
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Order Count:</strong> {data.count}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="totalQuantity" name="Total Quantity" fill="#8884d8" radius={[0, 4, 4, 0]}>
              {topProducts.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default ProductDistributionChart;
