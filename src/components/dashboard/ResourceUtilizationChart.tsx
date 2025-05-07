import { useState, useEffect } from "react";
import { Box, CircularProgress, Alert } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { getResources, Resource } from "../../services/resourceService";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import dayjs from "dayjs";

const HOURS_PER_DAY = 7.4;
const HOURS_PER_WEEK = 37;

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          backgroundColor: "background.paper",
          p: 1,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          boxShadow: 1,
        }}
      >
        <p>
          <strong>{label}</strong>
        </p>
        <p>{`Utilization: ${payload[0].value}%`}</p>
      </Box>
    );
  }
  return null;
};

export default function ResourceUtilizationChart() {
  const [data, setData] = useState<{ name: string; utilization: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUtilization = async () => {
      setLoading(true);
      setError(null);
      try {
        const resources = await getResources(true);
        const weekStart = dayjs().startOf("isoWeek");
        const weekEnd = dayjs().endOf("isoWeek");
        const ordersQuery = query(
          collection(db, "orders"),
          where("status", "in", ["Open", "Released", "In Progress", "Delayed", "Firm Planned"])
        );
        const ordersSnap = await getDocs(ordersQuery);
        const orders = ordersSnap.docs.map(doc => doc.data());
        const utilizationData = resources.map(resource => {
          const weeklyCapacity = resource.capacity ? resource.capacity * 5 : HOURS_PER_WEEK;
          // Sum estimated hours for orders assigned to this resource and planned for this week
          let assignedHours = 0;
          orders.forEach(order => {
            if (order.assignedResourceId === resource.id) {
              // Use plannedWeekStartDate if available, else calculate from start
              let plannedWeek = order.plannedWeekStartDate
                ? dayjs(order.plannedWeekStartDate)
                : order.start instanceof Timestamp
                  ? dayjs(order.start.toDate()).startOf("isoWeek")
                  : dayjs(order.start).startOf("isoWeek");
              if (plannedWeek.isSame(weekStart, "day")) {
                let est = order.estimatedHours;
                if (!est && order.start && order.end) {
                  // Estimate from start/end
                  const start =
                    order.start instanceof Timestamp ? order.start.toDate() : new Date(order.start);
                  const end =
                    order.end instanceof Timestamp ? order.end.toDate() : new Date(order.end);
                  let workDays = 0;
                  const currentDate = new Date(start);
                  while (currentDate <= end) {
                    const dayOfWeek = currentDate.getDay();
                    if (dayOfWeek !== 0 && dayOfWeek !== 6) workDays++;
                    currentDate.setDate(currentDate.getDate() + 1);
                  }
                  est = Math.max(workDays, 1) * HOURS_PER_DAY;
                }
                assignedHours += est || 0;
              }
            }
          });
          const utilization =
            weeklyCapacity > 0 ? Math.round((assignedHours / weeklyCapacity) * 100) : 0;
          return {
            name: resource.name,
            utilization,
          };
        });
        setData(utilizationData);
      } catch (err) {
        setError("Failed to load resource utilization data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUtilization();
  }, []);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  if (error) return <Alert severity="error">{error}</Alert>;
  if (data.length === 0)
    return <Alert severity="info">No resource utilization data available for this week.</Alert>;

  return (
    <Box sx={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis unit="%" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="utilization" name="Utilization" fill="#3f51b5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
