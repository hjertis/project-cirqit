import React, { useState, useEffect } from "react";
import { Box, Typography, Paper, CircularProgress, Alert, useTheme } from "@mui/material";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable, // <-- add this import
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { FirebaseOrder } from "../../hooks/useOrders";
import OrderDetailsDialog from "../orders/OrderDetailsDialog";
import { STANDARD_PROCESS_NAMES } from "../../constants/constants";

const KANBAN_COLUMNS = STANDARD_PROCESS_NAMES;

interface KanbanOrder extends FirebaseOrder {
  id: string;
  currentProcessName: string;
}

type BoardData = {
  [key: string]: KanbanOrder[];
};

function KanbanSortableItem({
  order,
  onClick,
}: {
  order: KanbanOrder;
  onClick: (id: string) => void;
}) {
  const theme = useTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: order.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    cursor: "pointer",
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    backgroundColor: "background.paper",
    userSelect: "none",
    marginBottom: 8,
    padding: 12,
    boxShadow: isDragging ? theme.shadows[4] : theme.shadows[1],
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(order.id)}
    >
      <Typography variant="subtitle2" fontWeight="bold">
        {order.orderNumber}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {order.partNo}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {order.description}
      </Typography>
    </Paper>
  );
}

const KanbanDroppableColumn = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        overflowY: "auto",
        flexGrow: 1,
        minHeight: 100,
        backgroundColor: isOver ? "primary.light" : undefined,
        transition: "background 0.2s",
      }}
    >
      {children}
    </Box>
  );
};

const InProgressKanbanBoard: React.FC = () => {
  const theme = useTheme();
  const [boardData, setBoardData] = useState<BoardData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const handleOpenDetailsDialog = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setIsDetailsDialogOpen(false);
    setSelectedOrderId(null);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = query(collection(db, "orders"), where("status", "==", "In Progress"));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const inProgressOrders: KanbanOrder[] = [];
        snapshot.forEach(doc => {
          const orderData = doc.data() as FirebaseOrder;

          const currentProcess = orderData.currentProcessName || KANBAN_COLUMNS[0];

          if (KANBAN_COLUMNS.includes(currentProcess)) {
            inProgressOrders.push({
              ...orderData,
              id: doc.id,
              currentProcessName: currentProcess,
            } as KanbanOrder);
          }
        });

        const groupedData: BoardData = KANBAN_COLUMNS.reduce((acc, col) => {
          acc[col] = [];
          return acc;
        }, {} as BoardData);

        inProgressOrders.forEach(order => {
          if (groupedData[order.currentProcessName]) {
            groupedData[order.currentProcessName].push(order);
          }
        });

        setBoardData(groupedData);
        setLoading(false);
      },
      err => {
        console.error("Error fetching in-progress orders:", err);
        setError("Failed to load orders.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // dnd-kit sensors
  const sensors = useSensors(useSensor(PointerSensor));

  // dnd-kit drag end handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active) return;

    // Find the source column
    let sourceCol = null;
    for (const col of KANBAN_COLUMNS) {
      if (boardData[col].find(o => o.id === active.id)) sourceCol = col;
    }
    if (!sourceCol) return;

    // Determine destination column
    let destCol = null;
    if (KANBAN_COLUMNS.includes(over.id as string)) {
      destCol = over.id;
    } else {
      for (const col of KANBAN_COLUMNS) {
        if (boardData[col].find(o => o.id === over.id)) destCol = col;
      }
    }
    if (!destCol) return;

    // Move the order in the UI
    const sourceList = Array.from(boardData[sourceCol]);
    const destList = Array.from(boardData[destCol]);
    const orderIdx = sourceList.findIndex(o => o.id === active.id);
    const [movedOrder] = sourceList.splice(orderIdx, 1);
    if (sourceCol === destCol) {
      const overIdx = destList.findIndex(o => o.id === over.id);
      destList.splice(overIdx, 0, movedOrder);
      setBoardData({ ...boardData, [sourceCol]: destList });
    } else {
      movedOrder.currentProcessName = destCol;
      const overIdx = destList.findIndex(o => o.id === over.id);
      destList.splice(overIdx === -1 ? destList.length : overIdx, 0, movedOrder);
      setBoardData({ ...boardData, [sourceCol]: sourceList, [destCol]: destList });
    }

    // Update Firestore
    try {
      const orderRef = doc(db, "orders", active.id as string);
      await updateDoc(orderRef, {
        currentProcessName: destCol,
        updated: Timestamp.now(),
      });
    } catch (err) {
      console.error("Failed to update order process:", err);
      setError("Failed to move order. Please refresh.");
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <React.Fragment>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Box sx={{ display: "flex", gap: 2, p: 2, overflowX: "auto" }}>
          {KANBAN_COLUMNS.map(columnName => (
            <Paper
              key={columnName}
              sx={{
                p: 1,
                width: 300,
                minWidth: 300,
                backgroundColor: theme.palette.grey[100],
                display: "flex",
                flexDirection: "column",
                height: "fit-content",
                maxHeight: "80vh",
              }}
            >
              <Typography variant="h6" sx={{ p: 1, mb: 1 }}>
                {columnName} ({boardData[columnName]?.length || 0})
              </Typography>
              <SortableContext
                items={boardData[columnName].map(o => o.id)}
                strategy={verticalListSortingStrategy}
              >
                <KanbanDroppableColumn id={columnName}>
                  {boardData[columnName]?.map(order => (
                    <KanbanSortableItem
                      key={order.id}
                      order={order}
                      onClick={handleOpenDetailsDialog}
                    />
                  ))}
                </KanbanDroppableColumn>
              </SortableContext>
            </Paper>
          ))}
        </Box>
      </DndContext>
      {selectedOrderId && (
        <OrderDetailsDialog
          orderId={selectedOrderId}
          open={isDetailsDialogOpen}
          onClose={handleCloseDetailsDialog}
        />
      )}
    </React.Fragment>
  );
};

export default InProgressKanbanBoard;
