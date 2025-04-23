// src/pages/ProductionDashboardPage.tsx
import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  ButtonGroup,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Tooltip,
  Menu,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import {
  NavigateNext as NavigateNextIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  GetApp as DownloadIcon,
  FileDownload as ExportIcon,
  Close as CloseIcon,
  DateRange as DateRangeIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import ContentWrapper from "../components/layout/ContentWrapper";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  ScatterChart,
} from "recharts";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

interface Order {
  id: string;
  orderNumber: string;
  description: string;
  partNo: string;
  quantity: number;
  start: Timestamp;
  end: Timestamp;
  status: string;
  updated: Timestamp;
  isArchived?: boolean;
}

const ProductionDashboardPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [productionByMonth, setProductionByMonth] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [efficiencyData, setEfficiencyData] = useState([]);
  const [selectedView, setSelectedView] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Refs for export
  const dashboardRef = useRef(null);

  // Filter states
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState([]);
  const [dateFilter, setDateFilter] = useState({
    start: "",
    end: "",
  });
  const [searchFilter, setSearchFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);

  // Export states
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [exportFormat, setExportFormat] = useState("pdf");
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchFirebaseData();
  }, [refreshTrigger]);

  // Apply filters whenever filter values change
  useEffect(() => {
    if (orders.length > 0) {
      applyFilters();
    }
  }, [statusFilter, dateFilter, searchFilter, productFilter, orders]);

  const fetchFirebaseData = async () => {
    try {
      setIsLoading(true);

      // Query orders from Firestore
      const ordersRef = collection(db, "orders");

      // Query both active and archived orders
      const activeOrdersQuery = query(
        ordersRef,
        orderBy("updated", "desc") // Sort by last updated
      );

      const archivedOrdersRef = collection(db, "archivedOrders");
      const archivedOrdersQuery = query(
        archivedOrdersRef,
        orderBy("updated", "desc") // Sort by last updated
      );

      // Execute both queries
      const [activeSnapshot, archivedSnapshot] = await Promise.all([
        getDocs(activeOrdersQuery),
        getDocs(archivedOrdersQuery),
      ]);

      // Combine active and archived orders
      const allOrders: Order[] = [];

      activeSnapshot.forEach(doc => {
        allOrders.push({
          id: doc.id,
          ...doc.data(),
          isArchived: false,
        } as Order);
      });

      archivedSnapshot.forEach(doc => {
        allOrders.push({
          id: doc.id,
          ...doc.data(),
          isArchived: true,
        } as Order);
      });

      console.log(`Loaded ${allOrders.length} orders from Firebase`);
      setOrders(allOrders);

      // Extract available statuses and products for filters
      const statuses = [...new Set(allOrders.map(order => order.status))].filter(Boolean);
      setAvailableStatuses(statuses);

      const products = [...new Set(allOrders.map(order => order.partNo))].filter(Boolean);
      setAvailableProducts(products);

      // Initially, filtered orders are the same as all orders
      setFilteredOrders(allOrders);

      // Process the data for visualizations
      processOrderData(allOrders);
      setError(null);
    } catch (err) {
      console.error("Error fetching data from Firebase:", err);
      setError(`Failed to load production data: ${err.message || "Unknown error"}`);

      // If Firebase query fails, use sample data as fallback
      useSampleData();
    } finally {
      setIsLoading(false);
    }
  };

  // Filter application
  const applyFilters = () => {
    let filtered = [...orders];

    // Apply status filter
    if (statusFilter.length > 0) {
      filtered = filtered.filter(order => statusFilter.includes(order.status));
    }

    // Apply date range filter
    if (dateFilter.start && dateFilter.end) {
      const startDate = new Date(dateFilter.start);
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date

      filtered = filtered.filter(order => {
        const orderDate = order.start?.toDate ? order.start.toDate() : new Date(order.start);
        return orderDate >= startDate && orderDate <= endDate;
      });
    } else if (dateFilter.start) {
      const startDate = new Date(dateFilter.start);
      filtered = filtered.filter(order => {
        const orderDate = order.start?.toDate ? order.start.toDate() : new Date(order.start);
        return orderDate >= startDate;
      });
    } else if (dateFilter.end) {
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => {
        const orderDate = order.start?.toDate ? order.start.toDate() : new Date(order.start);
        return orderDate <= endDate;
      });
    }

    // Apply search filter (on order number, description, etc.)
    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase();
      filtered = filtered.filter(
        order =>
          (order.orderNumber && order.orderNumber.toLowerCase().includes(searchLower)) ||
          (order.description && order.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply product filter
    if (productFilter) {
      filtered = filtered.filter(order => order.partNo === productFilter);
    }

    setFilteredOrders(filtered);

    // Process the filtered data
    processOrderData(filtered);
  };

  // Reset all filters
  const resetFilters = () => {
    setStatusFilter([]);
    setDateFilter({ start: "", end: "" });
    setSearchFilter("");
    setProductFilter("");
    setFilteredOrders(orders);
    processOrderData(orders);
  };

  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Fallback to sample data if needed
  const useSampleData = () => {
    const sampleOrders = generateSampleOrders();
    setOrders(sampleOrders);
    setFilteredOrders(sampleOrders);
    processOrderData(sampleOrders);
  };

  // Process the order data for visualizations
  const processOrderData = orderData => {
    // 1. Process monthly production
    const monthlyData = {};
    const today = new Date();

    orderData.forEach(order => {
      if (order.start) {
        let startDate;
        if (order.start instanceof Timestamp) {
          startDate = order.start.toDate();
        } else if (order.start.toDate) {
          startDate = order.start.toDate();
        } else {
          startDate = new Date(order.start);
        }

        if (startDate && !isNaN(startDate)) {
          const yearMonth = `${startDate.getFullYear()}-${(startDate.getMonth() + 1)
            .toString()
            .padStart(2, "0")}`;
          monthlyData[yearMonth] = (monthlyData[yearMonth] || 0) + (order.quantity || 0);
        }
      }
    });

    const monthlyChartData = Object.keys(monthlyData)
      .sort()
      .map(month => {
        const [year, monthNum] = month.split("-");
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        return {
          month: `${monthNames[parseInt(monthNum) - 1]} ${year}`,
          quantity: monthlyData[month],
          isPast: new Date(year, parseInt(monthNum) - 1) < today,
        };
      });

    setProductionByMonth(monthlyChartData);

    // 2. Process top products
    const productsByPartNo = {};
    orderData.forEach(order => {
      const partNo = order.partNo || "Unknown";
      if (!productsByPartNo[partNo]) {
        productsByPartNo[partNo] = {
          count: 0,
          totalQuantity: 0,
          description: order.description || partNo,
        };
      }
      productsByPartNo[partNo].count += 1;
      productsByPartNo[partNo].totalQuantity += order.quantity || 0;
    });

    const topProductsData = Object.keys(productsByPartNo)
      .map(partNo => ({
        partNo,
        ...productsByPartNo[partNo],
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    setTopProducts(topProductsData);

    // 3. Process status distribution
    const statusCounts = {};
    orderData.forEach(order => {
      const status = order.status || "Unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusData = Object.keys(statusCounts).map(status => ({
      status,
      count: statusCounts[status],
    }));

    setStatusDistribution(statusData);

    // 4. Process efficiency data - for orders that have start/end dates
    const efficiencyItems = orderData
      .filter(
        order =>
          (order.status === "Finished" || order.status === "Done") && order.start && order.end
      )
      .map(order => {
        let plannedEnd, actualEnd;

        if (order.end instanceof Timestamp) {
          plannedEnd = order.end.toDate();
        } else if (order.end.toDate) {
          plannedEnd = order.end.toDate();
        } else {
          plannedEnd = new Date(order.end);
        }

        // For actual end, use updated timestamp or end date
        if (order.updated) {
          if (order.updated instanceof Timestamp) {
            actualEnd = order.updated.toDate();
          } else if (order.updated.toDate) {
            actualEnd = order.updated.toDate();
          } else {
            actualEnd = new Date(order.updated);
          }
        } else {
          actualEnd = plannedEnd;
        }

        if (plannedEnd && actualEnd) {
          const diff = (actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24); // days difference
          return {
            order: order.orderNumber || order.id,
            description:
              (order.description || "").substring(0, 25) +
              (order.description && order.description.length > 25 ? "..." : ""),
            plannedEnd: formatDate(plannedEnd),
            actualEnd: formatDate(actualEnd),
            difference: diff,
            onTime: diff <= 0,
          };
        }
        return null;
      })
      .filter(item => item !== null);

    setEfficiencyData(efficiencyItems);
  };

  // Format date helper
  const formatDate = date => {
    if (!date) return "N/A";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Generate sample orders if Firebase data isn't available
  const generateSampleOrders = (): Order[] => {
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    return [
      {
        id: "sample-1",
        orderNumber: "WO-001",
        description: "TSP PRO Component",
        partNo: "TSP001",
        quantity: 100,
        start: Timestamp.fromDate(twoMonthsAgo),
        end: Timestamp.fromDate(oneMonthAgo),
        status: "Finished",
        updated: Timestamp.fromDate(oneMonthAgo),
      },
      {
        id: "sample-2",
        orderNumber: "WO-002",
        description: "ICESPY Module",
        partNo: "ICE100",
        quantity: 50,
        start: Timestamp.fromDate(oneMonthAgo),
        end: Timestamp.fromDate(now),
        status: "In Progress",
        updated: Timestamp.fromDate(now),
      },
      {
        id: "sample-3",
        orderNumber: "WO-003",
        description: "SKY Controller",
        partNo: "SKY002",
        quantity: 25,
        start: Timestamp.fromDate(threeMonthsAgo),
        end: Timestamp.fromDate(twoMonthsAgo),
        status: "Finished",
        updated: Timestamp.fromDate(twoMonthsAgo),
      },
      {
        id: "sample-4",
        orderNumber: "WO-004",
        description: "TVP System",
        partNo: "TVP003",
        quantity: 35,
        start: Timestamp.fromDate(now),
        end: Timestamp.fromDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
        status: "Released",
        updated: Timestamp.fromDate(now),
      },
      {
        id: "sample-5",
        orderNumber: "WO-005",
        description: "TSP PRO Advanced",
        partNo: "TSP002",
        quantity: 80,
        start: Timestamp.fromDate(now),
        end: Timestamp.fromDate(new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)),
        status: "Released",
        updated: Timestamp.fromDate(now),
      },
    ];
  };

  // Export functions
  const handleExportClick = event => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExportFormat = format => {
    setExportFormat(format);
    handleExportMenuClose();
    exportDashboard(format);
  };

  const exportDashboard = async format => {
    setExportLoading(true);

    try {
      switch (format) {
        case "pdf":
          await exportToPdf();
          break;
        case "excel":
          exportToExcel();
          break;
        case "raw":
          exportRawData();
          break;
        default:
          console.error("Unknown export format:", format);
      }
    } catch (err) {
      console.error("Error during export:", err);
      setError(`Export failed: ${err.message || "Unknown error"}`);
    } finally {
      setExportLoading(false);
    }
  };

  const exportToPdf = async () => {
    const element = dashboardRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 1,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    // Add report title
    pdf.setFontSize(16);
    pdf.text("Production Dashboard Report", 105, 15, { align: "center" });

    // Add date
    pdf.setFontSize(10);
    pdf.text(`Generated on ${new Date().toLocaleString()}`, 105, 22, { align: "center" });

    // Add filter summary if any filters are applied
    let filtersApplied = false;
    let filterText = "Filters applied: ";

    if (statusFilter.length > 0) {
      filterText += `Status (${statusFilter.join(", ")}), `;
      filtersApplied = true;
    }

    if (dateFilter.start || dateFilter.end) {
      filterText += `Date Range (${dateFilter.start || "any"} to ${dateFilter.end || "any"}), `;
      filtersApplied = true;
    }

    if (searchFilter) {
      filterText += `Search (${searchFilter}), `;
      filtersApplied = true;
    }

    if (productFilter) {
      filterText += `Product (${productFilter})`;
      filtersApplied = true;
    }

    if (filtersApplied) {
      filterText = filterText.endsWith(", ") ? filterText.slice(0, -2) : filterText;
      pdf.text(filterText, 105, 29, { align: "center" });
    }

    // Calculate aspect ratio to fit image on the page
    const imgWidth = 210 - 20; // A4 width (210mm) minus margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add the image
    const yPosition = filtersApplied ? 35 : 30;
    pdf.addImage(imgData, "PNG", 10, yPosition, imgWidth, imgHeight);

    // Save the PDF
    pdf.save(`production_dashboard_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const exportToExcel = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Add filtered orders sheet
    const ordersWS = XLSX.utils.json_to_sheet(
      filteredOrders.map(order => ({
        "Order Number": order.orderNumber || order.id,
        Description: order.description || "",
        "Part Number": order.partNo || "",
        Quantity: order.quantity || 0,
        Status: order.status || "",
        "Start Date": order.start
          ? formatDate(order.start.toDate ? order.start.toDate() : new Date(order.start))
          : "",
        "End Date": order.end
          ? formatDate(order.end.toDate ? order.end.toDate() : new Date(order.end))
          : "",
        "Last Updated": order.updated
          ? formatDate(order.updated.toDate ? order.updated.toDate() : new Date(order.updated))
          : "",
        Archived: order.isArchived ? "Yes" : "No",
      }))
    );
    XLSX.utils.book_append_sheet(wb, ordersWS, "Orders");

    // Add monthly production sheet
    const monthlyWS = XLSX.utils.json_to_sheet(
      productionByMonth.map(item => ({
        Month: item.month,
        Quantity: item.quantity,
      }))
    );
    XLSX.utils.book_append_sheet(wb, monthlyWS, "Monthly Production");

    // Add product distribution sheet
    const productsWS = XLSX.utils.json_to_sheet(
      topProducts.map(item => ({
        "Part Number": item.partNo,
        Description: item.description,
        "Total Quantity": item.totalQuantity,
        "Order Count": item.count,
      }))
    );
    XLSX.utils.book_append_sheet(wb, productsWS, "Product Distribution");

    // Add efficiency data sheet if available
    if (efficiencyData.length > 0) {
      const efficiencyWS = XLSX.utils.json_to_sheet(
        efficiencyData.map(item => ({
          Order: item.order,
          Description: item.description,
          "Planned End": item.plannedEnd,
          "Actual End": item.actualEnd,
          "Difference (days)": item.difference,
          "On Time": item.onTime ? "Yes" : "No",
        }))
      );
      XLSX.utils.book_append_sheet(wb, efficiencyWS, "Order Efficiency");
    }

    // Save the workbook
    XLSX.writeFile(wb, `production_dashboard_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportRawData = () => {
    // Create JSON file with the filtered orders data
    const dataStr = JSON.stringify(filteredOrders, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    // Create download link
    const exportFileDefaultName = `production_data_${new Date().toISOString().split("T")[0]}.json`;
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const COLORS = ["#3f51b5", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  if (isLoading) {
    return (
      <ContentWrapper>
        <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
          <CircularProgress />
        </Box>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper>
      <div ref={dashboardRef}>
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error} Using sample data as fallback.
          </Alert>
        )}

        <Box>
          {/* Page Header with Breadcrumbs */}
          <Box
            sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <Box>
              <Typography variant="h4" gutterBottom>
                Production Dashboard
              </Typography>
              <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small" />}
                aria-label="breadcrumb"
              >
                <Link component={RouterLink} to="/" color="inherit">
                  Dashboard
                </Link>
                <Typography color="text.primary">Production Dashboard</Typography>
              </Breadcrumbs>
            </Box>

            <Box>
              <Tooltip title="Refresh Data">
                <IconButton onClick={handleRefresh} disabled={isLoading} sx={{ mr: 1 }}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Filter Data">
                <IconButton
                  onClick={() => setFilterOpen(true)}
                  color={
                    statusFilter.length > 0 ||
                    dateFilter.start ||
                    dateFilter.end ||
                    searchFilter ||
                    productFilter
                      ? "primary"
                      : "default"
                  }
                  sx={{ mr: 1 }}
                >
                  <FilterIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Export Dashboard">
                <IconButton onClick={handleExportClick} disabled={exportLoading} sx={{ mr: 1 }}>
                  <ExportIcon />
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={exportMenuAnchor}
                open={Boolean(exportMenuAnchor)}
                onClose={handleExportMenuClose}
              >
                <MenuItem onClick={() => handleExportFormat("pdf")}>
                  <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
                  Export as PDF
                </MenuItem>
                <MenuItem onClick={() => handleExportFormat("excel")}>
                  <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
                  Export as Excel
                </MenuItem>
                <MenuItem onClick={() => handleExportFormat("raw")}>
                  <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
                  Export Raw Data (JSON)
                </MenuItem>
              </Menu>
            </Box>
          </Box>

          {/* Filters dialog */}
          <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              Filter Dashboard Data
              <IconButton onClick={() => setFilterOpen(false)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent>
              <Grid container spacing={3} sx={{ mt: 0 }}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      multiple
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      renderValue={selected => (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {selected.map(value => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {availableStatuses.map(status => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Product</InputLabel>
                    <Select value={productFilter} onChange={e => setProductFilter(e.target.value)}>
                      <MenuItem value="">
                        <em>All Products</em>
                      </MenuItem>
                      {availableProducts.map(product => (
                        <MenuItem key={product} value={product}>
                          {product}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={dateFilter.start}
                    onChange={e => setDateFilter({ ...dateFilter, start: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    sx={{ mb: 3 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DateRangeIcon />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={dateFilter.end}
                    onChange={e => setDateFilter({ ...dateFilter, end: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    sx={{ mb: 3 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DateRangeIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Search (by order number or description)"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                      endAdornment: searchFilter ? (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setSearchFilter("")} edge="end">
                            <ClearIcon />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                  />
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions>
              <Button onClick={resetFilters} color="secondary">
                Reset Filters
              </Button>
              <Button onClick={() => setFilterOpen(false)} color="primary" variant="contained">
                Apply Filters
              </Button>
            </DialogActions>
          </Dialog>
        </Box>

        {/* Filter chips */}
        {(statusFilter.length > 0 ||
          dateFilter.start ||
          dateFilter.end ||
          searchFilter ||
          productFilter) && (
          <Paper
            sx={{ p: 1, mb: 3, display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              Active filters:
            </Typography>

            {statusFilter.length > 0 &&
              statusFilter.map(status => (
                <Chip
                  key={`status-${status}`}
                  label={`Status: ${status}`}
                  onDelete={() => setStatusFilter(statusFilter.filter(s => s !== status))}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}

            {dateFilter.start && (
              <Chip
                label={`From: ${dateFilter.start}`}
                onDelete={() => setDateFilter({ ...dateFilter, start: "" })}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}

            {dateFilter.end && (
              <Chip
                label={`To: ${dateFilter.end}`}
                onDelete={() => setDateFilter({ ...dateFilter, end: "" })}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}

            {searchFilter && (
              <Chip
                label={`Search: ${searchFilter}`}
                onDelete={() => setSearchFilter("")}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}

            {productFilter && (
              <Chip
                label={`Product: ${productFilter}`}
                onDelete={() => setProductFilter("")}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}

            <Button
              size="small"
              variant="text"
              onClick={resetFilters}
              startIcon={<ClearIcon />}
              sx={{ ml: "auto" }}
            >
              Clear All
            </Button>
          </Paper>
        )}

        {/* Data summary */}
        <Alert severity="info" sx={{ mb: 3 }}>
          Displaying data from {filteredOrders.length} orders (out of {orders.length} total)
        </Alert>

        {/* View selection buttons */}
        <ButtonGroup variant="outlined" sx={{ mb: 3 }}>
          <Button
            variant={selectedView === "overview" ? "contained" : "outlined"}
            onClick={() => setSelectedView("overview")}
          >
            Overview
          </Button>
          <Button
            variant={selectedView === "timeline" ? "contained" : "outlined"}
            onClick={() => setSelectedView("timeline")}
          >
            Timeline
          </Button>
          <Button
            variant={selectedView === "products" ? "contained" : "outlined"}
            onClick={() => setSelectedView("products")}
          >
            Products
          </Button>
          <Button
            variant={selectedView === "efficiency" ? "contained" : "outlined"}
            onClick={() => setSelectedView("efficiency")}
          >
            Efficiency
          </Button>
        </ButtonGroup>

        {selectedView === "overview" && (
          <Grid container spacing={3}>
            {/* Status Distribution */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Typography variant="h6" gutterBottom>
                  Order Status Distribution
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="status"
                        label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={value => [`${value} orders`, "Count"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            {/* Production Quantity By Month */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Typography variant="h6" gutterBottom>
                  Monthly Production Volume
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productionByMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" angle={-45} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip formatter={value => [`${value} units`, "Quantity"]} />
                      <Bar dataKey="quantity" fill="#8884d8">
                        {productionByMonth.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.isPast ? "#8884d8" : "#82ca9d"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            {/* Top Products */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Typography variant="h6" gutterBottom>
                  Top Products by Volume
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topProducts.slice(0, 5)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        dataKey="description"
                        type="category"
                        width={150}
                        tickFormatter={value =>
                          value.length > 20 ? value.substring(0, 20) + "..." : value
                        }
                      />
                      <Tooltip formatter={value => [`${value} units`, "Quantity"]} />
                      <Bar dataKey="totalQuantity" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            {/* Efficiency Overview */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Typography variant="h6" gutterBottom>
                  Production Efficiency
                </Typography>
                {efficiencyData.length > 0 ? (
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "On Time", value: efficiencyData.filter(d => d.onTime).length },
                            {
                              name: "Delayed",
                              value: efficiencyData.filter(d => !d.onTime).length,
                            },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#00C49F" />
                          <Cell fill="#FF8042" />
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} orders`, name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: 300,
                    }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      No completed orders with date information available
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {selectedView === "timeline" && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Production Timeline
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={productionByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" angle={-45} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip formatter={value => [`${value} units`, "Quantity"]} />
                  <Legend />
                  <Bar dataKey="quantity" fill="#8884d8" />
                  <Line type="monotone" dataKey="quantity" stroke="#ff7300" />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Production Insights
              </Typography>
              <Box component="ul" sx={{ pl: 4 }}>
                <li>Total orders in system: {orders.length}</li>
                <li>
                  Active orders:{" "}
                  {orders.filter(o => o.status !== "Finished" && o.status !== "Done").length}
                </li>
                <li>
                  Completed orders:{" "}
                  {orders.filter(o => o.status === "Finished" || o.status === "Done").length}
                </li>
                <li>
                  Total production volume:{" "}
                  {orders.reduce((sum, order) => sum + (order.quantity || 0), 0)} units
                </li>
              </Box>
            </Box>
          </Paper>
        )}

        {selectedView === "products" && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Product Distribution
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} margin={{ top: 5, right: 30, left: 20, bottom: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="description"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    tickFormatter={value =>
                      value.length > 30 ? value.substring(0, 30) + "..." : value
                    }
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value} units`,
                      name === "totalQuantity" ? "Total Quantity" : name,
                    ]}
                    labelFormatter={label => `Product: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="totalQuantity" name="Total Quantity" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        )}

        {selectedView === "efficiency" && (
          <>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Order Completion Efficiency
              </Typography>
              {efficiencyData.length > 0 ? (
                <>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={4}>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: "primary.lighter" }}>
                        <Typography variant="body2" color="text.secondary">
                          Orders Analyzed
                        </Typography>
                        <Typography variant="h4">{efficiencyData.length}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: "success.lighter" }}>
                        <Typography variant="body2" color="text.secondary">
                          On-Time Rate
                        </Typography>
                        <Typography variant="h4">
                          {(
                            (efficiencyData.filter(d => d.onTime).length / efficiencyData.length) *
                            100
                          ).toFixed(1)}
                          %
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: "warning.lighter" }}>
                        <Typography variant="body2" color="text.secondary">
                          Average Delay
                        </Typography>
                        <Typography variant="h4">
                          {(
                            efficiencyData.reduce(
                              (sum, item) => sum + Math.max(0, item.difference),
                              0
                            ) / Math.max(1, efficiencyData.filter(d => !d.onTime).length)
                          ).toFixed(1)}{" "}
                          days
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid />
                        <XAxis
                          type="number"
                          dataKey="difference"
                          name="Delay"
                          label={{ value: "Delay (days)", position: "bottom" }}
                        />
                        <YAxis
                          type="category"
                          dataKey="description"
                          name="Product"
                          tickCount={6}
                          width={150}
                          tickFormatter={value =>
                            value.length > 20 ? value.substring(0, 20) + "..." : value
                          }
                        />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                        <Scatter
                          name="Production Orders"
                          data={efficiencyData}
                          fill="#8884d8"
                          shape="circle"
                        >
                          {efficiencyData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.onTime ? "#00C49F" : "#FF8042"}
                            />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Box>
                </>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: 300,
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    Not enough completed orders with date information for efficiency analysis
                  </Typography>
                </Box>
              )}
            </Paper>

            {efficiencyData.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Order Completion Details
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "background.default" }}>
                        <TableCell>Order No</TableCell>
                        <TableCell>Product</TableCell>
                        <TableCell>Planned End</TableCell>
                        <TableCell>Actual End</TableCell>
                        <TableCell>Difference</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {efficiencyData.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{item.order}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.plannedEnd}</TableCell>
                          <TableCell>{item.actualEnd}</TableCell>
                          <TableCell
                            sx={{
                              color: item.difference > 0 ? "error.main" : "success.main",
                            }}
                          >
                            {item.difference > 0
                              ? `+${item.difference.toFixed(1)}`
                              : item.difference.toFixed(1)}{" "}
                            days
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={item.onTime ? "On Time" : "Delayed"}
                              color={item.onTime ? "success" : "warning"}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}
          </>
        )}
      </div>
    </ContentWrapper>
  );
};

export default ProductionDashboardPage;
