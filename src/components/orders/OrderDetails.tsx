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
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Assignment as AssignmentIcon,
  AccessTime as AccessTimeIcon,
  LocalShipping as LocalShippingIcon,
} from "@mui/icons-material";
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../config/firebase";

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
              <Button variant="outlined" startIcon={<AssignmentIcon />} sx={{ mr: 1 }}>
                Assign Resources
              </Button>
              <Button variant="outlined" color="success" startIcon={<LocalShippingIcon />}>
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
      </Paper>
    </Box>
  );
};

export default OrderDetails;
