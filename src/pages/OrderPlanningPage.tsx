// src/pages/OrderPlanningPage.tsx
import { Box, Breadcrumbs, Typography, Link, Paper, Tabs, Tab } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { useState } from 'react';
import OrderPlanningGantt from '../components/orders/OrderPlanningGantt';

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
      id={`planning-tabpanel-${index}`}
      aria-labelledby={`planning-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const OrderPlanningPage = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      {/* Page Header with Breadcrumbs */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Order Planning
        </Typography>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          <Link component={RouterLink} to="/" color="inherit">
            Dashboard
          </Link>
          <Link component={RouterLink} to="/orders" color="inherit">
            Orders
          </Link>
          <Typography color="text.primary">Planning</Typography>
        </Breadcrumbs>
      </Box>

      {/* Planning Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="planning tabs">
          <Tab label="Gantt Chart" />
          <Tab label="Calendar View" />
          <Tab label="Resource Allocation" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <OrderPlanningGantt />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" color="text.secondary" align="center">
              Calendar View Coming Soon
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" color="text.secondary" align="center">
              Resource Allocation View Coming Soon
            </Typography>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default OrderPlanningPage;