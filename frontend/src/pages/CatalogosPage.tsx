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
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  CloseOutlined,
  InboxOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  EditOutlined,
  PictureOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import { Statistic } from 'antd';
import { AddItemModal } from '../components/AddItemModal';
// IMPORTAMOS TUS NUEVOS HOOKS
import { useUpdateItem, useDeleteItem } from '../hooks/useItems';
import { useRemoveItemFromCatalogo } from '../hooks/useCatalogos';
import { urlImagen } from '../api/axios.config';

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
  const removeFromCatalogoMutation = useRemoveItemFromCatalogo(catalogoId);

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error) return <Alert message="Error" description="No se pudo cargar el catálogo" type="error" showIcon />;
  
  const currentItemIds = data?.items.map((i: any) => i.id) || [];
  const selectedItem = data?.items.find((i: any) => i.id === selectedItemId);
  const hasItems = data?.items && data.items.length > 0;

  // CONTROLADOR PARA BORRADO PERMANENTE (DELETE /items/{id})
  // OJO: esto NO es "dar de baja", borra el registro del sistema entero.
  // Si el ítem viene de un inventario, también desaparece de ese inventario.
  const handleDelete = (item: any) => {
    const vinculado = item.inventario_id !== null && item.inventario_id !== undefined;
    Modal.confirm({
      title: '¿Eliminar este artículo del sistema?',
      okText: 'Sí, eliminar definitivamente',
      okType: 'danger',
      cancelText: 'Cancelar',
      content: vinculado
        ? `Se borrará el artículo "${item.nombre}" de forma PERMANENTE. Desaparecerá también del inventario #${item.inventario_id} y no se puede deshacer. Si solo querés sacarlo de este catálogo, usá "Quitar del catálogo".`
        : `Se borrará el artículo "${item.nombre}" de forma PERMANENTE. Esta acción no se puede deshacer.`,
      onOk: async () => {
        await deleteItemMutation.mutateAsync(item.id);
        setSelectedItemId(null); // Limpiamos la selección del panel lateral
      },
    });
  };

  // CONTROLADOR PARA DESVINCULAR DEL CATÁLOGO (DELETE /catalogos/{id}/items/{itemId})
  // El artículo sigue existiendo en su inventario; solo deja de estar en este catálogo.
  const handleRemoveFromCatalogo = (item: any) => {
    Modal.confirm({
      title: '¿Quitar este artículo del catálogo?',
      okText: 'Sí, quitar del catálogo',
      cancelText: 'Cancelar',
      content: `El artículo "${item.nombre}" se desvincula de este catálogo, pero SIGUE existiendo en el inventario #${item.inventario_id} con su stock intacto. Podés volver a agregarlo cuando quieras.`,
      onOk: async () => {
        await removeFromCatalogoMutation.mutateAsync(item.id);
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
      height: '100%',      
      width: '100%',          
      flex: 1,                
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      backgroundColor: token.colorBgLayout,
      overflow: 'hidden'
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
                      cover={
                        item.imagen ? (
                          <img
                            src={urlImagen(item.imagen)}
                            alt={item.nombre}
                            style={{ height: 140, objectFit: 'cover', borderRadius: `${token.borderRadius}px ${token.borderRadius}px 0 0` }}
                          />
                        ) : (
                          <div style={{
                            height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: token.colorFillAlter, color: token.colorTextQuaternary,
                            borderRadius: `${token.borderRadius}px ${token.borderRadius}px 0 0`,
                          }}>
                            <PictureOutlined style={{ fontSize: 32 }} />
                          </div>
                        )
                      }
                      style={{
                        borderRadius: token.borderRadius,
                        transition: 'all 0.3s',
                        border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                        backgroundColor: token.colorBgContainer,
                        boxShadow: isSelected ? token.boxShadow : 'none',
                        overflow: 'hidden',
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
                {selectedItem.imagen ? (
                  <img
                    src={urlImagen(selectedItem.imagen)}
                    alt={selectedItem.nombre}
                    style={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: token.borderRadiusLG, marginBottom: 20, backgroundColor: token.colorFillAlter }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: token.colorFillAlter, color: token.colorTextQuaternary,
                    borderRadius: token.borderRadiusLG, marginBottom: 20,
                  }}>
                    <Avatar size={48} icon={<PictureOutlined />} style={{ backgroundColor: 'transparent', color: token.colorTextQuaternary }} />
                  </div>
                )}
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
                  {selectedItem.inventario_id ? (
                    <>
                      <Button
                        danger
                        ghost
                        block
                        icon={<MinusCircleOutlined />}
                        size="large"
                        loading={removeFromCatalogoMutation.isPending}
                        onClick={() => handleRemoveFromCatalogo(selectedItem)} // SOLO DESVINCULA DEL CATÁLOGO
                      >
                        Quitar del catálogo
                      </Button>
                      <Button
                        danger
                        block
                        icon={<DeleteOutlined />}
                        size="large"
                        loading={deleteItemMutation.isPending}
                        onClick={() => handleDelete(selectedItem)} // BORRA PERMANENTE (SISTEMA + INVENTARIO)
                      >
                        Eliminar del inventario
                      </Button>
                    </>
                  ) : (
                    <Button
                      danger
                      block
                      icon={<DeleteOutlined />}
                      size="large"
                      loading={deleteItemMutation.isPending}
                      onClick={() => handleDelete(selectedItem)} // BORRA PERMANENTE (ítem suelto)
                    >
                      Eliminar del Catálogo
                    </Button>
                  )}
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