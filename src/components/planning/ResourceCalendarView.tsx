// src/components/planning/ResourceCalendarView.tsx
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Button,
  Menu,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  useTheme,
} from "@mui/material";
import {
  ViewWeek as ViewWeekIcon,
  ViewModule as ViewMonthIcon,
  Today as TodayIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FilterList as FilterListIcon,
  Person as PersonIcon,
  Build as BuildIcon,
} from "@mui/icons-material";
import {
  collection,
  query,
  getDocs,
  where,
  orderBy,
  Timestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { getResources, Resource as ResourceType } from "../../services/resourceService";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import weekOfYear from "dayjs/plugin/weekOfYear";
import OrderDetailsDialog from "../orders/OrderDetailsDialog";

// Extend dayjs
dayjs.extend(isBetween);
dayjs.extend(weekOfYear);

// Use the Resource type from the resource service
type Resource = ResourceType;

interface Order {
  id: string;
  orderNumber: string;
  description: string;
  status: string;
  start: Timestamp;
  end: Timestamp;
  priority?: string;
  assignedResourceId?: string; // ID of the assigned resource
}

interface CalendarViewProps {
  defaultView?: "week" | "month";
  defaultDate?: Date;
}

// Helper functions
const getStatusColor = (status: string): string => {
  switch (status) {
    case "Open":
    case "Released":
      return "#3f51b5"; // primary
    case "In Progress":
      return "#19857b"; // secondary
    case "Done":
    case "Finished":
      return "#4caf50"; // success
    case "Delayed":
      return "#f44336"; // error
    default:
      return "#9e9e9e"; // default
  }
};

const getPriorityColor = (priority: string = "Medium"): string => {
  switch (priority) {
    case "Critical":
      return "#e74c3c";
    case "High":
      return "#e67e22";
    case "Medium":
      return "#3498db";
    case "Low":
      return "#2ecc71";
    default:
      return "#3498db";
  }
};

const ResourceCalendarView = ({
  defaultView = "week",
  defaultDate = new Date(),
}: CalendarViewProps) => {
  const theme = useTheme();
  const [viewType, setViewType] = useState<"week" | "month">(defaultView);
  const [currentDate, setCurrentDate] = useState<Date>(defaultDate);
  const [resources, setResources] = useState<Resource[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // View configuration
  const [cellHeight, setCellHeight] = useState(100); // Height of a calendar cell in pixels
  const [cellWidth, setCellWidth] = useState(150); // Width of a calendar cell in pixels
  const [resourceFilter, setResourceFilter] = useState<string | null>(null);

  // Compute calendar dates based on view and current date
  const calendarDates = useMemo(() => {
    const dates: Date[] = [];

    if (viewType === "week") {
      // Get the start of the week (Sunday)
      const startOfWeek = dayjs(currentDate).startOf("week");

      // Create an array of dates for the week
      for (let i = 0; i < 7; i++) {
        dates.push(startOfWeek.add(i, "day").toDate());
      }
    } else if (viewType === "month") {
      // Get the start of the month
      const startOfMonth = dayjs(currentDate).startOf("month");
      const daysInMonth = startOfMonth.daysInMonth();

      // Create an array of dates for the month
      for (let i = 0; i < daysInMonth; i++) {
        dates.push(startOfMonth.add(i, "day").toDate());
      }
    }

    return dates;
  }, [currentDate, viewType]);

  // Fetch resources and orders
  useEffect(() => {
    const fetchResourcesAndOrders = async () => {
      setLoading(true);
      try {
        // Fetch resources from your database
        const fetchedResources = await getResources(true); // true to get only active resources
        setResources(fetchedResources);

        // Determine date range for orders
        const startDate = dayjs(calendarDates[0]).startOf("day");
        const endDate = dayjs(calendarDates[calendarDates.length - 1]).endOf("day");

        // Fetch orders within the date range
        const ordersQuery = query(
          collection(db, "orders"),
          where("status", "in", ["Open", "Released", "In Progress", "Delayed"]),
          orderBy("start", "asc")
        );

        const querySnapshot = await getDocs(ordersQuery);
        const fetchedOrders: Order[] = [];

        querySnapshot.forEach(doc => {
          const data = doc.data();
          // Filter orders that overlap with the calendar view
          const orderStart = dayjs(data.start.toDate());
          const orderEnd = dayjs(data.end.toDate());

          // Check if the order overlaps with our calendar range
          if (
            (orderStart.isBefore(endDate) && orderEnd.isAfter(startDate)) ||
            orderStart.isSame(startDate) ||
            orderEnd.isSame(endDate)
          ) {
            fetchedOrders.push({
              id: doc.id,
              orderNumber: data.orderNumber,
              description: data.description,
              status: data.status,
              start: data.start,
              end: data.end,
              priority: data.priority,
              assignedResourceId: data.assignedResourceId || null,
            });
          }
        });

        setOrders(fetchedOrders);
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(`Failed to load data: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchResourcesAndOrders();
  }, [calendarDates]);

  // Handle view type change
  const handleViewTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewType: "week" | "month" | null
  ) => {
    if (newViewType !== null) {
      setViewType(newViewType);
    }
  };

  // Go to today
  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  // Go to previous week/month
  const handlePrevious = () => {
    if (viewType === "week") {
      setCurrentDate(dayjs(currentDate).subtract(1, "week").toDate());
    } else {
      setCurrentDate(dayjs(currentDate).subtract(1, "month").toDate());
    }
  };

  // Go to next week/month
  const handleNext = () => {
    if (viewType === "week") {
      setCurrentDate(dayjs(currentDate).add(1, "week").toDate());
    } else {
      setCurrentDate(dayjs(currentDate).add(1, "month").toDate());
    }
  };

  // Handle zoom in (increase cell size)
  const handleZoomIn = () => {
    setCellHeight(prev => Math.min(prev + 20, 200));
    setCellWidth(prev => Math.min(prev + 30, 300));
  };

  // Handle zoom out (decrease cell size)
  const handleZoomOut = () => {
    setCellHeight(prev => Math.max(prev - 20, 60));
    setCellWidth(prev => Math.max(prev - 30, 90));
  };

  // Handle opening order details
  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsDialogOpen(true);
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return dayjs(date).format("ddd, MMM D");
  };

  // Check if a date is today
  const isToday = (date: Date): boolean => {
    return dayjs(date).isSame(dayjs(), "day");
  };

  // Check if a date is a weekend
  const isWeekend = (date: Date): boolean => {
    const day = dayjs(date).day();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  // Determine position of an order in the calendar grid
  const getOrderPosition = (order: Order, resourceId: string): any => {
    // Check if the order is assigned to this resource
    if (order.assignedResourceId !== resourceId) {
      return null;
    }

    // Calculate which days the order spans
    const orderStart = dayjs(order.start.toDate());
    const orderEnd = dayjs(order.end.toDate());

    // Check where the order should be positioned in our current view
    const startIndex = calendarDates.findIndex(
      date => dayjs(date).isSame(orderStart, "day") || dayjs(date).isAfter(orderStart)
    );

    const endIndex = calendarDates.findIndex(
      date => dayjs(date).isSame(orderEnd, "day") || dayjs(date).isAfter(orderEnd)
    );

    // If the order doesn't fit in our current view, we need to adjust
    const adjustedStartIndex = startIndex === -1 ? 0 : startIndex;
    const adjustedEndIndex = endIndex === -1 ? calendarDates.length - 1 : endIndex;

    // Calculate span based on the indexes
    const span = adjustedEndIndex - adjustedStartIndex + 1;

    return {
      startIndex: adjustedStartIndex,
      span: span,
    };
  };

  // Handle drag end for order reassignment
  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    // If dropped outside a droppable area or same position
    if (
      !destination ||
      (destination.droppableId === source.droppableId && destination.index === source.index)
    ) {
      return;
    }

    const orderToUpdate = orders.find(order => order.id === draggableId);
    if (!orderToUpdate) return;

    // Parse the destination droppable ID to get resourceId and date
    const [resourceId, dateString] = destination.droppableId.split("_");
    const targetDate = new Date(dateString);

    try {
      // Prepare update data
      const orderRef = doc(db, "orders", orderToUpdate.id);

      // Calculate new start and end dates based on the drop target
      const originalDuration = dayjs(orderToUpdate.end.toDate()).diff(
        dayjs(orderToUpdate.start.toDate()),
        "day"
      );
      const newStartDate = dayjs(targetDate);
      const newEndDate = newStartDate.add(originalDuration, "day");

      // Update in Firestore
      await updateDoc(orderRef, {
        assignedResourceId: resourceId,
        start: Timestamp.fromDate(newStartDate.toDate()),
        end: Timestamp.fromDate(newEndDate.toDate()),
        updated: Timestamp.fromDate(new Date()),
      });

      // Update local state
      setOrders(prev =>
        prev.map(order =>
          order.id === orderToUpdate.id
            ? {
                ...order,
                assignedResourceId: resourceId,
                start: Timestamp.fromDate(newStartDate.toDate()),
                end: Timestamp.fromDate(newEndDate.toDate()),
              }
            : order
        )
      );

      setUpdateSuccess(`Order ${orderToUpdate.orderNumber} successfully reassigned`);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(null);
      }, 3000);
    } catch (err) {
      console.error("Error updating order:", err);
      setError(`Failed to update order: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Create a simplified calendar view without drag and drop for now
  return (
    <Box>
      {/* Calendar Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <ToggleButtonGroup
              value={viewType}
              exclusive
              onChange={handleViewTypeChange}
              aria-label="view type"
              size="small"
            >
              <ToggleButton value="week" aria-label="week view">
                <ViewWeekIcon sx={{ mr: 1 }} /> Week
              </ToggleButton>
              <ToggleButton value="month" aria-label="month view">
                <ViewMonthIcon sx={{ mr: 1 }} /> Month
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item>
            <Button variant="outlined" onClick={handlePrevious} size="small">
              Previous
            </Button>
          </Grid>

          <Grid item>
            <Button variant="contained" onClick={handleGoToToday} startIcon={<TodayIcon />}>
              Today
            </Button>
          </Grid>

          <Grid item>
            <Button variant="outlined" onClick={handleNext} size="small">
              Next
            </Button>
          </Grid>

          <Grid item sx={{ ml: 2 }}>
            <Typography variant="h6">
              {viewType === "week"
                ? `Week of ${dayjs(calendarDates[0]).format("MMM D, YYYY")}`
                : dayjs(currentDate).format("MMMM YYYY")}
            </Typography>
          </Grid>

          <Grid item sx={{ ml: "auto" }}>
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
            <Tooltip title="Filter Resources">
              <IconButton size="small">
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {updateSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {updateSuccess}
        </Alert>
      )}

      {/* Simplified Calendar Grid */}
      <Paper sx={{ overflowX: "auto" }}>
        <Box sx={{ display: "flex", minWidth: cellWidth * calendarDates.length + 200 }}>
          {/* Resource Column */}
          <Box sx={{ width: 200, flexShrink: 0 }}>
            {/* Header cell */}
            <Box
              sx={{
                height: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderBottom: 1,
                borderRight: 1,
                borderColor: "divider",
                backgroundColor: "background.default",
                p: 1,
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Resources
              </Typography>
            </Box>

            {/* Resource rows */}
            {resources.map(resource => (
              <Box
                key={resource.id}
                sx={{
                  height: cellHeight,
                  display: "flex",
                  alignItems: "center",
                  borderBottom: 1,
                  borderRight: 1,
                  borderColor: "divider",
                  p: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {resource.type === "person" ? (
                    <PersonIcon sx={{ mr: 1, color: resource.color }} />
                  ) : (
                    <BuildIcon sx={{ mr: 1, color: resource.color }} />
                  )}
                  <Typography variant="body2" noWrap>
                    {resource.name}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Calendar Cells */}
          <Box sx={{ flexGrow: 1, position: "relative" }}>
            {/* Date headers */}
            <Box sx={{ display: "flex", height: 60 }}>
              {calendarDates.map((date, index) => (
                <Box
                  key={index}
                  sx={{
                    width: cellWidth,
                    borderBottom: 1,
                    borderRight: 1,
                    borderColor: "divider",
                    backgroundColor: isToday(date)
                      ? "primary.lighter"
                      : isWeekend(date)
                        ? "action.hover"
                        : "background.default",
                    p: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={isToday(date) ? "bold" : "normal"}
                    color={isToday(date) ? "primary.main" : "text.primary"}
                  >
                    {dayjs(date).format("ddd")}
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight={isToday(date) ? "bold" : "normal"}
                    color={isToday(date) ? "primary.main" : "text.primary"}
                  >
                    {dayjs(date).format("MMM D")}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Resource rows with cells */}
            {resources.map(resource => (
              <Box
                key={resource.id}
                sx={{
                  display: "flex",
                  height: cellHeight,
                  position: "relative",
                }}
              >
                {calendarDates.map((date, dateIndex) => (
                  <Box
                    key={`${resource.id}_${date.toISOString()}`}
                    sx={{
                      width: cellWidth,
                      height: "100%",
                      borderBottom: 1,
                      borderRight: 1,
                      borderColor: "divider",
                      backgroundColor: isToday(date)
                        ? "primary.lighter"
                        : isWeekend(date)
                          ? "action.hover"
                          : "background.paper",
                      p: 0.5,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  />
                ))}
              </Box>
            ))}

            {/* Overlay the orders on the grid */}
            {orders.map(order =>
              resources.map(resource => {
                const position = getOrderPosition(order, resource.id);
                if (!position) return null;

                const resourceIndex = resources.findIndex(r => r.id === resource.id);
                const topPosition = 60 + resourceIndex * cellHeight; // 60px for header
                const leftPosition = position.startIndex * cellWidth;
                const width = position.span * cellWidth - 5; // 5px for padding

                return (
                  <Box
                    key={`order-${order.id}-${resource.id}`}
                    sx={{
                      position: "absolute",
                      top: topPosition + 5, // 5px padding
                      left: leftPosition + 5, // 5px padding
                      width: width,
                      height: cellHeight - 10, // 10px for padding
                      backgroundColor: getStatusColor(order.status),
                      color: "white",
                      borderRadius: 1,
                      p: 1,
                      boxShadow: 1,
                      opacity: 0.8,
                      overflow: "hidden",
                      cursor: "pointer",
                      borderLeft: `4px solid ${getPriorityColor(order.priority)}`,
                      "&:hover": {
                        opacity: 1,
                        boxShadow: 3,
                      },
                      zIndex: 1,
                    }}
                    onClick={() => handleViewOrder(order.id)}
                  >
                    <Typography variant="body2" fontWeight="bold" noWrap>
                      {order.orderNumber}
                    </Typography>
                    <Typography variant="caption" noWrap>
                      {order.description}
                    </Typography>
                    <Chip
                      label={order.status}
                      size="small"
                      sx={{
                        position: "absolute",
                        bottom: 5,
                        right: 5,
                        backgroundColor: "rgba(255,255,255,0.3)",
                        height: 18,
                        fontSize: "0.6rem",
                      }}
                    />
                  </Box>
                );
              })
            )}
          </Box>
        </Box>
      </Paper>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        orderId={selectedOrderId}
      />
    </Box>
  );
};

export default ResourceCalendarView;
