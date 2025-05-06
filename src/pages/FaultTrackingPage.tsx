import { Box, Breadcrumbs, Typography, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import LogFaultForm from "../components/faults/LogFaultForm";
import ContentWrapper from "../components/layout/ContentWrapper";

const FaultTrackingPage = () => {
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
        <LogFaultForm />
      </Box>
    </ContentWrapper>
  );
};

export default FaultTrackingPage;
