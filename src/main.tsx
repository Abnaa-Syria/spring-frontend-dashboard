import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import arEG from 'antd/locale/ar_EG';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { StrictMode, lazy, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layout/AdminLayout';
import { AuthProvider } from './lib/auth';
import { LoginPage } from './pages/LoginPage';
import { theme } from './theme';
import './index.css';

// Each page is its own chunk, so the first load only pulls the layout and the current page.
const page = <P,>(load: () => Promise<ComponentType<P>>) => lazy(async () => ({ default: await load() }));

const HomePage = page(async () => (await import('./pages/HomePage')).HomePage);
const ServiceRequestsPage = page(async () => (await import('./pages/service-requests/ServiceRequestsPage')).ServiceRequestsPage);
const CustomersPage = page(async () => (await import('./pages/customers/CustomersPage')).CustomersPage);
const CustomerDetailPage = page(async () => (await import('./pages/customers/CustomerDetailPage')).CustomerDetailPage);
const TechniciansPage = page(async () => (await import('./pages/technicians/TechniciansPage')).TechniciansPage);
const TechnicianDetailPage = page(async () => (await import('./pages/technicians/TechnicianDetailPage')).TechnicianDetailPage);
const ProductsPage = page(async () => (await import('./pages/products/ProductsPage')).ProductsPage);
const InventoryPage = page(async () => (await import('./pages/inventory/InventoryPage')).InventoryPage);
const BillingPage = page(async () => (await import('./pages/billing/BillingPage')).BillingPage);
const LeadsPage = page(async () => (await import('./pages/leads/LeadsPage')).LeadsPage);
const OrdersPage = page(async () => (await import('./pages/orders/OrdersPage')).OrdersPage);
const ReportsPage = page(async () => (await import('./pages/reports/ReportsPage')).ReportsPage);
const SettingsPage = page(async () => (await import('./pages/settings/SettingsPage')).SettingsPage);

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
                  <Route path="technicians/:id" element={<TechnicianDetailPage />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="invoices" element={<BillingPage />} />
                  <Route path="leads" element={<LeadsPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
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
