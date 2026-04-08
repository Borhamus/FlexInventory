import { Card, Row, Col, Statistic, Empty } from 'antd';
import { BoxPlotOutlined, PartitionOutlined, BuildOutlined } from '@ant-design/icons';
import { useCatalogos } from '../hooks/useCatalogos';

export const CatalogoDashboard = () => {
  const { data: catalogos, isLoading } = useCatalogos();

  if (isLoading) return null;

  const totalInventarios = catalogos?.length || 0;

  return (
    <div style={{ padding: '40px', display:"flex", flexDirection:"column", width: "100%", height: "100%" }}>
      <h2 style={{ marginBottom: '24px' }}>Resumen General de Catalogos</h2>
      
      <Row gutter={16} style={{ flex: "1" }}>
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
              title="Placeholder"
              value="Activo"
              prefix={<PartitionOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Placeholder"
              value="Benjamin Dev"
              prefix={<BuildOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ textAlign: 'center', color: '#8c8c8c', flex: "9", alignContent:"center"}}>
        <Empty 
          description="Seleccioná un inventario de la lista lateral para gestionar sus artículos o crear uno nuevo." 
        />
      </div>
    </div>
  );
};
export default CatalogoDashboard;