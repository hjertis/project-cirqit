import { Box, Typography, Breadcrumbs, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import ContentWrapper from "../components/layout/ContentWrapper";
import ResourceStatusMatrixBoard from "../components/kanban/ResourceStatusMatrixBoard";

const KanbanPage = () => {
  return (
    <ContentWrapper>
      <Box sx={{ width: "100%" }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Resource/Status Matrix Board
          </Typography>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
            <Link component={RouterLink} to="/" color="inherit">
              Dashboard
            </Link>
            <Typography color="text.primary">Kanban Board</Typography>
          </Breadcrumbs>
        </Box>

        <ResourceStatusMatrixBoard />
      </Box>
    </ContentWrapper>
  );
};

export default KanbanPage;
