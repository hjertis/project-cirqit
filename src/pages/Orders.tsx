// src/pages/Orders.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  FilterList as FilterListIcon,
  GetApp as GetAppIcon
} from '@mui/icons-material';
import RecentOrdersTable from '../components/dashboard/RecentOrdersTable';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`orders-tabpanel-${index}`}
      aria-labelledby={`orders-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const OrdersPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleNewOrder = () => {
    console.log('Create new order');
    // Implement navigation to new order form
  };
  
  const handleExport = () => {
    setIsLoading(true);
    
    // Simulate export process
    setTimeout(() => {
      setIsLoading(false);
      alert('Orders exported successfully!');
    }, 2000);
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Orders
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<GetAppIcon />}
            onClick={handleExport}
            disabled={isLoading}
            sx={{ mr: 2 }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewOrder}
          >
            New Order
          </Button>
        </Box>
      </Box>
      
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      
      {/* Filters and Search */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            placeholder="Search orders..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            size="small"
            sx={{ width: { xs: '100%', sm: '300px' } }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              startIcon={<FilterListIcon />}
              sx={{ mr: 1 }}
            >
              Filters
            </Button>
            <Chip label="Status: All" onDelete={() => {}} size="small" />
            <Chip label="Date: This Month" onDelete={() => {}} size="small" />
          </Box>
        </Box>
      </Paper>
      
      {/* Orders Tabs and Table */}
      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="orders tabs">
            <Tab label="All Orders" />
            <Tab label="In Progress" />
            <Tab label="Completed" />
            <Tab label="Delayed" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <RecentOrdersTable maxItems={10} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            In Progress orders would be shown here
          </Typography>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            Completed orders would be shown here
          </Typography>
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            Delayed orders would be shown here
          </Typography>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default OrdersPage;