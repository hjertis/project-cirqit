import { useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Badge,
  Chip,
  Autocomplete,
} from "@mui/material";
import {
  AccessTime as TimeIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import {
  startTimeEntry,
  stopTimeEntry,
  pauseTimeEntry,
  resumeTimeEntry,
  hasActiveTimeEntry,
  getActiveTimeEntry,
} from "../../services/timeTrackingService";
import { useNavigate } from "react-router-dom";
import { formatDuration } from "../../utils/helpers";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import dayjs from "dayjs";

const QuickTimeClockWidget = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [hasActive, setHasActive] = useState<boolean>(false);
  const [activeEntry, setActiveEntry] = useState<any | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [orderOptions, setOrderOptions] = useState<{ orderNumber: string; description: string }[]>(
    []
  );
  const [unclosedEntry, setUnclosedEntry] = useState<any | null>(null);
  const [showUnclosedDialog, setShowUnclosedDialog] = useState(false);
  const [unclosedEndTime, setUnclosedEndTime] = useState<string>("16:00");

  useEffect(() => {
    const checkActiveEntries = async () => {
      if (!currentUser) return;

      try {
        const active = await hasActiveTimeEntry(currentUser.uid);
        setHasActive(active);

        if (active) {
          const entry = await getActiveTimeEntry(currentUser.uid, "");
          if (entry) {
            setActiveEntry(entry);
            setOrderNumber(entry.orderNumber);
            setNotes(entry.notes || "");

            const startTime = entry.startTime.toDate();
            const now = new Date();
            const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            setElapsedTime(elapsed);
            setTimerRunning(entry.status === "active");
          }
        }
      } catch (err) {
        console.error("Error checking active time entries:", err);
      }
    };

    checkActiveEntries();

    const interval = setInterval(checkActiveEntries, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (timerRunning) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timerRunning]);

  useEffect(() => {
    // Fetch only in-progress orders for autocomplete
    const fetchOrders = async () => {
      try {
        const q = query(collection(db, "orders"), where("status", "==", "In Progress"));
        const snap = await getDocs(q);
        const options = snap.docs.map(doc => ({
          orderNumber: doc.data().orderNumber || doc.id,
          description: doc.data().description || "",
        }));
        setOrderOptions(options);
      } catch (err) {
        // ignore autocomplete errors
      }
    };
    fetchOrders();
  }, [currentUser]);

  useEffect(() => {
    // Check for unclosed time entry from previous day
    const checkUnclosedEntry = async () => {
      if (!currentUser) return;
      const entry = await getActiveTimeEntry(currentUser.uid, "");
      if (entry && entry.startTime && dayjs(entry.startTime.toDate()).isBefore(dayjs(), "day")) {
        setUnclosedEntry(entry);
        setShowUnclosedDialog(true);
      } else {
        setUnclosedEntry(null);
        setShowUnclosedDialog(false);
      }
    };
    checkUnclosedEntry();
  }, [currentUser]);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setError(null);
  };

  const handleStartTime = async () => {
    if (unclosedEntry) {
      setShowUnclosedDialog(true);
      return;
    }

    if (!currentUser || !orderNumber) {
      setError("Please enter an order number");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const entry = await startTimeEntry(
        currentUser.uid,
        orderNumber,
        orderNumber,
        undefined,
        notes
      );

      setActiveEntry(entry);
      setHasActive(true);
      setTimerRunning(true);
      setElapsedTime(0);
      handleCloseDialog();
    } catch (err) {
      console.error("Error starting time:", err);
      setError(`Failed to start time: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopTime = async () => {
    if (!currentUser || !activeEntry) return;

    try {
      setLoading(true);

      await stopTimeEntry(activeEntry.id, notes);

      setActiveEntry(null);
      setHasActive(false);
      setTimerRunning(false);
      setElapsedTime(0);
      handleCloseDialog();
    } catch (err) {
      console.error("Error stopping time:", err);
      setError(`Failed to stop time: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseTime = async () => {
    if (!currentUser || !activeEntry) return;

    try {
      setLoading(true);

      const updatedEntry = await pauseTimeEntry(activeEntry.id);

      setActiveEntry(updatedEntry);
      setTimerRunning(false);
      handleCloseDialog();
    } catch (err) {
      console.error("Error pausing time:", err);
      setError(`Failed to pause time: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeTime = async () => {
    if (!currentUser || !activeEntry) return;

    try {
      setLoading(true);

      const updatedEntry = await resumeTimeEntry(activeEntry.id);

      setActiveEntry(updatedEntry);
      setTimerRunning(true);
      handleCloseDialog();
    } catch (err) {
      console.error("Error resuming time:", err);
      setError(`Failed to resume time: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUnclosed = async () => {
    if (!unclosedEntry) return;
    setLoading(true);
    setError(null);
    try {
      const start = dayjs(unclosedEntry.startTime.toDate());
      const [h, m] = unclosedEndTime.split(":").map(Number);
      const end = start.hour(h).minute(m).second(0);
      await stopTimeEntry(unclosedEntry.id, notes, end.toDate());
      setUnclosedEntry(null);
      setShowUnclosedDialog(false);
      // Optionally refresh state here
    } catch (err) {
      setError("Failed to close previous day's entry");
    } finally {
      setLoading(false);
    }
  };

  const handleViewTimesheet = () => {
    navigate("/time");
    handleCloseDialog();
  };

  const renderTimeBadge = () => {
    if (hasActive) {
      return (
        <Badge color={timerRunning ? "success" : "warning"} variant="dot">
          <TimeIcon />
        </Badge>
      );
    }

    return <TimeIcon />;
  };

  return (
    <>
      <Tooltip title="Time Tracking">
        <IconButton color="inherit" onClick={handleOpenDialog}>
          {renderTimeBadge()}
        </IconButton>
      </Tooltip>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Time Tracking</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {hasActive ? (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography variant="h3">{formatDuration(elapsedTime)}</Typography>

              <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                <Chip
                  label={timerRunning ? "ACTIVE" : "PAUSED"}
                  color={timerRunning ? "success" : "warning"}
                  size="small"
                />
              </Box>

              <Typography variant="h6" sx={{ mt: 2 }}>
                Order: {activeEntry?.orderNumber}
              </Typography>

              {activeEntry?.notes && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {activeEntry.notes}
                </Typography>
              )}

              <Box sx={{ mt: 3, display: "flex", justifyContent: "center", gap: 2 }}>
                {timerRunning ? (
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<PauseIcon />}
                    onClick={handlePauseTime}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Pause"}
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<StartIcon />}
                    onClick={handleResumeTime}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Resume"}
                  </Button>
                )}

                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={handleStopTime}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Stop"}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ py: 2 }}>
              <Autocomplete
                freeSolo
                options={orderOptions}
                getOptionLabel={option =>
                  typeof option === "string"
                    ? option
                    : `${option.orderNumber}${option.description ? ` - ${option.description}` : ""}`
                }
                value={orderOptions.find(o => o.orderNumber === orderNumber) || orderNumber}
                onInputChange={(_e, value) => setOrderNumber(value)}
                renderInput={params => (
                  <TextField
                    {...params}
                    fullWidth
                    label="Order Number"
                    disabled={loading}
                    sx={{ mb: 2 }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.orderNumber}>
                    <Box>
                      <strong>{option.orderNumber}</strong>
                      {option.description && (
                        <span style={{ color: "#888", marginLeft: 8 }}>{option.description}</span>
                      )}
                    </Box>
                  </li>
                )}
                disabled={loading}
              />
              <TextField
                fullWidth
                label="Notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                multiline
                rows={2}
                disabled={loading}
                placeholder="What are you working on?"
              />

              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<StartIcon />}
                onClick={handleStartTime}
                disabled={loading || !orderNumber}
                sx={{ mt: 3 }}
              >
                {loading ? <CircularProgress size={24} /> : "Start Time"}
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          <Button variant="outlined" onClick={handleViewTimesheet}>
            View Timesheet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unclosed entry dialog */}
      <Dialog open={showUnclosedDialog} onClose={() => setShowUnclosedDialog(false)}>
        <DialogTitle>Unclosed Time Entry</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You have an unfinished time entry from a previous day. When did you leave?
          </Typography>
          <TextField
            label="End Time (HH:mm)"
            type="time"
            value={unclosedEndTime}
            onChange={e => setUnclosedEndTime(e.target.value)}
            inputProps={{ step: 60 }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUnclosedDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirmUnclosed} variant="contained" disabled={loading}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QuickTimeClockWidget;
