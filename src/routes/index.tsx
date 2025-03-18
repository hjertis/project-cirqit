// src/routes/index.tsx 
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Dashboard from "../pages/Dashboard";
import OrdersPage from "../pages/Orders";
import ImportOrdersPage from "../pages/ImportOrdersPage";
import CreateOrderPage from "../pages/CreateOrderPage";
import EditOrderPage from "../pages/EditOrderPage";
import OrderDetailsPage from "../pages/OrderDetailsPage";
import OrderPlanningPage from "../pages/OrderPlanningPage";
import ArchivedOrdersPage from "../pages/ArchivedOrdersPage";
import MigrateOrdersPage from "../pages/admin/MigrateOrdersPage";
import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import ProtectedRoute from "./ProtectedRoute";

/**
 * Main application routes configuration
 * This centralizes all routing logic for the application
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes - wrapped in our main layout */}
      <Route element={<Layout />}>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Orders module */}
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/create" element={<CreateOrderPage />} />
        <Route path="/orders/import" element={<ImportOrdersPage />} />
        <Route path="/orders/planning" element={<OrderPlanningPage />} />
        <Route path="/orders/archived" element={<ArchivedOrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailsPage />} /> 
        <Route path="/orders/:id/edit" element={<EditOrderPage />} />

        {/* Products module */}
        <Route path="/products" element={<div>Products Page</div>} />
        <Route path="/products/create" element={<div>Create Product Page</div>} />
        <Route path="/products/:id" element={<div>Product Details Page</div>} />

        {/* Employees module */}
        <Route path="/employees" element={<div>Employees Page</div>} />

        {/* Reports module */}
        <Route path="/reports" element={<div>Reports Page</div>} />

        {/* Admin section */}
        <Route path="/admin/migrate-orders" element={<MigrateOrdersPage />} />

        {/* Settings */}
        <Route path="/settings" element={<div>Settings Page</div>} />
      </Route>

      {/* Redirect unknown paths to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;