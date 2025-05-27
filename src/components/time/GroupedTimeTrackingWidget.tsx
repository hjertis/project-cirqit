import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Autocomplete,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
} from "@mui/material";
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  Timer as TimerIcon,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import {
  startTimeEntry,
  stopGroupedTimeEntries,
  pauseGroupedTimeEntries,
  resumeGroupedTimeEntries,
  getActiveGroupedTimeEntries,
  TimeEntry,
} from "../../services/timeTrackingService";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import { formatDuration } from "../../utils/helpers";

interface OrderOption {
  id: string;
  orderNumber: string;
  description: string;
}

interface ActiveGroup {
  groupId: string;
  entries: TimeEntry[];
}

interface GroupedTimeTrackingWidgetProps {
  onTimeEntryUpdated?: () => void;
}

const GroupedTimeTrackingWidget = ({ onTimeEntryUpdated }: GroupedTimeTrackingWidgetProps) => {
  const { currentUser } = useAuth();
  const [selectedOrders, setSelectedOrders] = useState<OrderOption[]>([]);
  const [orderOptions, setOrderOptions] = useState<OrderOption[]>([]);
  const [notes, setNotes] = useState("");
  const [activeGroups, setActiveGroups] = useState<ActiveGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [elapsedTimes, setElapsedTimes] = useState<Map<string, number>>(new Map());

  // Dialog states
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [groupToStop, setGroupToStop] = useState<string | null>(null);
  const [stopNotes, setStopNotes] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) return;

      try {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("status", "in", ["In Progress", "Released", "Started"]));
        const snap = await getDocs(q);
        const options = snap.docs.map(doc => ({
          id: doc.id,
          orderNumber: doc.data().orderNumber || doc.id,
          description: doc.data().description || "",
        }));
        setOrderOptions(options);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("Failed to fetch orders");
      }
    };

    if (currentUser) {
      fetchOrders();
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchActiveGroups = async () => {
      if (!currentUser) return;
      try {
        const groups = await getActiveGroupedTimeEntries(currentUser.uid);
        setActiveGroups(groups);

        // Initialize elapsed times
        const newElapsedTimes = new Map<string, number>();
        groups.forEach(group => {
          // Find the earliest start time for active entries in the group
          const activeEntries = group.entries.filter(
            entry => entry.status === "active" && !entry.paused
          );

          if (activeEntries.length > 0) {
            const earliestStartTime = Math.min(
              ...activeEntries.map(entry => entry.startTime.toDate().getTime())
            );
            const now = new Date().getTime();
            const elapsed = Math.floor((now - earliestStartTime) / 1000);
            newElapsedTimes.set(group.groupId, elapsed);
          }
        });
        setElapsedTimes(newElapsedTimes);
      } catch (err) {
        console.error("Error fetching active groups:", err);
      }
    };

    if (currentUser) {
      fetchActiveGroups();
    }
  }, [currentUser]);

  // Timer effect for active groups
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    activeGroups.forEach(group => {
      const hasActiveEntry = group.entries.some(
        entry => entry.status === "active" && !entry.paused
      );

      if (hasActiveEntry) {
        const timer = setInterval(() => {
          setElapsedTimes(prev => {
            const newMap = new Map(prev);

            // Calculate elapsed time from the earliest start time in the group
            const activeEntries = group.entries.filter(
              entry => entry.status === "active" && !entry.paused
            );

            if (activeEntries.length > 0) {
              const earliestStartTime = Math.min(
                ...activeEntries.map(entry => entry.startTime.toDate().getTime())
              );
              const now = new Date().getTime();
              const elapsed = Math.floor((now - earliestStartTime) / 1000);
              newMap.set(group.groupId, elapsed);
            }

            return newMap;
          });
        }, 1000);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearInterval(timer));
    };
  }, [activeGroups]);

  const handleStartGroupTracking = async () => {
    if (selectedOrders.length === 0) {
      setError("Please select at least one order");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const groupId = `group_${Date.now()}_${currentUser?.uid}`; // Start time entries for all selected orders with the same group ID
      for (const order of selectedOrders) {
        await startTimeEntry(
          currentUser!.uid,
          order.id,
          order.orderNumber,
          undefined, // processId - this will be handled properly by the service
          notes,
          groupId
        );
      }
      setSuccess(`Started tracking ${selectedOrders.length} orders together`);
      setSelectedOrders([]);
      setNotes("");

      // Refresh active groups
      const groups = await getActiveGroupedTimeEntries(currentUser!.uid);
      setActiveGroups(groups);

      // Notify parent component
      if (onTimeEntryUpdated) {
        onTimeEntryUpdated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start tracking");
    } finally {
      setLoading(false);
    }
  };

  const handleStopGroup = async (groupId: string) => {
    setGroupToStop(groupId);
    setShowStopDialog(true);
  };
  const confirmStopGroup = async () => {
    if (!groupToStop) return;

    try {
      setLoading(true);
      await stopGroupedTimeEntries(groupToStop, stopNotes);

      setSuccess("Group tracking stopped successfully");
      setShowStopDialog(false);
      setGroupToStop(null);
      setStopNotes("");

      // Refresh active groups
      const groups = await getActiveGroupedTimeEntries(currentUser!.uid);
      setActiveGroups(groups);

      // Notify parent component
      if (onTimeEntryUpdated) {
        onTimeEntryUpdated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop tracking");
    } finally {
      setLoading(false);
    }
  };
  const handlePauseGroup = async (groupId: string) => {
    try {
      setLoading(true);
      await pauseGroupedTimeEntries(groupId);

      setSuccess("Group tracking paused");

      // Refresh active groups
      const groups = await getActiveGroupedTimeEntries(currentUser!.uid);
      setActiveGroups(groups);

      // Notify parent component
      if (onTimeEntryUpdated) {
        onTimeEntryUpdated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause tracking");
    } finally {
      setLoading(false);
    }
  };
  const handleResumeGroup = async (groupId: string) => {
    try {
      setLoading(true);
      await resumeGroupedTimeEntries(groupId);

      setSuccess("Group tracking resumed");

      // Refresh active groups
      const groups = await getActiveGroupedTimeEntries(currentUser!.uid);
      setActiveGroups(groups);

      // Notify parent component
      if (onTimeEntryUpdated) {
        onTimeEntryUpdated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume tracking");
    } finally {
      setLoading(false);
    }
  };

  const getGroupStatus = (group: ActiveGroup): "active" | "paused" | "mixed" => {
    const statuses = group.entries.map(entry => entry.status);
    const uniqueStatuses = [...new Set(statuses)];

    if (uniqueStatuses.length === 1) {
      return uniqueStatuses[0] as "active" | "paused";
    }
    return "mixed";
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Group Time Tracking
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearMessages}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={clearMessages}>
            {success}
          </Alert>
        )}

        {/* Active Groups Section */}
        {activeGroups.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Active Group Sessions
            </Typography>
            {activeGroups.map(group => {
              const groupStatus = getGroupStatus(group);
              const elapsed = elapsedTimes.get(group.groupId) || 0;

              return (
                <Card key={group.groupId} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <TimerIcon color={groupStatus === "active" ? "primary" : "disabled"} />
                        <Typography variant="body2" color="text.secondary">
                          {formatDuration(elapsed)}
                        </Typography>
                        <Chip
                          label={groupStatus}
                          size="small"
                          color={
                            groupStatus === "active"
                              ? "success"
                              : groupStatus === "paused"
                                ? "warning"
                                : "default"
                          }
                        />
                      </Box>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {groupStatus === "active" && (
                          <IconButton
                            size="small"
                            onClick={() => handlePauseGroup(group.groupId)}
                            disabled={loading}
                          >
                            <PauseIcon />
                          </IconButton>
                        )}
                        {groupStatus === "paused" && (
                          <IconButton
                            size="small"
                            onClick={() => handleResumeGroup(group.groupId)}
                            disabled={loading}
                          >
                            <StartIcon />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleStopGroup(group.groupId)}
                          disabled={loading}
                        >
                          <StopIcon />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {group.entries.map(entry => (
                        <Chip
                          key={entry.id}
                          label={entry.orderNumber}
                          size="small"
                          variant="outlined"
                          color={entry.status === "active" ? "primary" : "default"}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
            <Divider sx={{ my: 2 }} />
          </Box>
        )}

        {/* New Group Creation */}
        <Typography variant="subtitle1" gutterBottom>
          Start New Group Session
        </Typography>

        <Autocomplete
          multiple
          options={orderOptions}
          getOptionLabel={option => `${option.orderNumber} - ${option.description}`}
          value={selectedOrders}
          onChange={(_, newValue) => setSelectedOrders(newValue)}
          renderInput={params => (
            <TextField
              {...params}
              label="Select Orders"
              placeholder="Choose orders to track together"
              sx={{ mb: 2 }}
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                variant="outlined"
                label={option.orderNumber}
                {...getTagProps({ index })}
                key={option.id}
              />
            ))
          }
        />

        <TextField
          fullWidth
          label="Notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          multiline
          rows={2}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          onClick={handleStartGroupTracking}
          disabled={loading || selectedOrders.length === 0}
          fullWidth
          startIcon={loading ? <CircularProgress size={20} /> : <StartIcon />}
        >
          {loading ? "Starting..." : "Start Group Tracking"}
        </Button>

        {/* Stop Confirmation Dialog */}
        <Dialog open={showStopDialog} onClose={() => setShowStopDialog(false)}>
          <DialogTitle>Stop Group Tracking</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Are you sure you want to stop tracking this group? This will end all active time
              entries in the group.
            </Typography>
            <TextField
              fullWidth
              label="Final Notes (optional)"
              value={stopNotes}
              onChange={e => setStopNotes(e.target.value)}
              multiline
              rows={2}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowStopDialog(false)}>Cancel</Button>
            <Button onClick={confirmStopGroup} variant="contained" color="error">
              Stop Group
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default GroupedTimeTrackingWidget;
