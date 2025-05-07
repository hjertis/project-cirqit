import {
  Grid,
  Typography,
  Paper,
  Box,
  Button,
  Divider,
  Tab,
  Tabs,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { useState, SyntheticEvent } from "react";
import StatCard from "../components/dashboard/StatCard";
import RecentOrdersTable from "../components/dashboard/RecentOrdersTable";
import ResourceUtilizationChart from "../components/dashboard/ResourceUtilizationChart";
import DailyOrdersChart from "../components/dashboard/DailyOrdersChart";
import NotificationsPanel from "../components/dashboard/NotificationsPanel";
import UpcomingTasks from "../components/dashboard/UpcomingTasks";
import { useDashboardData } from "../hooks/useDashboardData";
import { Link as RouterLink } from "react-router-dom";
import OrderDetailsDialog from "../components/orders/OrderDetailsDialog";
import {
  Inventory as InventoryIcon,
  Timeline as TimelineIcon,
  Paid as PaidIcon,
  AssignmentTurnedIn as CompletedIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import ContentWrapper from "../components/layout/ContentWrapper";

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const Dashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const { stats, refreshStats, lastUpdatedString, isLoading } = useDashboardData();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const handleTabChange = (event: SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    refreshStats();
  };

  return (
    <ContentWrapper>
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h4" component="h1">
            Dashboard
          </Typography>
          <Box>
            <Tooltip title={`Last updated: ${lastUpdatedString}`}>
              <Button
                variant="outlined"
                startIcon={isLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
                onClick={handleRefresh}
                disabled={isLoading}
                sx={{ mr: 1 }}
              >
                {isLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />}>
              New Order
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Orders Overview"
              value={stats.ordersCompletionRate}
              icon={<InventoryIcon />}
              color="#3f51b5"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="On-time Delivery"
              value={stats.onTimeDeliveryRate}
              icon={<TimelineIcon />}
              color="#4caf50"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Average Lead Time"
              value={stats.averageLeadTime}
              icon={<TimelineIcon />}
              color="#4caf50"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Completed Orders"
              value={stats.completedOrdersCount}
              icon={<CompletedIcon />}
              color="#f44336"
            />
          </Grid>
        </Grid>

        <Paper sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
              <Tab label="Daily Orders" />
              <Tab label="Resource Utilization" />
            </Tabs>
          </Box>
          <TabPanel value={tabValue} index={0}>
            <DailyOrdersChart />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <ResourceUtilizationChart />
          </TabPanel>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
          >
            <Typography variant="h6">Recent Orders</Typography>
            <Button
              component={RouterLink}
              to="/orders/planning"
              variant="outlined"
              startIcon={<TimelineIcon />}
              sx={{ mr: 1 }}
            >
              Planning View
            </Button>
            <Button component={RouterLink} to="/orders" variant="text" endIcon={<TimelineIcon />}>
              View All
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <RecentOrdersTable
            maxItems={5}
            onViewOrder={orderId => {
              setSelectedOrderId(orderId);
              setDetailsDialogOpen(true);
            }}
          />
          <OrderDetailsDialog
            open={detailsDialogOpen}
            onClose={() => setDetailsDialogOpen(false)}
            orderId={selectedOrderId}
          />
        </Paper>

        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12} md={6}>
            <NotificationsPanel />
          </Grid>
          <Grid item xs={12} md={6}>
            <UpcomingTasks />
          </Grid>
        </Grid>
      </Box>
    </ContentWrapper>
  );
};

export default Dashboard;
