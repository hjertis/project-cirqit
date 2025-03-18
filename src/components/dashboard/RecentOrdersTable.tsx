// src/components/dashboard/RecentOrdersTable.tsx
import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Box,
} from "@mui/material";
import { Visibility as VisibilityIcon, Edit as EditIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import useOrders from "../../hooks/useOrders";
import { Timestamp } from "firebase/firestore";

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

interface RecentOrdersTableProps {
  maxItems?: number;
  onViewOrder?: (orderId: string) => void;
  defaultSortField?: string;
  defaultSortDirection?: "asc" | "desc";
}

export default function RecentOrdersTable({
  maxItems = 5,
  onViewOrder,
  defaultSortField = "start",
  defaultSortDirection = "asc",
}: RecentOrdersTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(maxItems);
  const { orders, loading, error, formatDate } = useOrders();
  const navigate = useNavigate();

  // Sorting state
  const [order, setOrder] = useState<"asc" | "desc">(defaultSortDirection);
  const [orderBy, setOrderBy] = useState<string>(defaultSortField);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewOrder = (orderId: string) => {
    if (onViewOrder) {
      // Use callback if provided
      onViewOrder(orderId);
    } else {
      // Fall back to navigation if no callback
      navigate(`/orders/${orderId}`);
    }
  };

  const handleEditOrder = (orderId: string) => {
    navigate(`/orders/${orderId}/edit`);
  };

  // Handle sort request
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Helper function to sort by timestamp fields
  const sortByTimestamp = (a: any, b: any, orderBy: string) => {
    // Handle case where timestamp might be undefined
    if (!a[orderBy] || !b[orderBy]) {
      if (!a[orderBy]) return 1;
      if (!b[orderBy]) return -1;
      return 0;
    }

    // Handle Firestore Timestamp objects
    if (a[orderBy] instanceof Timestamp && b[orderBy] instanceof Timestamp) {
      const aDate = a[orderBy].toDate().getTime();
      const bDate = b[orderBy].toDate().getTime();
      return aDate - bDate;
    }

    // Default fallback for non-timestamp fields
    if (a[orderBy] < b[orderBy]) return -1;
    if (a[orderBy] > b[orderBy]) return 1;
    return 0;
  };

  // Sort orders
  const sortedOrders = useMemo(() => {
    if (!orders.length) return [];

    // Create a copy to avoid mutating the original array
    return [...orders].sort((a, b) => {
      const sortResult = sortByTimestamp(a, b, orderBy);
      return order === "asc" ? sortResult : -sortResult;
    });
  }, [orders, order, orderBy]);

  return (
    <Paper sx={{ width: "100%", overflow: "hidden" }}>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      ) : (
        <>
          <TableContainer>
            <Table sx={{ minWidth: 650 }} aria-label="recent orders table">
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
                {sortedOrders.length > 0 ? (
                  sortedOrders
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
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={sortedOrders.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
    </Paper>
  );
}
