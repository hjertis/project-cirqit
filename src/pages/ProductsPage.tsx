import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import ContentWrapper from "../components/layout/ContentWrapper";
import TablePagination from "@mui/material/TablePagination";
import TableSortLabel from "@mui/material/TableSortLabel";
import { useQuery } from "@tanstack/react-query";

interface ProductCount {
  partNo: string;
  count: number;
  description: string;
}

const fetchProducts = async (): Promise<ProductCount[]> => {
  const ordersSnapshot = await getDocs(collection(db, "orders"));
  const partCount: Record<string, { count: number; description: string }> = {};
  ordersSnapshot.forEach(doc => {
    const data = doc.data();
    const partNo = data.partNo || "Unknown";
    const description = data.description || "";
    if (!partCount[partNo]) {
      partCount[partNo] = { count: 1, description };
    } else {
      partCount[partNo].count += 1;
      if (!partCount[partNo].description && description) {
        partCount[partNo].description = description;
      }
    }
  });
  return Object.entries(partCount)
    .map(([partNo, { count, description }]) => ({ partNo, count, description }))
    .sort((a, b) => b.count - a.count);
};

const ProductsPage = () => {
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [orderBy, setOrderBy] = useState<"partNo" | "count" | "description">("count");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const {
    data: products = [],
    isLoading: loading,
    isError,
    error,
  } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 1000 * 60 * 5,
  });

  const handleRequestSort = (property: "partNo" | "count" | "description") => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (orderBy === "count") {
      return order === "asc" ? a.count - b.count : b.count - a.count;
    } else if (orderBy === "partNo") {
      return order === "asc" ? a.partNo.localeCompare(b.partNo) : b.partNo.localeCompare(a.partNo);
    } else {
      return order === "asc"
        ? a.description.localeCompare(b.description)
        : b.description.localeCompare(a.description);
    }
  });

  return (
    <ContentWrapper>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Products
        </Typography>
      </Box>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Alert severity="error">{error instanceof Error ? error.message : String(error)}</Alert>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === "partNo"}
                      direction={orderBy === "partNo" ? order : "asc"}
                      onClick={() => handleRequestSort("partNo")}
                    >
                      Part Number
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === "description"}
                      direction={orderBy === "description" ? order : "asc"}
                      onClick={() => handleRequestSort("description")}
                    >
                      Description
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={orderBy === "count"}
                      direction={orderBy === "count" ? order : "desc"}
                      onClick={() => handleRequestSort("count")}
                    >
                      Order Count
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedProducts
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map(product => (
                    <TableRow key={product.partNo}>
                      <TableCell>{product.partNo}</TableCell>
                      <TableCell>{product.description}</TableCell>
                      <TableCell align="right">{product.count}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={products.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}
    </ContentWrapper>
  );
};

export default ProductsPage;
