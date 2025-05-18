import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { getResources } from "../../services/resourceService";
import {
  collection,
  getDocs,
  Timestamp,
  where,
  query,
  updateDoc,
  doc,
  addDoc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { FirebaseOrder } from "../../hooks/useOrders";
import OrderDetailsDialog from "../orders/OrderDetailsDialog";
import { STANDARD_PROCESS_NAMES } from "../../constants/constants";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

const HOURS_PER_DAY = 7.4;

function getEstimatedHours(order: FirebaseOrder): number {
  // Type guard for estimatedHours property
  if (Object.prototype.hasOwnProperty.call(order, "estimatedHours")) {
    const val = (order as Record<string, unknown>).estimatedHours;
    if (typeof val === "number") return val;
  }
  if (order.start && order.end) {
    const startDate =
      order.start instanceof Timestamp ? order.start.toDate() : new Date(order.start);
    const endDate = order.end instanceof Timestamp ? order.end.toDate() : new Date(order.end);
    let workDays = 0;
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) workDays++;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return Math.max(workDays, 1) * HOURS_PER_DAY;
  }
  if (order.quantity) return Math.max(order.quantity, 1) * 2;
  return HOURS_PER_DAY;
}

// Priority color helper (copied from ResourcePlanningBoard)
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

// Order card styled like PlanningSortableItem (match ResourcePlanningBoard)
function MatrixOrderCard({
  order,
  onClick,
  id,
}: {
  order: FirebaseOrder;
  onClick: (id: string) => void;
  id: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });

  return (
    <Paper
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      sx={{
        borderLeft: `4px solid ${getPriorityColor(order.priority)}`,
        backgroundColor: isDragging ? "#e3f2fd" : "#fff",
        fontSize: "0.75rem",
        mb: 0.5,
        p: 1,
        boxShadow: 1,
        overflow: "hidden",
        position: "relative",
        width: 180, // Match ResourcePlanningBoard: fixed width
        minWidth: 0,
        maxWidth: "100%",
        cursor: "grab",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        opacity: isDragging ? 0.5 : 1,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition: isDragging ? "none" : "box-shadow 0.2s",
      }}
      onClick={() => onClick(order.id)}
    >
      <Typography variant="caption" fontWeight="medium" noWrap>
        {order.orderNumber} ({Math.round(getEstimatedHours(order))}h)
      </Typography>
      {order.description && (
        <Typography variant="caption" noWrap color="text.secondary">
          {order.description}
        </Typography>
      )}
      {order.partNo && (
        <Typography variant="caption" noWrap color="text.secondary">
          Part: {order.partNo}
        </Typography>
      )}
    </Paper>
  );
}

const ORDER_STATUSES = [
  "Not Started",
  "In Progress",
  "Delayed",
  "Done",
  "Finished",
  "Completed",
  "Removed",
];

// Helper to fetch all processes for a set of order IDs
async function fetchProcessesForOrders(orderIds: string[]) {
  const processesRef = collection(db, "processes");
  const batches = [];
  for (let i = 0; i < orderIds.length; i += 30) {
    const batchIds = orderIds.slice(i, i + 30);
    const q = query(processesRef, where("workOrderId", "in", batchIds));
    batches.push(getDocs(q));
  }
  const snapshots = await Promise.all(batches);
  return snapshots.flatMap(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
}

function DroppableCell({
  processName,
  resource,
  orders,
  matrix,
  handleOpenDetailsDialog,
}: {
  processName: string;
  resource: any;
  orders: FirebaseOrder[];
  matrix: any;
  handleOpenDetailsDialog: (id: string) => void;
}) {
  const droppableId = `${processName}|${resource.id}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  return (
    <TableCell
      align="center"
      sx={{
        p: 0.5,
        backgroundColor: isOver ? "#f0f4c3" : undefined,
        minHeight: 60,
      }}
      ref={setNodeRef}
    >
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {orders.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        ) : (
          orders.map(order => (
            <MatrixOrderCard
              key={order.id}
              order={order}
              onClick={handleOpenDetailsDialog}
              id={`${order.id}|${processName}|${resource.id}`}
            />
          ))
        )}
      </Box>
    </TableCell>
  );
}

const ResourceStatusMatrixBoard: React.FC = () => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Fetch resources
  const {
    data: resources = [],
    isLoading: loadingResources,
    error: resourceError,
  } = useQuery({
    queryKey: ["resources", true],
    queryFn: async () => await getResources(true),
    staleTime: 1000 * 60 * 5,
  });

  // Fetch all orders (could be filtered for performance)
  const {
    data: allOrders = [],
    isLoading: loadingOrders,
    error: ordersError,
  } = useQuery({
    queryKey: ["all-orders-matrix"],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "orders"));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FirebaseOrder[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const orders = allOrders.filter(order => order.status === "In Progress");

  const [processes, setProcesses] = useState<any[]>([]);

  useEffect(() => {
    if (orders.length) {
      fetchProcessesForOrders(orders.map(o => o.id)).then(setProcesses);
    }
  }, [orders]);

  // Map each order to its current process
  const orderToCurrentProcess: Record<string, string> = {};
  orders.forEach(order => {
    const orderProcesses = processes.filter(p => p.workOrderId === order.id);
    const inProgress = orderProcesses.find(p => p.status === "In Progress");
    orderToCurrentProcess[order.id] = inProgress
      ? inProgress.name
      : orderProcesses[orderProcesses.length - 1]?.name || "Unknown";
  });

  // Build unique process names for Y axis (rows)
  const processNames = [...STANDARD_PROCESS_NAMES, "Unknown"];

  // Build matrix: process (rows) x resource (columns)
  const matrix: { [processName: string]: { [resourceId: string]: FirebaseOrder[] } } = {};
  for (const processName of processNames) {
    matrix[processName] = {};
    for (const resource of resources) {
      matrix[processName][resource.id] = orders.filter(
        o =>
          (orderToCurrentProcess[o.id] || "Unknown") === processName &&
          o.assignedResourceId === resource.id
      );
    }
  }

  const handleOpenDetailsDialog = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setIsDetailsDialogOpen(false);
    setSelectedOrderId(null);
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active) return;

    // active.id format: orderId|oldProcess|oldResource
    // over.id format: processName|resourceId
    const [orderId] = active.id.split("|");
    const [newProcess, newResourceId] = over.id.split("|");

    // Only update if moved to a new cell
    const order = orders.find(o => o.id === orderId);
    if (
      order &&
      (order.assignedResourceId !== newResourceId ||
        (orderToCurrentProcess[orderId] || "Unknown") !== newProcess)
    ) {
      // Update order's assignedResourceId
      await updateDoc(doc(db, "orders", orderId), {
        assignedResourceId: newResourceId,
      });

      // Update process status in Firestore
      const orderProcesses = processes.filter(p => p.workOrderId === orderId);

      // Set all processes to not "In Progress"
      for (const p of orderProcesses) {
        if (p.status === "In Progress" && p.name !== newProcess) {
          await updateDoc(doc(db, "processes", p.id), { status: "Not Started" });
        }
      }

      // Set the new process to "In Progress" or create it if missing
      const targetProcess = orderProcesses.find(p => p.name === newProcess);
      if (targetProcess) {
        await updateDoc(doc(db, "processes", targetProcess.id), { status: "In Progress" });
      } else if (newProcess !== "Unknown") {
        // Create the process if it doesn't exist
        await addDoc(collection(db, "processes"), {
          workOrderId: orderId,
          name: newProcess,
          status: "In Progress",
          // Add any other required fields here (e.g., type, sequence, etc.)
        });
      }

      // Optionally, refresh data here
      fetchProcessesForOrders(orders.map(o => o.id)).then(setProcesses);
    }
  };

  if (loadingResources || loadingOrders) return <CircularProgress />;
  if (resourceError || ordersError) {
    return (
      <Alert severity="error">
        {resourceError?.message || ordersError?.message || "Failed to load data."}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2, overflowX: "auto" }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Resource / Process Matrix
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell>Process \ Resource</TableCell>
              {resources.map(resource => (
                <TableCell key={resource.id} align="center">
                  {resource.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <TableBody>
              {processNames.map(processName => (
                <TableRow key={processName}>
                  <TableCell component="th" scope="row">
                    {processName}
                  </TableCell>
                  {resources.map(resource => (
                    <DroppableCell
                      key={resource.id}
                      processName={processName}
                      resource={resource}
                      orders={matrix[processName][resource.id]}
                      matrix={matrix}
                      handleOpenDetailsDialog={handleOpenDetailsDialog}
                    />
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </DndContext>
        </Table>
      </TableContainer>
      {selectedOrderId && (
        <OrderDetailsDialog
          orderId={selectedOrderId}
          open={isDetailsDialogOpen}
          onClose={handleCloseDetailsDialog}
        />
      )}
    </Box>
  );
};

export default ResourceStatusMatrixBoard;
