// src/components/orders/SimplifiedGanttChart.tsx
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Today as TodayIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import OrderDetailsDialog from "./OrderDetailsDialog";

// Extend dayjs
dayjs.extend(isBetween);

// Define interfaces
interface Order {
  id: string;
  orderNumber: string;
  description: string;
  partNo: string;
  status: string;
  start: Timestamp;
  end: Timestamp;
  priority?: string;
  customer?: string;
}

interface TimeLabel {
  label: string;
  date: Date;
  width: number;
}

// Get status color
const getStatusColor = (status: string): string => {
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

// Get priority color
const getPriorityColor = (priority: string = "Medium"): string => {
  switch (priority) {
    case "Critical":
      return "#e74c3c";
    case "High":
      return "#e67e22";
    case "Medium-High":
      return "#f39c12";
    case "Medium":
      return "#3498db";
    case "Low":
      return "#2ecc71";
    default:
      return "#3498db";
  }
};

// Configuration constants
const DAY_WIDTH_DEFAULT = 30; // pixels per day
const HEADER_HEIGHT = 60;
const ROW_HEIGHT = 40;
const TODAY = new Date();

// View options
type TimeScale = "week" | "month" | "quarter";

const SimplifiedGanttChart: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("Released");
  const [filterPriority, setFilterPriority] = useState<string>(""); // Add state for priority
  const [timeScale, setTimeScale] = useState<TimeScale>("month");
  const [dayWidth, setDayWidth] = useState<number>(DAY_WIDTH_DEFAULT);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState<boolean>(false);

  // Gantt view state
  const [startDate, setStartDate] = useState<Date>(dayjs().subtract(7, "day").toDate());
  const [endDate, setEndDate] = useState<Date>(dayjs().add(60, "day").toDate());

  // Number of days to display
  const daysDiff = dayjs(endDate).diff(dayjs(startDate), "day");

  /*   // Calculate total width of the chart
  const chartWidth = daysDiff * dayWidth; */

  // Calculate time labels using useMemo to improve performance
  const timeLabels = useMemo((): TimeLabel[] => {
    const labels = [];
    let currentDate = dayjs(startDate);
    const endDateTime = dayjs(endDate);

    if (timeScale === "week") {
      // Generate weekly labels
      while (currentDate.isBefore(endDateTime)) {
        const weekStart = currentDate.startOf("week");
        labels.push({
          date: weekStart.toDate(),
          label: `Week ${weekStart.week()}`,
          width: 7 * dayWidth,
        });
        currentDate = currentDate.add(7, "day");
      }
    } else if (timeScale === "month") {
      // Generate monthly labels
      while (currentDate.isBefore(endDateTime)) {
        const monthStart = currentDate.startOf("month");
        const daysInMonth = monthStart.daysInMonth();
        labels.push({
          date: monthStart.toDate(),
          label: monthStart.format("MMM YYYY"),
          width: daysInMonth * dayWidth,
        });
        currentDate = currentDate.add(1, "month");
      }
    } /* else if (timeScale === "quarter") {
      // Generate quarterly labels
      while (currentDate.isBefore(endDateTime)) {
        const quarterStart = currentDate.startOf("quarter");
        const quarterEnd = quarterStart.endOf("quarter");
        const daysInQuarter = quarterEnd.diff(quarterStart, "day") + 1;
        labels.push({
          date: quarterStart.toDate(),
          label: `Q${Math.ceil((quarterStart.month() + 1) / 3)} ${quarterStart.year()}`,
          width: daysInQuarter * dayWidth,
        });
        currentDate = currentDate.add(1, "quarter");
      }
    } */

    return labels;
  }, [timeScale, dayWidth, startDate, endDate]);

  // Calculate chart width
  const chartWidthMemo = useMemo((): number => {
    return timeLabels.reduce((total, label) => total + label.width, 0);
  }, [timeLabels]);

  // Generate dates for the day markers
  const dates = Array.from({ length: daysDiff }, (_, i) => dayjs(startDate).add(i, "day").toDate());

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const queryConstraints: (
          | QueryConstraint
          | QueryOrderByConstraint
          | QueryLimitConstraint
        )[] = [];

        if (filterStatus) {
          queryConstraints.push(where("status", "==", filterStatus));
        }
        if (filterPriority) {
          queryConstraints.push(where("priority", "==", filterPriority));
        }

        queryConstraints.push(orderBy("end", "asc"));
        queryConstraints.push(limit(50));

        const ordersQuery = query(collection(db, "orders"), ...queryConstraints);
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData: Order[] = [];

        ordersSnapshot.forEach(doc => {
          ordersData.push({
            id: doc.id,
            ...doc.data(),
          } as Order);
        });

        setOrders(ordersData);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.message.includes("requires an index")) {
          setError(
            `Query requires a Firestore index. Please check the console for the creation link. Error: ${err.message}`
          );
        } else {
          setError(`Failed to load orders: ${err instanceof Error ? err.message : String(err)}`);
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchOrders();
  }, [filterStatus, filterPriority]); // Removed startDate and endDate

  // Separate effect for updating date range based on orders
  useEffect(() => {
    if (orders.length > 0) {
      let earliestStart = dayjs(startDate);
      let latestEnd = dayjs(endDate);

      orders.forEach(order => {
        const orderStart = dayjs(order.start.toDate());
        const orderEnd = dayjs(order.end.toDate());

        if (orderStart.isBefore(earliestStart)) {
          earliestStart = orderStart;
        }
        if (orderEnd.isAfter(latestEnd)) {
          latestEnd = orderEnd;
        }
      });

      // Add padding to the dates
      setStartDate(earliestStart.subtract(7, "day").toDate());
      setEndDate(latestEnd.add(7, "day").toDate());
    }
  }, [orders]); // Only run when orders change

  // Handle filter change for Status
  const handleStatusFilterChange = (event: SelectChangeEvent<string>) => {
    // Use specific type
    setFilterStatus(event.target.value as string);
  };

  // Handle filter change for Priority
  const handlePriorityFilterChange = (event: SelectChangeEvent<string>) => {
    // Use specific type
    setFilterPriority(event.target.value as string);
  };

  // Handle time scale change
  const handleTimeScaleChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTimeScale: TimeScale
  ) => {
    if (newTimeScale) {
      setTimeScale(newTimeScale);
    }
  };

  // Handle zoom
  const handleZoom = (factor: number): void => {
    setDayWidth(prev => Math.max(20, Math.min(100, prev + factor)));
  };

  // Handle scroll to today
  const scrollToToday = (): void => {
    const todayPosition = getTodayPosition();
    const container = document.querySelector(".gantt-container");
    if (container) {
      container.scrollLeft = todayPosition - container.clientWidth / 2;
    }
  };

  // Get position for today marker
  const getTodayPosition = (): number => {
    const dateObj = dayjs(TODAY);
    const timelineStart = dayjs(startDate);
    const diffDays = dateObj.diff(timelineStart, "day", true);
    return Math.max(0, diffDays * dayWidth);
  };

  // View order details
  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsDialogOpen(true);
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return dayjs(date).format("MMM D, YYYY");
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
    return Math.max(dayWidth, durationDays * dayWidth); // Ensure minimum width for visibility
  };

  // Status options for filter
  const statusOptions = [
    { value: "", label: "All Orders" },
    { value: "Released", label: "Released" },
    { value: "In Progress", label: "In Progress" },
    { value: "Delayed", label: "Delayed" },
    { value: "Done", label: "Done" },
    { value: "Finished", label: "Finished" },
  ];

  /*   // Priority options for filter
  const priorityOptions = [
    { value: "", label: "All Priorities" },
    { value: "Critical", label: "Critical" },
    { value: "High", label: "High" },
    { value: "Medium-High", label: "Medium-High" },
    { value: "Medium", label: "Medium" },
    { value: "Low", label: "Low" },
  ]; */

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
      {/* Controls */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Order Timeline</Typography>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          {/* Status Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              id="status-filter"
              value={filterStatus}
              label="Status"
              onChange={handleStatusFilterChange} // Use specific handler
            >
              {statusOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Priority Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="priority-filter-label">Priority</InputLabel>
            <Select
              labelId="priority-filter-label"
              id="priority-filter"
              value={filterPriority}
              label="Priority"
              onChange={handlePriorityFilterChange} // Use specific handler
            >
              <MenuItem value="">All Priorities</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Medium-High">Medium-High</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
            </Select>
          </FormControl>

          {/* Time Scale Toggle */}
          <ToggleButtonGroup
            value={timeScale}
            exclusive
            onChange={handleTimeScaleChange}
            aria-label="time scale"
            size="small"
          >
            <ToggleButton value="week" aria-label="weekly view">
              Week
            </ToggleButton>
            <ToggleButton value="month" aria-label="monthly view">
              Month
            </ToggleButton>
            <ToggleButton value="quarter" aria-label="quarterly view">
              Quarter
            </ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Zoom In">
              <IconButton onClick={() => handleZoom(5)} size="small">
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <IconButton onClick={() => handleZoom(-5)} size="small">
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Go to Today">
              <IconButton onClick={scrollToToday} size="small">
                <TodayIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Gantt Chart */}
      <Box sx={{ display: "flex", height: "calc(100vh - 300px)", minHeight: "400px" }}>
        {/* Left sidebar with order details */}
        <Box
          sx={{
            width: "250px",
            flexShrink: 0,
            borderRight: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              height: HEADER_HEIGHT,
              display: "flex",
              alignItems: "center",
              pl: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.default",
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold">
              Orders
            </Typography>
          </Box>

          {/* Order list */}
          <Box
            sx={{
              overflowY: "auto",
              height: `calc(100% - ${HEADER_HEIGHT}px)`,
            }}
          >
            {orders.map(order => (
              <Box
                key={order.id}
                sx={{
                  height: ROW_HEIGHT,
                  display: "flex",
                  alignItems: "center",
                  pl: 2,
                  pr: 1,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    overflow: "hidden",
                  }}
                >
                  <Typography variant="body2" noWrap fontWeight="medium">
                    {order.orderNumber}
                  </Typography>
                  <Typography variant="caption" noWrap color="text.secondary">
                    {order.description}
                  </Typography>
                </Box>

                <Tooltip title="View Details">
                  <IconButton
                    size="small"
                    onClick={() => handleViewOrder(order.id)}
                    sx={{ ml: "auto" }}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Timeline area */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: "auto",
            position: "relative",
          }}
        >
          {/* Time scale header */}
          <Box
            sx={{
              height: HEADER_HEIGHT,
              position: "sticky",
              top: 0,
              zIndex: 10,
              backgroundColor: "background.paper",
              borderBottom: "1px solid",
              borderColor: "divider",
              display: "flex",
            }}
          >
            {/* Time labels (months/weeks/quarters) */}
            <Box
              sx={{
                minWidth: chartWidthMemo,
                height: HEADER_HEIGHT,
                position: "relative",
                display: "flex",
              }}
            >
              {timeLabels.map((label, index) => (
                <Box
                  key={index}
                  sx={{
                    width: label.width,
                    height: "100%",
                    position: "relative",
                    borderRight: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    py: 0.5,
                  }}
                >
                  <Typography variant="caption" fontWeight="medium">
                    {label.label}
                  </Typography>

                  {/* For monthly or quarterly view, show day indicators */}
                  {timeScale !== "week" && (
                    <Box
                      sx={{
                        display: "flex",
                        width: "100%",
                        justifyContent: "space-between",
                        px: 1,
                        mt: 1,
                        overflow: "hidden",
                      }}
                    >
                      {/* Only show a few day markers for readability */}
                      {[1, 10, 20].map(day => {
                        // Calculate if this day exists in this month/quarter
                        const dayDate = dayjs(label.date).date(day);
                        if (dayDate.month() === dayjs(label.date).month()) {
                          return (
                            <Typography
                              key={day}
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: "0.7rem" }}
                            >
                              {day}
                            </Typography>
                          );
                        }
                        return null;
                      })}
                    </Box>
                  )}
                </Box>
              ))}

              {/* Today indicator */}
              {dayjs(TODAY).isBetween(dayjs(startDate), dayjs(endDate)) && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: "2px",
                    backgroundColor: "error.main",
                    left: getBarPosition(TODAY),
                    zIndex: 20,
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Orders timeline */}
          <Box
            sx={{
              minWidth: chartWidthMemo,
              position: "relative",
              height: `${orders.length * ROW_HEIGHT}px`,
            }}
          >
            {/* Background grid */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              }}
            >
              {dates.map((date, index) => {
                const isWeekend = dayjs(date).day() === 0 || dayjs(date).day() === 6;
                /* const isToday = dayjs(date).isSame(dayjs(TODAY), "day"); */

                return (
                  <Box
                    key={index}
                    sx={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      width: dayWidth,
                      left: index * dayWidth,
                      backgroundColor: isWeekend ? "action.hover" : "transparent",
                      borderRight: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                );
              })}
            </Box>

            {/* Order bars */}
            {orders.map((order, index) => {
              const startPos = getBarPosition(order.start.toDate());
              const width = getBarWidth(order.start.toDate(), order.end.toDate());
              const orderStartDate = order.start.toDate();
              const orderEndDate = order.end.toDate();

              // Tooltip Content
              const tooltipTitle = (
                <Box sx={{ p: 0.5 }}>
                  <Typography component="div" variant="subtitle2">
                    {order.orderNumber}
                  </Typography>
                  <Typography component="div" variant="caption" display="block">
                    Part: {order.partNo}
                  </Typography>
                  <Typography component="div" variant="caption" display="block">
                    Desc: {order.description}
                  </Typography>
                  <Typography component="div" variant="caption" display="block">
                    Status: {order.status}
                  </Typography>
                  {order.priority && (
                    <Typography component="div" variant="caption" display="block">
                      Priority: {order.priority}
                    </Typography>
                  )}
                  <Typography component="div" variant="caption" display="block">
                    Start: {formatDate(orderStartDate)}
                  </Typography>
                  <Typography component="div" variant="caption" display="block">
                    End: {formatDate(orderEndDate)}
                  </Typography>
                </Box>
              );

              return (
                <Tooltip title={tooltipTitle} key={order.id} placement="top" arrow>
                  <Box
                    // key={order.id} // Key moved to Tooltip
                    sx={{
                      position: "absolute",
                      top: index * ROW_HEIGHT + 5,
                      left: startPos,
                      width: width,
                      height: ROW_HEIGHT - 10,
                      backgroundColor: getStatusColor(order.status),
                      opacity: 0.8,
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: 1,
                      cursor: "pointer",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      "&:hover": {
                        opacity: 1,
                        zIndex: 5,
                      },
                    }}
                    onClick={() => handleViewOrder(order.id)}
                    // title removed, using MUI Tooltip now
                  >
                    {/* Left border with priority color */}
                    <Box
                      sx={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: "4px",
                        backgroundColor: getPriorityColor(order.priority),
                        borderTopLeftRadius: "4px", // Match parent radius
                        borderBottomLeftRadius: "4px", // Match parent radius
                      }}
                    />

                    {/* Only show text if there's enough space */}
                    {width > 80 && (
                      <Typography
                        variant="caption"
                        sx={{
                          ml: 1, // Adjust margin left due to priority border
                          color: "white",
                          fontWeight: "medium",
                          textShadow: "0px 0px 2px rgba(0,0,0,0.5)",
                          pointerEvents: "none", // Prevent text from interfering with Box click
                        }}
                      >
                        {order.orderNumber}
                      </Typography>
                    )}
                  </Box>
                </Tooltip>
              );
            })}

            {/* Today indicator line */}
            {dayjs(TODAY).isBetween(dayjs(startDate), dayjs(endDate)) && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  width: "2px",
                  backgroundColor: "error.main",
                  left: getBarPosition(TODAY),
                }}
              />
            )}
          </Box>
        </Box>
      </Box>
      {/* Order Details Dialog */}
      <OrderDetailsDialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        orderId={selectedOrderId}
      />
    </Paper>
  );
};

export default SimplifiedGanttChart;
