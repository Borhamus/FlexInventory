import React, { useState } from 'react';
import { Layout, Button, Typography, Spin, theme } from 'antd';
import { RightOutlined, LeftOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Sider, Content } = Layout;
const { Text } = Typography;

interface GenericContextLayoutProps {
  title: string;
  items: any[] | undefined;
  isLoading: boolean;
  basePath: string;
  onAddClick?: () => void;
  canAdd?: boolean;
}

const GenericContextLayout: React.FC<GenericContextLayoutProps> = ({
  title, items, isLoading, basePath, onAddClick, canAdd = true  // ← default true
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const [collapsed, setCollapsed] = useState(false);
  const isActive = (id: number) => location.pathname === `${basePath}/${id}`;
  const sortedItems = items ? [...items].sort((a, b) => a.id - b.id) : [];

  return (
    <Layout style={{ height: '100%' }}>
      <Sider
        width={200}
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        collapsedWidth={0}
        trigger={collapsed ? <RightOutlined /> : <LeftOutlined />}
        zeroWidthTriggerStyle={{
          top: 300,                     
          transform: 'translateY(-50%)',  
          right: -15, 
          height: '50px',                 
          width: '15px',                  
          background: token.colorPrimary, 
          borderRadius: '0 8px 8px 0',    
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)' 
        }}
        style={{
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
          height: '100vh'
        }}
      >
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Text strong type="secondary">{title}</Text>
        </div>
        {isLoading ? (
          <div style={{ textAlign: 'center', marginTop: 20 }}><Spin /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '75vh', overflowY: 'auto', overflowX: 'hidden' }}>
              {sortedItems.map(item => (
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
                  <Text
                    style={{
                      color: 'inherit', 
                      width: '100%',    
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    ellipsis={{
                      tooltip: { title: item.nombre, placement: 'bottom' }
                    }}
                  >

                    {item.nombre}
                  </Text>
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