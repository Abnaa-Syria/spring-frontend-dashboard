import { Breadcrumb, Flex, Typography } from 'antd';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Crumb { title: string; to?: string }

/** Unified page title row: breadcrumbs, title, optional subtitle and actions. */
export function PageHeader({ title, subtitle, crumbs, actions }: {
  title: ReactNode;
  subtitle?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      {crumbs?.length ? (
        <Breadcrumb
          style={{ marginBottom: 6 }}
          items={crumbs.map((c) => ({ title: c.to ? <Link to={c.to}>{c.title}</Link> : c.title }))}
        />
      ) : null}
      <Flex justify="space-between" align="center" wrap gap={12}>
        <div style={{ minWidth: 0 }}>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 800 }}>{title}</Typography.Title>
          {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
        </div>
        {actions && <Flex gap={8} wrap>{actions}</Flex>}
      </Flex>
    </div>
  );
}
