import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Button,
  Grid,
  Paper,
  Tab,
  Tabs,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Refresh as RefreshIcon, NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import ContentWrapper from "../components/layout/ContentWrapper";
import FaultParetoChart from "../components/dashboard/FaultParetoChart";
import FaultsByOrderChart from "../components/dashboard/FaultsByOrderChart";
import FaultsOverTimeChart from "../components/dashboard/FaultsOverTimeChart";
import FaultsByTypeChart from "../components/dashboard/FaultsByTypeChart";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import dayjs from "dayjs";

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`fault-tabpanel-${index}`}
      aria-labelledby={`fault-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const FaultReportsPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    mostCommon: "-",
    avgPerOrder: "-",
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const snapshot = await getDocs(collection(db, "faults"));
        const faults = snapshot.docs.map(doc => doc.data());
        // Total faults
        const total = faults.length;
        // Faults this month
        const now = dayjs();
        const thisMonth = faults.filter(fault => {
          let date: Date | null = null;
          if (fault.addDate instanceof Timestamp) date = fault.addDate.toDate();
          else if (fault.addDate) date = new Date(fault.addDate);
          if (!date || isNaN(date.getTime())) return false;
          return dayjs(date).isSame(now, "month");
        }).length;
        // Most common fault type
        const typeCounts: Record<string, number> = {};
        faults.forEach(fault => {
          const type = fault.faultType || "Unknown";
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        let mostCommon = "-";
        let maxCount = 0;
        Object.entries(typeCounts).forEach(([type, count]) => {
          if (count > maxCount) {
            mostCommon = type;
            maxCount = count;
          }
        });
        // Average faults per order
        const orderSet = new Set(faults.map(fault => fault.orderId || "Unknown"));
        const avgPerOrder = orderSet.size > 0 ? (total / orderSet.size).toFixed(2) : "-";
        setStats({ total, thisMonth, mostCommon, avgPerOrder });
      } catch (err) {
        setStatsError("Failed to load fault stats.");
        console.error(err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    setLoading(true);
    // TODO: Add refresh logic
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <ContentWrapper>
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Fault Report
            </Typography>
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
              <Link component={RouterLink} to="/" color="inherit">
                Dashboard
              </Link>
              <Typography color="text.primary">Fault Report</Typography>
            </Breadcrumbs>
          </Box>
          <Tooltip title="Refresh Data">
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </Tooltip>
        </Box>

        {/* Summary Section */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography color="textSecondary" gutterBottom>
                Total Faults
              </Typography>
              {statsLoading ? (
                <CircularProgress size={20} />
              ) : (
                <Typography variant="h5">{stats.total}</Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography color="textSecondary" gutterBottom>
                Faults This Month
              </Typography>
              {statsLoading ? (
                <CircularProgress size={20} />
              ) : (
                <Typography variant="h5">{stats.thisMonth}</Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography color="textSecondary" gutterBottom>
                Most Common Fault
              </Typography>
              {statsLoading ? (
                <CircularProgress size={20} />
              ) : (
                <Typography variant="h5">{stats.mostCommon}</Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography color="textSecondary" gutterBottom>
                Avg Faults per Order
              </Typography>
              {statsLoading ? (
                <CircularProgress size={20} />
              ) : (
                <Typography variant="h5">{stats.avgPerOrder}</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Tabs for Fault KPIs */}
        <Paper>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="fault kpi tabs">
              <Tab label="Pareto Analysis" />
              <Tab label="By Order" />
              <Tab label="Over Time" />
              <Tab label="By Type" />
            </Tabs>
          </Box>
          <TabPanel value={tabValue} index={0}>
            <FaultParetoChart />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <FaultsByOrderChart />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <FaultsOverTimeChart />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <FaultsByTypeChart />
          </TabPanel>
        </Paper>
      </Box>
    </ContentWrapper>
  );
};

export default FaultReportsPage;
