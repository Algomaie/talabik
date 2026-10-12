import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import StoresPage from './pages/customer/StoresPage';
import StoreDetailsPage from './pages/customer/StoreDetailsPage';
import CartPage from './pages/customer/CartPage';
import CustomerOrdersPage from './pages/customer/CustomerOrdersPage';
import MerchantOrdersPage from './pages/merchant/MerchantOrdersPage';
import MerchantProductsPage from './pages/merchant/MerchantProductsPage';
import MerchantStoreSettingsPage from './pages/merchant/MerchantStoreSettingsPage';
import MerchantCategoriesPage from './pages/merchant/MerchantCategoriesPage';
import DriverDeliveriesPage from './pages/driver/DriverDeliveriesPage';
import DriverHistoryPage from './pages/driver/DriverHistoryPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminMerchantsPage from './pages/admin/AdminMerchantsPage';
import AdminDriversPage from './pages/admin/AdminDriversPage';
import ProfilePage from './pages/shared/ProfilePage';
import NotificationsPage from './pages/shared/NotificationsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            
            {/* Customer Routes */}
            <Route path="/stores" element={<StoresPage />} />
            <Route path="/stores/:id" element={<StoreDetailsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/my-orders" element={<CustomerOrdersPage />} />
            
            {/* Merchant Routes */}
            <Route path="/merchant/orders" element={<MerchantOrdersPage />} />
            <Route path="/merchant/products" element={<MerchantProductsPage />} />
            <Route path="/merchant/categories" element={<MerchantCategoriesPage />} />
            <Route path="/merchant/settings" element={<MerchantStoreSettingsPage />} />
            
            {/* Driver Routes */}
            <Route path="/driver/deliveries" element={<DriverDeliveriesPage />} />
            <Route path="/driver/history" element={<DriverHistoryPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/merchants" element={<AdminMerchantsPage />} />
            <Route path="/admin/drivers" element={<AdminDriversPage />} />
            
            {/* Shared Routes */}
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<ProfilePage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
