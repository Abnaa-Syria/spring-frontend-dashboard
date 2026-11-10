import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp } from 'antd';
import arEG from 'antd/locale/ar_EG';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { StrictMode, lazy, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layout/AdminLayout';
import { AuthProvider } from './lib/auth';
import { ThemeModeProvider } from './lib/themeMode';
import { LoginPage } from './pages/LoginPage';
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
const ZonesPage = page(async () => (await import('./pages/zones/ZonesPage')).ZonesPage);

// Detail and form pages (every view/edit is a page of its own, no popups).
const ServiceRequestDetailPage = page(async () => (await import('./pages/service-requests/ServiceRequestDetailPage')).ServiceRequestDetailPage);
const ServiceRequestCreatePage = page(async () => (await import('./pages/service-requests/ServiceRequestCreatePage')).ServiceRequestCreatePage);
const CustomerFormPage = page(async () => (await import('./pages/customers/CustomerFormPage')).CustomerFormPage);
const AddressFormPage = page(async () => (await import('./pages/customers/AddressFormPage')).AddressFormPage);
const DeviceFormPage = page(async () => (await import('./pages/customers/DeviceFormPage')).DeviceFormPage);
const TechnicianFormPage = page(async () => (await import('./pages/technicians/TechnicianFormPage')).TechnicianFormPage);
const ProductFormPage = page(async () => (await import('./pages/products/ProductFormPage')).ProductFormPage);
const CategoryFormPage = page(async () => (await import('./pages/products/CategoryFormPage')).CategoryFormPage);
const MovementFormPage = page(async () => (await import('./pages/inventory/MovementFormPage')).MovementFormPage);
const WarehouseDetailPage = page(async () => (await import('./pages/inventory/WarehouseDetailPage')).WarehouseDetailPage);
const InvoiceDetailPage = page(async () => (await import('./pages/billing/InvoiceDetailPage')).InvoiceDetailPage);
const TechnicianCashPage = page(async () => (await import('./pages/billing/TechnicianCashPage')).TechnicianCashPage);
const RecordHandoverPage = page(async () => (await import('./pages/billing/RecordHandoverPage')).RecordHandoverPage);
const OrderDetailPage = page(async () => (await import('./pages/orders/OrderDetailPage')).OrderDetailPage);
const LeadDetailPage = page(async () => (await import('./pages/leads/LeadDetailPage')).LeadDetailPage);
const UserFormPage = page(async () => (await import('./pages/settings/UserFormPage')).UserFormPage);

dayjs.locale('ar');
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeModeProvider locale={arEG}>
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
                  <Route path="service-requests/new" element={<ServiceRequestCreatePage />} />
                  <Route path="service-requests/:id" element={<ServiceRequestDetailPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="customers/new" element={<CustomerFormPage key="new" />} />
                  <Route path="customers/:id" element={<CustomerDetailPage />} />
                  <Route path="customers/:id/edit" element={<CustomerFormPage key="edit" />} />
                  <Route path="customers/:id/addresses/new" element={<AddressFormPage key="new" />} />
                  <Route path="customers/:id/addresses/:addressId/edit" element={<AddressFormPage key="edit" />} />
                  <Route path="customers/:id/devices/new" element={<DeviceFormPage />} />
                  <Route path="technicians" element={<TechniciansPage />} />
                  <Route path="technicians/new" element={<TechnicianFormPage key="new" />} />
                  <Route path="technicians/:id" element={<TechnicianDetailPage />} />
                  <Route path="technicians/:id/edit" element={<TechnicianFormPage key="edit" />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="products/new" element={<ProductFormPage key="new" />} />
                  <Route path="products/:id/edit" element={<ProductFormPage key="edit" />} />
                  <Route path="products/categories/new" element={<CategoryFormPage key="new" />} />
                  <Route path="products/categories/:id/edit" element={<CategoryFormPage key="edit" />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="inventory/movements/:kind" element={<MovementFormPage />} />
                  <Route path="inventory/warehouses/:id" element={<WarehouseDetailPage />} />
                  <Route path="invoices" element={<BillingPage />} />
                  <Route path="invoices/:id" element={<InvoiceDetailPage />} />
                  <Route path="invoices/cash/:technicianId" element={<TechnicianCashPage />} />
                  <Route path="invoices/cash/:technicianId/handover" element={<RecordHandoverPage />} />
                  <Route path="leads" element={<LeadsPage />} />
                  <Route path="leads/:id" element={<LeadDetailPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="orders/:id" element={<OrderDetailPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="zones" element={<ZonesPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="settings/users/new" element={<UserFormPage key="new" />} />
                  <Route path="settings/users/:id/edit" element={<UserFormPage key="edit" />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </AntApp>
    </ThemeModeProvider>
  </StrictMode>,
);
