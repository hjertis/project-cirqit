import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  AccessTime as TimeIcon,
  Edit as EditIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import {
  getTimeEntriesForOrder,
  TimeEntry,
  updateTimeEntry,
} from "../../services/timeTrackingService";
import { formatDuration, formatDurationHumanReadable, formatDateTime } from "../../utils/helpers";
import EditTimeEntryDialog from "./EditTimeEntryDialog";

interface TimeEntriesListProps {
  orderId: string;
  reloadTrigger?: number;
}

const TimeEntriesList = ({ orderId, reloadTrigger = 0 }: TimeEntriesListProps) => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState<number>(0);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeEntries = async () => {
      try {
        setLoading(true);
        const entries = await getTimeEntriesForOrder(orderId);
        setTimeEntries(entries);

        // Calculate total duration from start/end times, not stored duration
        let total = 0;
        entries.forEach(entry => {
          if (entry.endTime) {
            const duration = Math.max(
              0,
              Math.floor(
                (entry.endTime.toDate().getTime() - entry.startTime.toDate().getTime()) / 1000
              )
            );
            total += duration;
          }
        });
        setTotalDuration(total);
      } catch (err) {
        console.error("Error fetching time entries:", err);
        setError("Failed to load time entries");
      } finally {
        setLoading(false);
      }
    };

    fetchTimeEntries();
  }, [orderId, reloadTrigger]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "paused":
        return "warning";
      case "completed":
        return "default";
      default:
        return "default";
    }
  };

  const handleOpenEditDialog = (entry: TimeEntry) => {
    setEditEntry(entry);
    setEditDialogOpen(true);
  };

  const handleEditTimeEntry = async (updates: Partial<TimeEntry>) => {
    if (!editEntry) return;
    setEditLoading(true);
    setEditError(null);
    try {
      // Calculate duration if both start and end are present
      if (updates.startTime && updates.endTime) {
        const start = updates.startTime.toDate();
        const end = updates.endTime.toDate();
        updates.duration = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
      }
      await updateTimeEntry(editEntry.id!, updates);
      setTimeEntries(prevEntries => {
        const updatedEntries = prevEntries.map(entry => {
          if (entry.id === editEntry.id) {
            return {
              ...entry,
              ...updates,
              startTime: updates.startTime || entry.startTime,
              endTime: updates.endTime !== undefined ? updates.endTime : entry.endTime,
              processId: updates.processId !== undefined ? updates.processId : entry.processId,
              notes: updates.notes !== undefined ? updates.notes : entry.notes,
              duration: updates.duration !== undefined ? updates.duration : entry.duration,
            };
          }
          return entry;
        });
        // Recalculate total duration
        let total = 0;
        updatedEntries.forEach(entry => {
          if (entry.endTime) {
            const duration = Math.max(
              0,
              Math.floor(
                (entry.endTime.toDate().getTime() - entry.startTime.toDate().getTime()) / 1000
              )
            );
            total += duration;
          }
        });
        setTotalDuration(total);
        return updatedEntries;
      });
      setEditDialogOpen(false);
      setEditEntry(null);
    } catch {
      setEditError("Failed to update time entry");
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (timeEntries.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 3 }}>
        <Typography variant="body2" color="text.secondary">
          No time entries recorded for this order yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <TimeIcon sx={{ mr: 1, color: "primary.main" }} />
        <Typography variant="h6">Time Entries</Typography>
        <Chip
          label={`Total: ${formatDurationHumanReadable(totalDuration)}`}
          color="primary"
          sx={{ ml: "auto" }}
        />
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Start Time</TableCell>
              <TableCell>End Time</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {timeEntries.map(entry => (
              <TableRow key={entry.id} hover>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <PersonIcon fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} />
                    <Typography variant="body2">
                      {entry.userDisplayName || entry.userId.substring(0, 8)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{formatDateTime(entry.startTime.toDate())}</TableCell>
                <TableCell>
                  {entry.endTime ? formatDateTime(entry.endTime.toDate()) : "-"}
                </TableCell>
                <TableCell>
                  {entry.endTime
                    ? formatDuration(
                        Math.max(
                          0,
                          Math.floor(
                            (entry.endTime.toDate().getTime() -
                              entry.startTime.toDate().getTime()) /
                              1000
                          )
                        )
                      )
                    : entry.status === "active"
                      ? "In progress"
                      : "Paused"}
                </TableCell>
                <TableCell>
                  <Chip
                    label={entry.status.toUpperCase()}
                    color={getStatusColor(entry.status)}
                    size="small"
                  />
                  {entry.groupId && (
                    <Chip
                      size="small"
                      label="Group"
                      color="primary"
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  )}
                </TableCell>
                <TableCell sx={{ maxWidth: 200, overflowWrap: "break-word" }}>
                  {entry.notes || "-"}
                </TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => handleOpenEditDialog(entry)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <EditTimeEntryDialog
        open={editDialogOpen}
        entry={editEntry}
        loading={editLoading}
        error={editError}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleEditTimeEntry}
      />
    </Paper>
  );
};

export default TimeEntriesList;
