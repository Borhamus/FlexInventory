import React from 'react';
import { Layout, Button, Typography } from 'antd';
import {
  LogoutOutlined,
  DashboardOutlined,
  TeamOutlined,
  DatabaseOutlined, // Para Inventarios
  AppstoreOutlined, // Para Catálogos
  SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

const { Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthContext();

  const navItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Inicio' },
    { key: '/dashboard/inventario', icon: <DatabaseOutlined />, label: 'Inventarios' },
    { key: '/dashboard/catalogos', icon: <AppstoreOutlined />, label: 'Catálogos' },
    { key: '/dashboard/usuarios', icon: <TeamOutlined />, label: 'Usuarios' },
    { key: '/dashboard/config', icon: <SettingOutlined />, label: 'Ajustes' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={110}
        theme="dark"
        style={{
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          backgroundColor: '#001529',
          borderRight: '1px solid #002140',
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          paddingTop: 20,
          paddingBottom: 20
        }}>

          <div style={{ flex: 1 }}>
            {navItems.map((item) => {
              const isActive = item.key === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(item.key);

              return (
                <div
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  className={`nav-item-rail ${isActive ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '16px 0',
                    cursor: 'pointer',
                    backgroundColor: isActive ? '#1677ff' : 'transparent',
                    color: 'white',
                    marginBottom: 4,
                    borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{item.icon}</span>
                  <Text style={{ color: 'white', fontSize: '10px', marginTop: 4, textTransform: 'uppercase' }}>
                    {item.label}
                  </Text>
                </div>
              );
            })}
          </div>
          <div className="logout-btn-rail" style={{ textAlign: 'center' }}>
            <Button
              type="text"
              icon={<LogoutOutlined style={{ color: 'rgba(255,255,255,0.7)', fontSize: '24px' }} />}
              onClick={logout}
              style={{ height: 'auto', padding: '10px' }}
            />
            <div style={{ marginTop: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>SALIR</Text>
            </div>
          </div>

        </div>
      </Sider>
      <Layout>
        <Content style={{ minHeight: '100vh', display: 'flex' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;