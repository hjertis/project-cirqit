import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
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
  useTheme,
  useMediaQuery,
  Snackbar,
} from "@mui/material";
import {
  Close as CloseIcon,
  Edit as EditIcon,
  AccessTime as AccessTimeIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Print as PrintIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { archiveOrder, restoreOrder } from "../../services/orderService";
import OrderTimeTracking from "./OrderTimeTracking";
import PrintableWorkOrder from "./PrintableWorkOrder";

import EditOrderDialog from "./EditOrderDialog";

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
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
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

interface OrderDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string | null;
  fullPage?: boolean;
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

const OrderDetailsDialog = ({
  open,
  onClose,
  orderId,
  fullPage = false,
}: OrderDetailsDialogProps) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));

  const [order, setOrder] = useState<FirebaseOrder | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveResult, setArchiveResult] = useState<string | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // React Query for order and processes
  const {
    data: orderDataBundle,
    isLoading: loading,
    isError: isOrderError,
    error: orderError,
  } = useQuery({
    queryKey: ["order-details-dialog", orderId, open],
    queryFn: async () => {
      if (!orderId || !open) throw new Error("Order ID is missing");
      const orderDoc = await getDoc(doc(db, "orders", orderId));
      if (!orderDoc.exists()) throw new Error("Order not found");
      const orderData = { id: orderDoc.id, ...orderDoc.data() } as FirebaseOrder;
      const processesQuery = query(
        collection(db, "processes"),
        where("workOrderId", "==", orderId)
      );
      const processesSnapshot = await getDocs(processesQuery);
      const processesData: Process[] = [];
      processesSnapshot.forEach(doc => {
        processesData.push({ id: doc.id, ...doc.data() } as Process);
      });
      processesData.sort((a, b) => a.sequence - b.sequence);
      return { order: orderData, processes: processesData };
    },
    enabled: open && !!orderId,
  });

  useEffect(() => {
    if (orderDataBundle) {
      setOrder(orderDataBundle.order);
      setProcesses(orderDataBundle.processes);
      setError(null);
    }
  }, [orderDataBundle]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
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

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleOrderUpdated = () => {
    setEditDialogOpen(false);

    if (orderId) {
      fetchOrderDetails();
    }
  };

  const handleViewFull = () => {
    if (fullPage) {
      handleEdit();
    } else if (order) {
      navigate(`/orders/${order.id}`);
      onClose();
    }
  };

  const handlePrintOrder = () => {
    setPrintDialogOpen(true);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (isOrderError || error || !order) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">
            {orderError instanceof Error ? orderError.message : error || "Order not found"}
          </Alert>
        </Box>
      );
    }

    const handleArchiveOrder = async () => {
      if (!order) return;

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
      <>
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="h5">Order: {order.orderNumber}</Typography>
            <Chip
              label={order.status}
              color={getStatusColor(order.status)}
              size="small"
              sx={{ ml: 2 }}
            />
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />

        <DialogContent>
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

          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="order details tabs">
              <Tab label="Processes" />
              <Tab label="Notes" />
              <Tab label="Time Tracking" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sequence</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Status</TableCell>
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
                        <TableCell>{process.assignedResource || "Not assigned"}</TableCell>
                        <TableCell align="right">{process.progress}%</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No processes found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Card variant="outlined">
              <CardContent>
                {order.notes ? (
                  <Typography variant="body1">{order.notes}</Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    No notes available for this order.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <OrderTimeTracking
              orderId={order?.id || ""}
              orderNumber={order?.orderNumber || ""}
              processes={processes.map(p => ({
                id: p.id,
                name: p.name,
                type: p.type,
              }))}
            />
          </TabPanel>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          <Button onClick={handleEdit} startIcon={<EditIcon />}>
            Edit Order
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrintOrder}>
            Print Work Order
          </Button>
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
        </DialogActions>
        <Snackbar
          open={!!archiveResult}
          autoHideDuration={6000}
          onClose={() => setArchiveResult(null)}
          message={archiveResult || ""}
        />
        {order && (
          <PrintableWorkOrder
            open={printDialogOpen}
            onClose={() => setPrintDialogOpen(false)}
            order={order}
            processes={processes}
          />
        )}

        <EditOrderDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          orderId={orderId}
          onOrderUpdated={handleOrderUpdated}
        />
      </>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={fullPage || fullScreen}
      scroll="paper"
    >
      {renderContent()}
    </Dialog>
  );
};

export default OrderDetailsDialog;
