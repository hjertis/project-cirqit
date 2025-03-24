// Updated OptimizedPrintableWorkOrder component with print fixes
import { useState, useEffect } from "react";
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
  const [processProgress, setProcessProgress] = useState<Record<string, number>>({});

  // Initialize processProgress state based on processes
  useEffect(() => {
    const initialProgress: Record<string, number> = {};
    processes.forEach(process => {
      initialProgress[process.id] = process.progress || 0;
    });
    setProcessProgress(initialProgress);
  }, [processes]);

  const handlePrint = () => {
    window.print();
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
        className="no-print"
      >
        <Typography variant="h6">Print Work Order</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 1 }} className="print-content">
        <Box className="print-container" sx={{ maxWidth: "210mm", margin: "0 auto" }}>
          {/* Work Order Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 1,
              p: 1,
            }}
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
                Date: {order.updated ? formatDate(order.updated) : "N/A"}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 1 }} />

          {/* Order Details - More compact grid layout */}
          <Box sx={{ px: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 1, mb: 0.5 }}>
              Order Details
            </Typography>
            <Grid container spacing={1} sx={{ mb: 2 }} className="details-grid">
              <Grid item xs={6}>
                <Paper variant="outlined" sx={{ p: 1 }} className="details-card">
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Box sx={{ display: "flex" }} className="detail-row">
                      <Typography variant="caption" color="text.secondary" className="detail-label">
                        Part Number:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "0.8rem" }}
                        className="detail-value"
                      >
                        {order.partNo}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex" }} className="detail-row">
                      <Typography variant="caption" color="text.secondary" className="detail-label">
                        Quantity:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "0.8rem" }}
                        className="detail-value"
                      >
                        {order.quantity}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex" }} className="detail-row">
                      <Typography variant="caption" color="text.secondary" className="detail-label">
                        Priority:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "0.8rem" }}
                        className="detail-value"
                      >
                        {order.priority || "Medium"}
                      </Typography>
                    </Box>

                    {order.customer && (
                      <Box sx={{ display: "flex" }} className="detail-row">
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          className="detail-label"
                        >
                          Customer:
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontSize: "0.8rem" }}
                          className="detail-value"
                        >
                          {order.customer}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={6}>
                <Paper variant="outlined" sx={{ p: 1 }} className="details-card">
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Box sx={{ display: "flex" }} className="detail-row">
                      <Typography variant="caption" color="text.secondary" className="detail-label">
                        Start Date:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "0.8rem" }}
                        className="detail-value"
                      >
                        {formatDate(order.start)}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex" }} className="detail-row">
                      <Typography variant="caption" color="text.secondary" className="detail-label">
                        End Date:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "0.8rem" }}
                        className="detail-value"
                      >
                        {formatDate(order.end)}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex" }} className="detail-row">
                      <Typography variant="caption" color="text.secondary" className="detail-label">
                        Duration:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "0.8rem" }}
                        className="detail-value"
                      >
                        {Math.ceil(
                          (order.end.toDate().getTime() - order.start.toDate().getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{" "}
                        days
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* Process Tracking */}
            <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 1, mb: 0.5 }}>
              Process Tracking
            </Typography>
            <CompactProcessesTable
              processes={processes}
              processProgress={processProgress}
              onProgressChange={handleProgressChange}
              isPrintMode={printMode}
            />

            {/* Quality Verification */}
            <Box className="quality-verification-section">
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 2, mb: 0.5 }}>
                Quality Verification
              </Typography>
              <Box sx={{ width: "100%" }}>
                <CompactSignatureSection isPrintMode={printMode} />
              </Box>
            </Box>

            {/* Notes Section */}
            <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 2, mb: 0.5 }}>
              Additional Notes
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 1, minHeight: "40px", mb: 1 }}
              className="notes-section"
            >
              <Typography variant="caption" color="text.secondary">
                {order.notes || "No additional notes for this order."}
              </Typography>
            </Paper>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }} className="no-print">
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
