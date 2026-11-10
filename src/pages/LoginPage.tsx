import { CheckCircleFilled, LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Grid, Input, Typography } from 'antd';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useThemeMode } from '../lib/themeMode';

const POINTS = [
  'توزيع طلبات التركيب والصيانة على الفنيين ومتابعتها لحظياً',
  'الفواتير والتحصيل وعهدة الفنيين في مكان واحد',
  'تذكير العملاء بمواعيد الصيانة وتغيير الشمعات تلقائياً',
];

export function LoginPage() {
  const { user, login } = useAuth();
  const screens = Grid.useBreakpoint();
  const { dark } = useThemeMode();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (v: { username: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      await login(v.username.trim(), v.password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100%', display: 'flex', background: 'var(--c-surface)' }}>
      {screens.lg && (
        <div style={{
          flex: '0 0 46%', padding: 56, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          background: 'radial-gradient(circle at 20% 110%, rgba(66,184,200,.45) 0%, transparent 55%), linear-gradient(160deg, #2E508F 0%, #16304F 100%)',
        }}>
          <img src="/logo-white.svg" alt="Spring" style={{ height: 52, alignSelf: 'flex-start' }} />
          <div>
            <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.4, margin: '0 0 12px' }}>لوحة إدارة Spring</h1>
            <p style={{ fontSize: 16, opacity: 0.8, margin: '0 0 28px' }}>مبيعات وتركيب وصيانة فلاتر المياه — من الطلب لحد التحصيل.</p>
            {POINTS.map((p) => (
              <div key={p} style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 12, fontSize: 15 }}>
                <CheckCircleFilled style={{ color: '#42B8C8' }} />{p}
              </div>
            ))}
          </div>
          <div style={{ opacity: 0.55, fontSize: 13 }}>© {new Date().getFullYear()} Spring</div>
        </div>
      )}
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 24, background: screens.lg ? 'var(--c-surface)' : 'var(--c-bg)' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {!screens.lg && <img src={dark ? '/logo-white.svg' : '/logo-color.svg'} alt="Spring" style={{ height: 44, marginBottom: 24 }} />}
          <Typography.Title level={2} style={{ marginBottom: 4, fontWeight: 800 }}>تسجيل الدخول</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 28 }}>أدخل بيانات حسابك للمتابعة</Typography.Paragraph>
          {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
          <Form layout="vertical" onFinish={submit} requiredMark={false} size="large">
            <Form.Item name="username" label="اسم المستخدم أو الموبايل" rules={[{ required: true, message: 'مطلوب' }]}>
              <Input prefix={<UserOutlined style={{ color: 'var(--c-subtle)' }} />} autoComplete="username" autoFocus />
            </Form.Item>
            <Form.Item name="password" label="كلمة المرور" rules={[{ required: true, message: 'مطلوب' }]}>
              <Input.Password prefix={<LockOutlined style={{ color: 'var(--c-subtle)' }} />} autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 46, marginTop: 8 }}>
              دخول
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}
