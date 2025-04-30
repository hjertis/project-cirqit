import { Box } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { day: "Mon", orders: 4, completed: 3 },
  { day: "Tue", orders: 6, completed: 4 },
  { day: "Wed", orders: 8, completed: 7 },
  { day: "Thu", orders: 5, completed: 3 },
  { day: "Fri", orders: 7, completed: 6 },
  { day: "Sat", orders: 3, completed: 2 },
  { day: "Sun", orders: 2, completed: 1 },
];

export default function DailyOrdersChart() {
  return (
    <Box sx={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="orders"
            stroke="#3f51b5"
            strokeWidth={2}
            activeDot={{ r: 8 }}
          />
          <Line type="monotone" dataKey="completed" stroke="#4caf50" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
