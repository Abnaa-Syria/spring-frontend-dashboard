import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Skeleton, Statistic, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { SERVICE_STATUS, type ServiceStatus } from '../lib/labels';

interface Summary {
  requestsByStatus: Partial<Record<ServiceStatus, number>>;
  unassigned: number;
  emergencies: number;
  todayVisits: number;
  customers: number;
  technicians: number;
  dueMaintenanceNext7Days: number;
}

export function HomePage() {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get<Summary>('/dashboard/summary')).data,
    enabled: can('service.read'),
    refetchInterval: 60_000,
  });

  const tiles: { title: string; value?: number; to?: string; danger?: boolean }[] = [
    { title: 'طلبات تحتاج تعيين', value: data?.unassigned, to: '/scheduling', danger: !!data?.unassigned },
    { title: 'طوارئ مفتوحة', value: data?.emergencies, to: '/service-requests?priority=EMERGENCY', danger: !!data?.emergencies },
    { title: 'زيارات اليوم', value: data?.todayVisits, to: '/service-requests' },
    { title: 'صيانات مستحقة خلال 7 أيام', value: data?.dueMaintenanceNext7Days, to: '/reports' },
    { title: 'العملاء', value: data?.customers, to: '/customers' },
    { title: 'الفنيين النشطين', value: data?.technicians, to: '/technicians' },
  ];

  return (
    <>
      <Typography.Title level={3}>أهلاً، {user?.name}</Typography.Title>
      {!can('service.read') ? null : isLoading ? <Skeleton active /> : (
        <>
          <Row gutter={[16, 16]}>
            {tiles.map((t) => (
              <Col key={t.title} xs={24} sm={12} lg={8}>
                <Card hoverable={!!t.to} onClick={() => t.to && navigate(t.to)}>
                  <Statistic
                    title={t.title}
                    value={t.value ?? 0}
                    styles={{ content: { color: t.danger ? '#cf1322' : undefined } }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
          <Card title="الطلبات حسب الحالة" style={{ marginTop: 16 }}>
            <Row gutter={[16, 16]}>
              {(Object.keys(SERVICE_STATUS) as ServiceStatus[]).map((s) => (
                <Col key={s} xs={12} sm={8} lg={6} xl={3}>
                  <Statistic title={SERVICE_STATUS[s].label} value={data?.requestsByStatus[s] ?? 0} />
                </Col>
              ))}
            </Row>
          </Card>
        </>
      )}
    </>
  );
}
