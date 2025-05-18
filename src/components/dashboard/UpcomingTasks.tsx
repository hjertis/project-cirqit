import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Checkbox,
  Chip,
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert as MuiAlert,
} from "@mui/material";
import { MoreVert as MoreVertIcon } from "@mui/icons-material";
import { useTasks } from "../../hooks/useTasks";
import { useAuth } from "../../context/AuthContext";
import { formatDateForDisplay } from "../../utils/dateUtils";
import { useState } from "react";

const UpcomingTasks = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || "anonymous";
  const { tasks, isLoadingTasks, toggleTaskCompletion } = useTasks(userId);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingTask, setPendingTask] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  // Only show tasks that are not completed, sorted by due date (ascending)
  const sortedTasks = [...tasks]
    .filter(t => !t.completed)
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  return (
    <Paper sx={{ height: "100%" }}>
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h6">Upcoming Tasks</Typography>
        <IconButton size="small">
          <MoreVertIcon />
        </IconButton>
      </Box>

      <List sx={{ maxHeight: 360, overflow: "auto" }}>
        {isLoadingTasks ? (
          <Typography sx={{ p: 2 }}>Loading...</Typography>
        ) : sortedTasks.length === 0 ? (
          <Typography sx={{ p: 2 }}>No upcoming tasks.</Typography>
        ) : (
          sortedTasks.map(task => (
            <Box key={task.id}>
              <ListItem alignItems="flex-start">
                <ListItemAvatar>
                  <Checkbox
                    edge="start"
                    checked={task.completed}
                    onChange={() => {
                      setPendingTask(task.id);
                      setConfirmDialogOpen(true);
                    }}
                    inputProps={{ "aria-labelledby": `task-${task.id}` }}
                  />
                </ListItemAvatar>
                <ListItemText
                  id={`task-${task.id}`}
                  primary={
                    <Typography
                      component="span"
                      variant="body1"
                      sx={{
                        textDecoration: task.completed ? "line-through" : "none",
                        color: task.completed ? "text.secondary" : "text.primary",
                      }}
                    >
                      {task.text}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ mr: 1 }}
                      >
                        Due: {task.dueDate ? formatDateForDisplay(task.dueDate) : "No due date"}
                      </Typography>
                      {task.priority && (
                        <Chip
                          label={task.priority}
                          size="small"
                          color={
                            task.priority === "high"
                              ? "error"
                              : task.priority === "medium"
                                ? "warning"
                                : "info"
                          }
                          variant="outlined"
                          sx={{ height: 20 }}
                        />
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="more options">
                    <MoreVertIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider component="li" />
            </Box>
          ))
        )}
      </List>

      <Box sx={{ p: 2, textAlign: "center", borderTop: 1, borderColor: "divider" }}>
        <Typography variant="body2" color="text.secondary">
          Showing {sortedTasks.length} pending tasks
        </Typography>
      </Box>

      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Mark Task as Done?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to mark this task as completed?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              if (pendingTask) {
                const completedTask = tasks.find(t => t.id === pendingTask);
                await toggleTaskCompletion.mutateAsync({ taskId: pendingTask, completed: true });
                setSnackbarMsg(
                  completedTask
                    ? `Task "${completedTask.text}" marked as completed.`
                    : "Task marked as completed."
                );
                setSnackbarOpen(true);
              }
              setConfirmDialogOpen(false);
              setPendingTask(null);
            }}
            variant="contained"
            color="primary"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <MuiAlert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: "100%" }}>
          {snackbarMsg}
        </MuiAlert>
      </Snackbar>
    </Paper>
  );
};

export default UpcomingTasks;
