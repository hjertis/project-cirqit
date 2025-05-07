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
import { DndContext, useDraggable, useDroppable, DragEndEvent } from "@dnd-kit/core";

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

  // Helper for draggable event bar
  function DraggableEventBar({ order, startIdx, endIdx, level, cellWidth, onDrop, children }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: order.id,
      data: { orderId: order.id, startIdx },
    });
    return (
      <Paper
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        elevation={2}
        sx={{
          position: "absolute",
          left: `calc(${startIdx} * ${cellWidth}px)`,
          width: `calc((${endIdx} - ${startIdx} + 1) * ${cellWidth}px - 8px)`,
          top: level * 36,
          zIndex: isDragging ? 10 : 3,
          opacity: isDragging ? 0.7 : 1,
          p: 1,
          fontSize: "0.8rem",
          backgroundColor: "background.paper",
          color: "text.primary",
          borderLeft: `4px solid ${getPriorityColor(order.priority)}`,
          cursor: "grab",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          mb: 0.5,
          boxShadow: isDragging ? 4 : 2,
          display: "flex",
          alignItems: "center",
          minHeight: 32,
          "&:hover": {
            opacity: 0.95,
            boxShadow: 4,
          },
        }}
        title={`${order.orderNumber}: ${order.description}`}
      >
        {children}
      </Paper>
    );
  }

  // Helper for droppable date cell
  function DroppableDateCell({ resourceId, dateIdx, date, children, onDrop, sx = {}, ...props }) {
    const droppableId = `${resourceId}_${dateIdx}`;
    const { setNodeRef, isOver } = useDroppable({
      id: droppableId,
      data: { resourceId, dateIdx, date },
    });
    return (
      <Box
        ref={setNodeRef}
        sx={{
          borderBottom: 1,
          borderRight: 1,
          borderColor: "divider",
          backgroundColor: isOver
            ? theme.palette.primary.light
            : isToday(date)
              ? theme.palette.action.hover
              : isWeekend(date)
                ? theme.palette.action.disabledBackground
                : "background.paper",
          boxShadow: isOver ? 4 : undefined,
          outline: isOver ? `2px solid ${theme.palette.primary.main}` : undefined,
          zIndex: isOver ? 20 : 1,
          transition: "background 0.1s, box-shadow 0.1s, outline 0.1s, z-index 0s",
          p: 0.5,
          gridColumn: dateIdx + 2,
          minHeight: 36,
          position: "absolute",
          left: dateIdx * cellWidth,
          top: 0,
          width: cellWidth,
          ...sx,
        }}
        {...props}
      >
        {children}
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
        <DndContext
          onDragEnd={async (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || !active) return;
            const orderId = active.id;
            const order = orders.find(o => o.id === orderId);
            if (!order) return;
            const [resourceId, dateIdxStr] = over.id.split("_");
            const dateIdx = parseInt(dateIdxStr, 10);
            if (isNaN(dateIdx) || !calendarDates[dateIdx]) return;
            // Only allow drop on same resource row
            if (order.assignedResourceId !== resourceId) return;
            // Calculate duration
            const origStart = dayjs(order.start.toDate());
            const origEnd = dayjs(order.end.toDate());
            const duration = origEnd.diff(origStart, "day");
            const newStart = dayjs(calendarDates[dateIdx]).startOf("day");
            const newEnd = newStart.add(duration, "day");
            // Update Firestore and local state
            try {
              const orderRef = doc(db, "orders", order.id);
              await updateDoc(orderRef, {
                start: Timestamp.fromDate(newStart.toDate()),
                end: Timestamp.fromDate(newEnd.toDate()),
                updated: Timestamp.fromDate(new Date()),
              });
              setOrders(prev =>
                prev.map(o =>
                  o.id === order.id
                    ? {
                        ...o,
                        start: Timestamp.fromDate(newStart.toDate()),
                        end: Timestamp.fromDate(newEnd.toDate()),
                      }
                    : o
                )
              );
            } catch (err) {
              setError("Failed to update order date");
            }
          }}
        >
          <Box
            sx={{
              position: "relative",
              display: "grid",
              gridTemplateRows: `60px repeat(${resources.length}, auto)`,
              gridTemplateColumns: `200px repeat(${calendarDates.length}, ${cellWidth}px)`,
              minWidth: 200 + cellWidth * calendarDates.length,
            }}
          >
            {/* Header Row */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderBottom: 1,
                borderRight: 1,
                borderColor: "divider",
                backgroundColor: "background.default",
                p: 1,
                gridColumn: 1,
                gridRow: 1,
                zIndex: 2,
                position: "sticky",
                left: 0,
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Resources
              </Typography>
            </Box>
            {calendarDates.map((date, index) => (
              <Box
                key={index}
                sx={{
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
                  gridColumn: index + 2,
                  gridRow: 1,
                  zIndex: 1,
                  height: 60,
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

            {/* Resource Rows (sidebar and event area) */}
            {resources.map((resource, rowIdx) => {
              // Sidebar cell
              const sidebar = (
                <Box
                  key={resource.id + "_sidebar"}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    borderBottom: 1,
                    borderRight: 1,
                    borderColor: "divider",
                    p: 1,
                    gridColumn: 1,
                    gridRow: rowIdx + 2,
                    position: "sticky",
                    left: 0,
                    backgroundColor: "background.paper",
                    zIndex: 1,
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
              );

              // Event area cell (spans all date columns)
              // Calculate event stacking as before
              const resourceOrders = orders
                .filter(order => order.assignedResourceId === resource.id)
                .map(order => {
                  const orderStart = dayjs(order.start.toDate());
                  const orderEnd = dayjs(order.end.toDate());
                  let startIdx = calendarDates.findIndex(date =>
                    dayjs(date).isSame(orderStart, "day")
                  );
                  let endIdx = calendarDates.findIndex(date => dayjs(date).isSame(orderEnd, "day"));
                  if (startIdx === -1) startIdx = 0;
                  if (endIdx === -1) endIdx = calendarDates.length - 1;
                  return { ...order, startIdx, endIdx };
                })
                .sort((a, b) => a.startIdx - b.startIdx || a.endIdx - b.endIdx);
              const levels: { endIdx: number }[] = [];
              const ordersWithLevel = resourceOrders.map(order => {
                let level = 0;
                while (levels[level] && levels[level].endIdx >= order.startIdx) {
                  level++;
                }
                levels[level] = { endIdx: order.endIdx };
                return { ...order, level };
              });
              const maxLevel = ordersWithLevel.reduce((max, o) => Math.max(max, o.level), 0);

              const eventArea = (
                <Box
                  key={resource.id + "_eventarea"}
                  sx={{
                    gridColumn: `2 / ${calendarDates.length + 2}`,
                    gridRow: rowIdx + 2,
                    position: "relative",
                    minHeight: 36 * (maxLevel + 1),
                    borderBottom: 1,
                  }}
                >
                  {/* Droppable overlays for each date cell */}
                  {calendarDates.map((date, dateIdx) => (
                    <DroppableDateCell
                      key={`${resource.id}_${date.toISOString()}`}
                      resourceId={resource.id}
                      dateIdx={dateIdx}
                      date={date}
                      sx={{
                        position: "absolute",
                        left: dateIdx * cellWidth,
                        top: 0,
                        width: cellWidth,
                        height: 36 * (maxLevel + 1),
                        zIndex: 1,
                        p: 0.5,
                        boxSizing: "border-box",
                      }}
                    />
                  ))}
                  {/* Event bars, absolutely positioned */}
                  {ordersWithLevel.map(order => (
                    <DraggableEventBar
                      key={order.id}
                      order={order}
                      startIdx={order.startIdx}
                      endIdx={order.endIdx}
                      level={order.level}
                      cellWidth={cellWidth}
                    >
                      <Typography variant="subtitle2" fontWeight="bold" noWrap>
                        {order.orderNumber}
                      </Typography>
                      <Typography variant="body2" noWrap color="text.secondary" sx={{ ml: 1 }}>
                        {order.description}
                      </Typography>
                    </DraggableEventBar>
                  ))}
                  {/* Grid lines for each date cell */}
                  {calendarDates.map((date, dateIdx) => (
                    <Box
                      key={"gridline_" + dateIdx}
                      sx={{
                        position: "absolute",
                        left: dateIdx * cellWidth,
                        top: 0,
                        width: cellWidth,
                        height: 36 * (maxLevel + 1),
                        borderRight: 1,
                        borderColor: "divider",
                        pointerEvents: "none",
                        zIndex: 0,
                      }}
                    />
                  ))}
                </Box>
              );

              return [sidebar, eventArea];
            })}
          </Box>
        </DndContext>
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
