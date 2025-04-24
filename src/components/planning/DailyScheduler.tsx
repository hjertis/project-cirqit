import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Today as TodayIcon,
} from "@mui/icons-material";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isoWeek from "dayjs/plugin/isoWeek";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { getResources, Resource } from "../../services/resourceService";
import useOrders, { FirebaseOrder, OrderFilter } from "../../hooks/useOrders";

dayjs.extend(isBetween);
dayjs.extend(isoWeek);

const HOURS_PER_DAY = 7.4;
const RESOURCE_HEADER_WIDTH = 150;

interface SchedulerOrder extends FirebaseOrder {
  assignedResourceId: string;
  plannedWeekStartDate: string;
  estimatedHours?: number;
}

const calculateEndDate = (startDate: Date, estimatedHours: number): Date => {
  let remainingHours = estimatedHours;
  let currentDate = dayjs(startDate);
  const workHoursPerDay = HOURS_PER_DAY;

  while (remainingHours > 0) {
    const dayOfWeek = currentDate.day();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const hoursToWorkToday = Math.min(remainingHours, workHoursPerDay);
      remainingHours -= hoursToWorkToday;
      if (remainingHours <= 0) {
        const endOfDay = dayjs(currentDate).add(hoursToWorkToday, "hour");
        return endOfDay.toDate();
      }
    }
    currentDate = currentDate.add(1, "day");
    if (currentDate.diff(startDate, "year") > 5) {
      console.error("calculateEndDate exceeded safety limit");
      break;
    }
  }
  return currentDate.startOf("day").toDate();
};

const DailyScheduler: React.FC = () => {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(dayjs().startOf("week").toDate());
  const [viewType, setViewType] = useState<"week" | "month">("week");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [schedulerOrders, setSchedulerOrders] = useState<SchedulerOrder[]>([]);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>({
    status: ["Open", "Released", "In Progress", "Delayed", "Firm Planned"],
  });
  const {
    orders: fetchedOrders,
    loading: loadingOrders,
    error: errorOrders,
    refreshOrders,
  } = useOrders(orderFilter, 1000);

  const error = errorOrders || null;
  const loading = loadingResources || loadingOrders;

  const calendarDates = useMemo(() => {
    const dates: Date[] = [];
    const start = dayjs(currentDate).startOf("isoWeek");
    const range = viewType === "week" ? 7 : start.daysInMonth();
    for (let i = 0; i < range; i++) {
      dates.push(start.add(i, "day").toDate());
    }
    return dates;
  }, [currentDate, viewType]);

  useEffect(() => {
    const fetchResourcesData = async () => {
      setLoadingResources(true);
      try {
        const activeResources = await getResources(true);
        setResources(activeResources);
      } catch (err) {
        console.error("Error fetching resources:", err);
      } finally {
        setLoadingResources(false);
      }
    };
    fetchResourcesData();
  }, []);

  useEffect(() => {
    try {
      const processedOrders = fetchedOrders.map(order => {
        let estimatedHours = 8;
        if (order.estimatedHours) {
          estimatedHours = order.estimatedHours;
        } else if (order.start && order.end) {
          let workDays = 0;
          const startDate = order.start?.toDate ? order.start.toDate() : null;
          const endDate = order.end?.toDate ? order.end.toDate() : null;

          if (startDate && endDate) {
            let current = dayjs(startDate);
            const end = dayjs(endDate);
            while (current.isBefore(end) || current.isSame(end, "day")) {
              const dayOfWeek = current.day();
              if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                workDays++;
              }
              current = current.add(1, "day");
            }
            estimatedHours = Math.max(workDays, 1) * HOURS_PER_DAY;
            estimatedHours = Math.round(estimatedHours);
          } else {
            console.warn(`Order ${order.id} has invalid start/end Timestamps for calculation.`);
          }
        } else if (order.quantity) {
          estimatedHours = Math.max(order.quantity, 1) * 2;
        }

        return {
          ...order,
          estimatedHours: estimatedHours,
          start: order.start || null,
          end: order.end || null,
        };
      });

      setSchedulerOrders(processedOrders);
    } catch (processingError) {
      console.error("Error processing fetched orders:", processingError);
    }
  }, [fetchedOrders]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId: orderId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index)
      return;

    const [resourceId, dateString] = destination.droppableId.split("|");

    const currentSchedulerOrders = [...schedulerOrders];
    const order = currentSchedulerOrders.find(o => o.id === orderId);

    if (!order) {
      console.error("Order NOT FOUND in state snapshot!");
    }

    if (
      order.estimatedHours === undefined ||
      order.estimatedHours === null ||
      order.estimatedHours <= 0
    ) {
      console.error("Order found, but missing valid estimated hours:", orderId, order);
      return;
    }
    const newStartDate = dayjs(dateString).hour(8).minute(0).second(0).toDate();
    const newEndDate = calculateEndDate(newStartDate, order.estimatedHours);
    const newPlannedWeekStartDate = dayjs(newStartDate).startOf("isoWeek").format("YYYY-MM-DD");

    const originalOrders = [...schedulerOrders];
    setSchedulerOrders(prevOrders =>
      prevOrders.map(o =>
        o.id === orderId
          ? {
              ...o,
              assignedResourceId: resourceId,
              start: Timestamp.fromDate(newStartDate),
              end: Timestamp.fromDate(newEndDate),
              plannedWeekStartDate: newPlannedWeekStartDate,
            }
          : o
      )
    );

    try {
      await updateDoc(doc(db, "orders", orderId), {
        assignedResourceId: resourceId,
        start: Timestamp.fromDate(newStartDate),
        end: Timestamp.fromDate(newEndDate),
        plannedWeekStartDate: newPlannedWeekStartDate,
        updated: Timestamp.now(),
      });
    } catch (err) {
      console.error("Failed to update schedule:", err);
      setSchedulerOrders(originalOrders);
    }
  };

  // Navigation Handlers
  const handlePrev = () => {
    setCurrentDate(dayjs(currentDate).subtract(1, viewType).toDate());
  };
  const handleNext = () => {
    setCurrentDate(dayjs(currentDate).add(1, viewType).toDate());
  };
  const handleToday = () => {
    setCurrentDate(dayjs().startOf(viewType).toDate());
  };

  // --- Render Logic ---
  if (loading) {
    // ... (loading spinner) ...
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    // ... (error alert) ...
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Box sx={{ p: 2 }}>
        {/* Header with Navigation */}
        {/* ... (keep the header Box as provided before) ... */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">Daily Scheduler</Typography>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton onClick={handlePrev} aria-label={`Previous ${viewType}`} size="small">
              <PrevIcon />
            </IconButton>
            <Typography
              variant="subtitle1"
              component="span"
              sx={{ mx: 2, textAlign: "center", minWidth: "150px" }}
            >
              {viewType === "week" && calendarDates.length >= 7
                ? `${dayjs(calendarDates[0]).format("MMM D")} - ${dayjs(calendarDates[6]).format("MMM D, YYYY")}`
                : dayjs(currentDate).format("MMMM YYYY")}
            </Typography>
            <IconButton onClick={handleNext} aria-label={`Next ${viewType}`} size="small">
              <NextIcon />
            </IconButton>
            <Tooltip title={`Go to current ${viewType}`}>
              <IconButton
                onClick={handleToday}
                aria-label="Go to Today"
                size="small"
                sx={{ ml: 1 }}
              >
                <TodayIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Main Grid */}
        <Paper sx={{ overflowX: "auto", border: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: "flex" }}>
            {/* Resource Header Column */}
            {/* ... (keep the resource header Box as provided before) ... */}
            <Box
              sx={{
                width: RESOURCE_HEADER_WIDTH,
                flexShrink: 0,
                borderRight: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Box
                sx={{
                  height: 50,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  backgroundColor: "background.default",
                }}
              >
                <Typography variant="subtitle2">Resource</Typography>
              </Box>
              {resources.map(resource => (
                <Box
                  key={resource.id}
                  sx={{
                    height: 100,
                    p: 1,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: "background.paper",
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {resource.name}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Grid Content */}
            <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
              {/* Date Header Row */}
              {/* ... (keep the date header Box as provided before) ... */}
              <Box
                sx={{
                  display: "flex",
                  height: 50,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  backgroundColor: "background.default",
                }}
              >
                {calendarDates.map(date => (
                  <Box
                    key={date.toISOString()}
                    sx={{
                      flexGrow: 1,
                      flexBasis: 0,
                      minWidth: 100,
                      borderRight: `1px solid ${theme.palette.divider}`,
                      p: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: dayjs(date).isSame(dayjs(), "day")
                        ? theme.palette.action.hover
                        : "inherit",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {dayjs(date).format("ddd")}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {dayjs(date).format("D")}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Resource Rows */}
              {resources.map(resource => (
                <Box
                  key={resource.id}
                  sx={{ display: "flex", borderBottom: `1px solid ${theme.palette.divider}` }}
                >
                  {/* Cells */}
                  {calendarDates.map(date => {
                    const dateString = dayjs(date).format("YYYY-MM-DD");
                    const droppableId = `${resource.id}|${dateString}`;
                    const cellOrders = schedulerOrders.filter(
                      o =>
                        o.assignedResourceId === resource.id &&
                        o.plannedWeekStartDate ===
                          dayjs(date).startOf("isoWeek").format("YYYY-MM-DD")
                    );

                    return (
                      <Droppable droppableId={droppableId} key={droppableId}>
                        {(provided, snapshot) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            sx={{
                              flexGrow: 1,
                              flexBasis: 0,
                              minWidth: 100,
                              minHeight: 100,
                              borderRight: `1px solid ${theme.palette.divider}`,
                              p: 0.5,
                              backgroundColor: snapshot.isDraggingOver
                                ? theme.palette.action.focus
                                : dayjs(date).isSame(dayjs(), "day")
                                  ? theme.palette.action.hover
                                  : "background.paper",
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.5,
                              overflowY: "auto",
                            }}
                          >
                            {/* Render cellOrders as Draggables */}
                            {cellOrders.map((order, index) => (
                              <Draggable draggableId={order.id} index={index} key={order.id}>
                                {(providedDraggable, snapshotDraggable) => (
                                  <Paper
                                    ref={providedDraggable.innerRef}
                                    {...providedDraggable.draggableProps}
                                    {...providedDraggable.dragHandleProps}
                                    elevation={snapshotDraggable.isDragging ? 3 : 1}
                                    sx={{
                                      p: 0.5,
                                      fontSize: "0.7rem",
                                      opacity: snapshotDraggable.isDragging ? 0.8 : 1,
                                      cursor: "grab",
                                      overflow: "hidden",
                                    }}
                                    title={`${order.orderNumber}: ${order.description}`}
                                  >
                                    <Typography
                                      variant="caption"
                                      component="div"
                                      fontWeight="medium"
                                      noWrap
                                    >
                                      {order.orderNumber} ({order.estimatedHours}h)
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      component="div"
                                      noWrap
                                      color="text.secondary"
                                    >
                                      {order.description}
                                    </Typography>
                                  </Paper>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </Box>
                        )}
                      </Droppable>
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
      </Box>
    </DragDropContext>
  );
}; // <-- This is the single, correct closing brace for the component

export default DailyScheduler;
