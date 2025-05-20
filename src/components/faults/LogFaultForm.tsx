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
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { IconButton, List, ListItem, ListItemText, ListItemSecondaryAction } from "@mui/material";

const faultTypes = [
  { value: "scrap", label: "Scrap" },
  { value: "missing solder joint", label: "Missing Solder Joint" },
  { value: "missing component", label: "Missing Component" },
  { value: "wrong component", label: "Wrong Component" },
  { value: "damaged component", label: "Damaged Component" },
  { value: "incorrect part", label: "Incorrect Part" },
  { value: "rotated part", label: "Rotated Part" },
  { value: "incorrect assembly", label: "Incorrect Assembly" },
  { value: "tombstone", label: "Tombstone" },
  { value: "cold solder", label: "Cold Solder" },
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
const SERIAL_KEY = "lastFaultSerialNumber";
const PENDING_KEY = "pendingFaults";

type PendingFault = {
  orderId: string;
  partNumber: string;
  faultType: string;
  orderProductPartNumber?: string;
  addDate: string;
  updated: string;
  refPoint?: string;
  serialNumber?: string;
  description?: string;
};

interface LogFaultFormProps {
  initialOrderId?: string;
  initialPartNumber?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const LogFaultForm = ({ initialOrderId = "", initialPartNumber = "" }: LogFaultFormProps = {}) => {
  const { orders, loading: ordersLoading, error: ordersError } = useOrders({}, 1000);
  const [orderId, setOrderId] = useState(() =>
    initialOrderId !== undefined && initialOrderId !== null && initialOrderId !== ""
      ? initialOrderId
      : localStorage.getItem(ORDER_KEY) || ""
  );
  const [orderPartNo, setOrderPartNo] = useState(() =>
    initialPartNumber !== undefined && initialPartNumber !== null && initialPartNumber !== ""
      ? initialPartNumber
      : ""
  );
  const [partNumber, setPartNumber] = useState(() => localStorage.getItem(PART_KEY) || "");
  const [faultType, setFaultType] = useState(() => localStorage.getItem(TYPE_KEY) || "");
  const [refPoint, setRefPoint] = useState("");
  const [serialNumber, setSerialNumber] = useState(() => localStorage.getItem(SERIAL_KEY) || "");
  const [description, setDescription] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [pendingFaults, setPendingFaults] = useState<PendingFault[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState(false);
  const orderInputRef = useRef<HTMLInputElement>(null);

  const inProgressOrders = orders.filter(o => o.status === "In Progress");
  const orderOptions = inProgressOrders.map(order => ({
    id: order.id,
    label: `${order.orderNumber} - ${order.description}`,
    orderNumber: order.orderNumber,
    partNo: order.partNo,
  }));

  // Ensure the current orderId is always present in orderOptions for Autocomplete
  const currentOrderOption =
    orderId && !orderOptions.some(opt => opt.id === orderId)
      ? [{ id: orderId, label: orderId, orderNumber: orderId, partNo: orderPartNo }]
      : [];
  const allOrderOptions = [...currentOrderOption, ...orderOptions];

  useEffect(() => {
    // Only update orderPartNo if the selected order changes and it's not the initial mount with initialPartNumber
    const found = inProgressOrders.find(o => o.id === orderId);
    if (found) {
      setOrderPartNo(found.partNo || "");
    }
  }, [orderId, inProgressOrders]);

  // Add or update a fault in the pending list
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!orderId || !partNumber || !faultType) {
      setError("Order, Part Number, and Fault Type are required.");
      return;
    }
    const faultData: PendingFault = {
      orderId,
      partNumber,
      faultType,
      orderProductPartNumber: orderPartNo,
      addDate: new Date().toISOString(),
      updated: new Date().toISOString(),
      refPoint,
      serialNumber,
      description,
    };
    // Remove empty fields (type-safe)
    (Object.keys(faultData) as (keyof PendingFault)[]).forEach(k => {
      if (faultData[k] === "" || faultData[k] === undefined) {
        delete faultData[k];
      }
    });

    const newPending = [...pendingFaults];
    if (editIndex !== null) {
      newPending[editIndex] = faultData;
      setEditIndex(null);
    } else {
      newPending.push(faultData);
    }
    setPendingFaults(newPending);
    localStorage.setItem(PENDING_KEY, JSON.stringify(newPending));

    localStorage.setItem(ORDER_KEY, orderId);
    localStorage.setItem(PART_KEY, partNumber);
    localStorage.setItem(TYPE_KEY, faultType);
    if (serialNumber && !isNaN(Number(serialNumber))) {
      const next = Number(serialNumber) + 1;
      const nextSerial = String(next).padStart(5, "0");
      localStorage.setItem(SERIAL_KEY, nextSerial);
      setSerialNumber(nextSerial);
    } else {
      localStorage.setItem(SERIAL_KEY, serialNumber);
    }

    setOrderId(localStorage.getItem(ORDER_KEY) || "");
    setPartNumber(localStorage.getItem(PART_KEY) || "");
    setFaultType(localStorage.getItem(TYPE_KEY) || "");
    setRefPoint("");
    setDescription("");
    setSuccess(true);

    setTimeout(() => {
      orderInputRef.current?.focus();
    }, 0);
  };

  // Remove a fault from the pending list
  const handleRemove = (idx: number) => {
    const newPending = pendingFaults.filter((_, i) => i !== idx);
    setPendingFaults(newPending);
    localStorage.setItem(PENDING_KEY, JSON.stringify(newPending));
  };

  // Edit a fault (load into form)
  const handleEdit = (idx: number) => {
    const f = pendingFaults[idx];
    setOrderId(f.orderId || "");
    setPartNumber(f.partNumber || "");
    setFaultType(f.faultType || "");
    setRefPoint(f.refPoint || "");
    setSerialNumber(f.serialNumber || "");
    setDescription(f.description || "");
    setEditIndex(idx);
  };

  // Submit all faults to Firestore
  const handleSubmitAll = async () => {
    setBatchSubmitting(true);
    setBatchSuccess(false);
    setError("");
    try {
      for (const fault of pendingFaults) {
        await addDoc(collection(db, "faults"), {
          ...fault,
          addDate: Timestamp.now(),
          updated: Timestamp.now(),
        });
      }
      setPendingFaults([]);
      localStorage.removeItem(PENDING_KEY);
      setBatchSuccess(true);
    } catch (err) {
      setError("Failed to submit batch: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBatchSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Log Fault / Rework
      </Typography>
      {ordersError && <Alert severity="error">{ordersError}</Alert>}
      {success && <Alert severity="success">Fault added to batch!</Alert>}
      {batchSuccess && <Alert severity="success">All faults submitted!</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Autocomplete
            freeSolo
            options={allOrderOptions}
            getOptionLabel={option => (typeof option === "string" ? option : option.label)}
            value={allOrderOptions.find(opt => opt.id === orderId) || null}
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
            label="Order Product/Part Number"
            value={orderPartNo}
            InputProps={{ readOnly: true }}
            helperText="Main part number for this order"
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
            helperText="Specific part number at fault"
          />
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
          <Button type="submit" variant="contained" color="primary" disabled={false} fullWidth>
            Log Fault
          </Button>
        </Grid>
      </Grid>

      {/* Pending Faults List at the bottom */}
      {pendingFaults.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1">Pending Faults:</Typography>
          <List dense>
            {pendingFaults.map((fault, idx) => (
              <ListItem key={idx} sx={{ bgcolor: "#f5f5f5", mb: 1, borderRadius: 1 }}>
                <ListItemText
                  primary={`${fault.orderId} | ${fault.partNumber} | ${fault.faultType}`}
                  secondary={fault.description}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="edit" onClick={() => handleEdit(idx)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleRemove(idx)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          <Button
            variant="contained"
            color="success"
            onClick={handleSubmitAll}
            disabled={batchSubmitting}
            fullWidth
            sx={{ mt: 1 }}
          >
            {batchSubmitting ? <CircularProgress size={24} /> : "Submit All to Firestore"}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default LogFaultForm;
