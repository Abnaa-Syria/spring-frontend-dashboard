import { BellOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Empty, Flex, Popover, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Page } from '../lib/api';
import { fmtDateTime } from '../lib/format';

interface Notification {
  id: number;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  data: { serviceRequestId?: number; orderId?: number; leadId?: number; technicianId?: number; handoverId?: number } | null;
}

/** Dashboard page for what a notification is about (null when there's nothing to open). */
function linkFor(n: Notification): string | null {
  const d = n.data ?? {};
  if (d.serviceRequestId) return `/service-requests/${d.serviceRequestId}`;
  if (d.orderId) return `/orders/${d.orderId}`;
  if (d.leadId) return `/leads/${d.leadId}`;
  if (d.handoverId && d.technicianId) return `/invoices/cash/${d.technicianId}`;
  return null;
}

export function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<Page<Notification> & { unread: number }>('/notifications', { params: { pageSize: 15 } })).data,
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const readAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: refresh });
  const readOne = useMutation({ mutationFn: (id: number) => api.post(`/notifications/${id}/read`), onSuccess: refresh });

  const openItem = (n: Notification) => {
    if (!n.readAt) readOne.mutate(n.id);
    const to = linkFor(n);
    if (to) {
      setOpen(false);
      navigate(to);
    }
  };

  const content = (
    <div style={{ width: 340, maxHeight: 440, overflow: 'auto' }}>
      {!data?.items.length ? <Empty description="لا توجد إشعارات" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
        <Flex vertical gap={4}>
          {data.items.map((n) => (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => openItem(n)}
              onKeyDown={(e) => { if (e.key === 'Enter') openItem(n); }}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                background: n.readAt ? 'transparent' : 'var(--c-unread)',
                opacity: n.readAt ? 0.7 : 1,
              }}
            >
              <Typography.Text strong>{n.title}</Typography.Text>
              <div>{n.body}</div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{fmtDateTime(n.createdAt)}</Typography.Text>
            </div>
          ))}
        </Flex>
      )}
    </div>
  );

  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      open={open}
      onOpenChange={(v) => { setOpen(v); if (v) refresh(); }}
      title={
        <Flex justify="space-between" align="center">
          الإشعارات
          {!!data?.unread && <Button size="small" type="link" onClick={() => readAll.mutate()}>تعليم الكل كمقروء</Button>}
        </Flex>
      }
      content={content}
    >
      <Badge count={data?.unread} size="small" offset={[-6, 6]}>
        <Button type="text" className="header-icon-btn" icon={<BellOutlined />} aria-label="الإشعارات" />
      </Badge>
    </Popover>
  );
}
