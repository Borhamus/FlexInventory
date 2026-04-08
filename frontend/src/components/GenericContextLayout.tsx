import React from 'react';
import { Layout, Button, Typography, Spin } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Sider, Content } = Layout;
const { Text } = Typography;

interface GenericContextLayoutProps {
  title: string;
  items: any[] | undefined;
  isLoading: boolean;
  basePath: string; // Ej: '/dashboard/inventario' o '/dashboard/catalogos'
  onAddClick?: () => void;
}

const GenericContextLayout: React.FC<GenericContextLayoutProps> = ({
  title, items, isLoading, basePath, onAddClick
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout style={{ height: '100%' }}>
      <Sider width={250} theme="light" style={{ borderRight: '1px solid #f0f0f0', background: '#fff' }}>
        <div style={{ padding: '20px' }}>
          <Text strong type="secondary">{title}</Text>
        </div>
        {isLoading ? (
          <div style={{ textAlign: 'center', marginTop: 20 }}><Spin /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: "75vh", overflowY: "scroll" }}>
              {items?.map(item => (
                <Button
                  key={item.id}
                  type="text"
                  block
                  className="context-menu-item"
                  style={{
                    textAlign: 'left', borderRadius: 0, height: 45, paddingLeft: 24,
                    backgroundColor: location.pathname === `${basePath}/${item.id}` ? '#f0f5ff' : 'transparent',
                    color: location.pathname === `${basePath}/${item.id}` ? '#1677ff' : 'rgba(0,0,0,0.85)'
                  }}
                  onClick={() => navigate(`${basePath}/${item.id}`)}
                >
                  {item.nombre}
                </Button>
              ))}
            </div>
            <div style={{ padding: '20px 16px' }}>
              <Button type="dashed" block onClick={onAddClick}>
                + Crear Nuevo
              </Button>
            </div>
          </div>
        )}
      </Sider>

      <Content style={{ height: 'calc(100vh)', overflow: 'hidden' }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default GenericContextLayout;