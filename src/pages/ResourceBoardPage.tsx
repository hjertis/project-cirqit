import { useState } from "react";
import { Box, Typography, Breadcrumbs, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import ContentWrapper from "../components/layout/ContentWrapper";
import ResourcePlanningBoard from "../components/planning/ResourcePlanningBoard";
import OrderDetailsDialog from "../components/orders/OrderDetailsDialog";

const ResourceBoardPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [refreshBoard, setRefreshBoard] = useState(0);

  const handleOrderClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDialogOpen(true);
  };

  const handleOrderUpdated = () => {
    setRefreshBoard(r => r + 1); // trigger board refresh if needed
  };

  return (
    <ContentWrapper>
      <Box sx={{ width: "100%" }}>
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

        {/* Removed <form> wrapper to prevent remounts */}
        <ResourcePlanningBoard onOrderClick={handleOrderClick} refreshKey={refreshBoard} />
      </Box>
      <OrderDetailsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        orderId={selectedOrderId}
        onOrderUpdated={handleOrderUpdated}
      />
    </ContentWrapper>
  );
};

export default ResourceBoardPage;
