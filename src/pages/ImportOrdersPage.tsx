// src/pages/ImportOrdersPage.tsx
import { Box, Breadcrumbs, Typography, Link, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import OrdersImporter from '../components/orders/OrdersImporter';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';

const ImportOrdersPage = () => {
  return (
    <Box>
      {/* Page Header with Breadcrumbs */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Import Orders
        </Typography>
        <Breadcrumbs 
          separator={<NavigateNextIcon fontSize="small" />} 
          aria-label="breadcrumb"
        >
          <Link component={RouterLink} to="/" color="inherit">
            Dashboard
          </Link>
          <Link component={RouterLink} to="/orders" color="inherit">
            Orders
          </Link>
          <Typography color="text.primary">Import</Typography>
        </Breadcrumbs>
      </Box>
      
      {/* Instructions Panel */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Instructions
        </Typography>
        <Typography variant="body2" paragraph>
          Upload a CSV file to import orders into the system. The CSV file should have the following columns:
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <li>
            <Typography variant="body2">
              <strong>No</strong> - Unique order number
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Description</strong> - Description of the work order
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>SourceNo</strong> - Part number identifier
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Quantity</strong> - Order quantity
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>StartingDateTime</strong> - Start date in DD-MM-YYYY format
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>EndingDateTime</strong> - End date in DD-MM-YYYY format
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Status</strong> - Order status (Released, In Progress, Finished, or Planned)
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Notes</strong> - Additional notes (optional)
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>State</strong> - Order priority state (REGULAR, HIGH, URGENT) (optional)
            </Typography>
          </li>
        </Box>
      </Paper>
      
      {/* Import Component */}
      <OrdersImporter />
    </Box>
  );
};

export default ImportOrdersPage;