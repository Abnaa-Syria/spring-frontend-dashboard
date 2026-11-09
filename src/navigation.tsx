import {
  AppstoreOutlined, BarChartOutlined, CalendarOutlined, DashboardOutlined, DropboxOutlined, EnvironmentOutlined, RiseOutlined,
  SettingOutlined, ShoppingCartOutlined, TeamOutlined, ToolOutlined, UserOutlined, WalletOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

export interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
  /** Hidden from users without this permission. */
  permission?: string;
}

export interface NavGroup {
  title: string | null;
  items: NavItem[];
}

/** Sidebar, grouped by area of work. */
export const NAV_GROUPS: NavGroup[] = [
  { title: null, items: [{ path: '/', label: 'لوحة المتابعة', icon: <DashboardOutlined /> }] },
  {
    title: 'التشغيل',
    items: [
      { path: '/scheduling', label: 'توزيع المهام', icon: <CalendarOutlined />, permission: 'service.assign' },
      { path: '/service-requests', label: 'طلبات الخدمة', icon: <ToolOutlined />, permission: 'service.read' },
      { path: '/technicians', label: 'الفنيين', icon: <TeamOutlined />, permission: 'technician.read' },
      { path: '/customers', label: 'العملاء', icon: <UserOutlined />, permission: 'customer.read' },
      { path: '/zones', label: 'مناطق الخدمة والتسعير', icon: <EnvironmentOutlined />, permission: 'service.read' },
    ],
  },
  {
    title: 'المبيعات',
    items: [
      { path: '/orders', label: 'طلبات المتجر', icon: <ShoppingCartOutlined />, permission: 'order.read' },
      { path: '/products', label: 'المنتجات', icon: <AppstoreOutlined />, permission: 'product.read' },
      { path: '/leads', label: 'الترشيحات', icon: <RiseOutlined />, permission: 'lead.read' },
    ],
  },
  {
    title: 'المالية والمخزون',
    items: [
      { path: '/invoices', label: 'الفواتير والتحصيل', icon: <WalletOutlined />, permission: 'invoice.read' },
      { path: '/inventory', label: 'المخزون والعهد', icon: <DropboxOutlined />, permission: 'inventory.read' },
      { path: '/reports', label: 'التقارير', icon: <BarChartOutlined />, permission: 'report.read' },
    ],
  },
  {
    title: 'الإدارة',
    items: [{ path: '/settings', label: 'الإعدادات', icon: <SettingOutlined /> }],
  },
];

export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** The nav entry that owns a path (longest prefix wins). */
export function navFor(pathname: string): NavItem | undefined {
  if (pathname === '/') return NAV[0];
  return NAV.filter((n) => n.path !== '/' && pathname.startsWith(n.path)).sort((a, b) => b.path.length - a.path.length)[0];
}
