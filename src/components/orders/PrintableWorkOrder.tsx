// src/components/orders/PrintableWorkOrder.tsx
import { useState, useRef } from "react";
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
  Dialog,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Print as PrintIcon,
  Close as CloseIcon,
  LocalPrintshopOutlined as PrintOutlinedIcon,
} from "@mui/icons-material";
import { formatDate } from "../../utils/helpers";
import { Timestamp } from "firebase/firestore";

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

interface PrintableWorkOrderProps {
  open: boolean;
  onClose: () => void;
  order: any; // Order details
  processes: Process[];
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

const PrintableWorkOrder = ({ open, onClose, order, processes }: PrintableWorkOrderProps) => {
  const printContentRef = useRef<HTMLDivElement>(null);

  // State for managing manual progress checkboxes
  const [processProgress, setProcessProgress] = useState<Record<string, number>>({});
  const [processNotes, setProcessNotes] = useState<Record<string, string>>({});

  // Initialize progress and notes for each process
  useState(() => {
    const initialProgress: Record<string, number> = {};
    const initialNotes: Record<string, string> = {};

    processes.forEach(process => {
      initialProgress[process.id] = process.progress || 0;
      initialNotes[process.id] = "";
    });

    setProcessProgress(initialProgress);
    setProcessNotes(initialNotes);
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
          line-height: 1.3;
          font-size: 11pt;
        }
        .print-section {
          width: 100%;
          max-width: 100%;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 10pt;
        }
        table, th, td {
          border: 1px solid #ddd;
        }
        th, td {
          padding: 4px 8px;
          text-align: left;
        }
        th {
          background-color: #f4f4f4;
          font-weight: bold;
        }
        .header {
          margin-bottom: 15px;
        }
        .section-title {
          font-size: 14px;
          font-weight: bold;
          margin: 12px 0 6px 0;
          padding-bottom: 4px;
          border-bottom: 1px solid #eee;
        }
        .checkbox-cell {
          text-align: center;
          width: 40px;
        }
        .progress-container {
          width: 100%;
          background-color: #f4f4f4;
          border-radius: 4px;
          height: 10px;
          margin-top: 3px;
        }
        .progress-bar {
          height: 10px;
          background-color: #4caf50;
          border-radius: 4px;
        }
        .notes-section {
          margin-top: 3px;
          height: 40px;
          border: 1px solid #ddd;
          padding: 2px;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .details-card {
          border: 1px solid #ddd;
          padding: 8px;
          margin-bottom: 10px;
        }
        .detail-row {
          display: grid;
          grid-template-columns: 40% 60%;
          margin-bottom: 4px;
        }
        .detail-label {
          color: #666;
          font-size: 10pt;
        }
        .detail-value {
          font-size: 10pt;
        }
        .signature-box {
          border: 1px dashed #999;
          height: 50px;
          margin: 5px 0;
        }
        .signature-label {
          font-size: 10pt;
          margin-top: 5px;
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
          font-size: 8pt;
          margin-top: -2px;
        }
        .page-break-before {
          page-break-before: always;
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box sx={{ display: "flex", justifyContent: "space-between", p: 2, alignItems: "center" }}>
        <Typography variant="h6">Print Work Order</Typography>
        <Box>
          <Tooltip title="Print">
            <IconButton onClick={handlePrint} color="primary">
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Divider />

      <Box sx={{ p: 3, overflow: "auto", maxHeight: "80vh" }}>
        <Box ref={printContentRef} className="print-section">
          {/* Work Order Header */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }} className="header">
            <Box>
              <Typography variant="h5" sx={{ fontSize: "1.2rem", fontWeight: "bold" }}>
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

          {/* Order Details - Using grid layout for better print control */}
          <Typography variant="h6" className="section-title">
            Order Details
          </Typography>
          <Box className="details-grid">
            <Box className="details-card">
              <Box className="detail-row">
                <Typography className="detail-label">Part Number:</Typography>
                <Typography className="detail-value">{order.partNo}</Typography>
              </Box>

              <Box className="detail-row">
                <Typography className="detail-label">Quantity:</Typography>
                <Typography className="detail-value">{order.quantity}</Typography>
              </Box>

              <Box className="detail-row">
                <Typography className="detail-label">Priority:</Typography>
                <Typography className="detail-value">{order.priority || "Medium"}</Typography>
              </Box>

              {order.customer && (
                <Box className="detail-row">
                  <Typography className="detail-label">Customer:</Typography>
                  <Typography className="detail-value">{order.customer}</Typography>
                </Box>
              )}
            </Box>

            <Box className="details-card">
              <Box className="detail-row">
                <Typography className="detail-label">Start Date:</Typography>
                <Typography className="detail-value">{formatDate(order.start.toDate())}</Typography>
              </Box>

              <Box className="detail-row">
                <Typography className="detail-label">End Date:</Typography>
                <Typography className="detail-value">{formatDate(order.end.toDate())}</Typography>
              </Box>

              <Box className="detail-row">
                <Typography className="detail-label">Duration:</Typography>
                <Typography className="detail-value">
                  {Math.ceil(
                    (order.end.toDate().getTime() - order.start.toDate().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}{" "}
                  days
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Process Tracking - Using compact table designed for printing */}
          <Typography variant="h6" className="section-title">
            Process Tracking
          </Typography>
          {processes.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center" style={{ width: "40px" }}>
                    Seq
                  </TableCell>
                  <TableCell style={{ width: "25%" }}>Process</TableCell>
                  <TableCell style={{ width: "20%" }}>Date Range</TableCell>
                  <TableCell style={{ width: "15%" }}>Resource</TableCell>
                  <TableCell align="center">Progress Checkpoints</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processes.map(process => (
                  <TableRow key={process.id} className="process-row">
                    <TableCell align="center">{process.sequence}</TableCell>
                    <TableCell>
                      <Typography style={{ fontWeight: "bold", fontSize: "10pt" }}>
                        {process.name}
                      </Typography>
                      <Typography style={{ color: "#666", fontSize: "9pt" }}>
                        {process.type}
                      </Typography>
                    </TableCell>
                    <TableCell style={{ whiteSpace: "nowrap" }}>
                      {formatDate(process.startDate.toDate())} -{" "}
                      {formatDate(process.endDate.toDate())}
                    </TableCell>
                    <TableCell>{process.assignedResource || "—"}</TableCell>
                    <TableCell>
                      <Box className="progress-section">
                        {/* Progress checkboxes in a row */}
                        {[0, 25, 50, 75, 100].map(value => (
                          <Box key={value} className="progress-tick">
                            <input
                              type="checkbox"
                              checked={processProgress[process.id] >= value}
                              onChange={() => handleProgressChange(process.id, value)}
                            />
                            <span className="progress-label">{value}%</span>
                          </Box>
                        ))}
                      </Box>
                      <Box className="notes-section">&nbsp;</Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" style={{ color: "#666" }}>
              No processes found for this order.
            </Typography>
          )}

          {/* Quality Sign-off Section - Compact design */}
          <Typography variant="h6" className="section-title page-break-before">
            Quality Verification
          </Typography>
          <Box className="details-grid">
            <Box className="details-card">
              <Typography style={{ fontSize: "10pt" }}>Inspected By:</Typography>
              <Box className="signature-box"></Box>
              <Typography className="signature-label">
                Name: ____________________________
              </Typography>
              <Typography className="signature-label">
                Date: ____________________________
              </Typography>
            </Box>

            <Box className="details-card">
              <Typography style={{ fontSize: "10pt" }}>Approved By:</Typography>
              <Box className="signature-box"></Box>
              <Typography className="signature-label">
                Name: ____________________________
              </Typography>
              <Typography className="signature-label">
                Date: ____________________________
              </Typography>
            </Box>
          </Box>

          {/* Notes Section */}
          <Typography variant="h6" className="section-title">
            Additional Notes
          </Typography>
          <Box sx={{ border: "1px solid #ddd", p: 1, minHeight: "60px", mb: 2 }}>
            <Typography variant="body2" sx={{ color: "#666", fontSize: "10pt" }}>
              {order.notes || "No additional notes for this order."}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider />
      <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button variant="outlined" startIcon={<CloseIcon />} onClick={onClose} sx={{ mr: 1 }}>
          Cancel
        </Button>
        <Button variant="contained" startIcon={<PrintOutlinedIcon />} onClick={handlePrint}>
          Print Work Order
        </Button>
      </Box>
    </Dialog>
  );
};

export default PrintableWorkOrder;
