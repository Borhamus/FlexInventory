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
  Empty, // Importamos Empty
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  CloseOutlined,
  InboxOutlined, // Icono para el estado vacío
} from '@ant-design/icons';

const { Title, Text } = Typography;

const CatalogosPage: React.FC = () => {
  const { id } = useParams();
  const { data, isLoading, error } = useCatalogo(Number(id));
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error) return <Alert message="Error" description="No se pudo cargar el catálogo" type="error" showIcon />;

  const selectedItem = data?.items.find((i: any) => i.id === selectedItemId);
  const hasItems = data?.items && data.items.length > 0;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: "40px" }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>Catálogo: {data?.nombre}</Title>
            <Text type="secondary">{data?.descripcion}</Text>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', marginTop: '24px' }}>

        {/* ÁREA DE GRILLA O EMPTY STATE */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: "hidden",
          transition: 'all 0.3s ease',
          display: !hasItems ? 'flex' : 'block', // Flex para centrar el Empty
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {hasItems ? (
            <Row gutter={[16, 16]}>
              {data?.items.map((item: any) => {
                const atributosKeys = Object.keys(item.atributos || {});
                const mainAtributos = atributosKeys.slice(0, 3);
                const extraCount = atributosKeys.length - mainAtributos.length;

                return (
                  <Col
                    xs={24} sm={12} md={selectedItem ? 12 : 8} lg={selectedItem ? 8 : 6} xl={selectedItem ? 6 : 4}
                    key={item.id}
                  >
                    <Card
                      hoverable
                      size="small"
                      onClick={() => setSelectedItemId(item.id)}
                      style={{
                        borderColor: selectedItemId === item.id ? '#1890ff' : undefined,
                        height: '100%'
                      }}
                    >
                      <Title level={5} ellipsis style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', marginTop: "0" }}>
                        {item.nombre}
                        <Text type="secondary" style={{ fontSize: '11px' }}>ID: {item.id}</Text>
                      </Title>

                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        {mainAtributos.map(key => (
                          <Tag key={key} style={{ margin: 0, maxWidth: '100%' }}>
                            <span style={{ textTransform: 'capitalize' }}>{key}:</span> {item.atributos[key]}
                          </Tag>
                        ))}
                        <Tag color="green">Stock: {item.cantidad}</Tag>

                        {extraCount > 0 && (
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            +{extraCount} atributos más
                          </Text>
                        )}
                      </Space>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          ) : (
            /* VISTA DEFAULT CUANDO NO HAY ITEMS */
            <Empty
              image={<InboxOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
              imageStyle={{ height: 80 }}
              description={
                <Space direction="vertical">
                  <Text strong style={{ fontSize: 18 }}>No hay artículos en este catálogo</Text>
                  <Text type="secondary">Comienza agregando tu primer ítem para gestionar tu inventario.</Text>
                </Space>
              }
            >
              <Button type="primary" size="large" icon={<PlusOutlined />}>
                Crear Nuevo Artículo
              </Button>
            </Empty>
          )}
        </div>

        {/* PANEL DE DETALLE FIJO */}
        {selectedItem && (
          <div style={{
            width: '400px',
            display: 'flex',
            flexDirection: 'column',
            paddingInline: "10px",
            flexShrink: 0,
          }}>
            <Card
              style={{ height: "100%" }}
              bodyStyle={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0 }}
            >
              <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Detalle del Item</Title>
                <Button type="text" icon={<CloseOutlined />} onClick={() => setSelectedItemId(null)} />
              </div>

              <Divider style={{ margin: '0' }} />

              <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto' }}>
                <div>
                  <section>
                    <Text type="secondary" style={{ display: "flex", justifyContent: "space-between" }} >
                      Nombre del producto
                      <Tag color="blue">ID: {selectedItem.id}</Tag>
                    </Text>
                    <Title level={3} style={{ marginTop: 0 }}>{selectedItem.nombre}</Title>
                  </section>

                  <Divider style={{ margin: '16px 0' }} />

                  <section>
                    <Text strong>Todos los Atributos</Text>
                    <div style={{ marginTop: 16 }}>
                      {Object.entries(selectedItem.atributos).map(([key, value]: any) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <Text type="secondary" style={{ textTransform: 'capitalize' }}>{key}:</Text>
                          <Text strong>{value}</Text>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text type="secondary">STOCK DISPONIBLE:</Text>
                        <Tag color="green">{selectedItem.cantidad} unidades</Tag>
                      </div>
                    </div>
                  </section>
                </div>

                <div style={{ paddingTop: 20 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button type="primary" block size="large" icon={<ArrowRightOutlined />}>
                      Editar Artículo
                    </Button>
                    <Button block size="large" icon={<DeleteOutlined />} danger>
                      Retirar Artículo
                    </Button>
                  </Space>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* FOOTER ACCIONES (Solo se muestra si hay items para no duplicar el botón de crear) */}
      {hasItems && (
        <div style={{ padding: '16px 24px', textAlign: 'center', flexShrink: 0 }}>
          <Space size="middle">
            <Button type="primary" icon={<PlusOutlined />}>Agregar Artículo</Button>
            <Button icon={<ArrowRightOutlined />}>Migrar Masivamente</Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default CatalogosPage;