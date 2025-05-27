import { useState, useEffect, useRef, useCallback } from "react";
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
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import ContentWrapper from "../components/layout/ContentWrapper";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
} from "recharts";
import { collection, query, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import EfficiencyDetailsTable from "../components/dashboard/EfficiencyDetailsTable";
import ProductDistributionChart from "../components/dashboard/ProductDistributionChart";
import ProductionTimelineChart from "../components/dashboard/ProductionTimelineChart";

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
  finishedDate?: Timestamp;
  isArchived?: boolean;
}

interface MonthlyProductionData {
  month: string;
  quantity: number;
  isPast: boolean;
}

interface ProductData {
  partNo: string;
  count: number;
  totalQuantity: number;
  description: string;
}

interface StatusDistributionData {
  status: string;
  count: number;
}

interface EfficiencyData {
  order: string;
  description: string;
  plannedEnd: string;
  actualEnd: string;
  difference: number;
  onTime: boolean;
}

// Helper function to safely convert Firestore Timestamp or other date formats to Date
const safeConvertToDate = (
  dateInput: Timestamp | Date | string | number | undefined | null
): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Timestamp) {
    return dateInput.toDate();
  }
  if (dateInput instanceof Date) {
    // Check if the date is valid
    return !isNaN(dateInput.getTime()) ? dateInput : null;
  }
  // Attempt to parse string or number
  const potentialDate = new Date(dateInput);
  return !isNaN(potentialDate.getTime()) ? potentialDate : null;
};

const ProductionDashboardPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [productionByMonth, setProductionByMonth] = useState<MonthlyProductionData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductData[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistributionData[]>([]);
  const [efficiencyData, setEfficiencyData] = useState<EfficiencyData[]>([]);
  const [selectedView, setSelectedView] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const dashboardRef = useRef<HTMLDivElement>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState({
    start: "",
    end: "",
  });
  const [searchFilter, setSearchFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [availableProducts, setAvailableProducts] = useState<string[]>([]);

  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Define processOrderData first, as other callbacks depend on it
  const processOrderData = useCallback((orderData: Order[]) => {
    const monthlyData: { [key: string]: number } = {};
    const today = new Date();
    orderData.forEach(order => {
      const startDate = safeConvertToDate(order.start);
      if (startDate) {
        const yearMonth = `${startDate.getFullYear()}-${(startDate.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        monthlyData[yearMonth] = (monthlyData[yearMonth] || 0) + (order.quantity || 0);
      }
    });
    const monthlyChartData: MonthlyProductionData[] = Object.keys(monthlyData)
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
          isPast: new Date(parseInt(year), parseInt(monthNum) - 1) < today,
        };
      });
    setProductionByMonth(monthlyChartData);

    const productsByPartNo: {
      [key: string]: { count: number; totalQuantity: number; description: string };
    } = {};
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
    // Filter out omitted part numbers when creating topProductsData
    const topProductsData: ProductData[] = Object.keys(productsByPartNo)
      .map(partNo => ({
        partNo,
        ...productsByPartNo[partNo],
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 15);
    setTopProducts(topProductsData);

    const statusCounts: { [key: string]: number } = {};
    orderData.forEach(order => {
      const status = order.status || "Unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    const statusData: StatusDistributionData[] = Object.keys(statusCounts).map(status => ({
      status,
      count: statusCounts[status],
    }));
    setStatusDistribution(statusData);

    const efficiencyItems: EfficiencyData[] = orderData
      .filter(
        order =>
          (order.status === "Finished" || order.status === "Done") && order.start && order.end
      )
      .map(order => {
        const plannedEnd = safeConvertToDate(order.end);

        // Prioritize finishedDate if available, then updated, then fallback to planned end
        let actualEnd = safeConvertToDate(order.finishedDate) || safeConvertToDate(order.updated);
        if (!actualEnd) {
          actualEnd = plannedEnd;
        }

        if (plannedEnd && actualEnd) {
          const diff = (actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24);
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
      .filter((item): item is EfficiencyData => item !== null);
    setEfficiencyData(efficiencyItems);
  }, []); // Add omittedPartNumbers as dependency

  // Define loadSampleData, depends on processOrderData
  const loadSampleData = useCallback(() => {
    const sampleOrders = generateSampleOrders(); // Assuming generateSampleOrders is stable or defined outside
    setOrders(sampleOrders);
    setFilteredOrders(sampleOrders);
    processOrderData(sampleOrders);
    setError("Failed to load production data. Displaying sample data as fallback.");
  }, [processOrderData]); // Add processOrderData dependency

  // Define fetchFirebaseData, depends on loadSampleData and processOrderData
  const fetchFirebaseData = useCallback(async () => {
    try {
      setIsLoading(true);
      const ordersRef = collection(db, "orders");
      const activeOrdersQuery = query(ordersRef, orderBy("updated", "desc"));
      const archivedOrdersRef = collection(db, "archivedOrders");
      const archivedOrdersQuery = query(archivedOrdersRef, orderBy("updated", "desc"));
      const [activeSnapshot, archivedSnapshot] = await Promise.all([
        getDocs(activeOrdersQuery),
        getDocs(archivedOrdersQuery),
      ]);
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
      setOrders(allOrders);
      const statuses = [...new Set(allOrders.map(order => order.status))].filter(Boolean);
      setAvailableStatuses(statuses);
      const products = [...new Set(allOrders.map(order => order.partNo))].filter(Boolean);
      setAvailableProducts(products);
      // Initial filter application after fetch
      // setFilteredOrders(allOrders); // applyFilters will handle this
      // processOrderData(allOrders); // applyFilters will handle this
      setError(null);
    } catch (err) {
      console.error("Error fetching data from Firebase:", err);
      // Call the regular function here
      loadSampleData();
    } finally {
      setIsLoading(false);
    }
  }, [loadSampleData]); // Add loadSampleData and processOrderData to dependencies

  useEffect(() => {
    fetchFirebaseData();
  }, [refreshTrigger, fetchFirebaseData]);

  // Define applyFilters, depends on orders and processOrderData
  const applyFilters = useCallback(() => {
    let filtered = [...orders];
    if (statusFilter.length > 0) {
      filtered = filtered.filter(order => statusFilter.includes(order.status));
    }
    if (dateFilter.start || dateFilter.end) {
      const startDate = dateFilter.start ? new Date(dateFilter.start) : null;
      const endDate = dateFilter.end ? new Date(dateFilter.end) : null;
      if (endDate) endDate.setHours(23, 59, 59, 999); // Include the whole end day
      filtered = filtered.filter(order => {
        const orderDate = safeConvertToDate(order.start);
        if (!orderDate) return false; // Skip if no valid start date
        const afterStart = startDate ? orderDate >= startDate : true;
        const beforeEnd = endDate ? orderDate <= endDate : true;
        return afterStart && beforeEnd;
      });
    }
    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase();
      filtered = filtered.filter(
        order =>
          (order.orderNumber && order.orderNumber.toLowerCase().includes(searchLower)) ||
          (order.description && order.description.toLowerCase().includes(searchLower))
      );
    }
    if (productFilter) {
      filtered = filtered.filter(order => order.partNo === productFilter);
    }
    setFilteredOrders(filtered);
    processOrderData(filtered); // Call processOrderData, but don't list it as a dependency here
  }, [orders, statusFilter, dateFilter, searchFilter, productFilter, processOrderData]); // Add processOrderData back

  useEffect(() => {
    if (orders.length > 0) {
      applyFilters();
    }
  }, [statusFilter, dateFilter, searchFilter, productFilter, orders, applyFilters]);

  const resetFilters = () => {
    setStatusFilter([]);
    setDateFilter({ start: "", end: "" });
    setSearchFilter("");
    setProductFilter("");
    setFilteredOrders(orders);
    processOrderData(orders);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const formatDate = (date: Date | null): string => {
    if (!date || isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Keep generateSampleOrders as a regular function if it doesn't use hooks
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

  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExportFormat = (format: string) => {
    handleExportMenuClose();
    exportDashboard(format);
  };

  const exportDashboard = async (format: string) => {
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
      const errorMessage = err instanceof Error ? err.message : "Unknown export error";
      setError(`Export failed: ${errorMessage}`);
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
    pdf.setFontSize(16);
    pdf.text("Production Dashboard Report", 105, 15, { align: "center" });
    pdf.setFontSize(10);
    pdf.text(`Generated on ${new Date().toLocaleString()}`, 105, 22, { align: "center" });
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
    const imgWidth = 210 - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const yPosition = filtersApplied ? 35 : 30;
    pdf.addImage(imgData, "PNG", 10, yPosition, imgWidth, imgHeight);
    pdf.save(`production_dashboard_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const ordersWS = XLSX.utils.json_to_sheet(
      filteredOrders.map(order => ({
        "Order Number": order.orderNumber || order.id,
        Description: order.description || "",
        "Part Number": order.partNo || "",
        Quantity: order.quantity || 0,
        Status: order.status || "",
        "Start Date": formatDate(safeConvertToDate(order.start)),
        "End Date": formatDate(safeConvertToDate(order.end)),
        "Last Updated": formatDate(safeConvertToDate(order.updated)),
        Archived: order.isArchived ? "Yes" : "No",
      }))
    );
    XLSX.utils.book_append_sheet(wb, ordersWS, "Orders");
    const monthlyWS = XLSX.utils.json_to_sheet(
      productionByMonth.map(item => ({
        Month: item.month,
        Quantity: item.quantity,
      }))
    );
    XLSX.utils.book_append_sheet(wb, monthlyWS, "Monthly Production");
    const productsWS = XLSX.utils.json_to_sheet(
      topProducts.map(item => ({
        "Part Number": item.partNo,
        Description: item.description,
        "Total Quantity": item.totalQuantity,
        "Order Count": item.count,
      }))
    );
    XLSX.utils.book_append_sheet(wb, productsWS, "Product Distribution");
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
    XLSX.writeFile(wb, `production_dashboard_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportRawData = () => {
    const dataStr = JSON.stringify(filteredOrders, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
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
                      onChange={e => setStatusFilter(e.target.value as string[])}
                      renderValue={selected => (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {(selected as string[]).map(value => (
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
                    <Select
                      value={productFilter}
                      onChange={e => setProductFilter(e.target.value as string)}
                    >
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
                      endAdornment: (
                        <InputAdornment position="end">
                          <CalendarIcon color="action" />
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
                      endAdornment: (
                        <InputAdornment position="end">
                          <CalendarIcon color="action" />
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

        <Alert severity="info" sx={{ mb: 3 }}>
          Displaying data from {filteredOrders.length} orders (out of {orders.length} total)
        </Alert>

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
                        {statusDistribution.map(
                          (
                            _,
                            index // Use _ for unused entry
                          ) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          )
                        )}
                      </Pie>
                      <RechartsTooltip formatter={value => [`${value} orders`, "Count"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
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
                      <RechartsTooltip formatter={value => [`${value} units`, "Quantity"]} />
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
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Typography variant="h6" gutterBottom>
                  Top Products by Volume
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topProducts}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        dataKey="description"
                        type="category"
                        width={140}
                        tickFormatter={value =>
                          value.length > 25 ? value.substring(0, 25) + "..." : value
                        }
                      />
                      <RechartsTooltip
                        formatter={(value: number, name: string) => [
                          `${value} units`,
                          name === "totalQuantity" ? "Total Quantity" : name,
                        ]}
                        labelFormatter={(label: string) => `Product: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="totalQuantity" name="Total Quantity" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
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
                        <RechartsTooltip formatter={(value, name) => [`${value} orders`, name]} />
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
          <ProductionTimelineChart
            productionByMonth={productionByMonth}
            ordersCount={orders.length}
            activeOrdersCount={
              orders.filter(o => o.status !== "Finished" && o.status !== "Done").length
            }
            completedOrdersCount={
              orders.filter(o => o.status === "Finished" || o.status === "Done").length
            }
            totalVolume={orders.reduce((sum, order) => sum + (order.quantity || 0), 0)}
          />
        )}

        {selectedView === "products" && <ProductDistributionChart topProducts={topProducts} />}

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
                        <RechartsTooltip cursor={{ strokeDasharray: "3 3" }} />
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
                <EfficiencyDetailsTable data={efficiencyData} />
              </Paper>
            )}
          </>
        )}
      </div>
    </ContentWrapper>
  );
};

export default ProductionDashboardPage;
