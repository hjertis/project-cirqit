// src/routes/index.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Dashboard from '../pages/Dashboard';
import OrdersPage from '../pages/Orders';
import ImportOrdersPage from '../pages/ImportOrdersPage';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/SignUp';
import ProtectedRoute from './ProtectedRoute';

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
        <Route path="/orders/create" element={<div>Create Order Page</div>} />
        <Route path="/orders/import" element={<ImportOrdersPage />} />
        <Route path="/orders/:id" element={<div>Order Details Page</div>} />
        
        {/* Products module */}
        <Route path="/products" element={<div>Products Page</div>} />
        <Route path="/products/create" element={<div>Create Product Page</div>} />
        <Route path="/products/:id" element={<div>Product Details Page</div>} />
        
        {/* Employees module */}
        <Route path="/employees" element={<div>Employees Page</div>} />
        
        {/* Reports module */}
        <Route path="/reports" element={<div>Reports Page</div>} />
        
        {/* Settings */}
        <Route path="/settings" element={<div>Settings Page</div>} />
      </Route>
      
      {/* Redirect unknown paths to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;