import React, { useState } from 'react';
import { useCatalogo } from '../hooks/useCatalogos';
import { useParams } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Tag,
  Typography,
  Spin,
  Alert,
  Button,
  Space,
  Divider,
  Empty,
  Tooltip,
  Badge,
  Descriptions,
  theme, // Importamos el motor de temas
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  CloseOutlined,
  InboxOutlined,
  DatabaseOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { Statistic } from 'antd'; // Asegurate de añadir Statistic a los imports de 'antd'
import { AddItemModal } from '../components/AddItemModal';

const { Title, Text, Paragraph } = Typography;

const CatalogosPage: React.FC = () => {
  const { id } = useParams();
  const { token } = theme.useToken(); // Extraemos los tokens activos
  const { data, isLoading, error } = useCatalogo(Number(id));
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error) return <Alert message="Error" description="No se pudo cargar el catálogo" type="error" showIcon />;
  const currentItemIds = data?.items.map((i: any) => i.id) || [];
  const selectedItem = data?.items.find((i: any) => i.id === selectedItemId);
  const hasItems = data?.items && data.items.length > 0;

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      backgroundColor: token.colorBgLayout // Usamos el color de fondo del layout del tema
    }}>

      {/* HEADER COMPACTO */}
      <Card style={{
        marginBottom: 24,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowTertiary,
        backgroundColor: token.colorBgContainer
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="large" align="center">
            {/* Información del Catálogo */}
            <div>
              <Title level={3} style={{ margin: 0 }}>{data?.nombre}</Title>
              <Text type="secondary">{data?.descripcion}</Text>
            </div>

            <Divider type="vertical" style={{ height: 40, margin: '0 24px' }} />

            {/* Estadística Pasiva (No es un botón) */}
            <Statistic
              title="Total Artículos"
              value={data?.total_items}
              prefix={<InboxOutlined style={{ color: token.colorPrimary }} />}
              valueStyle={{ fontSize: '20px', fontWeight: 'bold' }}
            />
          </Space>

          {/* Acciones Globales */}
          <Space>
            <Button icon={<ArrowRightOutlined />}>Migrar Ítems</Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)} // ABRIR MODAL
            >
              Nuevo Artículo
            </Button>
          </Space>
        </div>
      </Card>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* GRILLA DE ITEMS */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 12 }}>
          {hasItems ? (
            <Row gutter={[16, 16]}>
              {data?.items.map((item: any) => {
                const isFromInventory = item.inventario_id !== null;
                const attributes = Object.entries(item.atributos || {}).slice(0, 2);
                const isSelected = selectedItemId === item.id;

                return (
                  <Col xs={24} sm={12} md={selectedItem ? 12 : 8} lg={selectedItem ? 12 : 6} xl={selectedItem ? 8 : 4} key={item.id}>
                    <Card
                      hoverable
                      size="small"
                      onClick={() => setSelectedItemId(item.id)}
                      style={{
                        borderRadius: token.borderRadius,
                        transition: 'all 0.3s',
                        border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                        backgroundColor: token.colorBgContainer,
                        boxShadow: isSelected ? token.boxShadow : 'none'
                      }}
                      bodyStyle={{ padding: '12px' }}
                    >
                      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                        <Tooltip title={isFromInventory ? `Vinculado al Inventario #${item.inventario_id}` : "Ítem independiente"}>
                          {isFromInventory ?
                            <Tag color="geekblue" icon={<DatabaseOutlined />}>Inv: {item.inventario_id}</Tag> :
                            <Tag color="orange" icon={<GlobalOutlined />}>Suelto</Tag>
                          }
                        </Tooltip>
                        <Text type="secondary" style={{ fontSize: 10 }}>ID: {item.id}</Text>
                      </div>

                      <Tooltip title={item.nombre}>
                        <Paragraph strong ellipsis={{ rows: 1 }} style={{ marginBottom: 8, fontSize: 15, color: token.colorText }}>
                          {item.nombre}
                        </Paragraph>
                      </Tooltip>

                      <div style={{ minHeight: 60 }}>
                        {attributes.map(([key, value]: any) => (
                          <div key={key} style={{
                            fontSize: 12,
                            color: token.colorTextDescription,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>{key}:</Text> {String(value)}
                          </div>
                        ))}

                        {/* INDICADOR DE MÁS ATRIBUTOS */}
                        {Object.keys(item.atributos || {}).length > 2 && (
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 10, fontStyle: 'italic', color: token.colorPrimary }}>
                              + {Object.keys(item.atributos).length - 2} atributos más...
                            </Text>
                          </div>
                        )}
                      </div>

                      <Divider style={{ margin: '8px 0' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={{ color: item.cantidad < 10 ? token.colorError : token.colorSuccess }}>
                          Stock: {item.cantidad}
                        </Text>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          ) : (
            <Empty description="No hay artículos" />
          )}
        </div>

        {/* PANEL LATERAL DE DETALLE */}
        {selectedItem && (
          <div style={{ width: 450, marginLeft: 24, flexShrink: 0 }}>
            <Card
              style={{
                height: '100%',
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowSecondary,
                backgroundColor: token.colorBgContainer
              }}
              bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ maxWidth: '80%' }}>
                  <Tag color={selectedItem.inventario_id ? "geekblue" : "orange"}>
                    {selectedItem.inventario_id ? `REGISTRO DE INVENTARIO #${selectedItem.inventario_id}` : "ARTÍCULO INDEPENDIENTE"}
                  </Tag>
                  <Title level={4} style={{ marginTop: 8, marginBottom: 0 }}>{selectedItem.nombre}</Title>
                </div>
                <Button type="text" icon={<CloseOutlined />} onClick={() => setSelectedItemId(null)} />
              </div>

              <Divider style={{ margin: 0 }} />

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                <Descriptions title="Ficha Técnica" column={1} bordered size="small">
                  <Descriptions.Item label="ID de Sistema">{selectedItem.id}</Descriptions.Item>
                  <Descriptions.Item label="Stock Actual">
                    <Badge status={selectedItem.cantidad > 0 ? "success" : "error"} text={`${selectedItem.cantidad} unidades`} />
                  </Descriptions.Item>
                  {Object.entries(selectedItem.atributos).map(([key, value]: any) => (
                    <Descriptions.Item key={key} label={key}>
                      {String(value)}
                    </Descriptions.Item>
                  ))}
                </Descriptions>

                {selectedItem.inventario_id && (
                  <Alert
                    style={{ marginTop: 20 }}
                    message="Ítem Vinculado"
                    description="Este ítem pertenece a un inventario físico."
                    type="info"
                    showIcon
                  />
                )}
              </div>

              <div style={{
                padding: 20,
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                backgroundColor: token.colorFillAlter // Color sutil para diferenciar el footer del panel
              }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button type="primary" block icon={<PlusOutlined />} size="large">Actualizar Datos</Button>
                  <Button danger block icon={<DeleteOutlined />} size="large">
                    {selectedItem.inventario_id ? "Dar de baja en Inventario" : "Eliminar del Catálogo"}
                  </Button>
                </Space>
              </div>
            </Card>
          </div>
        )}
      </div>
      {/* COMPONENTE MODAL */}
      <AddItemModal
        catalogoId={Number(id)}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemsActualesIds={currentItemIds}
      />
    </div>
  );
};

export default CatalogosPage;