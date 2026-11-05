import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const { user, login } = useAuth();
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
    <div style={{
      minHeight: '100%', display: 'grid', placeItems: 'center', padding: 16,
      background: 'linear-gradient(160deg, #4FB3C8 0%, #34508F 100%)',
    }}>
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <Typography.Title level={2} style={{ color: '#34508F', marginBottom: 4 }}>Spring</Typography.Title>
        <Typography.Paragraph type="secondary">تسجيل الدخول إلى لوحة التحكم</Typography.Paragraph>
        {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={submit} requiredMark={false}>
          <Form.Item name="username" label="اسم المستخدم" rules={[{ required: true, message: 'مطلوب' }]}>
            <Input prefix={<UserOutlined />} autoComplete="username" size="large" />
          </Form.Item>
          <Form.Item name="password" label="كلمة المرور" rules={[{ required: true, message: 'مطلوب' }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            دخول
          </Button>
        </Form>
      </Card>
    </div>
  );
}
