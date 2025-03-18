// src/components/time/TimeEntryWidget.tsx
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

  // Check for active time entry when component mounts
  useEffect(() => {
    const fetchActiveEntry = async () => {
      if (!currentUser) return;

      try {
        setIsLoading(true);
        const entry = await getActiveTimeEntry(currentUser.uid, orderId);
        setActiveEntry(entry);

        if (entry) {
          // If there's an active entry, initialize the elapsed time
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

  // Update the elapsed time every second for active entries
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

  const handleStartTime = async () => {
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

      {/* Active Time Display */}
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
    </Paper>
  );
};

export default TimeEntryWidget;
