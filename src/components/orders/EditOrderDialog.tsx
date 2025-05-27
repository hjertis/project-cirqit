import { useState, useEffect } from "react";
import { useQuery, useQueryClient, QueryKey } from "@tanstack/react-query";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  TextField,
  Grid,
  MenuItem,
  Alert,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  CircularProgress,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Close as CloseIcon,
  Save as SaveIcon,
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
import { getResources } from "../../services/resourceService";
import { SelectChangeEvent } from "@mui/material";
import { STANDARD_PROCESS_NAMES } from "../../constants/constants";

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

interface ProcessTemplate {
  id?: string;
  name: string;
  duration: number;
  sequence: number;
  status?: string;
}

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

interface EditOrderDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string | null;
  onOrderUpdated?: () => void;
}

const statusOptions = ["Open", "Released", "In Progress", "Delayed", "Done", "Finished"];
const priorityOptions = ["Low", "Medium", "High", "Critical"];
const processStatusOptions = ["Not Started", "Pending", "In Progress", "Completed", "Delayed"];

const formatDateForInput = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

const formatTimestampForInput = (timestamp: Timestamp): string => {
  return formatDateForInput(timestamp.toDate());
};

const parseInputDate = (dateString: string): Date => {
  return new Date(dateString);
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Helper function to check for valid JavaScript Date objects
const isValidJsDate = (d: any): d is Date => d instanceof Date && !isNaN(d.getTime());

const initialFormData: OrderFormData = {
  orderNumber: "",
  description: "",
  partNo: "",
  quantity: 1,
  status: "Open",
  startDate: formatDateForInput(new Date()),
  endDate: formatDateForInput(addDays(new Date(), 14)),
  customer: "",
  priority: "Medium",
  notes: "",
  processes: [],
};

const EditOrderDialog = ({ open, onClose, orderId, onOrderUpdated }: EditOrderDialogProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const queryClient = useQueryClient(); // Already initialized

  const [formData, setFormData] = useState<OrderFormData>(initialFormData);
  const [originalProcesses, setOriginalProcesses] = useState<FirebaseProcess[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [productProcessTemplates, setProductProcessTemplates] = useState<ProcessTemplate[]>([]);

  // Fetch order and processes
  const {
    data: orderDataBundle,
    isLoading: loading,
    isError: isOrderError,
    error: orderError,
  } = useQuery({
    queryKey: ["order-edit-dialog", orderId],
    queryFn: async () => {
      if (!orderId) throw new Error("Order ID is missing");
      const orderDoc = await getDoc(doc(db, "orders", orderId));
      if (!orderDoc.exists()) throw new Error("Order not found");
      const orderData = orderDoc.data();
      const processesQuery = query(
        collection(db, "processes"),
        where("workOrderId", "==", orderId)
      );
      const processesSnapshot = await getDocs(processesQuery);
      const processesData: FirebaseProcess[] = [];
      processesSnapshot.forEach(doc => {
        processesData.push({ id: doc.id, ...doc.data() } as FirebaseProcess);
      });
      processesData.sort((a, b) => a.sequence - b.sequence);
      return { orderData, processesData };
    },
    enabled: open && !!orderId,
  });

  // Fetch resources
  const { data: resources = [], isLoading: loadingResources } = useQuery({
    queryKey: ["resources", open],
    queryFn: async () => await getResources(true),
    enabled: open,
  });

  // Set form data when order/processes are loaded
  useEffect(() => {
    if (orderDataBundle) {
      const { orderData, processesData } = orderDataBundle;
      setOriginalProcesses(processesData);

      const processTemplates: ProcessTemplate[] = processesData.map(process => {
        let duration = 0; // Default duration in hours
        if (
          process.startDate &&
          typeof process.startDate.toDate === "function" &&
          process.endDate &&
          typeof process.endDate.toDate === "function"
        ) {
          const startDateMs = process.startDate.toDate().getTime();
          const endDateMs = process.endDate.toDate().getTime();

          if (endDateMs >= startDateMs) {
            duration = (endDateMs - startDateMs) / (1000 * 60 * 60);
          } else {
            console.warn(
              `Process (ID: ${process.id || "N/A"}, Name: ${process.name || "N/A"}, Sequence: ${
                process.sequence || "N/A"
              }) has endDate before startDate. Defaulting duration to 0.`,
              { processDataReceived: process }
            );
            // duration remains 0
          }
        } else {
          console.warn(
            `Process (ID: ${process.id || "N/A"}, Name: ${process.name || "N/A"}, Sequence: ${
              process.sequence || "N/A"
            }) is missing valid startDate or endDate, or they are not Firebase Timestamps. Defaulting duration to 0.`,
            { processDataReceived: process }
          );
          // duration remains 0
        }

        return {
          id: process.id,
          name: process.name,
          duration: duration,
          sequence: process.sequence,
          status: process.status,
        };
      });

      // Safely determine order start and end dates for the form
      let formStartDate = formatDateForInput(new Date()); // Default to current date
      if (orderData.start && typeof orderData.start.toDate === "function") {
        try {
          formStartDate = formatTimestampForInput(orderData.start);
        } catch (e) {
          console.warn(
            `Order (ID: ${orderId || "N/A"}) failed to format orderData.start from Firestore, using default. Error: ${
              e instanceof Error ? e.message : String(e)
            }`,
            { orderStartDataReceived: orderData.start }
          );
        }
      } else {
        console.warn(
          `Order (ID: ${orderId || "N/A"}) orderData.start from Firestore is missing, invalid, or not a Firebase Timestamp, using default.`,
          { orderStartDataReceived: orderData.start }
        );
      }

      let formEndDate = formatDateForInput(addDays(new Date(), 14)); // Default to 14 days from now
      if (orderData.end && typeof orderData.end.toDate === "function") {
        try {
          formEndDate = formatTimestampForInput(orderData.end);
        } catch (e) {
          console.warn(
            `Order (ID: ${orderId || "N/A"}) failed to format orderData.end from Firestore, using default. Error: ${
              e instanceof Error ? e.message : String(e)
            }`,
            { orderEndDataReceived: orderData.end }
          );
        }
      } else {
        console.warn(
          `Order (ID: ${orderId || "N/A"}) orderData.end from Firestore is missing, invalid, or not a Firebase Timestamp, using default.`,
          { orderEndDataReceived: orderData.end }
        );
      }

      setFormData({
        orderNumber: orderData.orderNumber || orderId,
        description: orderData.description || "",
        partNo: orderData.partNo || "",
        quantity: orderData.quantity || 1,
        status: orderData.status || "Open",
        startDate: formStartDate, // Use safely determined start date
        endDate: formEndDate, // Use safely determined end date
        customer: orderData.customer || "",
        priority: orderData.priority || "Medium",
        notes: orderData.notes || "",
        processes: processTemplates,
        assignedResourceId: orderData.assignedResourceId || "",
      });
      // setError(null); // Clear general error only if no specific date errors were set above
      // Or manage errors more granularly if you set them above.
      // For now, let existing error state persist if set by date issues.
    } else if (!open) {
      setFormData(initialFormData);
      setOriginalProcesses([]);
      setError(null);
      setValidationErrors({});
    }
  }, [orderDataBundle, open, orderId]);

  // Fetch product processTemplates when partNo changes
  useEffect(() => {
    const fetchProductTemplates = async () => {
      if (formData.partNo) {
        const productDoc = await getDoc(doc(db, "products", formData.partNo));
        if (productDoc.exists()) {
          const productData = productDoc.data();
          if (
            productData &&
            Array.isArray(productData.processTemplates) &&
            productData.processTemplates.length > 0
          ) {
            setProductProcessTemplates(
              productData.processTemplates.map((p: ProcessTemplate, idx: number) => ({
                ...p,
                sequence: p.sequence ?? idx + 1,
                status: "Not Started",
              }))
            );
          } else {
            setProductProcessTemplates([]);
          }
        } else {
          setProductProcessTemplates([]);
        }
      } else {
        setProductProcessTemplates([]);
      }
    };
    fetchProductTemplates();
  }, [formData.partNo]);

  const handleChange =
    (field: keyof OrderFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
      const value = event.target.value;
      setFormData({
        ...formData,
        [field]: value,
      });

      if (validationErrors[field]) {
        setValidationErrors({
          ...validationErrors,
          [field]: "",
        });
      }
    };

  const handleSelectChange = (field: keyof OrderFormData) => (event: SelectChangeEvent<string>) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
    if (validationErrors[field]) {
      setValidationErrors({
        ...validationErrors,
        [field]: "",
      });
    }
  };

  const handleAddProcess = () => {
    const newSequence =
      formData.processes.length > 0 ? Math.max(...formData.processes.map(p => p.sequence)) + 1 : 1;

    setFormData({
      ...formData,
      processes: [
        ...formData.processes,
        {
          name: `New Process ${newSequence}`,
          duration: 1,
          sequence: newSequence,
          status: "Not Started",
        },
      ],
    });
  };

  const handleProcessChange = (
    index: number,
    field: keyof ProcessTemplate,
    value: string | number
  ) => {
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

  const handleRemoveProcess = (index: number) => {
    const updatedProcesses = formData.processes.filter((_, i) => i !== index);

    const resequencedProcesses = updatedProcesses.map((process, i) => ({
      ...process,
      sequence: i + 1,
    }));

    setFormData({
      ...formData,
      processes: resequencedProcesses,
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

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

    // Only require processes if neither order-specific nor product processTemplates exist
    if (formData.processes.length === 0 && productProcessTemplates.length === 0) {
      errors.processes = "At least one process is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    // If no order-specific processes, but product processTemplates exist, copy them in before saving
    let processesToSave = formData.processes;
    if (processesToSave.length === 0 && productProcessTemplates.length > 0) {
      processesToSave = productProcessTemplates.map((p, idx) => ({
        name: p.name,
        duration: p.duration,
        sequence: p.sequence ?? idx + 1,
        status: p.status || "Not Started",
      }));
      setFormData(prev => ({ ...prev, processes: processesToSave }));
    }

    if (!validateForm() || !orderId) {
      // orderId is confirmed to be a string here for DB ops
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const orderFormStartDateString = formData.startDate;
      const orderFormEndDateString = formData.endDate;

      const parsedOrderStartDate = parseInputDate(orderFormStartDateString);
      const parsedOrderEndDate = parseInputDate(orderFormEndDateString);

      if (!isValidJsDate(parsedOrderStartDate)) {
        const errText = `Invalid Start Date for order after parsing: '${orderFormStartDateString}'. Please correct it.`;
        console.error(errText, { rawFormData: formData });
        setError(errText);
        setSaving(false);
        return;
      }
      if (!isValidJsDate(parsedOrderEndDate)) {
        const errText = `Invalid End Date for order after parsing: '${orderFormEndDateString}'. Please correct it.`;
        console.error(errText, { rawFormData: formData });
        setError(errText);
        setSaving(false);
        return;
      }
      if (parsedOrderStartDate > parsedOrderEndDate) {
        const errText = `Order Start Date cannot be after End Date. Start: '${orderFormStartDateString}', End: '${orderFormEndDateString}'.`;
        console.error(errText, { rawFormData: formData });
        setError(errText);
        setSaving(false);
        return;
      }

      let assignedResourceName = "";
      if (formData.assignedResourceId) {
        const assignedResource = resources.find(r => r.id === formData.assignedResourceId);
        assignedResourceName = assignedResource ? assignedResource.name : "";
      }

      const orderDataForFirestore: Record<string, any> = {
        orderNumber: formData.orderNumber,
        description: formData.description,
        partNo: formData.partNo,
        quantity: Number(formData.quantity),
        status: formData.status,
        start: Timestamp.fromDate(parsedOrderStartDate), // Use validated date
        end: Timestamp.fromDate(parsedOrderEndDate), // Use validated date
        customer: formData.customer,
        priority: formData.priority,
        notes: formData.notes,
        updated: Timestamp.fromDate(new Date()),
        assignedResourceId: formData.assignedResourceId || null,
        assignedResourceName: assignedResourceName || null,
      };

      if (formData.status === "Finished" || formData.status === "Done") {
        orderDataForFirestore.finishedDate = Timestamp.fromDate(new Date());
      } else {
        orderDataForFirestore.finishedDate = null;
      }

      if (formData.status === "Finished") {
        orderDataForFirestore.archivedAt = Timestamp.fromDate(new Date());
        orderDataForFirestore.originalId = orderId;

        await setDoc(doc(db, "archivedOrders", orderId), orderDataForFirestore);
        await deleteDoc(doc(db, "orders", orderId));
      } else {
        await updateDoc(doc(db, "orders", orderId), orderDataForFirestore);
      }

      const existingProcessIds = originalProcesses.map(p => p.id);
      const currentProcessIds = processesToSave.filter(p => p.id).map(p => p.id) as string[];

      const processesToDelete = existingProcessIds.filter(id => !currentProcessIds.includes(id));
      for (const processId of processesToDelete) {
        await deleteDoc(doc(db, "processes", processId));
      }

      for (const process of processesToSave) {
        const processStartDate = new Date(parsedOrderStartDate); // Start with validated order start date
        if (process.sequence > 1) {
          const previousProcesses = processesToSave.filter(p => p.sequence < process.sequence);
          const totalPreviousDuration = previousProcesses.reduce((sum, p) => {
            const duration = typeof p.duration === "number" && !isNaN(p.duration) ? p.duration : 0;
            return sum + duration;
          }, 0);
          processStartDate.setHours(parsedOrderStartDate.getHours() + totalPreviousDuration);
        }
        const processEndDate = new Date(processStartDate);
        const currentProcessDuration =
          typeof process.duration === "number" && !isNaN(process.duration) ? process.duration : 0;
        processEndDate.setHours(processEndDate.getHours() + currentProcessDuration);

        if (!isValidJsDate(processStartDate)) {
          const errText = `Invalid calculated start date for process '${process.name}' (Seq: ${process.sequence}).`;
          console.error(errText, {
            processDetails: process,
            calculatedDate: processStartDate,
            orderStartDate: parsedOrderStartDate,
          });
          setError(errText + " Please check process durations or order start date.");
          setSaving(false);
          return;
        }
        if (!isValidJsDate(processEndDate)) {
          const errText = `Invalid calculated end date for process '${process.name}' (Seq: ${process.sequence}, Duration: ${process.duration}hrs).`;
          console.error(errText, {
            processDetails: process,
            calculatedDate: processEndDate,
            processCalcStartDate: processStartDate,
          });
          setError(errText + " Please check process durations.");
          setSaving(false);
          return;
        }
        if (processStartDate > processEndDate && currentProcessDuration > 0) {
          // Allow 0 duration processes to have same start/end
          const errText = `Calculated start date for process '${process.name}' (Seq: ${process.sequence}) is after its end date.`;
          console.error(errText, {
            processDetails: process,
            calcStart: processStartDate,
            calcEnd: processEndDate,
          });
          setError(errText + " Please check process durations.");
          setSaving(false);
          return;
        }

        const processData: Record<string, any> = {
          workOrderId: orderId, // Use orderId for consistency
          name: process.name,
          sequence: process.sequence,
          status: process.status || "Not Started",
          startDate: Timestamp.fromDate(processStartDate),
          endDate: Timestamp.fromDate(processEndDate),
          updated: Timestamp.fromDate(new Date()),
        };

        if (process.id) {
          const processRef = doc(db, "processes", process.id);
          await updateDoc(processRef, processData);
        } else {
          const processRef = doc(collection(db, "processes"));
          processData.processId = processRef.id; // Set the ID for new processes
          processData.assignedResource = null;
          processData.progress = 0;
          processData.createdAt = Timestamp.fromDate(new Date());
          await setDoc(processRef, processData);
        }
      }

      // Invalidate queries after all DB operations are successful
      const queriesToInvalidate: QueryKey[] = [];

      if (formData.status === "Finished") {
        queriesToInvalidate.push(["orders"]);
        queriesToInvalidate.push(["archivedOrders"]);
      } else {
        queriesToInvalidate.push(["orders"]);
      }

      // Always invalidate the specific order details and the dialog's own data query
      queriesToInvalidate.push(["order", orderId]);
      queriesToInvalidate.push(["order-edit-dialog", orderId]);
      // Invalidate processes linked to this order
      queriesToInvalidate.push(["processes", orderId]);

      await Promise.all(
        queriesToInvalidate.map(queryKey => queryClient.invalidateQueries({ queryKey }))
      );

      setSuccess(true);

      setTimeout(() => {
        if (onOrderUpdated) {
          onOrderUpdated();
        }
        onClose();
      }, 1000);
    } catch (err) {
      setError(`Failed to update order: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <DialogTitle>
        Edit Order
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
          size="large"
          sx={{ position: "absolute", right: 12, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ px: 2 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Order updated successfully!
          </Alert>
        )}
        <Box component="form" noValidate autoComplete="off">
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Order Number"
                variant="outlined"
                fullWidth
                value={formData.orderNumber}
                onChange={handleChange("orderNumber")}
                disabled
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Description"
                variant="outlined"
                fullWidth
                value={formData.description}
                onChange={handleChange("description")}
                error={!!validationErrors.description}
                helperText={validationErrors.description}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Part No."
                variant="outlined"
                fullWidth
                value={formData.partNo}
                onChange={handleChange("partNo")}
                error={!!validationErrors.partNo}
                helperText={validationErrors.partNo}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Quantity"
                variant="outlined"
                fullWidth
                type="number"
                value={formData.quantity}
                onChange={handleChange("quantity")}
                error={!!validationErrors.quantity}
                helperText={validationErrors.quantity}
                InputProps={{
                  inputProps: { min: 1 },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={handleSelectChange("status")}
                  label="Status"
                >
                  {statusOptions.map(option => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{validationErrors.status}</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Start Date"
                variant="outlined"
                fullWidth
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
                label="End Date"
                variant="outlined"
                fullWidth
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
            <Grid item xs={12} md={6}>
              <TextField
                label="Customer"
                variant="outlined"
                fullWidth
                value={formData.customer}
                onChange={handleChange("customer")}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={handleSelectChange("priority")}
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
            <Grid item xs={12}>
              <TextField
                label="Notes"
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                value={formData.notes}
                onChange={handleChange("notes")}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Processes
              </Typography>
              {formData.processes.map((process, index) => (
                <Paper key={process.id || index} variant="outlined" sx={{ p: 1, mb: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle2" component="div">
                      {`Step ${process.sequence}: ${process.name}`}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveProcess(index)}
                      aria-label={`Remove ${process.name || "step " + process.sequence}`}
                      sx={{ color: "error.main" }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Process Name</InputLabel>
                        <Select
                          value={process.name}
                          onChange={e => handleProcessChange(index, "name", e.target.value)}
                          label="Process Name"
                          error={!!validationErrors.processes}
                        >
                          {STANDARD_PROCESS_NAMES.map(name => (
                            <MenuItem key={name} value={name}>
                              {name}
                            </MenuItem>
                          ))}
                        </Select>
                        {validationErrors.processes && (
                          <FormHelperText error>{validationErrors.processes}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={3} md={3}>
                      <TextField
                        label="Duration (hrs)"
                        variant="outlined"
                        fullWidth
                        type="number"
                        value={process.duration}
                        onChange={e =>
                          handleProcessChange(index, "duration", Number(e.target.value))
                        }
                        error={!!validationErrors.processes}
                        helperText={validationErrors.processes}
                        InputProps={{
                          inputProps: { min: 1 },
                        }}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3} md={5}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={process.status}
                          onChange={e => handleProcessChange(index, "status", e.target.value)}
                          label="Status"
                        >
                          {processStatusOptions.map(option => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddProcess}
                sx={{ mt: 2 }}
              >
                Add Process
              </Button>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditOrderDialog;
