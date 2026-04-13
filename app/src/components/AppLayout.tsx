import { useState } from 'react';
import { Layout, Menu, Button, theme } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  FolderOutlined,
  FileTextOutlined,
  TeamOutlined,
  ScanOutlined,
  DatabaseOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';

const { Sider, Header, Content } = Layout;

const NAV_ITEMS = [
  { key: '/portfolios', icon: <FolderOutlined />, label: 'Portfolios' },
  { key: '/exams', icon: <FileTextOutlined />, label: 'Examen' },
  { key: '/examinees', icon: <TeamOutlined />, label: 'Prüflinge' },
  { key: '/scans', icon: <ScanOutlined />, label: 'Scans' },
  { key: '/rawdata', icon: <DatabaseOutlined />, label: 'Rohdaten' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Einstellungen' },
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div style={{ padding: '16px', color: 'white', fontWeight: 'bold', fontSize: collapsed ? 14 : 18 }}>
          {collapsed ? 'FT' : 'Flowti'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={NAV_ITEMS}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={() => { logout(); navigate('/login'); }}
          >
            Abmelden
          </Button>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG, minHeight: 360 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
