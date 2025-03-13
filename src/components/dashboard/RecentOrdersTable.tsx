// src/components/dashboard/RecentOrdersTable.tsx
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Visibility as VisibilityIcon,
  Edit as EditIcon
} from '@mui/icons-material';

interface Order {
  id: string;
  orderNumber: string;
  description: string;
  customer: string;
  status: 'Open' | 'In Progress' | 'Done' | 'Delayed';
  date: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Open':
      return 'primary';
    case 'In Progress':
      return 'secondary';
    case 'Done':
      return 'success';
    case 'Delayed':
      return 'error';
    default:
      return 'default';
  }
};

// Sample data
const orders: Order[] = [
  { id: '1', orderNumber: 'WO-1001', description: 'PCB Assembly', customer: 'ABC Electronics', status: 'In Progress', date: '2023-05-10' },
  { id: '2', orderNumber: 'WO-1002', description: 'Cable Harness', customer: 'XYZ Manufacturing', status: 'Open', date: '2023-05-12' },
  { id: '3', orderNumber: 'WO-1003', description: 'Motor Testing', customer: 'Acme Motors', status: 'Done', date: '2023-05-05' },
  { id: '4', orderNumber: 'WO-1004', description: 'Control Panel', customer: 'Tech Solutions', status: 'Delayed', date: '2023-05-01' },
  { id: '5', orderNumber: 'WO-1005', description: 'Power Supply', customer: 'Power Systems', status: 'Open', date: '2023-05-15' },
];

interface RecentOrdersTableProps {
  maxItems?: number;
}

export default function RecentOrdersTable({ maxItems = 5 }: RecentOrdersTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(maxItems);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="recent orders table">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.default' }}>
              <TableCell>Order #</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell component="th" scope="row">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>{order.description}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>
                    <Chip 
                      label={order.status} 
                      color={getStatusColor(order.status)} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" color="primary">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={orders.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}