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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Today as TodayIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
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
  const [currentDate, setCurrentDate] = useState(dayjs().startOf("isoWeek").toDate());
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
    for (let i = 0; i < 7; i++) {
      const date = start.add(i, "day");
      const dayOfWeek = date.day();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // 0 = Sunday, 6 = Saturday
        dates.push(date.toDate());
      }
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
    setCurrentDate(
      dayjs()
        .startOf(viewType === "week" ? "isoWeek" : viewType)
        .toDate()
    );
  };

  // --- Dialog Logic ---
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [orderToMove, setOrderToMove] = useState<SchedulerOrder | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null);

  const handleOpenMoveDialog = (order: SchedulerOrder) => {
    setOrderToMove(order);
    setSelectedWeek(
      order.start ? dayjs(order.start.toDate()).startOf("isoWeek").toDate() : new Date()
    );
    setMoveDialogOpen(true);
  };

  const handleCloseMoveDialog = () => {
    setMoveDialogOpen(false);
    setOrderToMove(null);
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
    <React.Fragment>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ p: 2 }}>
          {/* Header with Navigation */}
          {/* ... (keep the header Box as provided before) ... */}
          <Box
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
          >
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
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: `${RESOURCE_HEADER_WIDTH}px repeat(${calendarDates.length}, 1fr)`,
              }}
            >
              {/* Header Row */}
              <Box
                sx={{
                  height: 50,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  backgroundColor: "background.default",
                  fontWeight: "bold",
                }}
              >
                Resource
              </Box>
              {calendarDates.map(date => (
                <Box
                  key={date.toISOString()}
                  sx={{
                    height: 50,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    borderRight: `1px solid ${theme.palette.divider}`,
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

              {/* Resource Rows */}
              {resources.map(resource => (
                <React.Fragment key={resource.id}>
                  {/* Resource Name Cell */}
                  <Box
                    sx={{
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      display: "flex",
                      alignItems: "center",
                      backgroundColor: "background.paper",
                      p: 1,
                      minHeight: 100,
                    }}
                  >
                    <Typography variant="body2" fontWeight="medium">
                      {resource.name}
                    </Typography>
                  </Box>
                  {/* Calendar Cells */}
                  {calendarDates.map(date => {
                    const dateString = dayjs(date).format("YYYY-MM-DD");
                    const droppableId = `${resource.id}|${dateString}`;
                    const cellOrders = schedulerOrders.filter(
                      o =>
                        o.assignedResourceId === resource.id &&
                        o.start &&
                        o.end &&
                        dayjs(date).isBetween(
                          dayjs(o.start.toDate()),
                          dayjs(o.end.toDate()),
                          "day",
                          "[]"
                        )
                    );
                    return (
                      <Droppable droppableId={droppableId} key={droppableId}>
                        {(provided, snapshot) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            sx={{
                              borderBottom: `1px solid ${theme.palette.divider}`,
                              borderRight: `1px solid ${theme.palette.divider}`,
                              minHeight: 100,
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
                                      borderLeft: `4px solid ${theme.palette.primary.main}`, // <-- Add this line for blue border
                                      "&:hover": { boxShadow: 3 }, // Optional: Add hover effect if desired
                                    }}
                                    title={`${order.orderNumber}: ${order.description}`}
                                  >
                                    <IconButton
                                      size="small"
                                      onClick={() => handleOpenMoveDialog(order)}
                                      sx={{ ml: 1 }}
                                    >
                                      <TodayIcon fontSize="inherit" />
                                    </IconButton>
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
                </React.Fragment>
              ))}
            </Box>
          </Paper>
        </Box>
      </DragDropContext>
      <Dialog open={moveDialogOpen} onClose={handleCloseMoveDialog}>
        <DialogTitle>Move Order to Another Week</DialogTitle>
        <DialogContent>
          <DatePicker
            label="Select week"
            value={selectedWeek ? dayjs(selectedWeek) : null}
            onChange={date => setSelectedWeek(dayjs(date).startOf("isoWeek").toDate())}
            views={["year", "month", "day"]}
            format="DD-MM-YYYY"
            renderInput={params => <TextField {...params} />}
            sx={{ mt: 1, mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMoveDialog}>Cancel</Button>
          <Button
            onClick={async () => {
              if (!orderToMove || !selectedWeek) return;
              // Calculate new start and end dates (start of selected week, 8:00)
              const newStartDate = dayjs(selectedWeek).hour(8).minute(0).second(0).toDate();
              const newEndDate = calculateEndDate(newStartDate, orderToMove.estimatedHours || 8);
              const newPlannedWeekStartDate = dayjs(newStartDate)
                .startOf("isoWeek")
                .format("YYYY-MM-DD");

              // Update Firestore and local state
              await updateDoc(doc(db, "orders", orderToMove.id), {
                start: Timestamp.fromDate(newStartDate),
                end: Timestamp.fromDate(newEndDate),
                plannedWeekStartDate: newPlannedWeekStartDate,
                updated: Timestamp.now(),
              });
              setSchedulerOrders(prev =>
                prev.map(o =>
                  o.id === orderToMove.id
                    ? {
                        ...o,
                        start: Timestamp.fromDate(newStartDate),
                        end: Timestamp.fromDate(newEndDate),
                        plannedWeekStartDate: newPlannedWeekStartDate,
                      }
                    : o
                )
              );
              handleCloseMoveDialog();
            }}
            variant="contained"
          >
            Move
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}; // <-- This is the single, correct closing brace for the component

export default DailyScheduler;
