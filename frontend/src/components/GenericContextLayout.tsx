import React from 'react';
import { Layout, Button, Typography, Spin, theme } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Sider, Content } = Layout;
const { Text } = Typography;

interface GenericContextLayoutProps {
  title: string;
  items: any[] | undefined;
  isLoading: boolean;
  basePath: string;
  onAddClick?: () => void;
  canAdd?:   boolean;
}

const GenericContextLayout: React.FC<GenericContextLayoutProps> = ({
  title, items, isLoading, basePath, onAddClick, canAdd = true  // ← default true
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const isActive = (id: number) => location.pathname === `${basePath}/${id}`;

  return (
    <Layout style={{ height: '100%' }}>
      <Sider
        width={250}
        theme="light"
        style={{
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
        }}
      >
        <div style={{ padding: '20px' }}>
          <Text strong type="secondary">{title}</Text>
        </div>
        {isLoading ? (
          <div style={{ textAlign: 'center', marginTop: 20 }}><Spin /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '75vh', overflowY: 'scroll' }}>
              {items?.map(item => (
                <Button
                  key={item.id}
                  type="text"
                  block
                  className="context-menu-item"
                  style={{
                    textAlign: 'left',
                    borderRadius: 0,
                    height: 45,
                    paddingLeft: 24,
                    backgroundColor: isActive(item.id) ? token.colorPrimaryBg : 'transparent',
                    color: isActive(item.id) ? token.colorPrimary : token.colorText,
                  }}
                  onClick={() => navigate(`${basePath}/${item.id}`)}
                >
                  {item.nombre}
                </Button>
              ))}
            </div>
            <div style={{ padding: '20px 16px' }}>
              {canAdd && (
                <Button type="dashed" block onClick={onAddClick}>
                  + Crear Nuevo
                </Button>
              )}
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