// src/components/orders/EditOrder.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Chip,
} from "@mui/material";
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
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
  id?: string; // Existing processes will have an ID
  type: string;
  name: string;
  duration: number; // in days
  sequence: number;
  status?: string; // Existing processes will have a status
}

// Interface for Firebase Process
interface FirebaseProcess {
  id: string;
  workOrderId: string;
  type: string;
  name: string;
  sequence: number;
  status: string;
  startDate: Timestamp;
  endDate: Timestamp;
  assignedResource: string | null;
  progress: number;
  createdAt: Timestamp;
}

// Format date as YYYY-MM-DD for input fields
const formatDateForInput = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// Format Timestamp as YYYY-MM-DD for input fields
const formatTimestampForInput = (timestamp: Timestamp): string => {
  return formatDateForInput(timestamp.toDate());
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

// Calculate duration in days between two dates
const calculateDuration = (startDate: Date, endDate: Date): number => {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
};

// Initial form state - will be populated with order data
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
const processTypes = [
  "Setup",
  "Assembly",
  "Testing",
  "Quality Check",
  "Packaging",
  "Shipping",
  "Production",
];

// Available statuses
const statusOptions = ["Open", "Released", "In Progress", "Delayed", "Done", "Finished"];

// Priority options
const priorityOptions = ["Low", "Medium", "High", "Critical"];

// Process status options
const processStatusOptions = ["Not Started", "Pending", "In Progress", "Completed", "Delayed"];

const EditOrder = () => {
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<OrderFormData>(initialFormData);
  const [originalProcesses, setOriginalProcesses] = useState<FirebaseProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState<boolean>(false);

  const navigate = useNavigate();

  // Fetch order and processes data
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

        const orderData = orderDoc.data();

        // Fetch processes for this order
        const processesQuery = query(collection(db, "processes"), where("workOrderId", "==", id));

        const processesSnapshot = await getDocs(processesQuery);
        const processesData: FirebaseProcess[] = [];

        processesSnapshot.forEach(doc => {
          processesData.push({
            id: doc.id,
            ...doc.data(),
          } as FirebaseProcess);
        });

        // Sort processes by sequence
        processesData.sort((a, b) => a.sequence - b.sequence);
        setOriginalProcesses(processesData);

        // Convert processes to form data format
        const processTemplates: ProcessTemplate[] = processesData.map(process => ({
          id: process.id,
          type: process.type,
          name: process.name,
          duration: calculateDuration(process.startDate.toDate(), process.endDate.toDate()),
          sequence: process.sequence,
          status: process.status,
        }));

        // Set form data
        setFormData({
          orderNumber: orderData.orderNumber || id,
          description: orderData.description || "",
          partNo: orderData.partNo || "",
          quantity: orderData.quantity || 1,
          status: orderData.status || "Open",
          startDate: formatTimestampForInput(orderData.start),
          endDate: formatTimestampForInput(orderData.end),
          customer: orderData.customer || "",
          priority: orderData.priority || "Medium",
          notes: orderData.notes || "",
          processes: processTemplates,
          // Include assignedResourceId if it exists
          assignedResourceId: orderData.assignedResourceId || "",
        });

        setError(null);
      } catch (err) {
        console.error("Error fetching order:", err);
        setError(`Failed to load order: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    // Add function to fetch resources
    const fetchResources = async () => {
      setLoadingResources(true);
      try {
        // Only fetch active resources
        const activeResources = await getResources(true);
        setResources(activeResources);
      } catch (err) {
        console.error("Error fetching resources:", err);
        // We don't set an error state here to avoid blocking the main form
      } finally {
        setLoadingResources(false);
      }
    };

    // Call both fetch functions
    fetchOrderData();
    fetchResources();
  }, [id]);

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
          status: "Not Started",
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

    // Validate the form
    if (!validateForm()) {
      setError("Please fix the validation errors before submitting.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const startDate = parseInputDate(formData.startDate);
      const endDate = parseInputDate(formData.endDate);

      // Get the resource name if a resource is assigned
      let assignedResourceName = "";
      if (formData.assignedResourceId) {
        const assignedResource = resources.find(r => r.id === formData.assignedResourceId);
        assignedResourceName = assignedResource ? assignedResource.name : "";
      }

      // Update the order object
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
        // Include assigned resource data
        assignedResourceId: formData.assignedResourceId || null,
        assignedResourceName: assignedResourceName || null,
      };

      // Update order in Firestore
      await updateDoc(doc(db, "orders", id!), orderData);

      // Handle process updates - first identify existing, updated, and new processes
      const existingProcessIds = originalProcesses.map(p => p.id);
      const currentProcessIds = formData.processes.filter(p => p.id).map(p => p.id) as string[];

      // Find processes to delete (in original but not in current)
      const processesToDelete = existingProcessIds.filter(id => !currentProcessIds.includes(id));

      // Delete processes that were removed
      for (const processId of processesToDelete) {
        await deleteDoc(doc(db, "processes", processId));
      }

      // Update or create processes
      for (const process of formData.processes) {
        // Calculate process dates based on parent order dates and sequence
        const processStartDate = new Date(startDate);
        const processEndDate = new Date(processStartDate);

        // Find previous processes to determine start date
        const previousProcesses = formData.processes.filter(p => p.sequence < process.sequence);
        if (previousProcesses.length > 0) {
          const totalPreviousDuration = previousProcesses.reduce((sum, p) => sum + p.duration, 0);
          processStartDate.setDate(startDate.getDate() + totalPreviousDuration);
        }

        // Calculate end date based on process duration
        processEndDate.setDate(processStartDate.getDate() + process.duration);

        if (process.id) {
          // Update existing process
          const processRef = doc(db, "processes", process.id);
          await updateDoc(processRef, {
            workOrderId: formData.orderNumber,
            type: process.type,
            name: process.name,
            sequence: process.sequence,
            status: process.status || "Not Started",
            startDate: Timestamp.fromDate(processStartDate),
            endDate: Timestamp.fromDate(processEndDate),
            updated: Timestamp.fromDate(new Date()),
          });
        } else {
          // Create new process
          const processRef = doc(collection(db, "processes"));
          await setDoc(processRef, {
            workOrderId: formData.orderNumber,
            processId: processRef.id,
            type: process.type,
            name: process.name,
            sequence: process.sequence,
            status: process.status || "Not Started",
            startDate: Timestamp.fromDate(processStartDate),
            endDate: Timestamp.fromDate(processEndDate),
            assignedResource: null,
            progress: 0,
            createdAt: Timestamp.fromDate(new Date()),
          });
        }
      }

      setSuccess(true);

      // Navigate back to order details after a short delay
      setTimeout(() => {
        navigate(`/orders/${id}`);
      }, 1500);
    } catch (err) {
      console.error("Error updating order:", err);
      setError(`Failed to update order: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate(`/orders/${id}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !formData.orderNumber) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/orders")} sx={{ mt: 2 }}>
          Back to Orders
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton onClick={handleCancel} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">Edit Order: {formData.orderNumber}</Typography>
        </Box>
        <Box>
          <Button variant="outlined" onClick={handleCancel} sx={{ mr: 2 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            loading={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
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
                helperText={validationErrors.orderNumber}
                error={!!validationErrors.orderNumber}
                disabled // Prevent changing the order number once created
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
                <InputLabel id="resource-select-label">Assigned Resource</InputLabel>
                <Select
                  labelId="resource-select-label"
                  value={formData.assignedResourceId || ""}
                  onChange={handleChange("assignedResourceId") as any}
                  label="Assigned Resource"
                  disabled={loadingResources || saving}
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
                <FormHelperText>Optional: Assign to a specific resource</FormHelperText>
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
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Chip label={`Step ${process.sequence}`} color="primary" size="small" />
                          {process.id && <Chip label="Existing" size="small" variant="outlined" />}
                        </Box>
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

                    <Grid item xs={12} md={3}>
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

                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={process.status || "Not Started"}
                          onChange={e => handleProcessChange(index, "status", e.target.value)}
                          label="Status"
                        >
                          {processStatusOptions.map(status => (
                            <MenuItem key={status} value={status}>
                              {status}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
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
          Order updated successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EditOrder;
