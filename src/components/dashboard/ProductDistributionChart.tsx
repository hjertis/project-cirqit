import { Paper, Typography, Box } from "@mui/material";
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

interface ProductDistributionChartProps {
  topProducts: ProductData[];
}

const ProductDistributionChart = ({ topProducts }: ProductDistributionChartProps) => (
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

export default ProductDistributionChart;
