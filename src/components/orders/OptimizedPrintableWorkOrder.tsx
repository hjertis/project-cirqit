// src/components/orders/OptimizedPrintableWorkOrder.tsx
import { useState, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Print as PrintIcon,
  Close as CloseIcon,
  LocalPrintshopOutlined as PrintOutlinedIcon,
} from "@mui/icons-material";
import { Timestamp } from "firebase/firestore";
import CompactProcessesTable from "./CompactProcessesTable";
import CompactSignatureSection from "./CompactSignatureSection";
import "../../styles/CompactPrintStyles.css";

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

interface OptimizedPrintableWorkOrderProps {
  open: boolean;
  onClose: () => void;
  order: any; // Order details
  processes: Process[];
  printMode?: boolean;
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
const formatDate = (timestamp: Timestamp | undefined) => {
  if (!timestamp || !timestamp.toDate) return "N/A";
  const date = timestamp.toDate();
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const OptimizedPrintableWorkOrder = ({
  open,
  onClose,
  order,
  processes,
  printMode = false,
}: OptimizedPrintableWorkOrderProps) => {
  const printContentRef = useRef<HTMLDivElement>(null);

  // State for managing manual progress checkboxes
  const [processProgress, setProcessProgress] = useState<Record<string, number>>({});

  // Initialize processProgress state based on processes
  useState(() => {
    const initialProgress: Record<string, number> = {};
    processes.forEach(process => {
      initialProgress[process.id] = process.progress || 0;
    });
    setProcessProgress(initialProgress);
  });

  const handlePrint = () => {
    const printContent = printContentRef.current;
    if (!printContent) return;

    const originalContents = document.body.innerHTML;
    const printContents = printContent.innerHTML;

    document.body.innerHTML = `
      <style>
        @page {
          size: A4;
          margin: 10mm;
        }
        body {
          font-family: Arial, sans-serif;
          line-height: 1.2;
          font-size: 9pt;
        }
        .signature-box {
          border: 1px dashed #999;
          height: 40px;
          margin: 3px 0;
        }
        .signature-label {
          font-size: 9pt;
          margin-top: 3px;
        }
        .process-row {
          page-break-inside: avoid;
        }
        .progress-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .progress-tick {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .progress-label {
          font-size: 7pt;
          margin-top: -2px;
        }
        .page-break-before {
          page-break-before: always;
        }
        .print-section {
          width: 100%;
          max-width: 100%;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          font-size: 9pt;
        }
        table, th, td {
          border: 1px solid #ddd;
        }
        th, td {
          padding: 3px 5px;
          text-align: left;
        }
        th {
          background-color: #f4f4f4;
          font-weight: bold;
        }
        .header {
          margin-bottom: 10px;
        }
        .section-title {
          font-size: 12px;
          font-weight: bold;
          margin: 8px 0 4px 0;
          padding-bottom: 2px;
          border-bottom: 1px solid #eee;
        }
        .checkbox-cell {
          text-align: center;
          width: 30px;
        }
        .notes-section {
          margin-top: 2px;
          height: 25px;
          border: 1px solid #ddd;
          padding: 1px;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .details-card {
          border: 1px solid #ddd;
          padding: 5px;
          margin-bottom: 8px;
        }
        .detail-row {
          display: grid;
          grid-template-columns: 40% 60%;
          margin-bottom: 2px;
        }
        .detail-label {
          color: #666;
          font-size: 9pt;
        }
        .detail-value {
          font-size: 10pt;
        }
      </style>
      <div class="print-section">${printContents}</div>
    `;

    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload to restore functionality
  };

  const handleProgressChange = (processId: string, progress: number) => {
    setProcessProgress(prev => ({
      ...prev,
      [processId]: progress,
    }));
  };

  if (!order) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: "90vh" },
      }}
    >
      <DialogTitle
        sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <Typography variant="h6">Print Work Order</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 1 }}>
        <Box
          ref={printContentRef}
          className="print-container"
          sx={{ maxWidth: "210mm", margin: "0 auto" }}
        >
          {/* Work Order Header - More compact */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }} className="header">
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
                Date: {order.updated ? formatDate(order.updated) : "N/A"}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 1 }} />

          {/* Order Details - More compact grid layout */}
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 1, mb: 0.5 }}>
            Order Details
          </Typography>
          <Grid container spacing={1} sx={{ mb: 1 }}>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 0.5 }}>
                <Grid container spacing={0.5}>
                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">
                      Part Number:
                    </Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                      {order.partNo}
                    </Typography>
                  </Grid>

                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">
                      Quantity:
                    </Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                      {order.quantity}
                    </Typography>
                  </Grid>

                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">
                      Priority:
                    </Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                      {order.priority || "Medium"}
                    </Typography>
                  </Grid>

                  {order.customer && (
                    <>
                      <Grid item xs={5}>
                        <Typography variant="caption" color="text.secondary">
                          Customer:
                        </Typography>
                      </Grid>
                      <Grid item xs={7}>
                        <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                          {order.customer}
                        </Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 0.5 }}>
                <Grid container spacing={0.5}>
                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">
                      Start Date:
                    </Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                      {formatDate(order.start)}
                    </Typography>
                  </Grid>

                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">
                      End Date:
                    </Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                      {formatDate(order.end)}
                    </Typography>
                  </Grid>

                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">
                      Duration:
                    </Typography>
                  </Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
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

          {/* Process Tracking - Using our compact component */}
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 1, mb: 0.5 }}>
            Process Tracking
          </Typography>
          <CompactProcessesTable
            processes={processes}
            processProgress={processProgress}
            onProgressChange={handleProgressChange}
            isPrintMode={printMode}
          />

          {/* Quality Sign-off Section - Using our compact component */}
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 1, mb: 0.5 }}>
            Quality Verification
          </Typography>
          <CompactSignatureSection isPrintMode={printMode} />

          {/* Notes Section - More compact */}
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 1, mb: 0.5 }}>
            Additional Notes
          </Typography>
          <Paper variant="outlined" sx={{ p: 0.5, minHeight: "40px", mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {order.notes || "No additional notes for this order."}
            </Typography>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button variant="outlined" startIcon={<CloseIcon />} onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" startIcon={<PrintOutlinedIcon />} onClick={handlePrint}>
          Print Work Order
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OptimizedPrintableWorkOrder;
