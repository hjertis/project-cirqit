import React from "react";
import {
  Dialog,
  Box,
  Typography,
  CircularProgress,
  Alert,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button,
} from "@mui/material";
import { TimeEntry } from "../../services/timeTrackingService";
import { formatDuration, formatDateTime, formatDurationHumanReadable } from "../../utils/helpers";

interface OrderTimeEntriesDialogProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  entries: TimeEntry[];
  total: number;
  orderNumber: string;
  onErrorClose?: () => void;
}

const OrderTimeEntriesDialog: React.FC<OrderTimeEntriesDialogProps> = ({
  open,
  onClose,
  loading,
  error,
  entries,
  total,
  orderNumber,
  onErrorClose,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Time Entries for Order: {orderNumber}
      </Typography>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" onClose={onErrorClose || onClose} sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : entries.length === 0 ? (
        <Typography color="textSecondary">No time entries found for this order.</Typography>
      ) : (
        <>
          <TableContainer sx={{ mb: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Start Time</TableCell>
                  <TableCell>End Time</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDateTime(entry.startTime.toDate())}</TableCell>
                    <TableCell>
                      {entry.endTime ? formatDateTime(entry.endTime.toDate()) : "-"}
                    </TableCell>
                    <TableCell>{formatDuration(entry.duration || 0)}</TableCell>
                    <TableCell>
                      <Chip label={entry.status.toUpperCase()} size="small" />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflowWrap: "break-word" }}>
                      {entry.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="subtitle1">
            Total Time: {formatDurationHumanReadable(total)}
          </Typography>
        </>
      )}
      <Box sx={{ mt: 2, textAlign: "right" }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </Box>
    </Box>
  </Dialog>
);

export default OrderTimeEntriesDialog;
