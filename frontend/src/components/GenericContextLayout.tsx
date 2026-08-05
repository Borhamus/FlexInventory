import React, { useState } from 'react';
import { Layout, Button, Typography, Spin, theme, Input } from 'antd';
import { RightOutlined, LeftOutlined, SearchOutlined } from '@ant-design/icons';
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
  collapsible?: boolean;
}

const GenericContextLayout: React.FC<GenericContextLayoutProps> = ({
  title, items, isLoading, basePath, onAddClick, canAdd = true, collapsible = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isActive = (id: number) => location.pathname === `${basePath}/${id}`;
  const sortedItems = items ? [...items].sort((a, b) => a.id - b.id) : [];

  const [menuSearch, setMenuSearch] = useState('');

  const filteredItems = sortedItems.filter(item => 
    item.nombre.toLowerCase().includes(menuSearch.toLowerCase())
  );

  return (
    <Layout style={{ height: '100%' }}>
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexShrink: 0 }}>
        <Sider
          width={200}
          collapsible={collapsible}
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          collapsedWidth={0}
          trigger={null}
          style={{
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorBgContainer,
            height: '100%'
          }}
        >
          {/* TITULO */}
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Text strong type="secondary">{title}</Text>
          </div>

          {/* BARRA DE BUSQUEDA */}
          <div style={{ padding: '0 16px 12px 16px' }}>
            <Input
              placeholder="Buscar..."
              prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              allowClear
            />
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', marginTop: 20 }}><Spin /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '75vh', overflowY: 'auto', overflowX: 'hidden' }}>
                {filteredItems.map(item => (
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
                  <Button block onClick={onAddClick}>
                    + Crear Nuevo
                  </Button>
                )}
              </div>
            </div>
          )}
        </Sider>

        {/* MANIJA ocultar/mostrar lista — solo cuando es colapsable */}
        {collapsible && (
          <div
            onClick={() => setCollapsed(!collapsed)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              right: -9,
              width: 18,
              height: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              color: hovered ? token.colorText : token.colorTextSecondary,
              background: hovered ? token.colorFillSecondary : token.colorBgElevated,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderLeft: 'none',
              borderRadius: '0 6px 6px 0',
              cursor: 'pointer',
              zIndex: 1,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {collapsed ? <RightOutlined /> : <LeftOutlined />}
          </div>
        )}
      </div>

      <Content style={{ height: 'calc(100vh)', overflow: 'hidden' }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default GenericContextLayout;
