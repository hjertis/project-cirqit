// src/pages/OrderDetailsPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Breadcrumbs, Typography, Link, CircularProgress } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import OrderDetailsDialog from '../components/orders/OrderDetailsDialog';

const OrderDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This component exists just for the URL structure and SEO
    // The actual content is handled by the dialog in fullPage mode
    setLoading(false);
  }, [id]);

  const handleClose = () => {
    navigate('/orders');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

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
          <Typography color="text.primary">{id}</Typography>
        </Breadcrumbs>
      </Box>

      {/* Full page dialog */}
      <OrderDetailsDialog
        open={true}
        onClose={handleClose}
        orderId={id || null}
        fullPage={true}
      />
    </Box>
  );
};

export default OrderDetailsPage;