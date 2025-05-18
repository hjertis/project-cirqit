import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
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
  CircularProgress,
  Alert,
  TableSortLabel,
} from "@mui/material";
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  RestoreFromTrash as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
  MoreVert as MoreVertIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import useOrders, { OrderFilter } from "../hooks/useOrders";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import OrderDetailsDialog from "../components/orders/OrderDetailsDialog";
import ContentWrapper from "../components/layout/ContentWrapper";

const getStatusColor = (status: string) => {
  switch (status) {
    case "Removed":
      return "error";
    case "Done":
      return "success";
    default:
      return "default";
  }
};

const RemovedOrdersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [orderBy, setOrderBy] = useState<string>("removedDate");
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const filter: OrderFilter = { status: ["Removed", "Done"] };
  const { orders, loading, error, refreshOrders, formatDate } = useOrders(filter, 1000);

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

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleRefresh = () => {
    refreshOrders();
  };
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, orderId: string) => {
    setSelectedOrder(orderId);
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsDialogOpen(true);
  };

  const handleRestoreOrder = async () => {
    if (!selectedOrder) return;

    try {
      setIsProcessing(true);
      const orderRef = doc(db, "orders", selectedOrder);

      await updateDoc(orderRef, {
        status: "Open",
        removedDate: null,
      });

      setStatusMessage({
        type: "success",
        text: "Order has been restored successfully",
      });

      refreshOrders();
    } catch (err) {
      console.error("Error restoring order:", err);
      setStatusMessage({
        type: "error",
        text: `Failed to restore order: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsProcessing(false);
      handleMenuClose();
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedOrder) return;

    try {
      setIsProcessing(true);
      const orderRef = doc(db, "orders", selectedOrder);

      await deleteDoc(orderRef);

      setStatusMessage({
        type: "success",
        text: "Order has been permanently deleted",
      });

      refreshOrders();
    } catch (err) {
      console.error("Error permanently deleting order:", err);
      setStatusMessage({
        type: "error",
        text: `Failed to permanently delete order: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsProcessing(false);
      handleMenuClose();
    }
  };

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleMarkAsRemoved = async (orderId: string) => {
    try {
      setIsProcessing(true);
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "Removed",
        removedDate: new Date(),
      });
      setStatusMessage({
        type: "success",
        text: `Order ${orderId} marked as Removed`,
      });
      refreshOrders();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: `Failed to mark as Removed: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const sortedOrders = React.useMemo(() => {
    if (!filteredOrders.length) return [];

    return [...filteredOrders].sort((a, b) => {
      const directionMultiplier = order === "asc" ? 1 : -1;

      if (orderBy === "removedDate") {
        const aDate = a.removedDate ? a.removedDate.toDate().getTime() : 0;
        const bDate = b.removedDate ? b.removedDate.toDate().getTime() : 0;
        return (aDate - bDate) * directionMultiplier;
      }
      if (orderBy === "start") {
        if (!a.start || !b.start) {
          if (!a.start) return 1 * directionMultiplier;
          if (!b.start) return -1 * directionMultiplier;
          return 0;
        }

        const aDate = a.start.toDate().getTime();
        const bDate = b.start.toDate().getTime();
        return (aDate - bDate) * directionMultiplier;
      }

      if (orderBy === "end") {
        if (!a.end || !b.end) {
          if (!a.end) return 1 * directionMultiplier;
          if (!b.end) return -1 * directionMultiplier;
          return 0;
        }

        const aDate = a.end.toDate().getTime();
        const bDate = b.end.toDate().getTime();
        return (aDate - bDate) * directionMultiplier;
      }

      // String comparison for orderNumber (default case)
      return (a.orderNumber || "").localeCompare(b.orderNumber || "") * directionMultiplier;
    });
  }, [filteredOrders, order, orderBy]);

  return (
    <ContentWrapper>
      <Box sx={{ width: "100%", mb: 6 }}>
        {statusMessage && (
          <Alert
            severity={statusMessage.type}
            sx={{ mb: 2 }}
            onClose={() => setStatusMessage(null)}
          >
            {statusMessage.text}
          </Alert>
        )}

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            mb: 3,
            gap: 2,
          }}
        >
          {" "}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              component={RouterLink}
              to="/orders"
              sx={{ mr: 2 }}
            >
              Back to Orders
            </Button>
            <Typography variant="h5">Removed Orders</Typography>
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              sx={{ mr: 2 }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {isProcessing && <LinearProgress sx={{ mb: 2 }} />}

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
              placeholder="Search removed orders..."
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
            <Chip label="Status: Removed or Done" color="error" />
          </Box>
        </Paper>

        <Paper>{renderOrdersTable()}</Paper>

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
          <Divider />
          <MenuItem onClick={handleRestoreOrder}>
            <RestoreIcon fontSize="small" sx={{ mr: 1 }} />
            Restore Order
          </MenuItem>
          <MenuItem onClick={handlePermanentDelete} sx={{ color: "error.main" }}>
            <DeleteForeverIcon fontSize="small" sx={{ mr: 1 }} />
            Permanently Delete
          </MenuItem>
        </Menu>

        <OrderDetailsDialog
          open={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          orderId={selectedOrderId}
        />
      </Box>
    </ContentWrapper>
  );

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
              <Button color="inherit" size="small" onClick={() => refreshOrders()}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      );
    }

    if (filteredOrders.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No removed orders found. {searchTerm ? "Try a different search term." : ""}
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
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "removedDate"}
                    direction={orderBy === "removedDate" ? order : "asc"}
                    onClick={() => handleRequestSort("removedDate")}
                  >
                    Removed Date
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "start"}
                    direction={orderBy === "start" ? order : "asc"}
                    onClick={() => handleRequestSort("start")}
                  >
                    Start Date
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "end"}
                    direction={orderBy === "end" ? order : "asc"}
                    onClick={() => handleRequestSort("end")}
                  >
                    End Date
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedOrders
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
                    <TableCell>
                      {order.removedDate ? formatDate(order.removedDate) : "N/A"}
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
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelectedOrder(order.id);
                            handleRestoreOrder();
                          }}
                        >
                          <RestoreIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {order.status === "Done" && (
                        <Tooltip title="Mark as Removed">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleMarkAsRemoved(order.id)}
                          >
                            <DeleteForeverIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
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
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={sortedOrders.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </>
    );
  }
};

export default RemovedOrdersPage;
