import {
  AppstoreOutlined, CalendarOutlined, DashboardOutlined, DropboxOutlined, FileTextOutlined, RiseOutlined,
  SettingOutlined, ShoppingCartOutlined, TeamOutlined, ToolOutlined, UserOutlined, WalletOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

export interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
  /** Hidden from users without this permission. */
  permission?: string;
  /** Not built yet — shown as a placeholder page. */
  soon?: boolean;
}

export const NAV: NavItem[] = [
  { path: '/', label: 'الرئيسية', icon: <DashboardOutlined /> },
  { path: '/scheduling', label: 'توزيع المهام', icon: <CalendarOutlined />, permission: 'service.assign' },
  { path: '/service-requests', label: 'طلبات الخدمة', icon: <ToolOutlined />, permission: 'service.read' },
  { path: '/customers', label: 'العملاء', icon: <UserOutlined />, permission: 'customer.read' },
  { path: '/technicians', label: 'الفنيين', icon: <TeamOutlined />, permission: 'technician.read' },
  { path: '/products', label: 'المنتجات', icon: <AppstoreOutlined />, permission: 'product.read' },
  { path: '/orders', label: 'طلبات الشراء', icon: <ShoppingCartOutlined />, permission: 'order.read' },
  { path: '/inventory', label: 'المخزون والعهد', icon: <DropboxOutlined />, permission: 'inventory.read' },
  { path: '/invoices', label: 'الفواتير والتحصيل', icon: <WalletOutlined />, permission: 'invoice.read' },
  { path: '/leads', label: 'الترشيحات', icon: <RiseOutlined />, permission: 'lead.read' },
  { path: '/reports', label: 'التقارير', icon: <FileTextOutlined />, permission: 'report.read', soon: true },
  { path: '/settings', label: 'المستخدمين والصلاحيات', icon: <SettingOutlined />, permission: 'user.manage' },
];
