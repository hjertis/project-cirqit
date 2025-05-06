import { Box, Breadcrumbs, Typography, Link, Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import { useState } from "react";
import LogFaultDialog from "../components/faults/LogFaultDialog";
import ContentWrapper from "../components/layout/ContentWrapper";

const FaultTrackingPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <ContentWrapper>
      <Box>
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
            <Link component={RouterLink} to="/" color="inherit">
              Dashboard
            </Link>
            <Typography color="text.primary">Fault Tracking</Typography>
          </Breadcrumbs>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Button variant="contained" color="primary" onClick={() => setDialogOpen(true)}>
            Log Fault
          </Button>
        </Box>
        <LogFaultDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      </Box>
    </ContentWrapper>
  );
};

export default FaultTrackingPage;
