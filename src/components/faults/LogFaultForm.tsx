import { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  TextField,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
  Typography,
} from "@mui/material";
import { Timestamp, collection, addDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import useOrders from "../../hooks/useOrders";
import Autocomplete from "@mui/material/Autocomplete";

const faultTypes = [
  { value: "scrap", label: "Scrap" },
  { value: "solder joint", label: "Solder Joint" },
  { value: "missing component", label: "Missing Component" },
  { value: "wrong component", label: "Wrong Component" },
  { value: "incorrect assembly", label: "Incorrect Assembly" },
  { value: "other", label: "Other" },
  { value: "rework", label: "Rework" },
  { value: "repair", label: "Repair" },
  { value: "test failure", label: "Test Failure" },
  { value: "visual inspection", label: "Visual Inspection" },
  { value: "packaging", label: "Packaging" },
  { value: "shipping damage", label: "Shipping Damage" },
  { value: "customer return", label: "Customer Return" },
];

const ORDER_KEY = "lastFaultOrderId";
const PART_KEY = "lastFaultPartNumber";
const TYPE_KEY = "lastFaultType";

const LogFaultForm = () => {
  const { orders, loading: ordersLoading, error: ordersError } = useOrders({}, 1000);
  const [orderId, setOrderId] = useState(() => localStorage.getItem(ORDER_KEY) || "");
  const [partNumber, setPartNumber] = useState(() => localStorage.getItem(PART_KEY) || "");
  const [faultType, setFaultType] = useState(() => localStorage.getItem(TYPE_KEY) || "");
  const [refPoint, setRefPoint] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const orderInputRef = useRef<HTMLInputElement>(null);

  // Only show orders with status 'In Progress'
  const inProgressOrders = orders.filter(o => o.status === "In Progress");
  const orderOptions = inProgressOrders.map(order => ({
    id: order.id,
    label: `${order.orderNumber} - ${order.description}`,
    orderNumber: order.orderNumber,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!orderId || !partNumber || !faultType) {
      setError("Order, Part Number, and Fault Type are required.");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "faults"), {
        orderId,
        partNumber,
        faultType,
        refPoint: refPoint || undefined,
        serialNumber: serialNumber || undefined,
        description: description || undefined,
        addDate: Timestamp.now(),
        updated: Timestamp.now(),
      });
      setSuccess(true);
      // Persist last used values
      localStorage.setItem(ORDER_KEY, orderId);
      localStorage.setItem(PART_KEY, partNumber);
      localStorage.setItem(TYPE_KEY, faultType);
      setOrderId(orderId); // keep value after submit
      setPartNumber(partNumber); // keep value after submit
      setFaultType(faultType); // keep value after submit
      setRefPoint("");
      setSerialNumber("");
      setDescription("");
      // Focus the first field after submit
      setTimeout(() => {
        orderInputRef.current?.focus();
      }, 0);
    } catch (err: any) {
      setError("Failed to log fault: " + (err.message || err.toString()));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Log Fault / Rework
      </Typography>
      {ordersError && <Alert severity="error">{ordersError}</Alert>}
      {success && <Alert severity="success">Fault logged successfully!</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Autocomplete
            freeSolo
            options={orderOptions}
            getOptionLabel={option => (typeof option === "string" ? option : option.label)}
            value={
              orderOptions.find(opt => opt.id === orderId) ||
              (orderId ? { label: orderId, id: orderId } : null)
            }
            onChange={(_e, newValue) => {
              if (typeof newValue === "string") {
                setOrderId(newValue);
              } else if (newValue && typeof newValue === "object") {
                setOrderId(newValue.id || newValue.orderNumber || "");
              } else {
                setOrderId("");
              }
            }}
            onInputChange={(_e, newInputValue) => setOrderId(newInputValue)}
            loading={ordersLoading}
            renderInput={params => (
              <TextField
                {...params}
                label="Order (In Progress)"
                required
                fullWidth
                autoFocus
                inputRef={orderInputRef}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            label="Part Number"
            value={partNumber}
            onChange={e => setPartNumber(e.target.value)}
            inputProps={{ tabIndex: 0 }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Fault Type</InputLabel>
            <Select
              value={faultType}
              label="Fault Type"
              onChange={e => setFaultType(e.target.value)}
            >
              {faultTypes.map(ft => (
                <MenuItem key={ft.value} value={ft.value}>
                  {ft.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Reference Point"
            value={refPoint}
            onChange={e => setRefPoint(e.target.value)}
            inputProps={{ tabIndex: 0 }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Serial Number"
            value={serialNumber}
            onChange={e => setSerialNumber(e.target.value)}
            inputProps={{ tabIndex: 0 }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description / Notes"
            value={description}
            onChange={e => setDescription(e.target.value)}
            multiline
            rows={2}
            inputProps={{ tabIndex: 0 }}
          />
        </Grid>
        <Grid item xs={12}>
          <Button type="submit" variant="contained" color="primary" disabled={submitting} fullWidth>
            {submitting ? <CircularProgress size={24} /> : "Log Fault"}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LogFaultForm;
