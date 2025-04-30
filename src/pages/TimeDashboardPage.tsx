import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import {
  getTimeEntriesForUser,
  getAllActiveTimeEntries,
  stopTimeEntry,
  pauseTimeEntry,
  resumeTimeEntry,
  calculateTotalTimeForUser,
  TimeEntry,
} from "../services/timeTrackingService";
import { formatDuration, formatDateTime, formatDurationHumanReadable } from "../utils/helpers";
import ContentWrapper from "../components/layout/ContentWrapper";
import dayjs from "dayjs";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`time-tabpanel-${index}`}
      aria-labelledby={`time-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const TimeDashboardPage = () => {
  const { currentUser } = useAuth();
  const [tabValue, setTabValue] = useState<number>(0);
  const [userTimeEntries, setUserTimeEntries] = useState<TimeEntry[]>([]);
  const [allActiveEntries, setAllActiveEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalTimeThisWeek, setTotalTimeThisWeek] = useState<number>(0);
  const [totalTimeThisMonth, setTotalTimeThisMonth] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(
    dayjs().subtract(14, "day").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserTimeEntries = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);

        const entries = await getTimeEntriesForUser(currentUser.uid, 100);
        setUserTimeEntries(entries);

        const activeEntries = await getAllActiveTimeEntries();
        setAllActiveEntries(activeEntries);

        const startOfWeek = dayjs().startOf("week").toDate();
        const totalWeek = await calculateTotalTimeForUser(currentUser.uid, startOfWeek);
        setTotalTimeThisWeek(totalWeek);

        const startOfMonth = dayjs().startOf("month").toDate();
        const totalMonth = await calculateTotalTimeForUser(currentUser.uid, startOfMonth);
        setTotalTimeThisMonth(totalMonth);
      } catch (err) {
        console.error("Error fetching time data:", err);
        setError("Failed to load time data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserTimeEntries();
  }, [currentUser, refreshTrigger]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleStopTimeEntry = async (entryId: string) => {
    try {
      setActionLoading(true);
      await stopTimeEntry(entryId);
      handleRefresh();
    } catch (err) {
      console.error("Error stopping time entry:", err);
      setError("Failed to stop time entry");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseTimeEntry = async (entryId: string) => {
    try {
      setActionLoading(true);
      await pauseTimeEntry(entryId);
      handleRefresh();
    } catch (err) {
      console.error("Error pausing time entry:", err);
      setError("Failed to pause time entry");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeTimeEntry = async (entryId: string) => {
    try {
      setActionLoading(true);
      await resumeTimeEntry(entryId);
      handleRefresh();
    } catch (err) {
      console.error("Error resuming time entry:", err);
      setError("Failed to resume time entry");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTimeEntries = userTimeEntries.filter(entry => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      entry.orderNumber.toLowerCase().includes(searchLower) ||
      (entry.notes && entry.notes.toLowerCase().includes(searchLower))
    );
  });

  return (
    <ContentWrapper>
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h4" component="h1">
            Time Dashboard
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Time This Week
                </Typography>
                {loading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Typography variant="h5" component="div">
                    {formatDurationHumanReadable(totalTimeThisWeek)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Time This Month
                </Typography>
                {loading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Typography variant="h5" component="div">
                    {formatDurationHumanReadable(totalTimeThisMonth)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Sessions
                </Typography>
                {loading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Typography variant="h5" component="div">
                    {allActiveEntries.filter(e => e.userId === currentUser?.uid).length}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Entries
                </Typography>
                {loading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Typography variant="h5" component="div">
                    {userTimeEntries.length}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="time tracking tabs">
              <Tab label="My Time Entries" />
              <Tab label="Active Sessions" />
              {currentUser?.email?.includes("admin") && <Tab label="All Users" />}
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Search Orders or Notes"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={8}>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <TextField
                      label="Start Date"
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />

                    <TextField
                      label="End Date"
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />

                    <Button variant="outlined" startIcon={<CalendarIcon />} onClick={handleRefresh}>
                      Apply Dates
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
                <CircularProgress />
              </Box>
            ) : filteredTimeEntries.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 5 }}>
                <Typography color="textSecondary">
                  No time entries found. Start tracking time on an order to see entries here.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order</TableCell>
                      <TableCell>Start Time</TableCell>
                      <TableCell>End Time</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTimeEntries.map(entry => (
                      <TableRow key={entry.id} hover>
                        <TableCell>{entry.orderNumber}</TableCell>
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
                        <TableCell>
                          <Chip
                            label={entry.status.toUpperCase()}
                            color={
                              entry.status === "active"
                                ? "success"
                                : entry.status === "paused"
                                  ? "warning"
                                  : "default"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200, overflowWrap: "break-word" }}>
                          {entry.notes || "-"}
                        </TableCell>
                        <TableCell>
                          {entry.status === "active" ? (
                            <>
                              <Tooltip title="Pause">
                                <IconButton
                                  size="small"
                                  color="warning"
                                  onClick={() => handlePauseTimeEntry(entry.id!)}
                                  disabled={actionLoading}
                                >
                                  <PauseIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Stop">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleStopTimeEntry(entry.id!)}
                                  disabled={actionLoading}
                                >
                                  <StopIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          ) : entry.status === "paused" ? (
                            <>
                              <Tooltip title="Resume">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleResumeTimeEntry(entry.id!)}
                                  disabled={actionLoading}
                                >
                                  <PlayIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Stop">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleStopTimeEntry(entry.id!)}
                                  disabled={actionLoading}
                                >
                                  <StopIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">Active Time Sessions</Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                View and manage your currently active time tracking sessions
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
                <CircularProgress />
              </Box>
            ) : allActiveEntries.filter(e => e.userId === currentUser?.uid).length === 0 ? (
              <Box sx={{ textAlign: "center", py: 5 }}>
                <Typography color="textSecondary">
                  You don't have any active time tracking sessions.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order</TableCell>
                      <TableCell>Start Time</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allActiveEntries
                      .filter(e => e.userId === currentUser?.uid)
                      .map(entry => (
                        <TableRow key={entry.id} hover>
                          <TableCell>{entry.orderNumber}</TableCell>
                          <TableCell>{formatDateTime(entry.startTime.toDate())}</TableCell>
                          <TableCell>
                            <Chip
                              label={entry.status.toUpperCase()}
                              color={entry.status === "active" ? "success" : "warning"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200, overflowWrap: "break-word" }}>
                            {entry.notes || "-"}
                          </TableCell>
                          <TableCell>
                            {entry.status === "active" ? (
                              <>
                                <Tooltip title="Pause">
                                  <IconButton
                                    size="small"
                                    color="warning"
                                    onClick={() => handlePauseTimeEntry(entry.id!)}
                                    disabled={actionLoading}
                                  >
                                    <PauseIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Stop">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleStopTimeEntry(entry.id!)}
                                    disabled={actionLoading}
                                  >
                                    <StopIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            ) : (
                              <>
                                <Tooltip title="Resume">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleResumeTimeEntry(entry.id!)}
                                    disabled={actionLoading}
                                  >
                                    <PlayIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Stop">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleStopTimeEntry(entry.id!)}
                                    disabled={actionLoading}
                                  >
                                    <StopIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {currentUser?.email?.includes("admin") && (
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6">All Active Sessions</Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Admin view of all active time tracking sessions
                </Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
                  <CircularProgress />
                </Box>
              ) : allActiveEntries.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 5 }}>
                  <Typography color="textSecondary">
                    There are no active time tracking sessions.
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Order</TableCell>
                        <TableCell>Start Time</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Notes</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allActiveEntries.map(entry => (
                        <TableRow key={entry.id} hover>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <PersonIcon sx={{ mr: 0.5, color: "text.secondary" }} />
                              <Typography variant="body2">
                                {entry.userDisplayName || entry.userId.substring(0, 8)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{entry.orderNumber}</TableCell>
                          <TableCell>{formatDateTime(entry.startTime.toDate())}</TableCell>
                          <TableCell>
                            <Chip
                              label={entry.status.toUpperCase()}
                              color={entry.status === "active" ? "success" : "warning"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200, overflowWrap: "break-word" }}>
                            {entry.notes || "-"}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Stop">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleStopTimeEntry(entry.id!)}
                                disabled={actionLoading}
                              >
                                <StopIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          )}
        </Paper>
      </Box>
    </ContentWrapper>
  );
};

export default TimeDashboardPage;
