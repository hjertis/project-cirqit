import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  InputAdornment,
  Autocomplete,
} from "@mui/material";
import { CalendarToday as CalendarIcon } from "@mui/icons-material";
import useOrders from "../../hooks/useOrders";

interface AddTimeEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (entry: {
    orderNumber: string;
    startTime: string;
    endTime: string;
    notes: string;
  }) => void;
  loading?: boolean;
  error?: string | null;
}

const AddTimeEntryDialog: React.FC<AddTimeEntryDialogProps> = ({
  open,
  onClose,
  onSave,
  loading,
  error,
}) => {
  const [orderNumber, setOrderNumber] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch all orders for autocomplete
  const { orders: allOrders } = useOrders(undefined, 500);
  const orderOptions = allOrders.map(order => ({
    label: `${order.orderNumber} - ${order.description}`,
    value: order.orderNumber,
  }));

  useEffect(() => {
    if (!open) {
      setOrderNumber("");
      setStartTime("");
      setEndTime("");
      setNotes("");
    }
  }, [open]);

  const handleSave = () => {
    if (!orderNumber || !startTime || !endTime) return;
    onSave({ orderNumber, startTime, endTime, notes });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Time Entry</DialogTitle>
      <DialogContent>
        <Autocomplete
          freeSolo
          options={orderOptions}
          getOptionLabel={option => (typeof option === "string" ? option : option.label)}
          value={orderOptions.find(opt => opt.value === orderNumber) || orderNumber}
          onInputChange={(_e, newInput) => setOrderNumber(newInput)}
          onChange={(_e, newValue) => {
            if (typeof newValue === "string") setOrderNumber(newValue);
            else if (newValue && typeof newValue === "object") setOrderNumber(newValue.value);
            else setOrderNumber("");
          }}
          renderInput={params => (
            <TextField {...params} label="Order Number" margin="normal" fullWidth />
          )}
        />
        <TextField
          label="Start Time"
          type="datetime-local"
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <CalendarIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="End Time"
          type="datetime-local"
          value={endTime}
          onChange={e => setEndTime(e.target.value)}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <CalendarIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="Notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          fullWidth
          margin="normal"
          multiline
        />
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading || !orderNumber || !startTime || !endTime}
          variant="contained"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddTimeEntryDialog;
