import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Group as GroupIcon,
  Timer as TimerIcon,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { TimeEntry } from "../../services/timeTrackingService";
import { formatDuration, formatDateTime } from "../../utils/helpers";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";

interface GroupSummary {
  groupId: string;
  entries: TimeEntry[];
  totalDuration: number;
  orderNumbers: string[];
  startTime: Date;
  endTime?: Date;
  status: "active" | "completed" | "mixed";
}

const GroupedTimeEntriesSummary = () => {
  const { currentUser } = useAuth();
  const [groupSummaries, setGroupSummaries] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroupedEntries = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch all time entries for the user that have a groupId
        const timeEntriesRef = collection(db, "timeEntries");
        const q = query(
          timeEntriesRef,
          where("userId", "==", currentUser.uid),
          where("groupId", "!=", null)
        );

        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map(
          doc =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as TimeEntry
        );

        // Group entries by groupId
        const grouped = new Map<string, TimeEntry[]>();
        entries.forEach(entry => {
          if (entry.groupId) {
            if (!grouped.has(entry.groupId)) {
              grouped.set(entry.groupId, []);
            }
            grouped.get(entry.groupId)!.push(entry);
          }
        });

        // Create summaries
        const summaries: GroupSummary[] = Array.from(grouped.entries()).map(
          ([groupId, groupEntries]) => {
            const totalDuration = groupEntries.reduce((sum, entry) => {
              return sum + (entry.duration || 0);
            }, 0);

            const orderNumbers = [...new Set(groupEntries.map(entry => entry.orderNumber))];
            const startTimes = groupEntries.map(entry => entry.startTime.toDate());
            const startTime = new Date(Math.min(...startTimes.map(d => d.getTime())));

            const endTimes = groupEntries
              .filter(entry => entry.endTime)
              .map(entry => entry.endTime!.toDate());
            const endTime =
              endTimes.length > 0
                ? new Date(Math.max(...endTimes.map(d => d.getTime())))
                : undefined;

            const statuses = [...new Set(groupEntries.map(entry => entry.status))];
            const status: "active" | "completed" | "mixed" =
              statuses.length === 1 ? (statuses[0] as "active" | "completed" | "mixed") : "mixed";

            return {
              groupId,
              entries: groupEntries.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis()),
              totalDuration,
              orderNumbers,
              startTime,
              endTime,
              status,
            };
          }
        );

        // Sort by start time (most recent first)
        summaries.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
        setGroupSummaries(summaries);
      } catch (err) {
        console.error("Error fetching grouped time entries:", err);
        setError("Failed to fetch grouped time entries");
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchGroupedEntries();
    }
  }, [currentUser]);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (groupSummaries.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: "center", p: 3 }}>
            <GroupIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No Grouped Time Entries
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start using group time tracking to see summaries here.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <GroupIcon />
          <Typography variant="h6">Grouped Time Entries Summary</Typography>
        </Box>

        {groupSummaries.map(summary => (
          <Accordion key={summary.groupId} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  pr: 2,
                }}
              >
                <Box>
                  <Typography variant="subtitle1">
                    Group Session - {formatDateTime(summary.startTime)}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                    {summary.orderNumbers.map(orderNumber => (
                      <Chip key={orderNumber} label={orderNumber} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TimerIcon fontSize="small" />
                    <Typography variant="body2" fontWeight="bold">
                      {formatDuration(summary.totalDuration)}
                    </Typography>
                  </Box>
                  <Chip
                    label={summary.status}
                    size="small"
                    color={
                      summary.status === "completed"
                        ? "success"
                        : summary.status === "active"
                          ? "primary"
                          : "default"
                    }
                  />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order</TableCell>
                      <TableCell>Start Time</TableCell>
                      <TableCell>End Time</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary.entries.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.orderNumber}</TableCell>
                        <TableCell>{formatDateTime(entry.startTime.toDate())}</TableCell>
                        <TableCell>
                          {entry.endTime ? formatDateTime(entry.endTime.toDate()) : "-"}
                        </TableCell>
                        <TableCell>
                          {entry.duration ? formatDuration(entry.duration) : "-"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={entry.status}
                            size="small"
                            color={
                              entry.status === "completed"
                                ? "success"
                                : entry.status === "active"
                                  ? "primary"
                                  : "warning"
                            }
                          />
                        </TableCell>
                        <TableCell
                          sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {entry.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))}
      </CardContent>
    </Card>
  );
};

export default GroupedTimeEntriesSummary;
