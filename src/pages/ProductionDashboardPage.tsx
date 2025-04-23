// src/pages/ProductionDashboardPage.tsx
import { useState, useEffect } from "react";
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
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
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
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  ScatterChart,
} from "recharts";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";

const ProductionDashboardPage = () => {
  const [orders, setOrders] = useState([]);
  const [productionByMonth, setProductionByMonth] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [efficiencyData, setEfficiencyData] = useState([]);
  const [selectedView, setSelectedView] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFirebaseData = async () => {
      try {
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
        const allOrders = [];

        activeSnapshot.forEach(doc => {
          allOrders.push({
            id: doc.id,
            ...doc.data(),
            isArchived: false,
          });
        });

        archivedSnapshot.forEach(doc => {
          allOrders.push({
            id: doc.id,
            ...doc.data(),
            isArchived: true,
          });
        });

        console.log(`Loaded ${allOrders.length} orders from Firebase`);
        setOrders(allOrders);

        // Process the data for visualizations
        processOrderData(allOrders);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching data from Firebase:", err);
        setError(`Failed to load production data: ${err.message || "Unknown error"}`);
        setIsLoading(false);

        // If Firebase query fails, use sample data as fallback
        useSampleData();
      }
    };

    fetchFirebaseData();
  }, []);

  // Fallback to sample data if needed
  const useSampleData = () => {
    const sampleOrders = generateSampleOrders();
    setOrders(sampleOrders);
    processOrderData(sampleOrders);
  };

  // Process the order data for visualizations
  const processOrderData = orderData => {
    // 1. Process monthly production
    const monthlyData = {};
    const today = new Date();

    orderData.forEach(order => {
      if (order.start) {
        const startDate = order.start.toDate ? order.start.toDate() : new Date(order.start);
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
        const plannedEnd = order.end.toDate ? order.end.toDate() : new Date(order.end);
        // For actual end, use updated timestamp or end date
        const actualEnd = order.updated
          ? order.updated.toDate
            ? order.updated.toDate()
            : new Date(order.updated)
          : plannedEnd;

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
  const generateSampleOrders = () => {
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
      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error} Using sample data as fallback.
        </Alert>
      )}

      <Box>
        {/* Page Header with Breadcrumbs */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Production Dashboard
          </Typography>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
            <Link component={RouterLink} to="/" color="inherit">
              Dashboard
            </Link>
            <Typography color="text.primary">Production Dashboard</Typography>
          </Breadcrumbs>
        </Box>

        {/* Data summary */}
        <Alert severity="info" sx={{ mb: 3 }}>
          Displaying data from {orders.length} orders (
          {statusDistribution.map(s => `${s.status}: ${s.count}`).join(", ")})
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
      </Box>
    </ContentWrapper>
  );
};

export default ProductionDashboardPage;
