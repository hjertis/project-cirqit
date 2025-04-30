import { useState } from "react";
import { Box, Breadcrumbs, Typography, Link, Paper, Tabs, Tab } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import OrderWorkflowTimeline from "../components/orders/OrderWorkflowTimeline";
import ContentWrapper from "../components/layout/ContentWrapper";

const OrderPlanningPage = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <ContentWrapper>
      <Box>
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

        <Paper>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="Order Planning Tabs"
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Workflow View" />
          </Tabs>
          <Box>{tabValue === 0 && <OrderWorkflowTimeline />}</Box>
        </Paper>
      </Box>
    </ContentWrapper>
  );
};

export default OrderPlanningPage;
