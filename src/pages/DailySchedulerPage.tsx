import { Box, Typography, Breadcrumbs, Link, Paper } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import DailyScheduler from "../components/planning/DailyScheduler";
import ContentWrapper from "../components/layout/ContentWrapper";

const DailySchedulerPage = () => {
  return (
    <ContentWrapper>
      <Box>
        <Breadcrumbs
          aria-label="breadcrumb"
          sx={{ mb: 2 }}
          separator={<NavigateNextIcon fontSize="small" />}
        >
          <Link underline="hover" color="inherit" component={RouterLink} to="/">
            Home
          </Link>
          <Typography color="text.primary">Daily Scheduler</Typography>
        </Breadcrumbs>
      </Box>
      <Paper elevation={3}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Daily Scheduler
          </Typography>
          <DailyScheduler />
        </Box>
      </Paper>
    </ContentWrapper>
  );
};

export default DailySchedulerPage;
