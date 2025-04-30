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

dayjs.extend(isBetween);
dayjs.extend(weekOfYear);

type Resource = ResourceType;

interface Order {
  id: string;
  orderNumber: string;
  description: string;
  status: string;
  start: Timestamp;
  end: Timestamp;
  priority?: string;
  assignedResourceId?: string;
}

interface CalendarViewProps {
  defaultView?: "week" | "month";
  defaultDate?: Date;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case "Open":
    case "Released":
      return "#3f51b5";
    case "In Progress":
      return "#19857b";
    case "Done":
    case "Finished":
      return "#4caf50";
    case "Delayed":
      return "#f44336";
    default:
      return "#9e9e9e";
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

  const [cellHeight, setCellHeight] = useState(100);
  const [cellWidth, setCellWidth] = useState(223);
  const [resourceFilter, setResourceFilter] = useState<string | null>(null);

  const calendarDates = useMemo(() => {
    const dates: Date[] = [];

    if (viewType === "week") {
      const startOfWeek = dayjs(currentDate).startOf("week");

      for (let i = 0; i < 7; i++) {
        dates.push(startOfWeek.add(i, "day").toDate());
      }
    } else if (viewType === "month") {
      const startOfMonth = dayjs(currentDate).startOf("month");
      const daysInMonth = startOfMonth.daysInMonth();

      for (let i = 0; i < daysInMonth; i++) {
        dates.push(startOfMonth.add(i, "day").toDate());
      }
    }

    return dates;
  }, [currentDate, viewType]);

  useEffect(() => {
    const fetchResourcesAndOrders = async () => {
      setLoading(true);
      try {
        const fetchedResources = await getResources(true);
        setResources(fetchedResources);

        const startDate = dayjs(calendarDates[0]).startOf("day");
        const endDate = dayjs(calendarDates[calendarDates.length - 1]).endOf("day");

        const ordersQuery = query(
          collection(db, "orders"),
          where("status", "in", ["Open", "Released", "In Progress", "Delayed"]),
          orderBy("start", "asc")
        );

        const querySnapshot = await getDocs(ordersQuery);
        const fetchedOrders: Order[] = [];

        querySnapshot.forEach(doc => {
          const data = doc.data();

          const orderStart = dayjs(data.start.toDate());
          const orderEnd = dayjs(data.end.toDate());

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

  const handleViewTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewType: "week" | "month" | null
  ) => {
    if (newViewType !== null) {
      setViewType(newViewType);
    }
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const handlePrevious = () => {
    if (viewType === "week") {
      setCurrentDate(dayjs(currentDate).subtract(1, "week").toDate());
    } else {
      setCurrentDate(dayjs(currentDate).subtract(1, "month").toDate());
    }
  };

  const handleNext = () => {
    if (viewType === "week") {
      setCurrentDate(dayjs(currentDate).add(1, "week").toDate());
    } else {
      setCurrentDate(dayjs(currentDate).add(1, "month").toDate());
    }
  };

  const handleZoomIn = () => {
    setCellHeight(prev => Math.min(prev + 20, 200));
    setCellWidth(prev => Math.min(prev + 30, 300));
  };

  const handleZoomOut = () => {
    setCellHeight(prev => Math.max(prev - 20, 60));
    setCellWidth(prev => Math.max(prev - 30, 90));
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsDialogOpen(true);
  };

  const formatDate = (date: Date): string => {
    return dayjs(date).format("ddd, MMM D");
  };

  const isToday = (date: Date): boolean => {
    return dayjs(date).isSame(dayjs(), "day");
  };

  const isWeekend = (date: Date): boolean => {
    const day = dayjs(date).day();
    return day === 0 || day === 6;
  };

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (
      !destination ||
      (destination.droppableId === source.droppableId && destination.index === source.index)
    ) {
      return;
    }

    const orderToUpdate = orders.find(order => order.id === draggableId);
    if (!orderToUpdate) return;

    const [resourceId, dateString] = destination.droppableId.split("_");
    const targetDate = new Date(dateString);

    try {
      const orderRef = doc(db, "orders", orderToUpdate.id);

      const originalDuration = dayjs(orderToUpdate.end.toDate()).diff(
        dayjs(orderToUpdate.start.toDate()),
        "day"
      );
      const newStartDate = dayjs(targetDate);
      const newEndDate = newStartDate.add(originalDuration, "day");

      await updateDoc(orderRef, {
        assignedResourceId: resourceId,
        start: Timestamp.fromDate(newStartDate.toDate()),
        end: Timestamp.fromDate(newEndDate.toDate()),
        updated: Timestamp.fromDate(new Date()),
      });

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

  return (
    <Box>
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

      <Paper sx={{ overflowX: "auto" }}>
        <Box sx={{ display: "flex", minWidth: cellWidth * calendarDates.length + 200 }}>
          <Box sx={{ width: 200, flexShrink: 0 }}>
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

          <Box sx={{ flexGrow: 1 }}>
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

            {resources.map(resource => (
              <Box
                key={resource.id}
                sx={{
                  display: "flex",
                  minHeight: cellHeight,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                {calendarDates.map((date, dateIndex) => {
                  const cellOrders = orders.filter(order => {
                    if (order.assignedResourceId !== resource.id) return false;
                    const orderStart = dayjs(order.start.toDate());
                    const orderEnd = dayjs(order.end.toDate());

                    return dayjs(date).isBetween(
                      orderStart.subtract(1, "day"),
                      orderEnd.add(1, "day"),
                      "day",
                      "()"
                    );
                  });

                  return (
                    <Box
                      key={`${resource.id}_${date.toISOString()}`}
                      sx={{
                        width: cellWidth,
                        minHeight: cellHeight,
                        borderBottom: 1,
                        borderRight: 1,
                        borderColor: "divider",
                        backgroundColor: isToday(date)
                          ? theme.palette.action.hover
                          : isWeekend(date)
                            ? theme.palette.action.disabledBackground
                            : "background.paper",
                        p: 0.5,
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                        overflowY: "auto",
                      }}
                    >
                      {cellOrders.map(order => (
                        <Paper
                          key={order.id}
                          elevation={1}
                          sx={{
                            p: 0.5,
                            fontSize: "0.7rem",
                            backgroundColor: getStatusColor(order.status),
                            color: theme.palette.getContrastText(getStatusColor(order.status)),
                            borderLeft: `3px solid ${getPriorityColor(order.priority)}`,
                            cursor: "pointer",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            "&:hover": {
                              opacity: 0.9,
                              boxShadow: 2,
                            },
                          }}
                          onClick={() => handleViewOrder(order.id)}
                          title={`${order.orderNumber}: ${order.description}`}
                        >
                          <Typography variant="caption" component="div" fontWeight="bold" noWrap>
                            {order.orderNumber}
                          </Typography>
                          <Typography variant="caption" component="div" noWrap>
                            {order.description}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      <OrderDetailsDialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        orderId={selectedOrderId}
      />
    </Box>
  );
};

export default ResourceCalendarView;
