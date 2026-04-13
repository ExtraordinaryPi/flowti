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

  const onFinish = (values: LoginForm) => {
    // Platzhalter: Token wird als Base64 gesetzt — später durch echten OAuth2 Flow ersetzen
    const dummyToken = btoa(`${values.username}:${values.password}`);
    login(values.serverUrl, dummyToken);
    notification.success({ message: 'Angemeldet' });
    navigate('/portfolios');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>Flowti</Title>
        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item label="Server-URL" name="serverUrl" rules={[{ required: true, message: 'Bitte Server-URL eingeben' }]}>
            <Input placeholder="https://example.com/" />
          </Form.Item>
          <Form.Item label="Benutzername" name="username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Passwort" name="password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Anmelden
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
