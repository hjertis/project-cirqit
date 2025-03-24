// src/pages/StandaloneWorkOrderPrintPage.tsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
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
import ContentWrapper from "../components/layout/ContentWrapper";
import CompactProcessesTable from "../components/orders/CompactProcessesTable";
import CompactSignatureSection from "../components/orders/CompactSignatureSection";
import "../styles/CompactPrintStyles.css";
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

// Format date function
const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
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
        processesData.forEach(process => {
          initialProgress[process.id] = process.progress || 0;
        });
        setProcessProgress(initialProgress);

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
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box
            ref={printRef}
            className="print-container"
            sx={{ maxWidth: "210mm", margin: "0 auto" }}
          >
            {/* Work Order Header - More compact */}
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              className="header"
            >
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontSize: "1rem", fontWeight: "bold", lineHeight: 1.2 }}
                >
                  WORK ORDER: {order.orderNumber}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                  {order.description}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
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

            <Box sx={{ px: 1 }}>
              {/* Order Details Section - Compact Grid Layout */}
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 1, mb: 0.5 }}>
                Order Details
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 1,
                  mb: 1,
                }}
              >
                <Paper variant="outlined" sx={{ p: 0.5 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Part Number:
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                      {order.partNo}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Quantity:
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                      {order.quantity}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Priority:
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                      {order.priority || "Medium"}
                    </Typography>

                    {order.customer && (
                      <>
                        <Typography variant="caption" color="text.secondary">
                          Customer:
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                          {order.customer}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 0.5 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Start Date:
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                      {formatDate(order.start.toDate())}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      End Date:
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                      {formatDate(order.end.toDate())}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Duration:
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                      {Math.ceil(
                        (order.end.toDate().getTime() - order.start.toDate().getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      days
                    </Typography>
                  </Box>
                </Paper>
              </Box>

              {/* Process Tracking */}
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 1, mb: 0.5 }}>
                Process Tracking
              </Typography>
              <CompactProcessesTable
                processes={processes}
                processProgress={processProgress}
                onProgressChange={handleProgressChange}
                isPrintMode={false}
              />

              {/* Quality Verification */}
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 1, mb: 0.5 }}>
                Quality Verification
              </Typography>
              <CompactSignatureSection isPrintMode={false} />

              {/* Notes Section */}
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 1, mb: 0.5 }}>
                Additional Notes
              </Typography>
              <Paper variant="outlined" sx={{ p: 0.5, minHeight: "40px", mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {order.notes || "No additional notes for this order."}
                </Typography>
              </Paper>
            </Box>
          </Box>
        </Paper>
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
            font-size: 10pt;
            line-height: 1.2;
          }

          .no-print {
            display: none !important;
          }

          table {
            page-break-inside: avoid;
            font-size: 9pt;
          }

          th,
          td {
            padding: 3px 5px !important;
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

          /* Reduce vertical spacing between sections */
          h6,
          .MuiTypography-subtitle2 {
            margin-top: 6px !important;
            margin-bottom: 3px !important;
            font-size: 11pt !important;
          }

          .MuiTypography-body2,
          .MuiTypography-body1 {
            font-size: 9pt !important;
          }

          .MuiTypography-caption {
            font-size: 8pt !important;
          }

          /* Reduce padding in cards */
          .MuiCard-root,
          .MuiCardContent-root,
          .MuiPaper-root {
            padding: 4px !important;
          }

          /* Fix Divider appearance */
          .MuiDivider-root {
            border-color: #888 !important;
            margin: 2px 0 !important;
          }

          /* Make signature areas smaller */
          .signature-box {
            height: 30px !important;
          }

          /* Ensure checkboxes are small */
          .MuiCheckbox-root {
            transform: scale(0.7) !important;
          }

          /* Print container padding adjustments */
          .print-container {
            padding: 0 !important;
            max-width: 100% !important;
          }

          /* Thinner borders */
          .MuiPaper-outlined {
            border: 1px solid #ddd !important;
          }
        }
      `}</style>
    </ContentWrapper>
  );
};

export default StandaloneWorkOrderPrintPage;
