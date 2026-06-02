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
  theme,
  Modal, // <-- Añadido para confirmaciones y edición
  Form,  // <-- Añadido para edición de datos
  Input, // <-- Añadido
  InputNumber, // <-- Añadido
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  CloseOutlined,
  InboxOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  EditOutlined
} from '@ant-design/icons';
import { Statistic } from 'antd';
import { AddItemModal } from '../components/AddItemModal';
// IMPORTAMOS TUS NUEVOS HOOKS
import { useUpdateItem, useDeleteItem } from '../hooks/useItems';

const { Title, Text, Paragraph } = Typography;

const CatalogosPage: React.FC = () => {
  const { id } = useParams();
  const catalogoId = Number(id);
  const { token } = theme.useToken();
  const { data, isLoading, error } = useCatalogo(catalogoId);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // ESTADOS PARA EDICIÓN DE ATRIBUTOS
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [form] = Form.useForm();

  // HOOKS DE REACT QUERY
  const updateItemMutation = useUpdateItem(catalogoId);
  const deleteItemMutation = useDeleteItem(catalogoId);

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error) return <Alert message="Error" description="No se pudo cargar el catálogo" type="error" showIcon />;
  
  const currentItemIds = data?.items.map((i: any) => i.id) || [];
  const selectedItem = data?.items.find((i: any) => i.id === selectedItemId);
  const hasItems = data?.items && data.items.length > 0;

  // CONTROLADOR AL DAR DE BAJA (DELETE)
  const handleDelete = (itemId: number) => {
    Modal.confirm({
      title: '¿Estás seguro de eliminar este artículo?',
      content: 'Esta acción eliminará el ítem permanentemente del sistema e inventario asociado.',
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        await deleteItemMutation.mutateAsync(itemId);
        setSelectedItemId(null); // Limpiamos la selección del panel lateral
      },
    });
  };

  // CONTROLADOR PARA ABRIR MODAL EDICIÓN CON VALORES PREVIOS
  const openEditModal = () => {
    if (!selectedItem) return;
    form.setFieldsValue({
      nombre: selectedItem.nombre,
      cantidad: selectedItem.cantidad,
      ...selectedItem.atributos // Carga dinámica de los atributos JSON
    });
    setIsEditModalOpen(true);
  };

  // CONTROLADOR PARA GUARDAR LOS DATOS ACTUALIZADOS (PUT)
  const handleUpdateSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { nombre, cantidad, ...atributos } = values;
      
      if(!selectedItem){
        return;
      }

      await updateItemMutation.mutateAsync({
        id: selectedItem.id,
        data: {
          nombre,
          cantidad,
          atributos // Mapea los campos extras de vuelta al JSON de atributos
        }
      });
      setIsEditModalOpen(false);
    } catch (info) {
      console.log('Validación fallida:', info);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      backgroundColor: token.colorBgLayout
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
            <div>
              <Title level={3} style={{ margin: 0 }}>{data?.nombre}</Title>
              <Text type="secondary">{data?.descripcion}</Text>
            </div>
            <Divider type="vertical" style={{ height: 40, margin: '0 24px' }} />
            <Statistic
              title="Total Artículos"
              value={data?.total_items}
              prefix={<InboxOutlined style={{ color: token.colorPrimary }} />}
              valueStyle={{ fontSize: '20px', fontWeight: 'bold' }}
            />
          </Space>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
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

              {/* FOOTER DEL ACCIONES LATERALES */}
              <div style={{
                padding: 20,
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                backgroundColor: token.colorFillAlter
              }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    block 
                    icon={<EditOutlined />} 
                    size="large"
                    onClick={openEditModal} // ACCIÓN ACTUALIZAR
                  >
                    Actualizar Datos
                  </Button>
                  <Button 
                    danger 
                    block 
                    icon={<DeleteOutlined />} 
                    size="large"
                    loading={deleteItemMutation.isPending}
                    onClick={() => handleDelete(selectedItem.id)} // ACCIÓN BORRAR
                  >
                    {selectedItem.inventario_id ? "Dar de baja en Inventario" : "Eliminar del Catálogo"}
                  </Button>
                </Space>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* MODAL INYECTADO PARA ACTUALIZAR DATOS DINÁMICAMENTE */}
      <Modal
        title="Actualizar Datos del Artículo"
        open={isEditModalOpen}
        onOk={handleUpdateSubmit}
        onCancel={() => setIsEditModalOpen(false)}
        confirmLoading={updateItemMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre del Artículo" rules={[{ required: true, message: 'Ingrese el nombre' }]}>
            <Input />
          </Form.Item>
          
          <Form.Item name="cantidad" label="Stock / Cantidad" rules={[{ required: true, message: 'Ingrese la cantidad' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          {/* Generación dinámica de inputs basados en los atributos actuales de este item */}
          {selectedItem && Object.keys(selectedItem.atributos || {}).length > 0 && (
            <>
              <Divider style={{ fontSize: 12, margin: '12px 0' }}>Atributos específicos</Divider>
              {Object.keys(selectedItem.atributos).map((key) => (
                <Form.Item key={key} name={key} label={key.toUpperCase()}>
                  <Input />
                </Form.Item>
              ))}
            </>
          )}
        </Form>
      </Modal>

      {/* COMPONENTE MODAL EXISTENTE */}
      <AddItemModal
        catalogoId={catalogoId}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemsActualesIds={currentItemIds}
      />
    </div>
  );
};

export default CatalogosPage;