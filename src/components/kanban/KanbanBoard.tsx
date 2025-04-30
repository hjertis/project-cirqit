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
import { FirebaseOrder } from "../../hooks/useOrders"; // Adjust path if needed
import OrderDetailsDialog from "../orders/OrderDetailsDialog";
import { STANDARD_PROCESS_NAMES } from "../../constants/constants";

// Define the columns for the Kanban board
const KANBAN_COLUMNS = STANDARD_PROCESS_NAMES;

// Interface for orders shown on the board (add necessary fields)
interface KanbanOrder extends FirebaseOrder {
  id: string;
  currentProcessName: string; // Assumes orders have this field
  // Add other fields needed for the card display (e.g., orderNumber, description)
}

// Type for the board data structure
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

    // Query for orders with status "In Progress"
    const q = query(collection(db, "orders"), where("status", "==", "In Progress"));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const inProgressOrders: KanbanOrder[] = [];
        snapshot.forEach(doc => {
          // --- IMPORTANT ---
          // You need to determine the 'currentProcessName' for each order.
          // This might involve looking at the order's sub-collection of processes
          // or a specific field on the order document itself.
          // For this example, we assume a field 'currentProcessName' exists.
          const orderData = doc.data() as FirebaseOrder;
          // --- Replace this logic with your actual process determination ---
          const currentProcess = orderData.currentProcessName || KANBAN_COLUMNS[0]; // Default or determine logic

          if (KANBAN_COLUMNS.includes(currentProcess)) {
            inProgressOrders.push({
              ...orderData,
              id: doc.id,
              currentProcessName: currentProcess,
            } as KanbanOrder); // Cast might need adjustment
          }
        });

        // Group orders by their current process
        const groupedData: BoardData = KANBAN_COLUMNS.reduce((acc, col) => {
          acc[col] = [];
          return acc;
        }, {} as BoardData);

        inProgressOrders.forEach(order => {
          if (groupedData[order.currentProcessName]) {
            groupedData[order.currentProcessName].push(order);
          }
          // Optionally handle orders whose process isn't a column
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

    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside the list
    if (!destination) {
      return;
    }

    // Dropped in the same place
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const startColumnName = source.droppableId;
    const endColumnName = destination.droppableId;

    // --- Optimistic UI Update ---
    const startColumn = Array.from(boardData[startColumnName]);
    const [movedOrder] = startColumn.splice(source.index, 1);
    const endColumn = Array.from(boardData[endColumnName]);

    // If moving within the same column
    if (startColumnName === endColumnName) {
      endColumn.splice(destination.index, 0, movedOrder);
      const newBoardData = { ...boardData, [startColumnName]: endColumn };
      setBoardData(newBoardData);
    } else {
      // Moving to a different column
      endColumn.splice(destination.index, 0, { ...movedOrder, currentProcessName: endColumnName });
      const newBoardData = {
        ...boardData,
        [startColumnName]: startColumn,
        [endColumnName]: endColumn,
      };
      setBoardData(newBoardData);
    }

    // --- Update Firestore ---
    try {
      const orderRef = doc(db, "orders", draggableId);
      // --- IMPORTANT ---
      // Update the order's status/process field in Firestore.
      // This might involve updating the main order document's 'currentProcessName'
      // or updating the status of specific sub-processes.
      await updateDoc(orderRef, {
        currentProcessName: endColumnName, // Update the process field
        // You might also need to update process start/end dates or status
        updated: Timestamp.now(),
      });
      // Note: If the optimistic update is wrong, Firestore listener will correct it.
    } catch (err) {
      console.error("Failed to update order process:", err);
      setError("Failed to move order. Please refresh.");
      // TODO: Revert optimistic update if needed, though Firestore sync might handle it.
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
                    height: "fit-content", // Adjust height as needed
                    maxHeight: "80vh", // Example max height
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
                              borderLeft: `4px solid ${theme.palette.primary.main}`, // <-- Add this line for blue border
                              "&:hover": { boxShadow: 3 }, // Optional: Add hover effect if desired
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
                              {order.description} {/* Or other relevant info */}
                            </Typography>
                            {/* Add more order details as needed */}
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
