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

  useEffect(() => {
    setLoading(false);
  }, [id]);

  const handleClose = () => {
    navigate("/orders");
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
            <Link component={RouterLink} to="/orders" color="inherit">
              Orders
            </Link>
            <Typography color="text.primary">{id}</Typography>
          </Breadcrumbs>
        </Box>

        <OrderDetailsDialog
          open={true}
          onClose={handleClose}
          orderId={id || null}
          fullPage={true}
        />
      </Box>
    </ContentWrapper>
  );
};

export default OrderDetailsPage;
