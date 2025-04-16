// src/components/orders/OrderPlanningGantt.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Today as TodayIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";
import { collection, query, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

// Extend dayjs with plugins
dayjs.extend(isBetween);

// Define types for orders and processes
interface Order {
  id: string;
  orderNumber: string;
  description: string;
  partNo: string;
  status: string;
  start: Timestamp;
  end: Timestamp;
  priority: string;
  customer?: string;
}

interface Process {
  id: string;
  workOrderId: string;
  type: string;
  name: string;
  sequence: number;
  status: string;
  startDate: Timestamp;
  endDate: Timestamp;
  assignedResource: string | null;
  progress: number;
}

// Group processes by order
interface OrderWithProcesses {
  order: Order;
  processes: Process[];
  progress: number; // Overall progress for the order
}

// Helper functions
const getStatusColor = (status: string) => {
  switch (status) {
    case "Open":
    case "Released":
    case "Pending":
      return "#3f51b5"; // primary
    case "In Progress":
      return "#19857b"; // secondary
    case "Done":
    case "Finished":
    case "Completed":
      return "#4caf50"; // success
    case "Delayed":
    case "Not Started":
      return "#f44336"; // error
    default:
      return "#9e9e9e"; // default
  }
};

const formatDate = (date: Date): string => {
  return dayjs(date).format("MMM D, YYYY");
};

// Timeline configuration
const DAY_WIDTH_DEFAULT = 40; // pixels per day
const HEADER_HEIGHT = 50;
const ROW_HEIGHT = 40; // Reduced height
const TODAY = new Date();

const OrderPlanningGantt: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderWithProcesses[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithProcesses[]>([]);

  // Gantt view state
  const [startDate, setStartDate] = useState<Date>(dayjs().subtract(7, "day").toDate());
  const [endDate, setEndDate] = useState<Date>(dayjs().add(30, "day").toDate());
  const [dayWidth, setDayWidth] = useState(DAY_WIDTH_DEFAULT);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterResource, setFilterResource] = useState<string>("");
  const [resources, setResources] = useState<string[]>([]);

  // Number of days to display
  const daysDiff = dayjs(endDate).diff(dayjs(startDate), "day");

  // Calculate total width of the chart
  const chartWidth = daysDiff * dayWidth;

  // Generate dates for the header
  const dates = Array.from({ length: daysDiff }, (_, i) => dayjs(startDate).add(i, "day").toDate());

  // Fetch orders and processes
  useEffect(() => {
    const fetchOrdersAndProcesses = async () => {
      setLoading(true);
      try {
        // Fetch all orders
        const ordersQuery = query(collection(db, "orders"));
        const ordersSnapshot = await getDocs(ordersQuery);

        const ordersData: Order[] = [];
        ordersSnapshot.forEach(doc => {
          ordersData.push({
            id: doc.id,
            ...doc.data(),
          } as Order);
        });

        // Fetch all processes
        const processesQuery = query(collection(db, "processes"));
        const processesSnapshot = await getDocs(processesQuery);

        const processesData: Process[] = [];
        const resourceSet = new Set<string>();

        processesSnapshot.forEach(doc => {
          const process = {
            id: doc.id,
            ...doc.data(),
          } as Process;

          processesData.push(process);

          // Collect unique resources
          if (process.assignedResource) {
            resourceSet.add(process.assignedResource);
          }
        });

        // Group processes by order and calculate progress
        const groupedData: OrderWithProcesses[] = ordersData.map(order => {
          const orderProcesses = processesData
            .filter(process => process.workOrderId === order.id)
            .sort((a, b) => a.sequence - b.sequence);

          // Calculate total progress for the order
          let totalProgress = 0;
          if (orderProcesses.length > 0) {
            totalProgress = Math.round(
              orderProcesses.reduce((sum, process) => sum + process.progress, 0) /
                orderProcesses.length
            );
          }

          return {
            order,
            processes: orderProcesses,
            progress: totalProgress,
          };
        });

        setOrders(groupedData);
        setFilteredOrders(groupedData);
        setResources(Array.from(resourceSet).sort());

        // Update date range if needed
        let minDate = startDate;
        let maxDate = endDate;

        groupedData.forEach(({ order }) => {
          const orderStart = order.start.toDate();
          const orderEnd = order.end.toDate();

          if (dayjs(orderStart).isBefore(dayjs(minDate))) {
            minDate = orderStart;
          }
          if (dayjs(orderEnd).isAfter(dayjs(maxDate))) {
            maxDate = orderEnd;
          }
        });

        setStartDate(minDate);
        setEndDate(maxDate);
        setError(null);
      } catch (err) {
        console.error("Error fetching orders and processes:", err);
        setError(
          `Failed to load planning data: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrdersAndProcesses();
  }, []);

  // Apply filters
  useEffect(() => {
    if (!orders.length) return;

    let result = [...orders];

    // Filter by status
    if (filterStatus) {
      result = result.filter(item => {
        // Filter on order status
        if (item.order.status === filterStatus) return true;

        // Or if any process has this status
        return item.processes.some(process => process.status === filterStatus);
      });
    }

    // Filter by resource
    if (filterResource) {
      result = result.filter(item => {
        // Check if any process has this resource
        return item.processes.some(process => process.assignedResource === filterResource);
      });
    }

    setFilteredOrders(result);
  }, [orders, filterStatus, filterResource]);

  // Zoom in/out handlers
  const handleZoomIn = () => {
    setDayWidth(prev => Math.min(prev + 10, 100));
  };

  const handleZoomOut = () => {
    setDayWidth(prev => Math.max(prev - 10, 20));
  };

  // Go to today
  const handleGoToToday = () => {
    const today = new Date();
    const newStartDate = dayjs(today).subtract(7, "day").toDate();
    const newEndDate = dayjs(today).add(21, "day").toDate();

    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilterStatus("");
    setFilterResource("");
  };

  // Get position on the timeline
  const getBarPosition = (date: Date): number => {
    const dateObj = dayjs(date);
    const timelineStart = dayjs(startDate);
    const diffDays = dateObj.diff(timelineStart, "day", true);
    return Math.max(0, diffDays * dayWidth);
  };

  // Get width of a bar
  const getBarWidth = (start: Date, end: Date): number => {
    const startDate = dayjs(start);
    const endDate = dayjs(end);
    const durationDays = endDate.diff(startDate, "day", true);
    return Math.max(0, durationDays * dayWidth);
  };

  // Get status options from all orders and processes
  const statusOptions = [
    ...new Set([
      ...orders.map(o => o.order.status),
      ...orders.flatMap(o => o.processes.map(p => p.status)),
    ]),
  ].sort();

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, overflow: "hidden" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Order Planning Timeline</Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Zoom In">
            <IconButton onClick={handleZoomIn} size="small">
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton onClick={handleZoomOut} size="small">
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Go to Today">
            <IconButton onClick={handleGoToToday} size="small">
              <TodayIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            value={filterStatus}
            label="Status"
            onChange={e => setFilterStatus(e.target.value)}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {statusOptions.map(status => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="resource-filter-label">Resource</InputLabel>
          <Select
            labelId="resource-filter-label"
            id="resource-filter"
            value={filterResource}
            label="Resource"
            onChange={e => setFilterResource(e.target.value)}
          >
            <MenuItem value="">All Resources</MenuItem>
            {resources.map(resource => (
              <MenuItem key={resource} value={resource}>
                {resource}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {(filterStatus || filterResource) && (
          <Tooltip title="Reset Filters">
            <IconButton onClick={handleResetFilters} size="small">
              <FilterListIcon />
            </IconButton>
          </Tooltip>
        )}

        <Typography variant="body2" color="text.secondary">
          Showing {filteredOrders.length} orders with{" "}
          {filteredOrders.reduce((sum, o) => sum + o.processes.length, 0)} processes
        </Typography>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: "flex", mb: 2 }}>
        {/* Timeline header with dates */}
        <Box sx={{ width: 300, flexShrink: 0 }}>
          <Box
            sx={{
              height: HEADER_HEIGHT,
              display: "flex",
              alignItems: "center",
              pl: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="body2" fontWeight="bold">
              Order / Description
            </Typography>
          </Box>
        </Box>

        <Box sx={{ overflow: "auto", position: "relative" }}>
          <Box
            sx={{
              minWidth: chartWidth,
              height: HEADER_HEIGHT,
              display: "flex",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            {dates.map((date, index) => {
              const isWeekend = dayjs(date).day() === 0 || dayjs(date).day() === 6;
              const isToday = dayjs(date).isSame(dayjs(), "day");

              return (
                <Box
                  key={index}
                  sx={{
                    width: dayWidth,
                    height: "100%",
                    borderRight: "1px solid",
                    borderColor: "divider",
                    backgroundColor: isWeekend ? "action.hover" : "transparent",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    position: "relative",
                  }}
                >
                  {isToday && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        width: "2px",
                        backgroundColor: "error.main",
                        left: "calc(50% - 1px)",
                      }}
                    />
                  )}
                  <Typography variant="caption" color={isToday ? "error" : "text.secondary"}>
                    {dayjs(date).format("D")}
                  </Typography>
                  <Typography variant="caption" color={isToday ? "error" : "text.secondary"}>
                    {dayjs(date).format("MMM")}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Main Gantt content */}
      <Box sx={{ display: "flex" }}>
        {/* Left side - Order names column */}
        <Box sx={{ width: 300, flexShrink: 0 }}>
          {filteredOrders.map(item => (
            <Box
              key={`name-${item.order.id}`}
              sx={{
                height: ROW_HEIGHT,
                borderBottom: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                px: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={`${item.order.orderNumber}: ${item.order.description}`}
              >
                {item.order.orderNumber}: {item.order.description}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Right side - Gantt chart */}
        <Box sx={{ overflow: "auto", flexGrow: 1, position: "relative" }}>
          {/* Background grid */}
          <Box
            sx={{
              position: "relative",
              minWidth: chartWidth,
              height: filteredOrders.length * ROW_HEIGHT,
              borderLeft: "1px solid #eee",
            }}
          >
            {/* Vertical date dividers */}
            {dates.map((date, index) => {
              const isWeekend = dayjs(date).day() === 0 || dayjs(date).day() === 6;
              const isToday = dayjs(date).isSame(dayjs(), "day");

              return (
                <Box
                  key={`grid-${index}`}
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: index * dayWidth,
                    width: dayWidth,
                    height: "100%",
                    borderRight: "1px solid #eee",
                    backgroundColor: isWeekend ? "rgba(0,0,0,0.02)" : "transparent",
                    zIndex: 1,
                  }}
                >
                  {isToday && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        width: 2,
                        backgroundColor: "error.main",
                        left: dayWidth / 2 - 1,
                      }}
                    />
                  )}
                </Box>
              );
            })}

            {/* Horizontal row dividers */}
            {filteredOrders.map((_, index) => (
              <Box
                key={`row-divider-${index}`}
                sx={{
                  position: "absolute",
                  top: (index + 1) * ROW_HEIGHT - 1,
                  left: 0,
                  right: 0,
                  height: 1,
                  backgroundColor: "#eee",
                  zIndex: 1,
                }}
              />
            ))}

            {/* Today marker - Moving this to its own section for better visibility */}
            {dates.findIndex(date => dayjs(date).isSame(dayjs(), "day")) >= 0 && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: getBarPosition(new Date()),
                  width: 2,
                  backgroundColor: "#f44336", // error.main color
                  zIndex: 2,
                }}
              />
            )}

            {/* Order bars */}
            {filteredOrders.map((item, index) => {
              // Calculate bar position and size
              const barLeft = getBarPosition(item.order.start.toDate());
              const barWidth = getBarWidth(item.order.start.toDate(), item.order.end.toDate());

              // Only show the bar if it has real width, otherwise just show text
              const hasRealWidth = barWidth > 30;

              return (
                <Box
                  key={`bar-${item.order.id}`}
                  sx={{
                    position: "absolute",
                    top: index * ROW_HEIGHT + 8, // Centered in the row
                    left: hasRealWidth ? barLeft : barLeft,
                    height: ROW_HEIGHT - 16,
                    width: hasRealWidth ? barWidth : "auto",
                    backgroundColor: hasRealWidth
                      ? getStatusColor(item.order.status)
                      : "transparent",
                    borderRadius: 0.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: hasRealWidth ? "white" : getStatusColor(item.order.status),
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    zIndex: 3,
                    px: hasRealWidth ? undefined : 1,
                  }}
                  title={`${item.order.orderNumber}: ${item.order.description} (${formatDate(item.order.start.toDate())} - ${formatDate(item.order.end.toDate())})`}
                >
                  {item.progress}%
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default OrderPlanningGantt;
