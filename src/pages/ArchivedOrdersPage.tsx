// src/pages/ArchivedOrdersPage.tsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Breadcrumbs,
  Link,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  RestoreFromTrash as RestoreIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import useArchivedOrders from "../hooks/useArchivedOrders";
import { restoreOrder } from "../services/orderService";
import OrderDetailsDialog from "../components/orders/OrderDetailsDialog";
import ContentWrapper from "../components/layout/ContentWrapper";

const ArchivedOrdersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [orderToRestore, setOrderToRestore] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Use our custom hook for archived orders
  const { archivedOrders, loading, error, formatDate, refreshArchivedOrders } = useArchivedOrders(
    {},
    200
  ); // Display up to 200 archived orders

  const navigate = useNavigate();

  // Filter orders by search term (client-side filtering)
  const filteredOrders = archivedOrders.filter(order => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.description.toLowerCase().includes(searchLower) ||
      (order.partNo && order.partNo.toLowerCase().includes(searchLower)) ||
      (order.customer && order.customer.toLowerCase().includes(searchLower))
    );
  });

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when searching
  };

  const handleRefresh = () => {
    refreshArchivedOrders();
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsDialogOpen(true);
  };

  const handleRestoreClick = (orderId: string) => {
    setOrderToRestore(orderId);
    setConfirmRestoreOpen(true);
  };

  const handleConfirmRestore = async () => {
    if (!orderToRestore) {
      setConfirmRestoreOpen(false);
      return;
    }

    try {
      setIsRestoring(true);
      const result = await restoreOrder(orderToRestore);

      if (result.success) {
        setSuccessMessage(`Order ${orderToRestore} has been restored successfully`);
        setSnackbarOpen(true);
        refreshArchivedOrders(); // Refresh the list
      } else {
        setSuccessMessage(`Failed to restore order: ${result.message}`);
        setSnackbarOpen(true);
      }
    } catch (err) {
      console.error("Error restoring order:", err);
      setSuccessMessage(
        `Failed to restore order: ${err instanceof Error ? err.message : String(err)}`
      );
      setSnackbarOpen(true);
    } finally {
      setIsRestoring(false);
      setConfirmRestoreOpen(false);
      setOrderToRestore(null);
    }
  };

  const handleCancelRestore = () => {
    setConfirmRestoreOpen(false);
    setOrderToRestore(null);
  };

  return (
    <ContentWrapper>
      <Box>
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
            <Link component={RouterLink} to="/" color="inherit">
              Dashboard
            </Link>
            <Link component={RouterLink} to="/orders" color="inherit">
              Orders
            </Link>
            <Typography color="text.primary">Archived Orders</Typography>
          </Breadcrumbs>

          <Box
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}
          >
            <Typography variant="h4" component="h1">
              Archived Orders
            </Typography>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Search and Filters */}
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
              placeholder="Search archived orders..."
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
          </Box>
        </Paper>

        {/* Orders Table */}
        <Paper>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ p: 3 }}>
              <Alert
                severity="error"
                action={
                  <Button color="inherit" size="small" onClick={refreshArchivedOrders}>
                    Retry
                  </Button>
                }
              >
                {error}
              </Alert>
            </Box>
          ) : filteredOrders.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">
                No archived orders found. {searchTerm ? "Try a different search term." : ""}
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "background.default" }}>
                      <TableCell>Order #</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Customer/Part</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Archived</TableCell>
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
                              color="default"
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{formatDate(order.archivedAt)}</TableCell>
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
                            <Tooltip title="Restore">
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={() => handleRestoreClick(order.id)}
                              >
                                <RestoreIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
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
          )}
        </Paper>

        {/* Order Details Dialog */}
        <OrderDetailsDialog
          open={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          orderId={selectedOrderId}
          isArchived={true} // Add this prop to OrderDetailsDialog component
        />

        {/* Restore Confirmation Dialog */}
        <Dialog open={confirmRestoreOpen} onClose={handleCancelRestore}>
          <DialogTitle>Confirm Restore</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to restore order {orderToRestore} from the archive? This will
              move it back to active orders.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelRestore} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRestore}
              variant="contained"
              color="primary"
              disabled={isRestoring}
            >
              {isRestoring ? "Restoring..." : "Restore"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          message={successMessage}
        />
      </Box>
    </ContentWrapper>
  );
};

export default ArchivedOrdersPage;
