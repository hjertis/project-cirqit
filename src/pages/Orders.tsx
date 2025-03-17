// src/pages/Orders.tsx
import React, { useState, useEffect } from "react";
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
  LinearProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Menu,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  FilterList as FilterListIcon,
  GetApp as GetAppIcon,
  CloudUpload as CloudUploadIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import ImportOrdersDialog from "../components/orders/ImportOrdersDialog";
import useOrders, { OrderFilter } from "../hooks/useOrders";
import { doc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";

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
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Open":
    case "Released":
      return "primary";
    case "In Progress":
      return "secondary";
    case "Done":
    case "Finished":
      return "success";
    case "Delayed":
      return "error";
    default:
      return "default";
  }
};

const OrdersPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  // Get the initial filter based on the tab
  const getFilterForTab = (tabIndex: number): OrderFilter => {
    switch (tabIndex) {
      case 1: // In Progress tab
        return { status: ["In Progress"] };
      case 2: // Completed tab
        return { status: ["Done", "Finished"] };
      case 3: // Delayed tab
        return { status: ["Delayed"] };
      default: // All Orders tab
        return {};
    }
  };

  // Use our orders hook with the initial filter
  const { orders, loading, error, updateFilter, formatDate, refreshOrders } = useOrders();

  const navigate = useNavigate();

  // Update filter when tab changes
  useEffect(() => {
    const newFilter = getFilterForTab(tabValue);
    updateFilter(newFilter);

    // Update active filters UI
    if (tabValue === 0) {
      setActiveFilters([]);
    } else {
      const filterLabel =
        tabValue === 1
          ? "Status: In Progress"
          : tabValue === 2
            ? "Status: Completed"
            : "Status: Delayed";
      setActiveFilters([filterLabel]);
    }
  }, [tabValue, updateFilter]);

  // Filter orders by search term (client-side filtering)
  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.description.toLowerCase().includes(searchLower) ||
      (order.partNo && order.partNo.toLowerCase().includes(searchLower)) ||
      (order.customer && order.customer.toLowerCase().includes(searchLower))
    );
  });

  const openImportDialog = () => {
    setImportDialogOpen(true);
  };

  const closeImportDialog = () => {
    setImportDialogOpen(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0); // Reset to first page when changing tabs
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when searching
  };

  const handleNewOrder = () => {
    navigate("/orders/create");
  };

  const handleRefresh = () => {
    refreshOrders();
  };

  const handleExport = () => {
    setIsExporting(true);

    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      alert("Orders exported successfully!");
    }, 2000);
  };

  const handleImportClick = () => {
    navigate("/orders/import");
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewOrder = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const handleEditOrder = (orderId: string) => {
    navigate(`/orders/${orderId}/edit`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, orderId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedOrder(orderId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    // Don't reset selectedOrder here
  };
  const handleDeleteClick = () => {
    // Store the selected order before closing the menu
    setOrderToDelete(selectedOrder);
    handleMenuClose();
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    console.log("Starting delete process for order:", orderToDelete);

    if (!orderToDelete) {
      console.log("No order selected, cancelling delete");
      setConfirmDeleteOpen(false);
      return;
    }

    try {
      setIsDeleting(true);

      // 1. Delete all processes associated with this order
      console.log("Finding processes for order:", orderToDelete);
      const processesQuery = query(
        collection(db, "processes"),
        where("workOrderId", "==", orderToDelete)
      );

      const processesSnapshot = await getDocs(processesQuery);
      console.log(`Found ${processesSnapshot.size} processes to delete`);

      // Use a batch for efficient deletion of multiple documents
      const batch = writeBatch(db);

      processesSnapshot.forEach(doc => {
        console.log("Adding process to delete batch:", doc.id);
        batch.delete(doc.ref);
      });

      // 2. Delete the order document itself
      console.log("Adding order to delete batch:", orderToDelete);
      const orderRef = doc(db, "orders", orderToDelete);
      batch.delete(orderRef);

      // Commit all the delete operations
      console.log("Committing batch delete");
      await batch.commit();
      console.log("Batch delete committed successfully");

      // Show success message
      setSuccessMessage(`Order ${orderToDelete} has been deleted successfully`);
      setSnackbarOpen(true);

      // Close the dialog
      setConfirmDeleteOpen(false);
      setOrderToDelete(null); // Clear the order to delete
      setSelectedOrder(null); // Also clear the selectedOrder

      // Refresh the orders list
      console.log("Refreshing orders list");
      await refreshOrders();
      console.log("Orders list refreshed");
    } catch (err) {
      console.error("Error in delete process:", err);
      setSuccessMessage(
        `Failed to delete order: ${err instanceof Error ? err.message : String(err)}`
      );
      setSnackbarOpen(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteOpen(false);
    setOrderToDelete(null); // Clear the order to delete
  };

  const handleRemoveFilter = (filterToRemove: string) => {
    // If removing the tab filter, go back to All Orders tab
    if (filterToRemove.startsWith("Status:")) {
      setTabValue(0);
    } else {
      setActiveFilters(activeFilters.filter(f => f !== filterToRemove));
    }
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1">
          Orders
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<GetAppIcon />}
            onClick={handleExport}
            disabled={isExporting}
            sx={{ mr: 2 }}
          >
            {isExporting ? "Exporting..." : "Export"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={handleImportClick}
            sx={{ mr: 2 }}
          >
            Import
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={openImportDialog}
            sx={{ mr: 2 }}
          >
            Quick Import
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleNewOrder}>
            New Order
          </Button>
        </Box>
      </Box>

      {isExporting && <LinearProgress sx={{ mb: 2 }} />}

      {/* Filters and Search */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
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
            sx={{ width: { xs: "100%", sm: "300px" } }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Button size="small" startIcon={<FilterListIcon />} sx={{ mr: 1 }}>
              Filters
            </Button>
            {activeFilters.map(filter => (
              <Chip
                key={filter}
                label={filter}
                onDelete={() => handleRemoveFilter(filter)}
                size="small"
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Orders Tabs and Table */}
      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="orders tabs">
            <Tab label="All Orders" />
            <Tab label="In Progress" />
            <Tab label="Completed" />
            <Tab label="Delayed" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {renderOrdersTable()}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {renderOrdersTable()}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {renderOrdersTable()}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {renderOrdersTable()}
        </TabPanel>
      </Paper>

      {/* Import Dialog */}
      <ImportOrdersDialog open={importDialogOpen} onClose={closeImportDialog} />

      {/* Context Menu */}
      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            handleMenuClose();
            if (selectedOrder) handleViewOrder(selectedOrder);
          }}
        >
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuClose();
            if (selectedOrder) handleEditOrder(selectedOrder);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteClick} sx={{ color: "error.main" }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDeleteOpen} onClose={handleCancelDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete order {orderToDelete}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  // Function to render the orders table
  function renderOrdersTable() {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={refreshOrders}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This could be due to:
            <ul>
              <li>Network connectivity issues</li>
              <li>Firestore permissions</li>
              <li>The collection or field names not matching</li>
            </ul>
          </Typography>
        </Box>
      );
    }

    if (filteredOrders.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No orders found. {searchTerm ? "Try a different search term or " : ""}
            <Button variant="text" startIcon={<AddIcon />} onClick={handleNewOrder}>
              create a new order
            </Button>
          </Typography>
        </Box>
      );
    }

    return (
      <>
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: "background.default" }}>
                <TableCell>Order #</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Customer/Part</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map(order => (
                  <TableRow key={order.id} hover>
                    <TableCell component="th" scope="row">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>{order.description}</TableCell>
                    <TableCell>{order.customer || `Part: ${order.partNo}`}</TableCell>
                    <TableCell>
                      <Chip
                        label={order.status}
                        color={getStatusColor(order.status)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{formatDate(order.start)}</TableCell>
                    <TableCell>{formatDate(order.end)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="View">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleViewOrder(order.id)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditOrder(order.id)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="More">
                        <IconButton size="small" onClick={e => handleMenuOpen(e, order.id)}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          message={successMessage || error}
          ContentProps={{
            sx: {
              backgroundColor: error ? "error.main" : "success.main",
            },
          }}
        />
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredOrders.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </>
    );
  }
};

export default OrdersPage;
