import { LogoutOutlined, MenuOutlined } from '@ant-design/icons';
import { Button, Drawer, Grid, Layout, Menu, Space, Spin, Typography } from 'antd';
import { useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { NotificationBell } from '../components/NotificationBell';
import { useAuth } from '../lib/auth';
import { NAV } from '../navigation';

const { Sider, Header, Content } = Layout;

export function AdminLayout() {
  const { user, loading, logout, can } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const screens = Grid.useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (loading) return <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}><Spin size="large" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const items = NAV.filter((n) => !n.permission || can(n.permission));
  const current = items.find((n) => n.path !== '/' && pathname.startsWith(n.path))?.path ?? '/';
  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[current]}
      items={items.map((n) => ({ key: n.path, icon: n.icon, label: n.label }))}
      onClick={({ key }) => { navigate(key); setDrawerOpen(false); }}
      style={{ borderInlineEnd: 'none' }}
    />
  );
  const logo = (
    <div style={{ padding: '20px 24px' }}>
      <Typography.Title level={3} style={{ margin: 0, color: '#34508F' }}>Spring</Typography.Title>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100%' }}>
      {screens.lg ? (
        <Sider width={240} theme="light" style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}>
          {logo}
          {menu}
        </Sider>
      ) : (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} placement="right" size={260} styles={{ body: { padding: 0 } }}>
          {logo}
          {menu}
        </Drawer>
      )}
      <Layout>
        <Header style={{ background: '#fff', paddingInline: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {screens.lg ? <span /> : <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} />}
          <Space>
            <NotificationBell />
            <Typography.Text>{user.name}</Typography.Text>
            <Typography.Text type="secondary">{user.roles.map((r) => r.nameAr).join('، ')}</Typography.Text>
            <Button type="text" icon={<LogoutOutlined />} onClick={logout}>خروج</Button>
          </Space>
        </Header>
        <Content style={{ margin: screens.md ? 24 : 12 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
