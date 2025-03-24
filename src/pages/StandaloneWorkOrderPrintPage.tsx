// src/pages/StandaloneWorkOrderPrintPage.tsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Button,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  useTheme,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Print as PrintIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { formatDate } from "../utils/helpers";
import ContentWrapper from "../components/layout/ContentWrapper";

interface Process {
  id: string;
  name: string;
  type: string;
  sequence: number;
  status: string;
  startDate: Timestamp;
  endDate: Timestamp;
  assignedResource: string | null;
  progress: number;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case "Open":
    case "Released":
    case "Pending":
      return "#3f51b5"; // primary
    case "In Progress":
      return "#19857b"; // secondary
    case "Done":
    case "Finished":
    case "Completed":
      return "#4caf50"; // success
    case "Delayed":
    case "Not Started":
      return "#f44336"; // error
    default:
      return "#9e9e9e"; // default
  }
};

const StandaloneWorkOrderPrintPage = () => {
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // State for managing manual progress checkboxes
  const [processProgress, setProcessProgress] = useState<Record<string, number>>({});
  const [processNotes, setProcessNotes] = useState<Record<string, string>>({});

  // Fetch order and processes
  useEffect(() => {
    const fetchOrderData = async () => {
      if (!id) {
        setError("Order ID is missing");
        setLoading(false);
        return;
      }

      try {
        // Fetch order data
        const orderDoc = await getDoc(doc(db, "orders", id));

        if (!orderDoc.exists()) {
          setError("Order not found");
          setLoading(false);
          return;
        }

        const orderData = { id: orderDoc.id, ...orderDoc.data() };
        setOrder(orderData);

        // Fetch processes for this order
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

        // Initialize progress state
        const initialProgress: Record<string, number> = {};
        const initialNotes: Record<string, string> = {};

        processesData.forEach(process => {
          initialProgress[process.id] = process.progress || 0;
          initialNotes[process.id] = "";
        });

        setProcessProgress(initialProgress);
        setProcessNotes(initialNotes);

        setError(null);
      } catch (err) {
        console.error("Error fetching order:", err);
        setError(`Failed to load order: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [id]);

  const handleBack = () => {
    navigate(`/orders/${id}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleProgressChange = (processId: string, progress: number) => {
    setProcessProgress(prev => ({
      ...prev,
      [processId]: progress,
    }));
  };

  if (loading) {
    return (
      <ContentWrapper>
        <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
          <CircularProgress />
        </Box>
      </ContentWrapper>
    );
  }

  if (error || !order) {
    return (
      <ContentWrapper>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Order not found"}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/orders")}>
          Back to Orders
        </Button>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper>
      <Box>
        {/* Page Header with Breadcrumbs - Will be hidden when printing */}
        <Box sx={{ mb: 3 }} className="no-print">
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
            <Link component={RouterLink} to="/" color="inherit">
              Dashboard
            </Link>
            <Link component={RouterLink} to="/orders" color="inherit">
              Orders
            </Link>
            <Link component={RouterLink} to={`/orders/${id}`} color="inherit">
              {id}
            </Link>
            <Typography color="text.primary">Print</Typography>
          </Breadcrumbs>
        </Box>

        {/* Action Buttons - Will be hidden when printing */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }} className="no-print">
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
            Back to Order
          </Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
            Print Work Order
          </Button>
        </Box>

        {/* Printable Content */}
        <Box ref={printRef} sx={{ maxWidth: "210mm", margin: "0 auto", p: 2 }}>
          {/* Work Order Header */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }}>
                WORK ORDER: {order.orderNumber}
              </Typography>
              <Typography variant="subtitle2">{order.description}</Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="body2">
                Status:{" "}
                <span style={{ color: getStatusColor(order.status), fontWeight: "bold" }}>
                  {order.status}
                </span>
              </Typography>
              <Typography variant="caption">
                Date: {order.updated ? formatDate(order.updated.toDate()) : "N/A"}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Order Details - Compact layout */}
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: "bold", mt: 2, mb: 1 }}>
            Order Details
          </Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1 }}>
                <Grid container spacing={1}>
                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">
                      Part Number:
                    </Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2">{order.partNo}</Typography>
                  </Grid>

                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">
                      Quantity:
                    </Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2">{order.quantity}</Typography>
                  </Grid>

                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">
                      Priority:
                    </Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2">{order.priority || "Medium"}</Typography>
                  </Grid>

                  {order.customer && (
                    <>
                      <Grid item xs={5}>
                        <Typography variant="caption" color="text.secondary">
                          Customer:
                        </Typography>
                      </Grid>
                      <Grid item xs={7}>
                        <Typography variant="body2">{order.customer}</Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1 }}>
                <Grid container spacing={1}>
                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">
                      Start Date:
                    </Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2">{formatDate(order.start.toDate())}</Typography>
                  </Grid>

                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">
                      End Date:
                    </Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2">{formatDate(order.end.toDate())}</Typography>
                  </Grid>

                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">
                      Duration:
                    </Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2">
                      {Math.ceil(
                        (order.end.toDate().getTime() - order.start.toDate().getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      days
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>

          {/* Process Tracking - More compact table */}
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: "bold", mt: 2, mb: 1 }}>
            Process Tracking
          </Typography>
          {processes.length > 0 ? (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" align="center">
                      Seq
                    </TableCell>
                    <TableCell>Process</TableCell>
                    <TableCell>Date Range</TableCell>
                    <TableCell>Resource</TableCell>
                    <TableCell align="center">Progress Checkpoints</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {processes.map(process => (
                    <TableRow key={process.id} className="process-row">
                      <TableCell align="center">{process.sequence}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: "medium", fontSize: "0.8rem" }}
                        >
                          {process.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: "0.7rem" }}
                        >
                          {process.type}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="caption">
                          {formatDate(process.startDate.toDate())} -{" "}
                          {formatDate(process.endDate.toDate())}
                        </Typography>
                      </TableCell>
                      <TableCell>{process.assignedResource || "—"}</TableCell>
                      <TableCell>
                        <Box className="progress-section" sx={{ width: "100%" }}>
                          {/* Progress checkboxes in a row */}
                          <Box
                            sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}
                          >
                            {[0, 25, 50, 75, 100].map(value => (
                              <Box
                                key={value}
                                sx={{
                                  textAlign: "center",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                }}
                              >
                                <Checkbox
                                  checked={processProgress[process.id] >= value}
                                  onChange={() => handleProgressChange(process.id, value)}
                                  sx={{ p: 0, m: 0 }}
                                  className="progress-checkbox"
                                  size="small"
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontSize: "0.6rem", display: "block", mt: -0.5 }}
                                >
                                  {value}%
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            height: "35px",
                            border: "1px solid #ddd",
                            width: "100%",
                          }}
                        >
                          &nbsp;
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No processes found for this order.
            </Typography>
          )}

          {/* Quality Sign-off Section - More compact */}
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: "bold", mt: 2, mb: 1 }}>
            Quality Verification
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1 }}>
                <Typography variant="caption" gutterBottom>
                  Inspected By:
                </Typography>
                <Box
                  className="signature-box"
                  sx={{
                    border: "1px dashed #ccc",
                    height: "60px",
                    mt: 0.5,
                  }}
                ></Box>
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="caption">Name: ____________________________</Typography>
                  <Typography variant="caption" display="block">
                    Date: ____________________________
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1 }}>
                <Typography variant="caption" gutterBottom>
                  Approved By:
                </Typography>
                <Box
                  className="signature-box"
                  sx={{
                    border: "1px dashed #ccc",
                    height: "60px",
                    mt: 0.5,
                  }}
                ></Box>
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="caption">Name: ____________________________</Typography>
                  <Typography variant="caption" display="block">
                    Date: ____________________________
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Notes Section - Smaller */}
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: "bold", mt: 2, mb: 1 }}>
            Additional Notes
          </Typography>
          <Paper variant="outlined" sx={{ p: 1, minHeight: "80px", mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {order.notes || "No additional notes for this order."}
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Print Styles */}
      <style jsx="true">{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          body {
            margin: 0;
            padding: 0;
            font-size: 11pt;
            line-height: 1.3;
          }

          .no-print {
            display: none !important;
          }

          table {
            page-break-inside: avoid;
            font-size: 10pt;
          }

          th,
          td {
            padding: 4px 8px !important;
          }

          .process-row {
            page-break-inside: avoid;
          }

          .progress-section {
            height: auto !important;
          }

          .progress-checkbox {
            padding: 2px !important;
          }
        }
      `}</style>
    </ContentWrapper>
  );
};

export default StandaloneWorkOrderPrintPage;
