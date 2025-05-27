import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  InputAdornment,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { TimeEntry } from "../../services/timeTrackingService";
import { formatDuration, formatDateTime, formatDurationHumanReadable } from "../../utils/helpers";
import OrderTimeEntriesDialog from "./OrderTimeEntriesDialog";

interface OrderTimeLookupProps {
  userTimeEntries: TimeEntry[];
}

const OrderTimeLookup: React.FC<OrderTimeLookupProps> = ({ userTimeEntries }) => {
  const [orderLookupDialogOpen, setOrderLookupDialogOpen] = useState(false);
  const [orderLookupNumber, setOrderLookupNumber] = useState("");
  const [orderLookupEntries, setOrderLookupEntries] = useState<TimeEntry[]>([]);
  const [orderLookupTotal, setOrderLookupTotal] = useState<number>(0);
  const [orderLookupLoading, setOrderLookupLoading] = useState(false); // For dialog loading
  const [orderLookupError, setOrderLookupError] = useState<string | null>(null);

  const handleOpenOrderLookupDialog = async () => {
    setOrderLookupLoading(true);
    setOrderLookupError(null);
    try {
      const entries = userTimeEntries.filter(e => e.orderNumber === orderLookupNumber);
      setOrderLookupEntries(entries);
      const total = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
      setOrderLookupTotal(total);
      setOrderLookupDialogOpen(true);
    } catch (err) {
      console.error("Error preparing order lookup dialog:", err);
      setOrderLookupError("Failed to load order time entries for dialog");
    } finally {
      setOrderLookupLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">Order Time Lookup</Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Search for a specific order and view all its time entries and total time.
        </Typography>
      </Box>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            label="Order Number"
            value={orderLookupNumber}
            onChange={e => setOrderLookupNumber(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            helperText={
              userTimeEntries.length === 0
                ? "No orders available"
                : "Select or type an order number"
            }
          >
            {[...new Set(userTimeEntries.map(e => e.orderNumber))].map(orderNum => (
              <MenuItem key={orderNum} value={orderNum}>
                {orderNum}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenOrderLookupDialog}
            disabled={!orderLookupNumber || orderLookupLoading}
          >
            Show Time Entries in Dialog
          </Button>
        </Grid>
      </Grid>

      {orderLookupNumber && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Preview for Order: <b>{orderLookupNumber}</b>
          </Typography>
          {(() => {
            const entries = userTimeEntries.filter(e => e.orderNumber === orderLookupNumber);
            const total = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
            if (entries.length === 0) {
              return (
                <Typography color="textSecondary">No time entries found for this order.</Typography>
              );
            }
            return (
              <>
                <TableContainer sx={{ mb: 2 }}>
                  <Table size="small">
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
                <Typography variant="subtitle2">
                  Total Time: {formatDurationHumanReadable(total)}
                </Typography>
              </>
            );
          })()}
        </Box>
      )}

      {orderLookupError &&
        !orderLookupDialogOpen && ( // Only show tab error if dialog is not open
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setOrderLookupError(null)}>
            {orderLookupError}
          </Alert>
        )}

      {/* Order Lookup Dialog */}
      <OrderTimeEntriesDialog
        open={orderLookupDialogOpen}
        onClose={() => {
          setOrderLookupDialogOpen(false);
          setOrderLookupError(null);
        }}
        loading={orderLookupLoading}
        error={orderLookupError}
        entries={orderLookupEntries}
        total={orderLookupTotal}
        orderNumber={orderLookupNumber}
        onErrorClose={() => setOrderLookupError(null)}
      />
    </>
  );
};

export default OrderTimeLookup;
