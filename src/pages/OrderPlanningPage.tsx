// src/pages/OrderPlanningPage.tsx
import { useState } from "react";
import { Box, Breadcrumbs, Typography, Link, Paper, Tabs, Tab } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import OrderWorkflowTimeline from "../components/orders/OrderWorkflowTimeline";
import OrderPlanningGantt from "../components/orders/OrderPlanningGantt";
// Remove or comment out this line:
// import SimplifiedGanttChart from "../components/orders/SimplifiedGanttChart";
import ContentWrapper from "../components/layout/ContentWrapper";

const OrderPlanningPage = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <ContentWrapper>
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
        <Paper sx={{ mb: 3, p: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="Order Planning Tabs">
            <Tab label="Workflow View" />
            <Tab label="Gantt Chart" />
          </Tabs>
          <Box sx={{ mt: 2 }}>
            {tabValue === 0 && <OrderWorkflowTimeline />}
            {tabValue === 1 && <OrderPlanningGantt />} {/* Use the new Gantt */}
          </Box>
        </Paper>
      </Box>
    </ContentWrapper>
  );
};

export default OrderPlanningPage;
