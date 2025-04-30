import { Box, Typography, Breadcrumbs, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import ContentWrapper from "../components/layout/ContentWrapper";
import InProgressKanbanBoard from "../components/kanban/KanbanBoard"; // Adjust path if needed

const KanbanPage = () => {
  return (
    <ContentWrapper>
      <Box sx={{ width: "100%" }}>
        {/* Page Header with Breadcrumbs */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            In Progress Kanban Board
          </Typography>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
            <Link component={RouterLink} to="/" color="inherit">
              Dashboard
            </Link>
            <Typography color="text.primary">Kanban Board</Typography>
          </Breadcrumbs>
        </Box>

        {/* Render the Kanban Board Component */}
        <InProgressKanbanBoard />
      </Box>
    </ContentWrapper>
  );
};

export default KanbanPage;
