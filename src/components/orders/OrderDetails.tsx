// src/components/orders/OrderDetails.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Snackbar,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Assignment as AssignmentIcon,
  AccessTime as AccessTimeIcon,
  LocalShipping as LocalShippingIcon,
  Person as PersonIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
} from "@mui/icons-material";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { archiveOrder, restoreOrder } from "../../services/orderService";
import OrderTimeTracking from "./OrderTimeTracking";

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
      id={`order-detail-tabpanel-${index}`}
      aria-labelledby={`order-detail-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface FirebaseOrder {
  id: string;
  orderNumber: string;
  description: string;
  partNo: string;
  quantity: number;
  status: string;
  start: Timestamp;
  end: Timestamp;
  customer?: string;
  priority?: string;
  notes?: string;
  updated?: Timestamp;
  state?: string;
}

interface Process {
  id: string;
  workOrderId: string;
  type: string;
  name: string;
  sequence: number;
  status: string;
  startDate: Timestamp;
  endDate: Timestamp;
  assignedResource: string | null;
  progress: number;
}

// Available resources for assignment
const availableResources = [
  "John Doe",
  "Jane Smith",
  "Mike Johnson",
  "Sarah Williams",
  "Robert Brown",
  "Emma Davis",
];

// Status options for processes
const processStatusOptions = ["Not Started", "Pending", "In Progress", "Completed", "Delayed"];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Open":
    case "Released":
    case "Pending":
      return "primary";
    case "In Progress":
      return "secondary";
    case "Done":
    case "Finished":
    case "Completed":
      return "success";
    case "Delayed":
    case "Not Started":
      return "error";
    default:
      return "default";
  }
};

const OrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<FirebaseOrder | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // State for resource assignment modal
  const [assignResourceOpen, setAssignResourceOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [selectedResource, setSelectedResource] = useState<string>("");
  const [assignLoading, setAssignLoading] = useState(false);

  // State for status update modal
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [statusNotes, setStatusNotes] = useState<string>("");
  const [updateLoading, setUpdateLoading] = useState(false);

  // State for success message
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // State for archiving
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveResult, setArchiveResult] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // Fetch order details
        const orderDoc = await getDoc(doc(db, "orders", id));

        if (!orderDoc.exists()) {
          setError("Order not found");
          setLoading(false);
          return;
        }

        setOrder({ id: orderDoc.id, ...orderDoc.data() } as FirebaseOrder);

        // Fetch order processes
        const processesQuery = query(collection(db, "processes"), where("workOrderId", "==", id));

        const processesSnapshot = await getDocs(processesQuery);
        const processesData: Process[] = [];

        processesSnapshot.forEach(doc => {
          processesData.push({
            id: doc.id,
            ...doc.data(),
          } as Process);
        });

        // Sort processes by sequence
        processesData.sort((a, b) => a.sequence - b.sequence);
        setProcesses(processesData);

        setError(null);
      } catch (err) {
        console.error("Error fetching order details:", err);
        setError("Failed to load order details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp || !timestamp.toDate) return "N/A";
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (timestamp: Timestamp | undefined) => {
    if (!timestamp || !timestamp.toDate) return "N/A";
    const date = timestamp.toDate();
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleBack = () => {
    navigate("/orders");
  };

  const handleEdit = () => {
    navigate(`/orders/${id}/edit`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Handle opening the resource assignment modal
  const handleAssignResourceClick = () => {
    setAssignResourceOpen(true);
  };

  // Handle resource selection in the modal
  const handleResourceSelect = (processId: string, resource: string) => {
    setSelectedProcess(processes.find(p => p.id === processId) || null);
    setSelectedResource(resource);
  };

  // Handle saving the resource assignment
  const handleSaveAssignment = async () => {
    if (!selectedProcess || !selectedResource) return;

    setAssignLoading(true);

    try {
      // Update the process document in Firestore
      const processRef = doc(db, "processes", selectedProcess.id);
      await updateDoc(processRef, {
        assignedResource: selectedResource,
        updated: Timestamp.fromDate(new Date()),
      });

      // Update the local state
      setProcesses(
        processes.map(process =>
          process.id === selectedProcess.id
            ? { ...process, assignedResource: selectedResource }
            : process
        )
      );

      // Show success message
      setSuccessMessage(`Resource ${selectedResource} assigned to process ${selectedProcess.name}`);
      setSnackbarOpen(true);

      // Close the modal
      setAssignResourceOpen(false);
      setSelectedProcess(null);
      setSelectedResource("");
    } catch (err) {
      console.error("Error assigning resource:", err);
      setError(`Failed to assign resource: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAssignLoading(false);
    }
  };

  // Handle opening the status update modal
  const handleUpdateStatusClick = () => {
    setUpdateStatusOpen(true);
  };

  // Handle status selection in the modal
  const handleStatusSelect = (processId: string, status: string) => {
    setSelectedProcess(processes.find(p => p.id === processId) || null);
    setSelectedStatus(status);
  };

  // Handle saving the status update
  const handleSaveStatus = async () => {
    if (!selectedProcess || !selectedStatus) return;

    setUpdateLoading(true);

    try {
      // Update the process document in Firestore
      const processRef = doc(db, "processes", selectedProcess.id);

      const updates: Record<string, any> = {
        status: selectedStatus,
        updated: Timestamp.fromDate(new Date()),
      };

      // If moving to completed, set progress to 100%
      if (selectedStatus === "Completed") {
        updates.progress = 100;
      }
      // If moving to In Progress from an earlier state, set progress to a default value
      else if (
        selectedStatus === "In Progress" &&
        (selectedProcess.status === "Not Started" || selectedProcess.status === "Pending")
      ) {
        updates.progress = 25;
      }

      await updateDoc(processRef, updates);

      // Update the local state
      setProcesses(
        processes.map(process =>
          process.id === selectedProcess.id
            ? {
                ...process,
                status: selectedStatus,
                ...(updates.progress ? { progress: updates.progress } : {}),
              }
            : process
        )
      );

      // Show success message
      setSuccessMessage(`Status updated to ${selectedStatus} for process ${selectedProcess.name}`);
      setSnackbarOpen(true);

      // Close the modal
      setUpdateStatusOpen(false);
      setSelectedProcess(null);
      setSelectedStatus("");
      setStatusNotes("");
    } catch (err) {
      console.error("Error updating status:", err);
      setError(`Failed to update status: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  // Handle closing the snackbar
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error || "Order not found"}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Orders
        </Button>
      </Box>
    );
  }

  const handleArchiveOrder = async () => {
    if (!order) return;

    // Show a confirmation dialog
    const confirm = window.confirm(
      `Are you sure you want to archive order ${order.orderNumber}? This will move it to the archive collection.`
    );

    if (!confirm) return;

    setIsArchiving(true);
    setArchiveResult(null);

    try {
      const result = await archiveOrder(order.id);

      if (result.success) {
        setArchiveResult(`Successfully archived: ${result.message}`);
        // Redirect to the orders list after a short delay
        setTimeout(() => {
          navigate("/orders");
        }, 2000);
      } else {
        setArchiveResult(`Failed to archive: ${result.message}`);
      }
    } catch (error) {
      setArchiveResult(
        `Error archiving order: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestoreOrder = async () => {
    if (!order) return;

    // Show a confirmation dialog
    const confirm = window.confirm(
      `Are you sure you want to restore order ${order.orderNumber} from the archive? This will move it back to active orders.`
    );

    if (!confirm) return;

    setIsArchiving(true);
    setArchiveResult(null);

    try {
      const result = await restoreOrder(order.id);

      if (result.success) {
        setArchiveResult(`Successfully restored: ${result.message}`);
        // Redirect to the orders list after a short delay
        setTimeout(() => {
          navigate("/orders");
        }, 2000);
      } else {
        setArchiveResult(`Failed to restore: ${result.message}`);
      }
    } catch (error) {
      setArchiveResult(
        `Error restoring order: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <Box>
      {/* Header with actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton onClick={handleBack} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5">Order: {order.orderNumber}</Typography>
            <Chip
              label={order.status}
              color={getStatusColor(order.status)}
              size="small"
              sx={{ ml: 2 }}
            />
          </Box>
          <Box>
            <Button startIcon={<EditIcon />} onClick={handleEdit} sx={{ mr: 1 }}>
              Edit
            </Button>
            <Button startIcon={<PrintIcon />} onClick={handlePrint} sx={{ mr: 1 }}>
              Print
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Order summary cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Details
              </Typography>
              <Button
                color="secondary"
                variant="outlined"
                onClick={handleArchiveOrder}
                disabled={isArchiving || order.status !== "Finished"}
                startIcon={isArchiving ? <CircularProgress size={20} /> : <ArchiveIcon />}
                sx={{ ml: 1 }}
              >
                {isArchiving ? "Archiving..." : "Archive Order"}
              </Button>
              <Button
                color="secondary"
                variant="outlined"
                onClick={handleRestoreOrder}
                disabled={isArchiving}
                startIcon={isArchiving ? <CircularProgress size={20} /> : <UnarchiveIcon />}
                sx={{ ml: 1 }}
              >
                {isArchiving ? "Restoring..." : "Restore Order"}
              </Button>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Description:
                  </Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="body2">{order.description}</Typography>
                </Grid>

                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Part Number:
                  </Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="body2">{order.partNo}</Typography>
                </Grid>

                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Quantity:
                  </Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="body2">{order.quantity}</Typography>
                </Grid>

                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Priority:
                  </Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="body2">{order.priority || "Medium"}</Typography>
                </Grid>

                {order.customer && (
                  <>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        Customer:
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">{order.customer}</Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Schedule
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Start Date:
                  </Typography>
                </Grid>
                <Grid item xs={8}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                    <Typography variant="body2">{formatDate(order.start)}</Typography>
                  </Box>
                </Grid>

                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    End Date:
                  </Typography>
                </Grid>
                <Grid item xs={8}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                    <Typography variant="body2">{formatDate(order.end)}</Typography>
                  </Box>
                </Grid>

                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Duration:
                  </Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="body2">
                    {order.start && order.end
                      ? `${Math.ceil((order.end.toDate().getTime() - order.start.toDate().getTime()) / (1000 * 60 * 60 * 24))} days`
                      : "N/A"}
                  </Typography>
                </Grid>

                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Last Updated:
                  </Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="body2">
                    {order.updated ? formatDateTime(order.updated) : "N/A"}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for order details, processes, etc. */}
      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="order details tabs">
            <Tab label="Processes" />
            <Tab label="Notes" />
            <Tab label="History" />
            <Tab label="Time Tracking" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Sequence</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell align="right">Progress</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processes.length > 0 ? (
                  processes.map(process => (
                    <TableRow key={process.id} hover>
                      <TableCell>{process.sequence}</TableCell>
                      <TableCell>{process.type}</TableCell>
                      <TableCell>{process.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={process.status}
                          color={getStatusColor(process.status)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{formatDate(process.startDate)}</TableCell>
                      <TableCell>{formatDate(process.endDate)}</TableCell>
                      <TableCell>{process.assignedResource || "Not assigned"}</TableCell>
                      <TableCell align="right">{process.progress}%</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No processes found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {processes.length > 0 && (
            <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                startIcon={<AssignmentIcon />}
                sx={{ mr: 1 }}
                onClick={handleAssignResourceClick}
              >
                Assign Resources
              </Button>
              <Button
                variant="outlined"
                color="success"
                startIcon={<LocalShippingIcon />}
                onClick={handleUpdateStatusClick}
              >
                Update Status
              </Button>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Order Notes
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {order.notes ? (
                  <Typography variant="body1">{order.notes}</Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    No notes available for this order.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Order History
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.updated ? (
                        <TableRow>
                          <TableCell>{formatDateTime(order.updated)}</TableCell>
                          <TableCell>Order Updated</TableCell>
                          <TableCell>System</TableCell>
                          <TableCell>Order status updated to {order.status}</TableCell>
                        </TableRow>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            No history available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 2 }}>
            <OrderTimeTracking
              orderId={order.id}
              orderNumber={order.orderNumber}
              processes={processes.map(p => ({
                id: p.id,
                name: p.name,
                type: p.type,
              }))}
            />
          </Box>
        </TabPanel>
      </Paper>

      {/* Resource Assignment Dialog */}
      <Dialog
        open={assignResourceOpen}
        onClose={() => setAssignResourceOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Assign Resources</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Select a process and assign a resource to it
          </Typography>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="process-select-label">Process</InputLabel>
            <Select
              labelId="process-select-label"
              id="process-select"
              value={selectedProcess?.id || ""}
              label="Process"
              onChange={e => {
                const processId = e.target.value as string;
                const process = processes.find(p => p.id === processId);
                setSelectedProcess(process || null);
                // Pre-select current resource if any
                if (process && process.assignedResource) {
                  setSelectedResource(process.assignedResource);
                } else {
                  setSelectedResource("");
                }
              }}
            >
              {processes.map(process => (
                <MenuItem key={process.id} value={process.id}>
                  {process.sequence}. {process.name} ({process.type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedProcess && (
            <FormControl fullWidth>
              <InputLabel id="resource-select-label">Resource</InputLabel>
              <Select
                labelId="resource-select-label"
                id="resource-select"
                value={selectedResource}
                label="Resource"
                onChange={e => setSelectedResource(e.target.value)}
                startAdornment={selectedResource ? <PersonIcon sx={{ ml: 1, mr: 0.5 }} /> : null}
              >
                {availableResources.map(resource => (
                  <MenuItem key={resource} value={resource}>
                    {resource}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignResourceOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveAssignment}
            disabled={!selectedProcess || !selectedResource || assignLoading}
          >
            {assignLoading ? "Saving..." : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog
        open={updateStatusOpen}
        onClose={() => setUpdateStatusOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Update Process Status</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Select a process and update its status
          </Typography>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="process-status-select-label">Process</InputLabel>
            <Select
              labelId="process-status-select-label"
              id="process-status-select"
              value={selectedProcess?.id || ""}
              label="Process"
              onChange={e => {
                const processId = e.target.value as string;
                const process = processes.find(p => p.id === processId);
                setSelectedProcess(process || null);
                // Pre-select current status
                if (process) {
                  setSelectedStatus(process.status);
                } else {
                  setSelectedStatus("");
                }
              }}
            >
              {processes.map(process => (
                <MenuItem key={process.id} value={process.id}>
                  {process.sequence}. {process.name} ({process.type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedProcess && (
            <>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="status-select-label">Status</InputLabel>
                <Select
                  labelId="status-select-label"
                  id="status-select"
                  value={selectedStatus}
                  label="Status"
                  onChange={e => setSelectedStatus(e.target.value)}
                >
                  {processStatusOptions.map(status => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Notes (Optional)"
                multiline
                rows={3}
                value={statusNotes}
                onChange={e => setStatusNotes(e.target.value)}
                placeholder="Add any notes about this status change"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateStatusOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveStatus}
            disabled={!selectedProcess || !selectedStatus || updateLoading}
            color="primary"
          >
            {updateLoading ? "Updating..." : "Update Status"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={successMessage}
      />
    </Box>
  );
};

export default OrderDetails;
