import React, { useState } from 'react';
import { Layout, Menu, Button, theme } from 'antd';
import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useInventories } from '../hooks/useInventory';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthContext();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const { data: inventories } = useInventories();

  const inventarioItems = (inventories ?? []).map(inv => ({
    key: `/dashboard/inventario/${inv.id}`,
    label: inv.nombre,
  }));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'white', fontWeight: 'bold' }}>{collapsed ? 'FI' : 'FlexInventory'}</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1 }}
          items={[
            { key: '/dashboard', icon: <DashboardOutlined />, label: 'Inicio' },
            { key: '/dashboard/usuarios', icon: <TeamOutlined />, label: 'Personal' },
            ...inventarioItems,
          ]}
        />
        <div style={{ padding: 16 }}>
          <Button
            type="primary"
            block
            onClick={() => navigate('/dashboard/inventario/nuevo')}
          >
            {collapsed ? '+' : 'Crear inventario'}
          </Button>
        </div>
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <Button 
            type="link" 
            danger 
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
          >
            Cerrar Sesión
          </Button>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'initial'
          }}
        >
          {/* Aquí es donde React Router inyectará las páginas hijas */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;