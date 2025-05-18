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
  TableSortLabel,
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
import { useNavigate, useLocation } from "react-router-dom";
// import ImportOrdersDialog from "../components/orders/ImportOrdersDialog";
import EditOrderDialog from "../components/orders/EditOrderDialog";
import useOrders, { OrderFilter } from "../hooks/useOrders";
import { doc, collection, query, where, getDocs, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import OrderDetailsDialog from "../components/orders/OrderDetailsDialog";
import ContentWrapper from "../components/layout/ContentWrapper";

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
console.log("OrdersPage component loaded");
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
    case "Removed":
      return "error";
    default:
      return "default";
  }
};

const OrdersPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);
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
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [orderBy, setOrderBy] = useState<string>("start");
  const getFilterForTab = (tabIndex: number): OrderFilter => {
    let filter: OrderFilter;

    switch (tabIndex) {
      case 1:
        filter = { status: ["In Progress"] };
        break;
      case 2:
        filter = { status: ["Done", "Finished"] };
        break;
      case 3:
        filter = { status: ["Delayed"] };
        break;
      case 4:
        filter = { status: ["Removed"] };
        break;
      default:
        filter = {
          status: ["Open", "Released", "In Progress", "Delayed", "Firm Planned"],
        };
    }

    return filter;
  };

  const { orders, loading, error, updateFilter, formatDate, refreshOrders } = useOrders({}, 1000);

  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const newFilter = getFilterForTab(tabValue);

    updateFilter(newFilter);

    if (tabValue === 0) {
      setActiveFilters([]);
    } else {
      const filterLabel =
        tabValue === 1
          ? "Status: In Progress"
          : tabValue === 2
            ? "Status: Completed"
            : tabValue === 3
              ? "Status: Delayed"
              : "Status: Removed";
      setActiveFilters([filterLabel]);
    }
  }, [tabValue, updateFilter]);

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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleNewOrder = () => {
    navigate("/orders/create");
  };

  const handleRefresh = () => {
    refreshOrders();
  };

  const handleExport = () => {
    setIsExporting(true);

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
    setSelectedOrderId(orderId);
    setDetailsDialogOpen(true);
  };

  const handleEditOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setEditDialogOpen(true);
  };

  const handleEditComplete = () => {
    setEditDialogOpen(false);

    refreshOrders();

    setSuccessMessage("Order updated successfully");
    setSnackbarOpen(true);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, orderId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedOrder(orderId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleDeleteClick = () => {
    setOrderToDelete(selectedOrder);
    handleMenuClose();
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) {
      setConfirmDeleteOpen(false);
      return;
    }

    try {
      setIsDeleting(true);

      const processesQuery = query(
        collection(db, "processes"),
        where("workOrderId", "==", orderToDelete)
      );

      const processesSnapshot = await getDocs(processesQuery);

      const batch = writeBatch(db);

      processesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      const orderRef = doc(db, "orders", orderToDelete);
      batch.delete(orderRef);

      await batch.commit();

      setSuccessMessage(`Order ${orderToDelete} has been deleted successfully`);
      setSnackbarOpen(true);

      setConfirmDeleteOpen(false);
      setOrderToDelete(null);
      setSelectedOrder(null);

      await refreshOrders();
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
    setOrderToDelete(null);
  };

  const handleRemoveFilter = (filterToRemove: string) => {
    if (filterToRemove.startsWith("Status:")) {
      setTabValue(0);
    } else {
      setActiveFilters(activeFilters.filter(f => f !== filterToRemove));
    }
  };

  useEffect(() => {
    if (location.state && location.state.openOrderDetails) {
      setSelectedOrderId(location.state.orderId);
      setDetailsDialogOpen(true);

      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const sortByTimestamp = (a: any, b: any, orderBy: string) => {
    if (!a[orderBy] || !b[orderBy]) {
      if (!a[orderBy]) return 1;
      if (!b[orderBy]) return -1;
      return 0;
    }

    if (a[orderBy] instanceof Timestamp && b[orderBy] instanceof Timestamp) {
      const aDate = a[orderBy].toDate().getTime();
      const bDate = b[orderBy].toDate().getTime();
      return aDate - bDate;
    }

    if (a[orderBy] < b[orderBy]) return -1;
    if (a[orderBy] > b[orderBy]) return 1;
    return 0;
  };

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedOrders = React.useMemo(() => {
    if (!filteredOrders.length) return [];

    return [...filteredOrders].sort((a, b) => {
      const sortResult = sortByTimestamp(a, b, orderBy);
      return order === "asc" ? sortResult : -sortResult;
    });
  }, [filteredOrders, order, orderBy]);

  return (
    <ContentWrapper>
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h4" component="h1">
            Orders
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleNewOrder}
              sx={{ minWidth: 120 }}
            >
              New Order
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={handleImportClick}
              sx={{ minWidth: 110 }}
            >
              Import
            </Button>
            <Button
              variant="outlined"
              startIcon={<GetAppIcon />}
              onClick={handleExport}
              disabled={isExporting}
              sx={{ minWidth: 110 }}
            >
              {isExporting ? "Exporting..." : "Export"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              sx={{ minWidth: 110 }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {isExporting && <LinearProgress sx={{ mb: 2 }} />}

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

        <Paper>
          {" "}
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="orders tabs">
              <Tab label="All Orders" />
              <Tab label="In Progress" />
              <Tab label="Completed" />
              <Tab label="Delayed" />
              <Tab label="Removed" />
            </Tabs>
          </Box>{" "}
          <TabPanel value={tabValue} index={0}>
            {renderOrdersTable()}
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            {renderOrdersTable()}
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            {renderOrdersTable()}
          </TabPanel>{" "}
          <TabPanel value={tabValue} index={3}>
            {renderOrdersTable()}
          </TabPanel>
          <TabPanel value={tabValue} index={4}>
            {renderOrdersTable()}
          </TabPanel>
        </Paper>

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
            Edit Order
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleDeleteClick} sx={{ color: "error.main" }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>

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

        <OrderDetailsDialog
          open={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          orderId={selectedOrderId}
        />

        <EditOrderDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          orderId={selectedOrderId}
          onOrderUpdated={handleEditComplete}
        />

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          message={successMessage}
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

export default OrdersPage;
