import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Divider,
} from "@mui/material";
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Timer as TimerIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Pause as PauseIcon,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import {
  startTimeEntry,
  stopTimeEntry,
  pauseTimeEntry,
  resumeTimeEntry,
  getActiveTimeEntry,
} from "../../services/timeTrackingService";
import { formatDuration } from "../../utils/helpers";
import dayjs from "dayjs";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

interface TimeEntryWidgetProps {
  orderId: string;
  orderNumber: string;
  processes?: { id: string; name: string; type: string }[];
  onTimeEntryUpdated?: () => void;
}

const TimeEntryWidget = ({
  orderId,
  orderNumber,
  processes = [],
  onTimeEntryUpdated,
}: TimeEntryWidgetProps) => {
  const { currentUser } = useAuth();
  const [selectedProcess, setSelectedProcess] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeEntry, setActiveEntry] = useState<any | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [unclosedEntry, setUnclosedEntry] = useState<any | null>(null);
  const [showUnclosedDialog, setShowUnclosedDialog] = useState(false);
  const [unclosedEndTime, setUnclosedEndTime] = useState<string>("16:00");

  useEffect(() => {
    const fetchActiveEntry = async () => {
      if (!currentUser) return;

      try {
        setIsLoading(true);
        const entry = await getActiveTimeEntry(currentUser.uid, orderId);
        setActiveEntry(entry);

        if (entry) {
          const startTime = entry.startTime.toDate();
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          setElapsedTime(elapsed);
          setSelectedProcess(entry.processId || "");
          setNotes(entry.notes || "");
        }
      } catch (err) {
        console.error("Error fetching active time entry:", err);
        setError("Failed to fetch active time entry");
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveEntry();
  }, [currentUser, orderId]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (activeEntry && !activeEntry.paused) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeEntry]);

  useEffect(() => {
    const checkUnclosedEntry = async () => {
      if (!currentUser) return;
      // Find any active/paused entry from a previous day
      const entry = await getActiveTimeEntry(currentUser.uid, orderId);
      if (entry && entry.startTime && dayjs(entry.startTime.toDate()).isBefore(dayjs(), "day")) {
        setUnclosedEntry(entry);
        setShowUnclosedDialog(true);
      } else {
        setUnclosedEntry(null);
        setShowUnclosedDialog(false);
      }
    };
    checkUnclosedEntry();
  }, [currentUser, orderId]);

  const handleConfirmUnclosed = async () => {
    if (!unclosedEntry) return;
    setIsLoading(true);
    setError(null);
    try {
      // Set end time to previous day at chosen time
      const start = dayjs(unclosedEntry.startTime.toDate());
      const [h, m] = unclosedEndTime.split(":").map(Number);
      const end = start.hour(h).minute(m).second(0);
      await stopTimeEntry(unclosedEntry.id, notes, end.toDate());
      setUnclosedEntry(null);
      setShowUnclosedDialog(false);
      setSuccess("Previous day's time entry closed.");
      if (onTimeEntryUpdated) onTimeEntryUpdated();
    } catch (err) {
      setError("Failed to close previous day's entry");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTime = async () => {
    if (unclosedEntry) {
      setShowUnclosedDialog(true);
      return;
    }
    if (!currentUser) return;

    try {
      setIsLoading(true);
      setError(null);

      const entry = await startTimeEntry(
        currentUser.uid,
        orderId,
        orderNumber,
        selectedProcess,
        notes
      );

      setActiveEntry(entry);
      setSuccess("Time tracking started");
      if (onTimeEntryUpdated) onTimeEntryUpdated();
    } catch (err) {
      console.error("Error starting time entry:", err);
      setError("Failed to start time tracking");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTime = async () => {
    if (!currentUser || !activeEntry) return;

    try {
      setIsLoading(true);
      setError(null);

      await stopTimeEntry(activeEntry.id, notes);

      setActiveEntry(null);
      setElapsedTime(0);
      setSuccess("Time entry completed");
      if (onTimeEntryUpdated) onTimeEntryUpdated();
    } catch (err) {
      console.error("Error stopping time entry:", err);
      setError("Failed to stop time tracking");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseTime = async () => {
    if (!currentUser || !activeEntry) return;

    try {
      setIsLoading(true);
      setError(null);

      const updatedEntry = await pauseTimeEntry(activeEntry.id);

      setActiveEntry(updatedEntry);
      setSuccess("Time tracking paused");
      if (onTimeEntryUpdated) onTimeEntryUpdated();
    } catch (err) {
      console.error("Error pausing time entry:", err);
      setError("Failed to pause time tracking");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeTime = async () => {
    if (!currentUser || !activeEntry) return;

    try {
      setIsLoading(true);
      setError(null);

      const updatedEntry = await resumeTimeEntry(activeEntry.id);

      setActiveEntry(updatedEntry);
      setSuccess("Time tracking resumed");
      if (onTimeEntryUpdated) onTimeEntryUpdated();
    } catch (err) {
      console.error("Error resuming time entry:", err);
      setError("Failed to resume time tracking");
    } finally {
      setIsLoading(false);
    }
  };

  const displayTime = formatDuration(elapsedTime);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <TimerIcon sx={{ mr: 1, color: "primary.main" }} />
        <Typography variant="h6">Time Tracking</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {activeEntry && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2,
            p: 2,
            bgcolor: "primary.main",
            color: "white",
            borderRadius: 1,
          }}
        >
          <Typography variant="h4" component="div" sx={{ textAlign: "center" }}>
            {displayTime}
          </Typography>
          <Chip
            label={activeEntry.paused ? "PAUSED" : "ACTIVE"}
            color={activeEntry.paused ? "warning" : "success"}
            size="small"
            sx={{ ml: 2 }}
          />
        </Box>
      )}

      <Box sx={{ mb: 2 }}>
        {activeEntry ? (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <PersonIcon sx={{ mr: 1, color: "text.secondary" }} />
              <Typography variant="body2">
                {currentUser?.displayName || currentUser?.email}
              </Typography>
            </Box>

            {activeEntry.processId && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                Process:{" "}
                {processes.find(p => p.id === activeEntry.processId)?.name || "Unknown Process"}
              </Typography>
            )}

            <TextField
              fullWidth
              label="Notes"
              variant="outlined"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
              {activeEntry.paused ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<StartIcon />}
                  onClick={handleResumeTime}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Resume"}
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<PauseIcon />}
                  onClick={handlePauseTime}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Pause"}
                </Button>
              )}

              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleStopTime}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Stop"}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="process-select-label">Process (Optional)</InputLabel>
              <Select
                labelId="process-select-label"
                value={selectedProcess}
                label="Process (Optional)"
                onChange={e => setSelectedProcess(e.target.value)}
              >
                <MenuItem value="">
                  <em>General order work</em>
                </MenuItem>
                {processes.map(process => (
                  <MenuItem key={process.id} value={process.id}>
                    {process.name} ({process.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Notes"
              variant="outlined"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What are you working on?"
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />

            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<StartIcon />}
              onClick={handleStartTime}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : "Start Working"}
            </Button>
          </Box>
        )}
      </Box>

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
          <Button onClick={handleConfirmUnclosed} variant="contained" disabled={isLoading}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TimeEntryWidget;
