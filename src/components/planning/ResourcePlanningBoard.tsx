import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  ArrowBackIosNew as PrevIcon,
  ArrowForwardIos as NextIcon,
  Person as PersonIcon,
  Build as BuildIcon,
} from "@mui/icons-material";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable, // <-- add this import
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import { getResources, Resource } from "../../services/resourceService";
import OrderDetailsDialog from "../orders/OrderDetailsDialog";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../config/firebase";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(isBetween);

interface PlanningOrder {
  id: string;
  orderNumber: string;
  description: string;
  estimatedHours: number;
  assignedResourceId: string | null;
  plannedWeekStartDate: string;
  priority?: string;

  partNo?: string;
  status?: string;
}

interface ResourceWithLoad extends Resource {
  weeklyLoad: { [weekStartDate: string]: number };
}

const WEEKS_TO_SHOW = 6;
const HOURS_PER_DAY = 7.4;
const HOURS_PER_WEEK = 37;
const RESOURCE_HEADER_WIDTH = "220px";
const WEEK_CELL_WIDTH = "250px";
const DEFAULT_ESTIMATED_HOURS = HOURS_PER_DAY;

const getPriorityColor = (priority: string = "Medium"): string => {
  switch (priority?.toLowerCase()) {
    case "critical":
      return "#e74c3c";
    case "high":
      return "#e67e22";
    case "medium-high":
      return "#f39c12";
    case "medium":
      return "#3498db";
    case "low":
      return "#2ecc71";
    default:
      return "#95a5a6";
  }
};

/**
 * Fetch orders from Firebase and transform them for the planning board
 * @param startDate The start date for the planning period
 * @param endDate The end date for the planning period
 * @returns Promise with an array of PlanningOrder objects
 */
const fetchPlanningData = async (startDate: Date, endDate: Date): Promise<PlanningOrder[]> => {
  try {
    const ordersRef = collection(db, "orders");

    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    const q = query(
      ordersRef,
      where("status", "in", ["Open", "Released", "In Progress", "Delayed", "Firm Planned"]),
      orderBy("start", "asc"),
      limit(200)
    );

    const querySnapshot = await getDocs(q);
    const planningOrders: PlanningOrder[] = [];

    querySnapshot.forEach(doc => {
      const orderData = doc.data();

      if (
        (orderData.end && orderData.end.toDate() < startDate) ||
        (orderData.start && orderData.start.toDate() > endDate)
      ) {
        return;
      }

      const orderStartDate = orderData.start ? orderData.start.toDate() : new Date();
      const weekStartDate = dayjs(orderStartDate).startOf("isoWeek").format("YYYY-MM-DD");

      let estimatedHours = DEFAULT_ESTIMATED_HOURS;

      if (orderData.estimatedHours) {
        estimatedHours = orderData.estimatedHours;
      } else if (orderData.start && orderData.end) {
        const startDate = orderData.start.toDate();
        const endDate = orderData.end.toDate();
        let workDays = 0;
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workDays++;
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        estimatedHours = Math.max(workDays, 1) * HOURS_PER_DAY;

        estimatedHours = Math.round(estimatedHours);
      } else if (orderData.quantity) {
        estimatedHours = Math.max(orderData.quantity, 1) * 2;
      }

      planningOrders.push({
        id: doc.id,
        orderNumber: orderData.orderNumber || doc.id,
        description: orderData.description || "",
        estimatedHours: estimatedHours,
        assignedResourceId: orderData.assignedResourceId || null,
        plannedWeekStartDate:
          orderData.plannedWeekStartDate ||
          dayjs(orderStartDate).startOf("isoWeek").format("YYYY-MM-DD"),
        priority: orderData.priority || "Medium",
        partNo: orderData.partNo || "",
        status: orderData.status || "Open",
      });
    });

    return planningOrders;
  } catch (error) {
    console.error("Error fetching planning data:", error);
    throw error;
  }
};

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
  return currentDate.toDate();
};

const getLoadBackgroundColor = (load: number, capacity: number): string => {
  if (capacity <= 0) return "transparent";
  const percentage = (load / capacity) * 100;
  if (percentage > 100) return "#ffebee";
  if (percentage > 85) return "#fff3e0";
  return "transparent";
};

const getOrderBackgroundColor = (status?: string, isDragging?: boolean, theme?: any): string => {
  if (isDragging && theme) return theme.palette.action.selected;
  if (status === "Firm Planned") return "#e3f2fd";
  return theme ? theme.palette.background.paper : "#fff";
};

function PlanningSortableItem({
  order,
  onClick,
}: {
  order: PlanningOrder;
  onClick: (id: string) => void;
}) {
  const theme = useTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(order.id),
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    borderLeft: `4px solid ${getPriorityColor(order.priority)}`,
    backgroundColor: getOrderBackgroundColor(order.status, isDragging, theme),
    fontSize: "0.75rem",
    marginBottom: 4,
    padding: 8,
    boxShadow: isDragging ? theme.shadows[3] : theme.shadows[1],
    overflow: "hidden",
    position: "relative",
  };

  // Track pointer movement to distinguish click vs drag
  const pointerDownRef = React.useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
    if (listeners.onPointerDown) listeners.onPointerDown(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerDownRef.current) {
      const dx = Math.abs(e.clientX - pointerDownRef.current.x);
      const dy = Math.abs(e.clientY - pointerDownRef.current.y);
      if (dx < 5 && dy < 5) {
        // Considered a click, not a drag
        onClick(order.id);
      }
    }
    pointerDownRef.current = null;
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...attributes}
      // Remove onClick from here
      // {...listeners} // Remove listeners from Paper
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      // Attach drag listeners to a drag handle if you want (not required here)
    >
      <div {...listeners} style={{ width: "100%", height: "100%" }}>
        <Typography variant="caption" component="div" fontWeight="medium" noWrap>
          {order.orderNumber} ({order.estimatedHours}h)
        </Typography>
        <Typography variant="caption" component="div" noWrap color="text.secondary">
          {order.description}
        </Typography>
        {order.partNo && (
          <Typography variant="caption" component="div" noWrap color="text.secondary">
            Part: {order.partNo}
          </Typography>
        )}
      </div>
    </Paper>
  );
}

// Add a droppable wrapper for each cell
const PlanningDroppableCell = ({
  id,
  children,
  backgroundColor,
}: {
  id: string;
  children: React.ReactNode;
  backgroundColor?: string;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        width: WEEK_CELL_WIDTH,
        minWidth: WEEK_CELL_WIDTH,
        flexShrink: 0,
        p: 1,
        borderLeft: 1,
        borderColor: "divider",
        position: "relative",
        backgroundColor: isOver ? "primary.light" : backgroundColor,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        minHeight: "100px",
        transition: "background 0.2s",
      }}
      id={id}
    >
      {children}
    </Box>
  );
};

interface ResourcePlanningBoardProps {
  onOrderClick: (orderId: string) => void;
  refreshKey?: number;
}

const ResourcePlanningBoard: React.FC<ResourcePlanningBoardProps> = ({
  onOrderClick,
  refreshKey,
}) => {
  console.log("ResourcePlanningBoard: render/mount");
  const theme = useTheme();
  const [currentWeekStart, setCurrentWeekStart] = useState(dayjs().startOf("isoWeek").toDate());
  const [resources, setResources] = useState<ResourceWithLoad[]>([]);
  const [orders, setOrders] = useState<PlanningOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Remove dialog state

  const visibleWeeks = useMemo(
    () =>
      Array.from({ length: WEEKS_TO_SHOW }).map((_, i) =>
        dayjs(currentWeekStart).add(i, "week").toDate()
      ),
    [currentWeekStart]
  );

  const fetchData = async () => {
    console.log("ResourcePlanningBoard: fetchData called");
    setLoading(true);
    setError(null);
    try {
      const fetchedResources = await getResources(true);
      const startDate = dayjs(currentWeekStart).subtract(1, "week").startOf("isoWeek").toDate();
      const endDate = dayjs(currentWeekStart).add(WEEKS_TO_SHOW, "week").endOf("isoWeek").toDate();
      const fetchedOrders = await fetchPlanningData(startDate, endDate);

      const filteredOrders = fetchedOrders.filter(order => {
        const orderDate = dayjs(order.plannedWeekStartDate);
        return orderDate.isBetween(dayjs(startDate), dayjs(endDate), null, "[]");
      });

      setOrders(filteredOrders);

      const resourcesWithLoad = fetchedResources.map(res => {
        const weeklyLoad: { [weekStartDate: string]: number } = {};
        visibleWeeks.forEach(weekDate => {
          const weekStartStr = dayjs(weekDate).format("YYYY-MM-DD");

          const load = fetchedOrders
            .filter(o => o.assignedResourceId === res.id && o.plannedWeekStartDate === weekStartStr)
            .reduce((sum, o) => sum + (o.estimatedHours || 0), 0);
          weeklyLoad[weekStartStr] = load;
        });
        return { ...res, weeklyLoad };
      });

      setResources(resourcesWithLoad);
    } catch (err) {
      console.error("Error fetching planning data:", err);
      setError(
        `Failed to load planning board: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("ResourcePlanningBoard: useEffect (fetchData) triggered");
    fetchData();
  }, [currentWeekStart, refreshKey]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(dayjs(currentWeekStart).subtract(1, "week").toDate());
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(dayjs(currentWeekStart).add(1, "week").toDate());
  };

  const handleViewOrder = (orderId: string) => {
    onOrderClick(orderId);
  };

  const handleGoToToday = () => {
    setCurrentWeekStart(dayjs().startOf("isoWeek").toDate());
  };

  const getLoadColor = (load: number, capacity: number): string => {
    if (capacity <= 0) return theme.palette.text.disabled;
    const percentage = (load / capacity) * 100;
    if (percentage > 100) return "#b71c1c";
    if (percentage > 85) return "#b26a00";
    return theme.palette.success.main;
  };

  const getLoadBackgroundColor = (load: number, capacity: number): string => {
    if (capacity <= 0) return "transparent";
    const percentage = (load / capacity) * 100;
    if (percentage > 100) return "#ffebee";
    if (percentage > 85) return "#fff3e0";
    return "transparent";
  };

  const getOrderBackgroundColor = (status?: string, isDragging?: boolean): string => {
    if (isDragging) return theme.palette.action.selected;
    if (status === "Firm Planned") return "#e3f2fd";
    return "background.paper";
  };

  // dnd-kit sensors
  const sensors = useSensors(useSensor(PointerSensor));

  // dnd-kit drag end handler
  const handleDndKitDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active) return;
    let cellId = over.id;
    // If dropped on an order, resolve to its cell
    if (typeof cellId === "string" && !cellId.includes("|")) {
      const overOrder = orders.find(o => String(o.id) === cellId);
      if (overOrder) {
        cellId = `${overOrder.assignedResourceId ?? "unassigned"}|${overOrder.plannedWeekStartDate}`;
      }
    }
    const [destResourceId, destWeekStart] = String(cellId).split("|");
    const orderId = active.id;
    const newPlannedWeekStartDate = dayjs(destWeekStart).format("YYYY-MM-DD");
    const draggedOrder = orders.find(o => String(o.id) === orderId);
    if (!draggedOrder) return;
    const newStartDate = dayjs(destWeekStart).hour(8).minute(0).second(0).toDate();
    const newEndDate = calculateEndDate(newStartDate, draggedOrder.estimatedHours || 8);
    try {
      await updateDoc(doc(db, "orders", String(orderId)), {
        assignedResourceId: destResourceId === "unassigned" ? null : destResourceId,
        plannedWeekStartDate: newPlannedWeekStartDate,
        start: Timestamp.fromDate(newStartDate),
        end: Timestamp.fromDate(newEndDate),
        updated: Timestamp.now(),
      });
      fetchData();
    } catch (err) {
      setError("Failed to update order in Firestore.");
    }
  };

  // Add a handler to refresh only after an update
  const handleOrderUpdated = () => {
    fetchData();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Paper sx={{ p: 2, overflow: "hidden", width: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Resource Planning Board</Typography>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton onClick={handlePrevWeek} aria-label="Previous Week" size="small">
            <PrevIcon />
          </IconButton>
          <Typography
            variant="subtitle1"
            component="span"
            sx={{ mx: 2, textAlign: "center", minWidth: "200px" }}
          >
            {dayjs(currentWeekStart).format("MMM D")} -{" "}
            {dayjs(currentWeekStart)
              .add(WEEKS_TO_SHOW - 1, "week")
              .endOf("isoWeek")
              .format("MMM D, YYYY")}
          </Typography>
          <IconButton onClick={handleNextWeek} aria-label="Next Week" size="small">
            <NextIcon />
          </IconButton>
          <IconButton onClick={handleGoToToday} aria-label="Go to Today" size="small">
            <Tooltip title="Go to current week">
              <span>Today</span>
            </Tooltip>
          </IconButton>
        </Box>
      </Box>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDndKitDragEnd}
      >
        <Box sx={{ overflowX: "auto", pb: 1 }}>
          <Box
            sx={{
              display: "flex",
              minWidth: `calc(${RESOURCE_HEADER_WIDTH} + ${WEEKS_TO_SHOW} * ${WEEK_CELL_WIDTH})`,
            }}
          >
            <Box
              sx={{
                width: RESOURCE_HEADER_WIDTH,
                flexShrink: 0,
                p: 1,
                borderBottom: 1,
                borderColor: "divider",
                fontWeight: "bold",
                backgroundColor: "background.default",
                position: "sticky",
                left: 0,
                zIndex: 2,
              }}
            >
              Resource
            </Box>
            {visibleWeeks.map(weekDate => (
              <Box
                key={weekDate.toISOString()}
                sx={{
                  width: WEEK_CELL_WIDTH,
                  flexShrink: 0,
                  p: 1,
                  textAlign: "center",
                  borderBottom: 1,
                  borderLeft: 1,
                  borderColor: "divider",
                  fontWeight: "bold",
                  backgroundColor: "background.default",
                }}
              >
                Week {dayjs(weekDate).week()} <br /> ({dayjs(weekDate).format("MMM D")})
              </Box>
            ))}
          </Box>
          {resources.map(resource => (
            <Box
              key={resource.id}
              sx={{ display: "flex", borderBottom: 1, borderColor: "divider", minHeight: "100px" }}
            >
              <Box
                sx={{
                  width: RESOURCE_HEADER_WIDTH,
                  flexShrink: 0,
                  p: 1,
                  borderRight: 1,
                  borderColor: "divider",
                  display: "flex",
                  alignItems: "flex-start",
                  position: "sticky",
                  left: 0,
                  backgroundColor: "background.paper",
                  zIndex: 1,
                }}
              >
                <Tooltip title={resource.type || ""} placement="top-start">
                  {resource.type === "person" ? (
                    <PersonIcon
                      sx={{
                        mr: 1,
                        fontSize: "1.1rem",
                        color: resource.color || theme.palette.primary.main,
                      }}
                    />
                  ) : (
                    <BuildIcon
                      sx={{
                        mr: 1,
                        fontSize: "1.1rem",
                        color: resource.color || theme.palette.secondary.main,
                      }}
                    />
                  )}
                </Tooltip>
                <Typography variant="body2" fontWeight="medium">
                  {resource.name}
                </Typography>
              </Box>
              {visibleWeeks.map(weekDate => {
                const weekStartStr = dayjs(weekDate).format("YYYY-MM-DD");
                const weeklyCapacity = resource.capacity ? resource.capacity * 5 : HOURS_PER_WEEK;
                const currentLoad = resource.weeklyLoad?.[weekStartStr] ?? 0;
                const loadPercentage =
                  weeklyCapacity > 0 ? Math.round((currentLoad / weeklyCapacity) * 100) : 0;
                const cellOrders = orders.filter(
                  o =>
                    o.assignedResourceId === resource.id && o.plannedWeekStartDate === weekStartStr
                );
                const droppableId = `${resource.id}|${weekStartStr}`;

                return (
                  <SortableContext
                    key={droppableId}
                    items={cellOrders.map(o => String(o.id))}
                    strategy={verticalListSortingStrategy}
                  >
                    <PlanningDroppableCell
                      id={droppableId}
                      backgroundColor={getLoadBackgroundColor(currentLoad, weeklyCapacity)}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: getLoadColor(currentLoad, weeklyCapacity),
                            fontWeight: "bold",
                          }}
                        >
                          {Math.round(currentLoad)}h / {weeklyCapacity}h ({loadPercentage}%)
                        </Typography>
                      </Box>
                      {cellOrders.length > 0 ? (
                        cellOrders.map(order => (
                          <PlanningSortableItem
                            key={order.id}
                            order={order}
                            onClick={handleViewOrder}
                          />
                        ))
                      ) : (
                        <Box
                          sx={{
                            flexGrow: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography variant="caption" color="text.disabled">
                            No orders
                          </Typography>
                        </Box>
                      )}
                    </PlanningDroppableCell>
                  </SortableContext>
                );
              })}
            </Box>
          ))}
          <Box
            sx={{
              display: "flex",
              borderBottom: 1,
              borderColor: "divider",
              minHeight: "100px",
              backgroundColor: "background.default",
            }}
          >
            <Box
              sx={{
                width: RESOURCE_HEADER_WIDTH,
                flexShrink: 0,
                p: 1,
                borderRight: 1,
                borderColor: "divider",
                display: "flex",
                alignItems: "flex-start",
                position: "sticky",
                left: 0,
                backgroundColor: "background.default",
                zIndex: 1,
              }}
            >
              <Typography variant="body2" fontWeight="medium" color="text.secondary">
                Unassigned
              </Typography>
            </Box>
            {visibleWeeks.map(weekDate => {
              const weekStartStr = dayjs(weekDate).format("YYYY-MM-DD");
              const unassignedOrders = orders.filter(
                o => o.assignedResourceId === null && o.plannedWeekStartDate === weekStartStr
              );
              const droppableId = `unassigned|${weekStartStr}`;
              return (
                <SortableContext
                  key={droppableId}
                  items={unassignedOrders.map(o => String(o.id))}
                  strategy={verticalListSortingStrategy}
                >
                  <PlanningDroppableCell
                    id={droppableId}
                    backgroundColor={getLoadBackgroundColor(0, 0)}
                  >
                    {unassignedOrders.length > 0 ? (
                      unassignedOrders.map(order => (
                        <PlanningSortableItem
                          key={order.id}
                          order={order}
                          onClick={handleViewOrder}
                        />
                      ))
                    ) : (
                      <Box
                        sx={{
                          flexGrow: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Typography variant="caption" color="text.disabled">
                          No unassigned orders
                        </Typography>
                      </Box>
                    )}
                  </PlanningDroppableCell>
                </SortableContext>
              );
            })}
          </Box>
        </Box>
      </DndContext>
    </Paper>
  );
};

export default ResourcePlanningBoard;
