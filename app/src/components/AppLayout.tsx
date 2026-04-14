import { Layout, Menu, Dropdown, Avatar, theme } from 'antd';
import type { MenuProps } from 'antd';
import {
  SunOutlined,
  MoonOutlined,
  LogoutOutlined,
  FolderOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useConfigStore } from '../stores/configStore';

const { Header, Content } = Layout;

const NAV_ITEMS: MenuProps['items'] = [
  { key: '/portfolios', icon: <FolderOutlined />, label: 'Portfolios' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Einstellungen' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const isDarkMode = useConfigStore((s) => s.isDarkMode);
  const toggleDarkMode = useConfigStore((s) => s.toggleDarkMode);
  const { token } = theme.useToken();

  const dropdownItems: MenuProps['items'] = [
    {
      key: 'theme',
      icon: isDarkMode ? <SunOutlined /> : <MoonOutlined />,
      label: isDarkMode ? 'Helles Theme' : 'Dunkles Theme',
      onClick: toggleDarkMode,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Abmelden',
      danger: true,
      onClick: () => { logout(); navigate('/login'); },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 52,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 28, flexShrink: 0 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-0.5px',
            }}
          >
            FT
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: token.colorText }}>flow</span>
        </div>

        {/* Navigation */}
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={NAV_ITEMS}
          onClick={({ key }) => navigate(key)}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            minWidth: 0,
            lineHeight: '50px',
          }}
        />

        {/* Avatar Dropdown */}
        <Dropdown menu={{ items: dropdownItems }} trigger={['click']} placement="bottomRight">
          <Avatar
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              cursor: 'pointer',
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            CM
          </Avatar>
        </Dropdown>
      </Header>

      <Content
        style={{
          margin: 24,
          padding: 24,
          background: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          minHeight: 360,
        }}
      >
        <Outlet />
      </Content>
    </Layout>
  );
}
