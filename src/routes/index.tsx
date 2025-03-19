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
import ForgotPassword from "../pages/auth/ForgotPassword";
import ProfilePage from "../pages/ProfilePage";
import ProtectedRoute from "./ProtectedRoute";
import TimeDashboardPage from "../pages/TimeDashboardPage";
import ResourceCalendarPage from "../pages/ResourceCalendarPage";
import ResourceManagementPage from "../pages/ResourceManagementPage";

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
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />

      {/* Protected routes - wrapped in our main layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />
        {/* Orders module */}
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/create" element={<CreateOrderPage />} />
        <Route path="/orders/import" element={<ImportOrdersPage />} />
        <Route path="/orders/planning" element={<OrderPlanningPage />} />
        <Route path="/orders/calendar" element={<ResourceCalendarPage />} />{" "}
        {/* New calendar route */}
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
        <Route path="/time" element={<TimeDashboardPage />} />
        {/* Resource Management */}
        <Route path="/resources" element={<ResourceManagementPage />} />
        {/* Admin section */}
        <Route
          path="/admin/migrate-orders"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <MigrateOrdersPage />
            </ProtectedRoute>
          }
        />
        {/* Settings */}
        <Route path="/settings" element={<div>Settings Page</div>} />
        {/* User Profile */}
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Redirect unknown paths to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
