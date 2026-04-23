import React from 'react';
import { Layout, Button, Typography, Spin, Switch } from 'antd';
import {
  LogoutOutlined,
  DashboardOutlined,
  TeamOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  SettingOutlined,
  BulbOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext'; 

const { Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, hasPermission, isTenant, loadingPermissions } = useAuthContext();
  const { isDark, toggleTheme, primaryColor } = useTheme();

  const allNavItems = [
    {
      key:     '/dashboard',
      icon:    <DashboardOutlined />,
      label:   'Inicio',
      visible: true,
    },
    {
      key:     '/dashboard/inventario',
      icon:    <DatabaseOutlined />,
      label:   'Inventarios',
      visible: isTenant || hasPermission('inventarios', 'read'),
    },
    {
      key:     '/dashboard/catalogos',
      icon:    <AppstoreOutlined />,
      label:   'Catálogos',
      visible: isTenant || hasPermission('catalogos', 'read'),
    },
    {
      key:     '/dashboard/usuarios',
      icon:    <TeamOutlined />,
      label:   'Usuarios',
      visible: isTenant || hasPermission('empleados', 'read'),
    },
    {
      key:     '/dashboard/config',
      icon:    <SettingOutlined />,
      label:   'Ajustes',
      visible: true,
    },
  ];

  const navItems = allNavItems.filter((item) => item.visible);

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
          backgroundColor: `color-mix(in srgb, ${primaryColor}, black 50%)`,
          borderRight: 'none',
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          paddingTop: 20,
          paddingBottom: 20,
        }}>

          {/* Nav items — spinner mientras cargan los permisos */}
          <div style={{ flex: 1 }}>
            {loadingPermissions ? (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
                <Spin size="small" />
              </div>
            ) : (
              navItems.map((item) => {
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
                      backgroundColor: isActive ? `${primaryColor} !important` : 'transparent',
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
              })
            )}
          </div>

          {/* --- MODO OSCURO --- */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <Switch
              checked={isDark}
              onChange={toggleTheme}
              checkedChildren={<BulbOutlined />}
              unCheckedChildren={<BulbOutlined />}
              size="small" // Le ponemos tamaño small para que no desentone en la barra finita
            />
          </div>

          {/* Salir — siempre visible */}
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