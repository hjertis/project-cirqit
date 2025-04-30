import React, { useState, useEffect } from "react";
import { Box, Typography, Paper, CircularProgress, Alert, useTheme } from "@mui/material";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
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

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) {
      return;
    }

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const startColumnName = source.droppableId;
    const endColumnName = destination.droppableId;

    const startColumn = Array.from(boardData[startColumnName]);
    const [movedOrder] = startColumn.splice(source.index, 1);
    const endColumn = Array.from(boardData[endColumnName]);

    if (startColumnName === endColumnName) {
      endColumn.splice(destination.index, 0, movedOrder);
      const newBoardData = { ...boardData, [startColumnName]: endColumn };
      setBoardData(newBoardData);
    } else {
      endColumn.splice(destination.index, 0, { ...movedOrder, currentProcessName: endColumnName });
      const newBoardData = {
        ...boardData,
        [startColumnName]: startColumn,
        [endColumnName]: endColumn,
      };
      setBoardData(newBoardData);
    }

    try {
      const orderRef = doc(db, "orders", draggableId);

      await updateDoc(orderRef, {
        currentProcessName: endColumnName,

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
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ display: "flex", gap: 2, p: 2, overflowX: "auto" }}>
          {KANBAN_COLUMNS.map(columnName => (
            <Droppable droppableId={columnName} key={columnName}>
              {(provided, snapshot) => (
                <Paper
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    p: 1,
                    width: 300,
                    minWidth: 300,
                    backgroundColor: snapshot.isDraggingOver
                      ? theme.palette.action.hover
                      : theme.palette.grey[100],
                    display: "flex",
                    flexDirection: "column",
                    height: "fit-content",
                    maxHeight: "80vh",
                  }}
                >
                  <Typography variant="h6" sx={{ p: 1, mb: 1 }}>
                    {columnName} ({boardData[columnName]?.length || 0})
                  </Typography>
                  <Box sx={{ overflowY: "auto", flexGrow: 1, minHeight: 100 }}>
                    {boardData[columnName]?.map((order, index) => (
                      <Draggable key={order.id} draggableId={order.id} index={index}>
                        {(providedDraggable, snapshotDraggable) => (
                          <Paper
                            ref={providedDraggable.innerRef}
                            {...providedDraggable.draggableProps}
                            {...providedDraggable.dragHandleProps}
                            elevation={snapshotDraggable.isDragging ? 4 : 1}
                            sx={{
                              p: 1.5,
                              mb: 1,
                              userSelect: "none",
                              backgroundColor: "background.paper",
                              opacity: snapshotDraggable.isDragging ? 0.8 : 1,
                              cursor: "pointer",
                              borderLeft: `4px solid ${theme.palette.primary.main}`,
                              "&:hover": { boxShadow: 3 },
                            }}
                            onClick={() => handleOpenDetailsDialog(order.id)}
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
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                </Paper>
              )}
            </Droppable>
          ))}
        </Box>
      </DragDropContext>
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
