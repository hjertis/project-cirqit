import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Dashboard from "../pages/Dashboard";
import OrdersPage from "../pages/Orders";
import ImportOrdersPage from "../pages/ImportOrdersPage";
import CreateOrderPage from "../pages/CreateOrderPage";
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
import FaultParetoChart from "../components/dashboard/FaultParetoChart";
import ResourceBoardPage from "../pages/ResourceBoardPage";
import ProductionDashboardPage from "../pages/ProductionDashboardPage";
import PrintOrderPage from "../pages/PrintOrderPage";
import DailySchedulerPage from "../pages/DailySchedulerPage";
import MigratePlannedWeekStartDateButton from "../pages/admin/MigrateDates";
import KanbanPage from "../pages/KanbanPage";
import StandardizeProcessesCollectionPage from "../pages/admin/StandardizeProcessesCollectionPage.tsx";
import FixInvalidOrderResourcesPage from "../pages/admin/FixInvalidOrderResourcesPage.tsx";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/create" element={<CreateOrderPage />} />
        <Route path="/orders/import" element={<ImportOrdersPage />} />
        <Route path="/orders/planning" element={<OrderPlanningPage />} />
        <Route path="/orders/calendar" element={<ResourceCalendarPage />} />
        <Route path="/orders/resource-board" element={<ResourceBoardPage />} />
        <Route path="/orders/resource-scheduler" element={<DailySchedulerPage />} />
        <Route path="/orders/:id/print" element={<PrintOrderPage />} />
        <Route path="/orders/archived" element={<ArchivedOrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailsPage />} />
        <Route path="/products" element={<div>Products Page</div>} />
        <Route path="/products/create" element={<div>Create Product Page</div>} />
        <Route path="/products/:id" element={<div>Product Details Page</div>} />
        <Route path="/employees" element={<div>Employees Page</div>} />
        <Route path="/reports" element={<div>Reports Page</div>} />
        <Route path="/reports/fault-analysis" element={<FaultParetoChart />} />
        <Route path="/reports/production-dashboard" element={<ProductionDashboardPage />} />
        <Route path="/time" element={<TimeDashboardPage />} />
        <Route path="/resources" element={<ResourceManagementPage />} />
        <Route path="/kanban" element={<KanbanPage />} />
        <Route
          path="/admin/migrate-orders"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <MigrateOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/migrate-dates" element={<MigratePlannedWeekStartDateButton />} />
        <Route
          path="/admin/standardize-process-collection"
          element={<StandardizeProcessesCollectionPage />}
        />
        <Route
          path="/admin/fix-invalid-order-resources"
          element={<FixInvalidOrderResourcesPage />}
        />
        <Route path="/settings" element={<div>Settings Page</div>} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
