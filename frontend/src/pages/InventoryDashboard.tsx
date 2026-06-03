import { Card, Row, Col, Statistic, Empty } from 'antd';
import { BoxPlotOutlined, PartitionOutlined, BuildOutlined } from '@ant-design/icons';
import { useInventories } from '../hooks/useInventory';

export const InventoryDashboard = () => {
  const { data: inventories, isLoading } = useInventories();

  if (isLoading) return null;

  const totalInventarios = inventories?.length || 0;

  return (
    <div style={{ padding: '40px' }}>
      <h2 style={{ marginBottom: '24px' }}>Resumen General de Inventarios</h2>
      
      <Row gutter={16}>
        <Col span={8}>
          <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Total de Depósitos"
              value={totalInventarios}
              prefix={<BoxPlotOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Estado del Sistema"
              value="Activo"
              prefix={<PartitionOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tenant"
              value="Benjamin Dev"
              prefix={<BuildOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: '40px', textAlign: 'center', color: '#8c8c8c' }}>
        <Empty 
          description="Seleccioná un inventario de la lista lateral para gestionar sus artículos o crear uno nuevo." 
        />
      </div>
    </div>
  );
};
export default InventoryDashboard;