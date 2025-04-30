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
} from "@mui/material";
import { MoreVert as MoreVertIcon } from "@mui/icons-material";
import { useState } from "react";

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
}

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Order components for WO-1005",
    dueDate: "Today",
    priority: "high",
    completed: false,
  },
  {
    id: "2",
    title: "Review production plan for next week",
    dueDate: "Tomorrow",
    priority: "medium",
    completed: false,
  },
  {
    id: "3",
    title: "Update inventory records",
    dueDate: "Today",
    priority: "low",
    completed: false,
  },
  {
    id: "4",
    title: "Prepare weekly status report",
    dueDate: "Friday",
    priority: "medium",
    completed: false,
  },
  {
    id: "5",
    title: "Fix equipment in production line 2",
    dueDate: "Thursday",
    priority: "high",
    completed: false,
  },
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "error";
    case "medium":
      return "warning";
    case "low":
    default:
      return "info";
  }
};

const UpcomingTasks = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const handleToggle = (id: string) => () => {
    setTasks(tasks.map(task => (task.id === id ? { ...task, completed: !task.completed } : task)));
  };

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
        {tasks.map(task => (
          <Box key={task.id}>
            <ListItem alignItems="flex-start">
              <ListItemAvatar>
                <Checkbox
                  edge="start"
                  checked={task.completed}
                  onChange={handleToggle(task.id)}
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
                    {task.title}
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
                      Due: {task.dueDate}
                    </Typography>
                    <Chip
                      label={task.priority}
                      size="small"
                      color={getPriorityColor(task.priority)}
                      variant="outlined"
                      sx={{ height: 20 }}
                    />
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
        ))}
      </List>

      <Box sx={{ p: 2, textAlign: "center", borderTop: 1, borderColor: "divider" }}>
        <Typography variant="body2" color="text.secondary">
          Showing {tasks.filter(t => !t.completed).length} pending tasks
        </Typography>
      </Box>
    </Paper>
  );
};

export default UpcomingTasks;
