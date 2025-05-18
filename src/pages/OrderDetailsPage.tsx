import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Breadcrumbs, Typography, Link, CircularProgress } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import OrderDetailsDialog from "../components/orders/OrderDetailsDialog";
import ContentWrapper from "../components/layout/ContentWrapper";

const OrderDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Detect if viewing an archived order (e.g., /orders/archived/:id or ?archived=1)
  // This example uses a query param, but you can adapt to your routing as needed
  const isArchived = new URLSearchParams(window.location.search).get("archived") === "1";

  useEffect(() => {
    setLoading(false);
  }, [id]);

  const handleClose = () => {
    navigate(isArchived ? "/orders/archived" : "/orders");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ContentWrapper>
      <Box>
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
            <Link component={RouterLink} to="/" color="inherit">
              Dashboard
            </Link>
            <Link
              component={RouterLink}
              to={isArchived ? "/orders/archived" : "/orders"}
              color="inherit"
            >
              {isArchived ? "Archived Orders" : "Orders"}
            </Link>
            <Typography color="text.primary">{id}</Typography>
          </Breadcrumbs>
        </Box>

        <OrderDetailsDialog
          open={true}
          onClose={handleClose}
          orderId={id || null}
          fullPage={true}
          isArchived={isArchived}
        />
      </Box>
    </ContentWrapper>
  );
};

export default OrderDetailsPage;
