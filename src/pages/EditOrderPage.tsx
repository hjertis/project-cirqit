// src/pages/EditOrderPage.tsx
import { Box, Breadcrumbs, Typography, Link } from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import EditOrder from "../components/orders/EditOrder";

const EditOrderPage = () => {
  const { id } = useParams<{ id: string }>();

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
          <Link component={RouterLink} to={`/orders/${id}`} color="inherit">
            {id}
          </Link>
          <Typography color="text.primary">Edit</Typography>
        </Breadcrumbs>
      </Box>

      {/* Edit Order Form */}
      <EditOrder />
    </Box>
  );
};

export default EditOrderPage;
