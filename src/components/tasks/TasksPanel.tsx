import React, { useState } from "react";
import {
  Paper,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Box,
  MenuItem,
  FormControl,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Tabs,
  Tab,
  Tooltip,
  CircularProgress,
  Alert,
  Chip,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  Stack,
  Menu,
  Autocomplete,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PushPinIcon from "@mui/icons-material/PushPin";
import AddIcon from "@mui/icons-material/Add";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import SortIcon from "@mui/icons-material/Sort";
import FlagIcon from "@mui/icons-material/Flag";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { formatDateForDisplay, sortTasksByDueDate } from "../../utils/dateUtils";
import { useTasks, Task } from "../../hooks/useTasks";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";

// Define types
interface Order {
  id: number;
  name: string;
  [key: string]: any;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tasks-tabpanel-${index}`}
      aria-labelledby={`tasks-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const TasksPanel: React.FC = () => {
  // Use the auth hook to get the current user
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || "anonymous";

  const taskHook = useTasks(userId);
  // Make TypeScript happy with type assertions
  const tasks = taskHook.tasks as Task[];
  const isLoadingTasks = taskHook.isLoadingTasks as boolean;
  const isErrorTasks = taskHook.isErrorTasks as boolean;
  const addTaskToFirestore = taskHook.addTask as any;
  const toggleTaskCompletion = taskHook.toggleTaskCompletion as any;
  const removeTaskFromFirestore = taskHook.removeTask as any;
  const pinnedOrders = taskHook.pinnedOrders as number[];
  const isLoadingPinnedOrders = taskHook.isLoadingPinnedOrders as boolean;
  const isErrorPinnedOrders = taskHook.isErrorPinnedOrders as boolean;
  const updatePinnedOrders = taskHook.updatePinnedOrders as any;

  const [newTask, setNewTask] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [priority, setPriority] = useState<"high" | "medium" | "low" | "">("");
  const [tabValue, setTabValue] = useState(0);
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [sortCriteria, setSortCriteria] = useState<string>("createdAt");

  // Dialog states
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [pinOrderDialogOpen, setPinOrderDialogOpen] = useState(false);

  // Fetch orders from Firestore
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const querySnapshot = await getDocs(collection(db, "orders"));
      return querySnapshot.docs.map(doc => ({
        id: Number(doc.id),
        name: doc.data().name || `Order ${doc.id}`,
        ...doc.data(),
      })) as Order[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handlers for tasks
  const handleAddTask = async () => {
    if (newTask.trim()) {
      await addTaskToFirestore.mutateAsync({
        text: newTask,
        ...(dueDate && { dueDate: dueDate.toISOString().split("T")[0] }),
        ...(priority && { priority }),
      });
      setNewTask("");
      setDueDate(null);
      setPriority("");
      setAddTaskDialogOpen(false);
    }
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    await toggleTaskCompletion.mutateAsync({ taskId, completed: !completed });
  };

  const handleRemoveTask = async (taskId: string) => {
    await removeTaskFromFirestore.mutateAsync(taskId);
  };

  // Handlers for pinned orders
  const handlePinOrder = async (id: number) => {
    if (!pinnedOrders.includes(id)) {
      const updatedPinnedOrders = [...pinnedOrders, id];
      await updatePinnedOrders.mutateAsync(updatedPinnedOrders);
      setPinOrderDialogOpen(false);
    }
  };

  const handleUnpinOrder = async (id: number) => {
    const updatedPinnedOrders = pinnedOrders.filter((oid: number) => oid !== id);
    await updatePinnedOrders.mutateAsync(updatedPinnedOrders);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }; // Loading states
  const isLoading = isLoadingTasks || isLoadingPinnedOrders || isLoadingOrders;

  // Check specifically for error conditions that are not just empty data
  const hasTasksError = isErrorTasks;
  const hasPinnedOrdersError = isErrorPinnedOrders;

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Box sx={{ position: "relative", minHeight: "500px", minWidth: 400 }}>
      {hasTasksError && tabValue === 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading tasks. Please try again later.
        </Alert>
      )}
      {hasPinnedOrdersError && tabValue === 1 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading pinned orders. Please try again later.
        </Alert>
      )}
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="task management tabs">
          <Tab
            icon={<AssignmentIcon />}
            label="My Tasks"
            id="tasks-tab-0"
            aria-controls="tasks-tabpanel-0"
          />
          <Tab
            icon={<ShoppingBagIcon />}
            label="Pinned Orders"
            id="tasks-tab-1"
            aria-controls="tasks-tabpanel-1"
          />
        </Tabs>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
            gap: 1,
            mt: 1,
          }}
        >
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() =>
              tabValue === 0 ? setAddTaskDialogOpen(true) : setPinOrderDialogOpen(true)
            }
            size="small"
            sx={{ minWidth: 120 }}
          >
            {tabValue === 0 ? "Add Task" : "Pin Order"}
          </Button>
          <Button
            startIcon={<SortIcon />}
            onClick={e => setSortAnchorEl(e.currentTarget)}
            size="small"
          >
            Sort
          </Button>
        </Box>
        {/* End toolbar below tabs */}
        <TabPanel value={tabValue} index={0}>
          {/* Removed duplicate Sort button */}
          <List sx={{ minHeight: "300px" }}>
            {" "}
            {!isErrorTasks && tasks.length === 0 && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">No tasks yet. Add your first task!</Typography>
              </Box>
            )}
            {[...tasks]
              .sort((a, b) => {
                if (sortCriteria === "dueDate") {
                  // Use sortTasksByDueDate utility function
                  const [first, second] = sortTasksByDueDate([a, b]);
                  return first === a ? -1 : 1;
                } else if (sortCriteria === "priority") {
                  const priorityWeight = { high: 3, medium: 2, low: 1, "": 0 };
                  const aWeight = a.priority ? priorityWeight[a.priority] : 0;
                  const bWeight = b.priority ? priorityWeight[b.priority] : 0;
                  return bWeight - aWeight; // Higher priority first
                }
                // Default: sort by created date, newest first
                return b.createdAt - a.createdAt;
              })
              .map((task: Task) => (
                <ListItem
                  key={task.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleRemoveTask(task.id)}
                    >
                      <DeleteIcon color="error" />
                    </IconButton>
                  }
                  sx={{ borderBottom: "1px solid rgba(0, 0, 0, 0.08)" }}
                >
                  <Checkbox
                    checked={task.completed}
                    onChange={() => handleToggleTask(task.id, task.completed)}
                    sx={{ mr: 1 }}
                  />{" "}
                  <ListItemText
                    primary={task.text}
                    secondary={
                      <>
                        {" "}
                        {task.dueDate && (
                          <Chip
                            size="small"
                            icon={<CalendarTodayIcon />}
                            label={`Due: ${formatDateForDisplay(task.dueDate)}`}
                            sx={{ mr: 1, mb: 0.5 }}
                          />
                        )}
                        {task.priority && (
                          <Chip
                            size="small"
                            icon={<FlagIcon />}
                            label={task.priority}
                            color={
                              task.priority === "high"
                                ? "error"
                                : task.priority === "medium"
                                  ? "warning"
                                  : "success"
                            }
                            sx={{ mb: 0.5 }}
                          />
                        )}
                      </>
                    }
                    sx={{ textDecoration: task.completed ? "line-through" : "none" }}
                  />
                </ListItem>
              ))}
          </List>
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          {" "}
          <List sx={{ minHeight: "300px" }}>
            {!isErrorPinnedOrders && pinnedOrders.length === 0 && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">
                  No pinned orders. Pin an order for quick access!
                </Typography>
              </Box>
            )}
            {orders
              .filter((o: Order) => pinnedOrders.includes(Number(o.id)))
              .map((order: Order) => (
                <ListItem
                  key={order.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={() => handleUnpinOrder(Number(order.id))}
                      aria-label="unpin"
                    >
                      <PushPinIcon color="primary" />
                    </IconButton>
                  }
                  sx={{ borderBottom: "1px solid rgba(0, 0, 0, 0.08)" }}
                >
                  <ListItemText primary={order.name} />
                </ListItem>
              ))}
          </List>
        </TabPanel>
        {/* End TabPanel and List rendering */}
      </Paper>
      {/* Add Task Dialog */}
      <Dialog
        open={addTaskDialogOpen}
        onClose={() => setAddTaskDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Task description"
            fullWidth
            variant="outlined"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            sx={{ mb: 2 }}
          />

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Due Date (Optional)"
              value={dueDate}
              onChange={newDate => setDueDate(newDate)}
              slotProps={{ textField: { fullWidth: true, margin: "dense", sx: { mb: 2 } } }}
            />
          </LocalizationProvider>

          <FormControl fullWidth margin="dense">
            <FormLabel id="task-priority-label">Priority</FormLabel>
            <RadioGroup
              row
              aria-labelledby="task-priority-label"
              name="priority"
              value={priority}
              onChange={e => setPriority(e.target.value as "high" | "medium" | "low" | "")}
            >
              <FormControlLabel value="high" control={<Radio />} label="High" />
              <FormControlLabel value="medium" control={<Radio />} label="Medium" />
              <FormControlLabel value="low" control={<Radio />} label="Low" />
              <FormControlLabel value="" control={<Radio />} label="None" />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddTaskDialogOpen(false);
              setNewTask("");
              setDueDate(null);
              setPriority("");
            }}
          >
            Cancel
          </Button>{" "}
          <Button
            onClick={handleAddTask}
            variant="contained"
            disabled={!newTask.trim() || addTaskToFirestore.isLoading}
          >
            {addTaskToFirestore.isLoading ? "Adding..." : "Add Task"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Pin Order Dialog */}
      <Dialog
        open={pinOrderDialogOpen}
        onClose={() => setPinOrderDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Pin an Order</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <Autocomplete
              freeSolo
              options={orders
                .filter((o: Order) => !pinnedOrders.includes(Number(o.id)))
                .map((order: Order) => ({
                  label: order.orderNumber
                    ? `#${order.orderNumber} - ${order.description || order.name}`
                    : `#${order.id} - ${order.description || order.name}`,
                  id: order.id,
                }))}
              getOptionLabel={option => (typeof option === "string" ? option : option.label)}
              onChange={(_event, value) => {
                if (typeof value === "object" && value && "id" in value) {
                  handlePinOrder(Number(value.id));
                }
              }}
              renderInput={params => <TextField {...params} label="Select Order" margin="dense" />}
            />
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPinOrderDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TasksPanel;
