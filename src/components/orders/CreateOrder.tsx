// src/components/orders/CreateOrder.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Grid,
  MenuItem,
  Button,
  Divider,
  Alert,
  Snackbar,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { collection, Timestamp, doc, setDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { getResources, Resource } from "../../services/resourceService";

// Define the form data interface
interface OrderFormData {
  orderNumber: string;
  description: string;
  partNo: string;
  quantity: number;
  status: string;
  startDate: string;
  endDate: string;
  customer: string;
  priority: string;
  notes: string;
  processes: ProcessTemplate[];
  assignedResourceId?: string;
}

// Define process template interface
interface ProcessTemplate {
  type: string;
  name: string;
  duration: number; // in days
  sequence: number;
}

// Format date as YYYY-MM-DD for input fields
const formatDateForInput = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// Parse date string from input field
const parseInputDate = (dateString: string): Date => {
  return new Date(dateString);
};

// Calculate new date by adding days
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Initial form state
const initialFormData: OrderFormData = {
  orderNumber: "",
  description: "",
  partNo: "",
  quantity: 1,
  status: "Open",
  startDate: formatDateForInput(new Date()),
  endDate: formatDateForInput(addDays(new Date(), 14)), // 2 weeks from now
  customer: "",
  priority: "Medium",
  notes: "",
  processes: [],
};

// Predefined process templates
const processTypes = ["Setup", "Assembly", "Testing", "Quality Check", "Packaging", "Shipping"];

// Available statuses
const statusOptions = ["Open", "Released", "In Progress", "Delayed", "Done", "Finished"];

// Priority options
const priorityOptions = ["Low", "Medium", "High", "Critical"];

// Default process templates
const defaultProcessTemplates: ProcessTemplate[] = [
  { type: "Setup", name: "Initial Setup", duration: 1, sequence: 1 },
  { type: "Assembly", name: "Assembly Process", duration: 3, sequence: 2 },
  { type: "Testing", name: "Testing & Validation", duration: 2, sequence: 3 },
  { type: "Quality Check", name: "Quality Inspection", duration: 1, sequence: 4 },
  { type: "Packaging", name: "Packaging", duration: 1, sequence: 5 },
];

const CreateOrder = () => {
  const [formData, setFormData] = useState<OrderFormData>({
    ...initialFormData,
    processes: [...defaultProcessTemplates],
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState<boolean>(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchResources = async () => {
      setLoadingResources(true);
      try {
        // Only fetch active resources
        const activeResources = await getResources(true);
        setResources(activeResources);
      } catch (err) {
        console.error("Error fetching resources:", err);
        // Optionally show an error message
      } finally {
        setLoadingResources(false);
      }
    };

    fetchResources();
  }, []);

  // Handle form field changes
  const handleChange =
    (field: keyof OrderFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
      const value = event.target.value;
      setFormData({
        ...formData,
        [field]: value,
      });

      // Clear validation error when field is edited
      if (validationErrors[field]) {
        setValidationErrors({
          ...validationErrors,
          [field]: "",
        });
      }
    };

  // Add a new process
  const handleAddProcess = () => {
    const newSequence =
      formData.processes.length > 0 ? Math.max(...formData.processes.map(p => p.sequence)) + 1 : 1;

    setFormData({
      ...formData,
      processes: [
        ...formData.processes,
        {
          type: processTypes[0],
          name: `New Process ${newSequence}`,
          duration: 1,
          sequence: newSequence,
        },
      ],
    });
  };

  // Update a process
  const handleProcessChange = (index: number, field: keyof ProcessTemplate, value: any) => {
    const updatedProcesses = [...formData.processes];
    updatedProcesses[index] = {
      ...updatedProcesses[index],
      [field]: value,
    };

    setFormData({
      ...formData,
      processes: updatedProcesses,
    });
  };

  // Remove a process
  const handleRemoveProcess = (index: number) => {
    const updatedProcesses = formData.processes.filter((_, i) => i !== index);

    // Resequence the processes
    const resequencedProcesses = updatedProcesses.map((process, i) => ({
      ...process,
      sequence: i + 1,
    }));

    setFormData({
      ...formData,
      processes: resequencedProcesses,
    });
  };

  // Auto-generate order number if blank
  const generateOrderNumber = () => {
    if (formData.orderNumber) return;

    const timestamp = new Date().getTime();
    const randomPart = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const newOrderNumber = `WO-${timestamp.toString().slice(-6)}-${randomPart}`;

    setFormData({
      ...formData,
      orderNumber: newOrderNumber,
    });
  };

  // Validate the form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.orderNumber) {
      errors.orderNumber = "Order number is required";
    }

    if (!formData.description) {
      errors.description = "Description is required";
    }

    if (!formData.partNo) {
      errors.partNo = "Part number is required";
    }

    if (formData.quantity <= 0) {
      errors.quantity = "Quantity must be greater than 0";
    }

    if (!formData.startDate) {
      errors.startDate = "Start date is required";
    }

    if (!formData.endDate) {
      errors.endDate = "End date is required";
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (startDate > endDate) {
      errors.endDate = "End date must be after start date";
    }

    if (formData.processes.length === 0) {
      errors.processes = "At least one process is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Generate order number if not provided
    if (!formData.orderNumber) {
      generateOrderNumber();
    }

    // Validate the form
    if (!validateForm()) {
      setError("Please fix the validation errors before submitting.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startDate = parseInputDate(formData.startDate);
      const endDate = parseInputDate(formData.endDate);

      // Create the order object
      const orderData = {
        orderNumber: formData.orderNumber,
        description: formData.description,
        partNo: formData.partNo,
        quantity: Number(formData.quantity),
        status: formData.status,
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(endDate),
        customer: formData.customer,
        priority: formData.priority,
        notes: formData.notes,
        updated: Timestamp.fromDate(new Date()),
        assignedResourceId: formData.assignedResourceId || null,
      };

      // Add the order to Firestore
      const orderRef = await setDoc(doc(db, "orders", formData.orderNumber), orderData);

      // Create processes for the order
      for (const process of formData.processes) {
        const processRef = doc(collection(db, "processes"));

        // Calculate process dates
        const processStartDate = new Date(startDate);
        const processEndDate = new Date(processStartDate);

        // Find previous processes and adjust start date
        const previousProcesses = formData.processes.filter(p => p.sequence < process.sequence);
        if (previousProcesses.length > 0) {
          const totalPreviousDuration = previousProcesses.reduce((sum, p) => sum + p.duration, 0);
          processStartDate.setDate(startDate.getDate() + totalPreviousDuration);
        }

        // Set end date based on duration
        processEndDate.setDate(processStartDate.getDate() + process.duration);

        await setDoc(processRef, {
          workOrderId: formData.orderNumber,
          processId: processRef.id,
          type: process.type,
          name: process.name,
          sequence: process.sequence,
          status: process.sequence === 1 ? "Pending" : "Not Started",
          startDate: Timestamp.fromDate(processStartDate),
          endDate: Timestamp.fromDate(processEndDate),
          assignedResource: null,
          progress: 0,
          createdAt: Timestamp.fromDate(new Date()),
        });
      }

      setSuccess(true);

      // Navigate back to orders after a delay
      setTimeout(() => {
        navigate(`/orders/${formData.orderNumber}`);
      }, 1500);
    } catch (err) {
      console.error("Error creating order:", err);
      setError(`Failed to create order: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate("/orders");
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton onClick={handleCancel} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">Create New Order</Typography>
        </Box>
        <Box>
          <Button variant="outlined" onClick={handleCancel} sx={{ mr: 2 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Order"}
          </Button>
        </Box>
      </Box>

      {/* Form */}
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6">Basic Information</Typography>
              <Divider sx={{ mt: 1, mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Order Number"
                value={formData.orderNumber}
                onChange={handleChange("orderNumber")}
                helperText={validationErrors.orderNumber || "Leave blank to auto-generate"}
                error={!!validationErrors.orderNumber}
                InputProps={{
                  endAdornment: (
                    <Tooltip title="Generate Order Number">
                      <IconButton onClick={generateOrderNumber} edge="end">
                        <AddIcon />
                      </IconButton>
                    </Tooltip>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!validationErrors.status}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={handleChange("status") as any}
                  label="Status"
                >
                  {statusOptions.map(option => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={handleChange("description")}
                helperText={validationErrors.description}
                error={!!validationErrors.description}
                multiline
                rows={2}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Part Number"
                value={formData.partNo}
                onChange={handleChange("partNo")}
                helperText={validationErrors.partNo}
                error={!!validationErrors.partNo}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Quantity"
                value={formData.quantity}
                onChange={handleChange("quantity")}
                helperText={validationErrors.quantity}
                error={!!validationErrors.quantity}
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth error={!!validationErrors.priority}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={handleChange("priority") as any}
                  label="Priority"
                >
                  {priorityOptions.map(option => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Customer"
                value={formData.customer}
                onChange={handleChange("customer")}
                helperText="Optional"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="resource-select-label">Assigned Resource (Optional)</InputLabel>
                <Select
                  labelId="resource-select-label"
                  value={formData.assignedResourceId || ""}
                  onChange={handleChange("assignedResourceId") as any}
                  label="Assigned Resource (Optional)"
                  disabled={loadingResources}
                >
                  <MenuItem value="">
                    <em>{loadingResources ? "Loading resources..." : "None"}</em>
                  </MenuItem>
                  {resources.map(resource => (
                    <MenuItem key={resource.id} value={resource.id}>
                      {resource.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Schedule */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="h6">Schedule</Typography>
              <Divider sx={{ mt: 1, mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={handleChange("startDate")}
                error={!!validationErrors.startDate}
                helperText={validationErrors.startDate}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={handleChange("endDate")}
                error={!!validationErrors.endDate}
                helperText={validationErrors.endDate}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            {/* Processes */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6">Production Processes</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddProcess}
                  variant="outlined"
                  size="small"
                >
                  Add Process
                </Button>
              </Box>
              <Divider sx={{ mt: 1, mb: 2 }} />
              {validationErrors.processes && (
                <FormHelperText error>{validationErrors.processes}</FormHelperText>
              )}
            </Grid>

            {formData.processes.map((process, index) => (
              <Grid item xs={12} key={index}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sx={{ mb: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Chip label={`Step ${process.sequence}`} color="primary" size="small" />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveProcess(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth>
                        <InputLabel>Process Type</InputLabel>
                        <Select
                          value={process.type}
                          onChange={e => handleProcessChange(index, "type", e.target.value)}
                          label="Process Type"
                        >
                          {processTypes.map(type => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Process Name"
                        value={process.name}
                        onChange={e => handleProcessChange(index, "name", e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Duration (days)"
                        value={process.duration}
                        onChange={e =>
                          handleProcessChange(index, "duration", Number(e.target.value))
                        }
                        InputProps={{ inputProps: { min: 1 } }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ))}

            {/* Notes */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="h6">Additional Notes</Typography>
              <Divider sx={{ mt: 1, mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={formData.notes}
                onChange={handleChange("notes")}
                multiline
                rows={4}
                helperText="Optional"
              />
            </Grid>

            {/* Error messaging */}
            {error && (
              <Grid item xs={12}>
                <Alert severity="error">{error}</Alert>
              </Grid>
            )}
          </Grid>
        </form>
      </Paper>

      {/* Success message */}
      <Snackbar
        open={success}
        autoHideDuration={5000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled">
          Order created successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateOrder;
