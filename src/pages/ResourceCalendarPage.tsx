// src/pages/ResourceCalendarPage.tsx
import { Box, Typography, Breadcrumbs, Link, Paper } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import ResourceCalendarView from "../components/planning/ResourceCalendarView";
import ContentWrapper from "../components/layout/ContentWrapper";

const ResourceCalendarPage = () => {
  return (
    <ContentWrapper>
      <Box>
        {/* Page Header with Breadcrumbs */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Resource Calendar
          </Typography>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
            <Link component={RouterLink} to="/" color="inherit">
              Dashboard
            </Link>
            <Link component={RouterLink} to="/orders" color="inherit">
              Orders
            </Link>
            <Typography color="text.primary">Resource Calendar</Typography>
          </Breadcrumbs>
        </Box>

        {/* Resource Calendar View */}
        <ResourceCalendarView defaultView="week" />
      </Box>
    </ContentWrapper>
  );
};

export default ResourceCalendarPage;
