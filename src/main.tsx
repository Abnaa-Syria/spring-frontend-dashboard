import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import arEG from 'antd/locale/ar_EG';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layout/AdminLayout';
import { AuthProvider } from './lib/auth';
import { NAV } from './navigation';
import { BillingPage } from './pages/billing/BillingPage';
import { CustomerDetailPage } from './pages/customers/CustomerDetailPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { LeadsPage } from './pages/leads/LeadsPage';
import { OrdersPage } from './pages/orders/OrdersPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { Placeholder } from './pages/Placeholder';
import { ProductsPage } from './pages/products/ProductsPage';
import { ServiceRequestsPage } from './pages/service-requests/ServiceRequestsPage';
import { UsersPage } from './pages/settings/UsersPage';
import { TechniciansPage } from './pages/technicians/TechniciansPage';
import { theme } from './theme';
import './index.css';

dayjs.locale('ar');
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider direction="rtl" locale={arEG} theme={theme}>
      <AntApp style={{ height: '100%' }}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<AdminLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="scheduling" element={<ServiceRequestsPage key="dispatch" dispatch />} />
                  <Route path="service-requests" element={<ServiceRequestsPage key="all" />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="customers/:id" element={<CustomerDetailPage />} />
                  <Route path="technicians" element={<TechniciansPage />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="invoices" element={<BillingPage />} />
                  <Route path="leads" element={<LeadsPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="settings" element={<UsersPage />} />
                  {NAV.filter((n) => n.soon).map((n) => (
                    <Route key={n.path} path={n.path.slice(1)} element={<Placeholder title={n.label} />} />
                  ))}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
