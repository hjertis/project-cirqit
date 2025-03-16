// src/pages/CreateOrderPage.tsx
import { Box, Breadcrumbs, Typography, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import CreateOrder from "../components/orders/CreateOrder";

const CreateOrderPage = () => {
  return (
    <Box>
      {/* Page Header with Breadcrumbs */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          <Link component={RouterLink} to="/" color="inherit">
            Dashboard
          </Link>
          <Link component={RouterLink} to="/orders" color="inherit">
            Orders
          </Link>
          <Typography color="text.primary">Create Order</Typography>
        </Breadcrumbs>
      </Box>

      {/* Create Order Form */}
      <CreateOrder />
    </Box>
  );
};

export default CreateOrderPage;
