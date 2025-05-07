import { useState, useEffect } from "react";
import { Box, CircularProgress, Alert } from "@mui/material";
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
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";

interface DailyOrdersData {
  day: string; // e.g. 'Mon'
  orders: number;
  completed: number;
}

const getLast7Days = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    days.push(dayjs().subtract(i, "day"));
  }
  return days;
};

export default function DailyOrdersChart() {
  const fetchDailyOrders = async () => {
    const [activeSnap, archivedSnap] = await Promise.all([
      getDocs(collection(db, "orders")),
      getDocs(collection(db, "archivedOrders")),
    ]);
    const allOrders = [
      ...activeSnap.docs.map(doc => doc.data()),
      ...archivedSnap.docs.map(doc => doc.data()),
    ];
    const last7 = getLast7Days();
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyData: DailyOrdersData[] = last7.map(d => ({
      day: dayLabels[d.day()],
      orders: 0,
      completed: 0,
    }));
    allOrders.forEach(order => {
      let start = order.start instanceof Timestamp ? order.start.toDate() : new Date(order.start);
      let finished = order.finishedDate
        ? order.finishedDate instanceof Timestamp
          ? order.finishedDate.toDate()
          : new Date(order.finishedDate)
        : null;
      last7.forEach((d, idx) => {
        if (start && dayjs(start).isSame(d, "day")) dailyData[idx].orders++;
        if (finished && dayjs(finished).isSame(d, "day")) dailyData[idx].completed++;
      });
    });
    return dailyData;
  };

  const {
    data = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["dailyOrdersChart"],
    queryFn: fetchDailyOrders,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  if (isError)
    return <Alert severity="error">{error instanceof Error ? error.message : String(error)}</Alert>;
  if (data.length === 0)
    return <Alert severity="info">No order data available for the last 7 days.</Alert>;

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
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="orders"
            name="Started"
            stroke="#3f51b5"
            strokeWidth={2}
            activeDot={{ r: 8 }}
          />
          <Line
            type="monotone"
            dataKey="completed"
            name="Completed"
            stroke="#4caf50"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
