// src/components/planning/ResourcePlanningBoard.tsx
import React, { useState, useEffect, useMemo } from "react";
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
  useTheme,
} from "@mui/material";
import {
  ArrowBackIosNew as PrevIcon,
  ArrowForwardIos as NextIcon,
  MoreVert as MoreIcon,
  Person as PersonIcon,
  Build as BuildIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isBetween from "dayjs/plugin/isBetween"; // Needed for date checks later if implemented
import { getResources, Resource } from "../../services/resourceService"; // Use your actual service
import OrderDetailsDialog from "../orders/OrderDetailsDialog"; // Import the dialog
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from "firebase/firestore";
import { db } from "../../config/firebase";

dayjs.extend(weekOfYear);
dayjs.extend(isBetween);

// --- Define Types ---

// Interface for the planning-specific order data we need
interface PlanningOrder {
  id: string;
  orderNumber: string;
  description: string;
  estimatedHours: number; // Crucial for load calculation
  assignedResourceId: string | null;
  plannedWeekStartDate: string; // Store week start date as YYYY-MM-DD string
  priority?: string;
  // Add other fields needed for display or tooltips if necessary
  partNo?: string;
  status?: string;
}

// Extend the Resource type to include calculated weekly load
interface ResourceWithLoad extends Resource {
  weeklyLoad: { [weekStartDate: string]: number }; // Key: YYYY-MM-DD, Value: total hours
}

// --- Constants ---
const WEEKS_TO_SHOW = 6; // Number of weeks to display
const HOURS_PER_DAY = 7.4; // Standard 8-hour workday
const HOURS_PER_WEEK = 37; // Standard 40-hour workweek
const RESOURCE_HEADER_WIDTH = "220px";
const WEEK_CELL_WIDTH = "250px";
const DEFAULT_ESTIMATED_HOURS = HOURS_PER_DAY; // Default to one workday if not specified

// --- Helper Functions ---
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
      return "#95a5a6"; // Default grey for unknown/undefined
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
    // Query orders within the date range
    const ordersRef = collection(db, "orders");

    // Create Firebase timestamp objects for query
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    // Query orders that have start or end dates within our range
    // We need both conditions to catch orders that span across our range
    const q = query(
      ordersRef,
      where("status", "in", ["Open", "Released", "In Progress", "Delayed"]), // Only active orders
      orderBy("start", "asc"),
      limit(200) // Reasonable limit for performance
    );

    const querySnapshot = await getDocs(q);
    const planningOrders: PlanningOrder[] = [];

    querySnapshot.forEach(doc => {
      const orderData = doc.data();

      // Skip orders that are entirely outside our date range
      if (
        (orderData.end && orderData.end.toDate() < startDate) ||
        (orderData.start && orderData.start.toDate() > endDate)
      ) {
        return;
      }

      // Convert the order's start date to the start of its week for planning
      const orderStartDate = orderData.start ? orderData.start.toDate() : new Date();
      const weekStartDate = dayjs(orderStartDate).startOf("week").format("YYYY-MM-DD");

      // Calculate estimated hours from order metadata
      // You might need to adjust this logic based on your actual data model
      let estimatedHours = DEFAULT_ESTIMATED_HOURS; // Default to one workday

      // If order has a custom estimatedHours field, use that
      if (orderData.estimatedHours) {
        estimatedHours = orderData.estimatedHours;
      }
      // If we have start and end dates, calculate duration in workdays * 8 hours
      else if (orderData.start && orderData.end) {
        // Calculate working days between dates (excluding weekends)
        const startDate = orderData.start.toDate();
        const endDate = orderData.end.toDate();
        let workDays = 0;
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          // Only count Monday - Friday (0 = Sunday, 6 = Saturday)
          const dayOfWeek = currentDate.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workDays++;
          }
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Calculate hours based on 8-hour workdays, minimum 1 day
        estimatedHours = Math.max(workDays, 1) * HOURS_PER_DAY;
        // Round to whole numbers for cleaner display
        estimatedHours = Math.round(estimatedHours);
      }
      // Or if order has a quantity field, we could use that to estimate hours
      else if (orderData.quantity) {
        // Simple calculation - adjust as needed for your business logic
        // Each item takes 2 hours, minimum of 1 hour
        estimatedHours = Math.max(orderData.quantity, 1) * 2;
      }

      planningOrders.push({
        id: doc.id,
        orderNumber: orderData.orderNumber || doc.id,
        description: orderData.description || "",
        estimatedHours: estimatedHours,
        assignedResourceId: orderData.assignedResourceId || null,
        plannedWeekStartDate: weekStartDate,
        priority: orderData.priority || "Medium",
        partNo: orderData.partNo || "",
        status: orderData.status || "Open",
      });
    });

    return planningOrders;
  } catch (error) {
    console.error("Error fetching planning data:", error);
    throw error; // Re-throw to let the caller handle it
  }
};

const ResourcePlanningBoard: React.FC = () => {
  const theme = useTheme(); // Access theme for colors
  const [currentWeekStart, setCurrentWeekStart] = useState(dayjs().startOf("week").toDate());
  const [resources, setResources] = useState<ResourceWithLoad[]>([]);
  const [orders, setOrders] = useState<PlanningOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Calculate the start dates of the weeks to display
  const visibleWeeks = useMemo(
    () =>
      Array.from({ length: WEEKS_TO_SHOW }).map((_, i) =>
        dayjs(currentWeekStart).add(i, "week").toDate()
      ),
    [currentWeekStart]
  );

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Resources
        const fetchedResources = await getResources(true); // Get only active resources

        // 2. Fetch Orders for the visible weeks + buffer
        const startDate = dayjs(currentWeekStart).subtract(1, "week").startOf("week").toDate();
        const endDate = dayjs(currentWeekStart).add(WEEKS_TO_SHOW, "week").endOf("week").toDate();
        const fetchedOrders = await fetchPlanningData(startDate, endDate); // Fetch orders from Firebase

        // Filter orders to only include those within the visible weeks
        const filteredOrders = fetchedOrders.filter(order => {
          const orderDate = dayjs(order.plannedWeekStartDate);
          return orderDate.isBetween(dayjs(startDate), dayjs(endDate), null, "[]"); // Inclusive of start and end
        });

        // Set the filtered orders to state
        setOrders(filteredOrders);

        // 3. Calculate Load and add to resources
        const resourcesWithLoad = fetchedResources.map(res => {
          const weeklyLoad: { [weekStartDate: string]: number } = {};
          visibleWeeks.forEach(weekDate => {
            const weekStartStr = dayjs(weekDate).format("YYYY-MM-DD");
            // Calculate load based on orders assigned to this resource AND this week
            const load = fetchedOrders
              .filter(
                o => o.assignedResourceId === res.id && o.plannedWeekStartDate === weekStartStr
              )
              .reduce((sum, o) => sum + (o.estimatedHours || 0), 0); // Use estimatedHours
            weeklyLoad[weekStartStr] = load;
          });
          return { ...res, weeklyLoad }; // Add the calculated load object to the resource
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

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart]); // Re-fetch data when the displayed week changes

  // --- Event Handlers ---
  const handlePrevWeek = () => {
    setCurrentWeekStart(dayjs(currentWeekStart).subtract(1, "week").toDate());
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(dayjs(currentWeekStart).add(1, "week").toDate());
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsDialogOpen(true);
  };

  // --- Drag and Drop handlers (to be implemented) ---
  // const onDragEnd = (result) => {
  //    if (!result.destination) return; // Dropped outside
  //    const { source, destination, draggableId } = result;
  //    // Logic to update order's assignedResourceId and plannedWeekStartDate in Firestore
  //    // Update local state optimistically or refetch
  //    // Recalculate load
  // };

  // --- Render Helpers ---
  const getLoadColor = (load: number, capacity: number): string => {
    if (capacity <= 0) return theme.palette.text.disabled; // No capacity defined
    const percentage = (load / capacity) * 100;
    if (percentage > 100) return theme.palette.error.main;
    if (percentage > 85) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  const getLoadBackgroundColor = (load: number, capacity: number): string => {
    if (capacity <= 0) return "transparent";
    const percentage = (load / capacity) * 100;
    if (percentage > 100) return theme.palette.error.light || "#ffcdd2";
    if (percentage > 85) return theme.palette.warning.light || "#fff9c4";
    return "transparent"; // Use 'transparent' or a subtle success color if needed
  };

  // --- Main Render ---
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
    <Paper sx={{ p: 2, overflow: "hidden" }}>
      {/* Header with Navigation */}
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
              .endOf("week")
              .format("MMM D, YYYY")}
          </Typography>
          <IconButton onClick={handleNextWeek} aria-label="Next Week" size="small">
            <NextIcon />
          </IconButton>
        </Box>
        {/* Add Filter/Zoom controls here if needed */}
      </Box>

      {/* Board Grid */}
      <Box sx={{ overflowX: "auto", pb: 1 }}>
        {" "}
        {/* Added padding bottom */}
        <Box
          sx={{
            display: "flex",
            minWidth: `calc(${RESOURCE_HEADER_WIDTH} + ${WEEKS_TO_SHOW} * ${WEEK_CELL_WIDTH})`,
          }}
        >
          {/* Header Row */}
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
        {/* Resource Rows */}
        {/* TODO: Wrap with DragDropContext here if implementing D&D */}
        {resources.map(resource => (
          <Box
            key={resource.id}
            sx={{ display: "flex", borderBottom: 1, borderColor: "divider", minHeight: "100px" }}
          >
            {" "}
            {/* Ensure rows have min height */}
            {/* Resource Name Cell (Sticky) */}
            <Box
              sx={{
                width: RESOURCE_HEADER_WIDTH,
                flexShrink: 0,
                p: 1,
                borderRight: 1,
                borderColor: "divider",
                display: "flex",
                alignItems: "flex-start", // Align text to top
                position: "sticky",
                left: 0,
                backgroundColor: "background.paper", // Ensure it covers underlying content
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
            {/* Weekly Cells */}
            {visibleWeeks.map(weekDate => {
              const weekStartStr = dayjs(weekDate).format("YYYY-MM-DD");
              // Use resource capacity or default, assuming 5 days/week
              // Standard 40-hour workweek
              const weeklyCapacity = resource.capacity ? resource.capacity * 5 : HOURS_PER_WEEK;
              const currentLoad = resource.weeklyLoad?.[weekStartStr] ?? 0;
              const loadPercentage =
                weeklyCapacity > 0 ? Math.round((currentLoad / weeklyCapacity) * 100) : 0;
              // Get orders assigned to this specific resource and week
              const cellOrders = orders.filter(
                o => o.assignedResourceId === resource.id && o.plannedWeekStartDate === weekStartStr
              );

              return (
                // TODO: This Box should be the Droppable if implementing D&D
                <Box
                  key={`${resource.id}-${weekStartStr}`}
                  sx={{
                    width: WEEK_CELL_WIDTH,
                    minWidth: WEEK_CELL_WIDTH, // Prevent shrinking
                    flexShrink: 0,
                    p: 1,
                    borderLeft: 1,
                    borderColor: "divider",
                    position: "relative",
                    backgroundColor: getLoadBackgroundColor(currentLoad, weeklyCapacity),
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5, // Space between cards
                    minHeight: "100px", // Match row min height
                  }}
                  // droppableId={`${resource.id}_${weekStartStr}`} // For D&D
                >
                  {/* Load Indicator */}
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
                      sx={{ color: getLoadColor(currentLoad, weeklyCapacity), fontWeight: "bold" }}
                    >
                      {Math.round(currentLoad)}h / {weeklyCapacity}h ({loadPercentage}%)
                    </Typography>
                    {/* Optionally add a visual bar here */}
                  </Box>

                  {/* Order Cards */}
                  {cellOrders.length > 0 ? (
                    cellOrders.map((order, index) => (
                      // TODO: This Paper should be the Draggable
                      <Paper
                        key={order.id}
                        // draggableId={order.id} index={index} // For D&D
                        elevation={1}
                        sx={{
                          p: 0.5,
                          fontSize: "0.75rem",
                          cursor: "pointer", // Change to 'grab' for D&D
                          borderLeft: `4px solid ${getPriorityColor(order.priority)}`,
                          "&:hover": { boxShadow: 3, zIndex: 10 }, // Bring card to front on hover
                          position: "relative", // Needed for zIndex hover effect
                          overflow: "hidden", // Prevent text overflow issues
                        }}
                        onClick={() => handleViewOrder(order.id)}
                      >
                        <Typography variant="caption" component="div" fontWeight="medium" noWrap>
                          {order.orderNumber} ({order.estimatedHours}h)
                        </Typography>
                        <Typography variant="caption" component="div" noWrap color="text.secondary">
                          {order.description}
                        </Typography>
                        {order.partNo && (
                          <Typography
                            variant="caption"
                            component="div"
                            noWrap
                            color="text.secondary"
                          >
                            Part: {order.partNo}
                          </Typography>
                        )}
                      </Paper>
                    ))
                  ) : (
                    // Placeholder for empty cells
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
                </Box>
              );
            })}
          </Box> // Closes the resource row Box
        ))}
        {/* Unassigned Orders Section */}
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

          {/* Unassigned Orders Cells */}
          {visibleWeeks.map(weekDate => {
            const weekStartStr = dayjs(weekDate).format("YYYY-MM-DD");
            const unassignedOrders = orders.filter(
              o => o.assignedResourceId === null && o.plannedWeekStartDate === weekStartStr
            );

            return (
              <Box
                key={`unassigned-${weekStartStr}`}
                sx={{
                  width: WEEK_CELL_WIDTH,
                  minWidth: WEEK_CELL_WIDTH,
                  flexShrink: 0,
                  p: 1,
                  borderLeft: 1,
                  borderColor: "divider",
                  position: "relative",
                  backgroundColor: theme.palette.action.hover,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                  minHeight: "100px",
                }}
              >
                {unassignedOrders.length > 0 ? (
                  unassignedOrders.map(order => (
                    <Paper
                      key={order.id}
                      elevation={1}
                      sx={{
                        p: 0.5,
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        borderLeft: `4px solid ${getPriorityColor(order.priority)}`,
                        "&:hover": { boxShadow: 3, zIndex: 10 },
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onClick={() => handleViewOrder(order.id)}
                    >
                      <Typography variant="caption" component="div" fontWeight="medium" noWrap>
                        {order.orderNumber} ({Math.round(order.estimatedHours)}h)
                      </Typography>
                      <Typography variant="caption" component="div" noWrap color="text.secondary">
                        {order.description}
                      </Typography>
                    </Paper>
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
              </Box>
            );
          })}
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

export default ResourcePlanningBoard;
