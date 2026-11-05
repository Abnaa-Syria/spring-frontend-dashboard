import {
  DownOutlined, KeyOutlined, LogoutOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined, UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Drawer, Dropdown, Flex, Grid, Layout, Menu, Spin, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Suspense, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { GlobalSearch } from '../components/GlobalSearch';
import { NotificationBell } from '../components/NotificationBell';
import { useAuth } from '../lib/auth';
import { NAV_GROUPS, navFor } from '../navigation';

const { Sider, Header, Content } = Layout;
const COLLAPSE_KEY = 'spring.sider.collapsed';

const readCollapsed = () => {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
};

export function AdminLayout() {
  const { user, loading, logout, can } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const screens = Grid.useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* storage unavailable */ }
  }, [collapsed]);

  const current = navFor(pathname);
  useEffect(() => {
    document.title = current ? `${current.label} · Spring` : 'Spring — لوحة التحكم';
  }, [current]);

  if (loading) return <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}><Spin size="large" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const isDesktop = !!screens.lg;
  const narrow = isDesktop && collapsed;
  const groups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((n) => !n.permission || can(n.permission)) }))
    .filter((g) => g.items.length);

  const menuItems: MenuProps['items'] = groups.flatMap((g): NonNullable<MenuProps['items']> => {
    const items = g.items.map((n) => ({ key: n.path, icon: n.icon, label: n.label }));
    if (!g.title) return items;
    return narrow ? [{ type: 'divider' as const }, ...items] : [{ type: 'group' as const, key: g.title, label: g.title, children: items }];
  });

  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      inlineCollapsed={narrow}
      selectedKeys={current ? [current.path] : []}
      items={menuItems}
      onClick={({ key }) => { navigate(key); setDrawerOpen(false); }}
      style={{ borderInlineEnd: 'none', paddingBlock: 4 }}
    />
  );

  const brand = (
    <div className="sider-logo" style={narrow ? { justifyContent: 'center', paddingInline: 0 } : undefined}>
      <img src={narrow ? '/logo-mark-white.svg' : '/logo-white.svg'} alt="Spring" style={narrow ? { height: 30 } : undefined} />
    </div>
  );

  const sideContent = (
    <Flex vertical style={{ height: '100%' }}>
      {brand}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>{menu}</div>
      {!narrow && <div className="sider-footer">Spring · لوحة الإدارة</div>}
    </Flex>
  );

  const roleNames = user.roles.map((r) => r.nameAr).join('، ');
  const userMenu: MenuProps = {
    items: [
      { key: 'who', disabled: true, label: <div><div style={{ fontWeight: 700, color: '#1F2A37' }}>{user.name}</div><div style={{ fontSize: 12 }}>{roleNames}</div></div> },
      { type: 'divider' },
      { key: 'account', icon: <KeyOutlined />, label: 'حسابي وكلمة المرور' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'تسجيل الخروج', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'account') navigate('/settings?tab=account');
      if (key === 'logout') void logout();
    },
  };

  return (
    <Layout style={{ minHeight: '100%' }}>
      {isDesktop ? (
        <Sider
          className="sider"
          width={252}
          collapsedWidth={76}
          collapsed={narrow}
          trigger={null}
          style={{
            position: 'sticky', top: 0, height: '100vh',
            background: 'linear-gradient(180deg, #1D3D66 0%, #16304F 100%)',
          }}
        >
          {sideContent}
        </Sider>
      ) : (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="right"
          size={268}
          closable={false}
          styles={{ body: { padding: 0, background: 'linear-gradient(180deg, #1D3D66 0%, #16304F 100%)' } }}
          className="sider"
        >
          {sideContent}
        </Drawer>
      )}
      <Layout>
        <Header
          style={{
            position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: '1px solid #E6ECF3', paddingInline: screens.md ? 24 : 12,
          }}
        >
          <Button
            type="text"
            aria-label={isDesktop ? (collapsed ? 'توسيع القائمة' : 'طي القائمة') : 'فتح القائمة'}
            icon={!isDesktop ? <MenuOutlined /> : collapsed ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            onClick={() => (isDesktop ? setCollapsed((c) => !c) : setDrawerOpen(true))}
          />
          <div style={{ flex: 1, maxWidth: 460 }}>
            <GlobalSearch />
          </div>
          <Flex align="center" gap={8} style={{ marginInlineStart: 'auto' }}>
            <NotificationBell />
            <Dropdown menu={userMenu} trigger={['click']} placement="bottomLeft">
              <Button type="text" style={{ height: 44, paddingInline: 8 }} aria-label="قائمة المستخدم">
                <Flex align="center" gap={10}>
                  <Avatar style={{ background: '#E8EFFA', color: '#2E508F', fontWeight: 700 }} icon={<UserOutlined />} />
                  {screens.md && (
                    <div style={{ textAlign: 'start', lineHeight: 1.3 }}>
                      <div style={{ fontWeight: 700 }}>{user.name}</div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{roleNames}</Typography.Text>
                    </div>
                  )}
                  <DownOutlined style={{ fontSize: 10, color: '#8A99AD' }} />
                </Flex>
              </Button>
            </Dropdown>
          </Flex>
        </Header>
        <Content style={{ padding: screens.md ? 24 : 12 }}>
          <div className="page">
            <Suspense fallback={<div style={{ padding: 80, textAlign: 'center' }}><Spin /></div>}>
              <Outlet />
            </Suspense>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
