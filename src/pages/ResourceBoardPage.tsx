// src/pages/ResourceBoardPage.tsx
import { Box, Typography, Breadcrumbs, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import ContentWrapper from "../components/layout/ContentWrapper";
import ResourcePlanningBoard from "../components/planning/ResourcePlanningBoard"; // Import the new board

const ResourceBoardPage = () => {
  return (
    <ContentWrapper>
      <Box sx={{ width: "100%" }}>
        {/* Page Header with Breadcrumbs */}
        <Box sx={{ mb: 3, width: "100%" }}>
          <Typography variant="h4" gutterBottom>
            Resource Planning Board
          </Typography>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
            <Link component={RouterLink} to="/" color="inherit">
              Dashboard
            </Link>
            <Link component={RouterLink} to="/orders" color="inherit">
              Orders
            </Link>
            <Typography color="text.primary">Resource Board</Typography>
          </Breadcrumbs>
        </Box>

        {/* Render the Resource Planning Board Component */}

        <form onSubmit={e => e.preventDefault()}>
          <ResourcePlanningBoard />
        </form>
      </Box>
    </ContentWrapper>
  );
};

export default ResourceBoardPage;
