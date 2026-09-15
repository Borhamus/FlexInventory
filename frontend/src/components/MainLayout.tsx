import React from 'react';
import { Layout, Typography, Spin, Switch, Badge } from 'antd';
import {
  LogoutOutlined,
  DashboardOutlined,
  TeamOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  SettingOutlined,
  BulbOutlined,
  CloudServerOutlined,
  EyeOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotificacionesNoLeidasCount } from '../hooks/useNotificaciones';

const { Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, hasPermission, isTenant, loadingPermissions } = useAuthContext();
  const { isDark, toggleTheme, primaryColor } = useTheme();

  const puedeVerNotificaciones = isTenant || hasPermission('notificaciones', 'read');
  const { data: notificacionesSinLeer = 0 } = useNotificacionesNoLeidasCount(puedeVerNotificaciones);

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
    // ── Solo visible para el tenant owner ───────────────────────────────
    {
      key:     '/dashboard/database',
      icon:    <CloudServerOutlined />,
      label:   'Recuperación',   
      visible: isTenant,
    },
    {
      key:     '/dashboard/historial',
      icon:    <EyeOutlined />,
      label:   'Historial',
      visible: isTenant,
    },
    // ───────────────────────────────────────────────────────────────────
    {
      key:     '/dashboard/notificaciones',
      icon:    <BellOutlined />,
      label:   'Avisos',
      visible: puedeVerNotificaciones,
      badge:   notificacionesSinLeer,
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
    // height:'100%' (no minHeight:'100vh'): html/body/#root ya están fijados
    // en height:100% en index.css de forma confiable. 100vh puede no
    // coincidir con el alto real disponible (pasa en navegadores de celular
    // con la barra de direcciones, y en algunos entornos de testing) —
    // usar % en toda la cadena evita ese desfasaje en vez de solo tapar el
    // síntoma con overflow:hidden en el body.
    <Layout style={{ height: '100%' }}>
      <Sider
        width={110}
        theme="dark"
        style={{
          height: '100%',
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
          // El alto de la rail es fijo (100%), así que el padding y los ítems
          // se miden en vh: en notebooks bajas se comprimen y en monitores
          // grandes llegan al tope de siempre. El clamp() evita que se hagan
          // ilegibles cuando la pantalla es muy chica.
          paddingTop: 'clamp(8px, 2vh, 20px)',
          paddingBottom: 'clamp(8px, 2vh, 20px)',
        }}>

          {/* Nav items — spinner mientras cargan los permisos.
              minHeight:0 es necesario para que un hijo flex pueda encogerse por
              debajo de su contenido y recién ahí el overflow scrollee; sin eso
              el flex:1 crece y desborda la rail. El scroll es el último
              recurso: con muchos ítems visibles (tenant) y una pantalla muy
              baja, el clamp() solo no alcanza. */}
          <div className="nav-rail-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
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
                      padding: 'clamp(6px, 1.6vh, 16px) 0',
                      cursor: 'pointer',
                      backgroundColor: isActive ? `${primaryColor} !important` : 'transparent',
                      color: 'white',
                      marginBottom: 'clamp(2px, 0.4vh, 4px)',
                      borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                    }}
                  >
                    <span style={{ fontSize: 'clamp(18px, 2.4vh, 24px)', lineHeight: 1 }}>
                      {'badge' in item && item.badge ? (
                        <Badge count={item.badge} size="small" offset={[2, 0]}>
                          <span style={{ color: 'white' }}>{item.icon}</span>
                        </Badge>
                      ) : item.icon}
                    </span>
                    <Text style={{ color: 'white', fontSize: 'clamp(9px, 1.2vh, 10px)', marginTop: 'clamp(2px, 0.5vh, 4px)', textTransform: 'uppercase', lineHeight: 1.2 }}>
                      {item.label}
                    </Text>
                  </div>
                );
              })
            )}
          </div>

          {/* --- MODO OSCURO --- */}
          <div style={{ textAlign: 'center', marginBottom: 'clamp(8px, 2vh, 20px)', marginTop: 'clamp(8px, 1.5vh, 16px)', flexShrink: 0 }}>
            <Switch
              checked={isDark}
              onChange={toggleTheme}
              checkedChildren={<BulbOutlined />}
              unCheckedChildren={<BulbOutlined />}
              size="small" // Le ponemos tamaño small para que no desentone en la barra finita
            />
          </div>

          {/* Salir — siempre visible. Todo el contenedor es clickeable (icono +
              texto) y tiene un único hover (.logout-btn-rail); se sacó el
              <Button> interno para no tener un segundo hover encima. */}
          <div
            className="logout-btn-rail"
            onClick={() => { logout(); navigate('/login'); }}
            style={{ textAlign: 'center', cursor: 'pointer', padding: 'clamp(4px, 1.2vh, 10px)', flexShrink: 0 }}
          >
            <LogoutOutlined style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(18px, 2.4vh, 24px)' }} />
            <div style={{ marginTop: 'clamp(2px, 0.5vh, 4px)' }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(9px, 1.2vh, 10px)' }}>SALIR</Text>
            </div>
          </div>

        </div>
      </Sider>

      <Layout style={{ height: '100%' }}>
        <Content style={{ height: '100%', overflow: 'hidden', display: 'flex' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;