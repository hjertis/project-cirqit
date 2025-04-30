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
  Divider,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  AccessTime as TimeIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import { getTimeEntriesForOrder, TimeEntry } from "../../services/timeTrackingService";
import { formatDuration, formatDurationHumanReadable, formatDateTime } from "../../utils/helpers";

interface TimeEntriesListProps {
  orderId: string;
  reloadTrigger?: number;
}

const TimeEntriesList = ({ orderId, reloadTrigger = 0 }: TimeEntriesListProps) => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState<number>(0);

  useEffect(() => {
    const fetchTimeEntries = async () => {
      try {
        setLoading(true);
        const entries = await getTimeEntriesForOrder(orderId);
        setTimeEntries(entries);

        let total = 0;
        entries.forEach(entry => {
          if (entry.status === "completed" && entry.duration) {
            total += entry.duration;
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
              <TableCell>Process</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Notes</TableCell>
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
                  {entry.status === "completed"
                    ? formatDuration(entry.duration || 0)
                    : entry.status === "active"
                      ? "In progress"
                      : "Paused"}
                </TableCell>
                <TableCell>{entry.processId || "General"}</TableCell>
                <TableCell>
                  <Chip
                    label={entry.status.toUpperCase()}
                    color={getStatusColor(entry.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ maxWidth: 200, overflowWrap: "break-word" }}>
                  {entry.notes || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default TimeEntriesList;
