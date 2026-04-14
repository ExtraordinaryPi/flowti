import { useState } from 'react';
import { Form, Input, Button, Card, Typography, App as AntApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const { Title } = Typography;

interface LoginForm {
  serverUrl: string;
  username: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { notification } = AntApp.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const base = values.serverUrl ? values.serverUrl.replace(/\/$/, '') : '';
      const body = new URLSearchParams({ username: values.username, password: values.password });

      const res = await fetch(`${base}/perform_login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        credentials: 'include',
        redirect: 'manual', // Redirect = Erfolg bei Form-Login
      });

      // Spring Security leitet bei Erfolg weiter (302) oder gibt 200 zurück
      if (res.ok || res.status === 302 || res.type === 'opaqueredirect') {
        // Session-Cookie wurde vom Browser gespeichert
        login(values.serverUrl, ''); // kein Bearer-Token nötig — Session-Cookie übernimmt Auth
        notification.success({ message: 'Angemeldet' });
        navigate('/portfolios');
      } else {
        notification.error({ message: `Anmeldung fehlgeschlagen (${res.status})` });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Verbindungsfehler';
      notification.error({ message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>flow</Title>
        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item
            label="Server-URL"
            name="serverUrl"
            help="Leer lassen wenn Vite-Proxy genutzt wird"
          >
            <Input placeholder="https://example.com/ (optional)" />
          </Form.Item>
          <Form.Item label="Benutzername" name="username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Passwort" name="password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Anmelden
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
