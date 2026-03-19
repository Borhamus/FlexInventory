import { Layout, Button, Typography } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useInventories } from '../hooks/useInventory';

const { Sider, Content } = Layout;
const { Text } = Typography;

const InventoryLayout = () => {
  const { data: inventories } = useInventories();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout>
      <Sider width={250} theme="light" style={{ borderRight: '1px solid #f0f0f0', background: '#fff' }}>
        <div style={{ padding: '20px' }}>
          <Text strong type="secondary">MIS INVENTARIOS</Text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {inventories?.map(inv => (
            <Button
              key={inv.id}
              type="text"
              block
              className="context-menu-item"
              style={{
                textAlign: 'left', borderRadius: 0, height: 45, paddingLeft: 24,
                backgroundColor: location.pathname.includes(`/inventario/${inv.id}`) ? '#f0f5ff' : 'transparent',
                color: location.pathname.includes(`/inventario/${inv.id}`) ? '#1677ff' : 'rgba(0,0,0,0.85)'
              }}
              onClick={() => navigate(`/dashboard/inventario/${inv.id}`)}
            >
              {inv.nombre}
            </Button>
          ))}
        </div>
      </Sider>
      <Content style={{ padding: '24px' }}>
        <Outlet /> {/* Aquí se renderizará la InventoryPage (la tabla) */}
      </Content>
    </Layout>
  );
};

export default InventoryLayout;