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
  Descriptions,
  theme,
  Modal, // <-- Añadido para confirmaciones y edición
  Form,  // <-- Añadido para edición de datos
  Input, // <-- Añadido
  InputNumber, // <-- Añadido
  Avatar,
  Image,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CloseOutlined,
  InboxOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  EditOutlined,
  PictureOutlined,
  MinusCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { Statistic } from 'antd';
import { AddItemModal } from '../components/AddItemModal';
// IMPORTAMOS TUS NUEVOS HOOKS
import { useUpdateItem, useDeleteItem } from '../hooks/useItems';
import { useRemoveItemFromCatalogo } from '../hooks/useCatalogos';
import { useInventories } from '../hooks/useInventory';
import { useAuthContext } from '../context/AuthContext';
import { urlImagen } from '../api/axios.config';

const { Title, Text, Paragraph } = Typography;

const CatalogosPage: React.FC = () => {
  const { id } = useParams();
  const catalogoId = Number(id);
  const { token } = theme.useToken();

  // Render de un valor de atributo para mostrar (tarjeta y panel de detalle).
  // - Vacío (null/undefined/'') → guión. El chequeo es explícito, NO falsy: un
  //   `0` o un `false` NO se ocultan (se muestran igual).
  // - Casilla (boolean) → ícono ✓/✗ en vez de "true"/"false". Se infiere por el
  //   valor porque acá no hay mapa de tipos de atributos (los items pueden venir
  //   de distintos inventarios). Las fechas quedan como texto por el mismo motivo.
  const renderValorAtributo = (value: any): React.ReactNode => {
    if (value === undefined || value === null || value === '') {
      return <Text type="secondary">—</Text>;
    }
    if (typeof value === 'boolean' || value === 'true' || value === 'false') {
      const esVerdadero = value === true || String(value).toLowerCase() === 'true';
      return esVerdadero
        ? <CheckCircleOutlined style={{ color: token.colorSuccess }} />
        : <CloseCircleOutlined style={{ color: token.colorError }} />;
    }
    return String(value);
  };

  const { data, isLoading, error } = useCatalogo(catalogoId);
  // Los items del catálogo solo traen inventario_id (no el nombre). Traemos la
  // lista de inventarios para poder mostrar el nombre en el panel de detalle.
  const { data: inventarios } = useInventories();
  const nombreInventario = (invId: number | null | undefined) =>
    inventarios?.find((inv) => inv.id === invId)?.nombre;
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ESTADOS PARA EDICIÓN DE ATRIBUTOS
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [form] = Form.useForm();

  // HOOKS DE REACT QUERY
  const updateItemMutation = useUpdateItem(catalogoId);
  const deleteItemMutation = useDeleteItem(catalogoId);
  const removeFromCatalogoMutation = useRemoveItemFromCatalogo(catalogoId);

  // Permisos para gatear los botones de acción (mismo criterio que la tabla
  // de inventario, issue #29). Vincular/desvincular items de un catálogo es
  // `catalogos:update`; editar/borrar el artículo en sí es sobre `items`.
  const { hasPermission, isTenant } = useAuthContext();
  const canLinkItems   = isTenant || hasPermission('catalogos', 'update');
  const canEditItems   = isTenant || hasPermission('items', 'update');
  const canDeleteItems = isTenant || hasPermission('items', 'delete');

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error) return <Alert message="Error" description="No se pudo cargar el catálogo" type="error" showIcon />;
  
  const currentItemIds = data?.items.map((i: any) => i.id) || [];
  const selectedItem = data?.items.find((i: any) => i.id === selectedItemId);
  // Filtrado por nombre, id, o por atributo: matchea tanto el NOMBRE del
  // atributo (ej. "color" → los que tienen ese atributo) como su VALOR
  // (ej. "rojo" → los que valen rojo). Todo client-side sobre los items ya
  // cargados en el catálogo.
  const itemsFiltrados = (data?.items || []).filter((item: any) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    if (item.nombre?.toLowerCase().includes(q) || String(item.id).includes(q)) return true;
    return Object.entries(item.atributos || {}).some(([key, value]) =>
      key.toLowerCase().includes(q) || String(value ?? '').toLowerCase().includes(q)
    );
  });

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
      content: `El artículo "${item.nombre}" se desvincula de este catálogo, pero SIGUE existiendo en el inventario #${item.inventario_id} con su cantidad intacta. Podés volver a agregarlo cuando quieras.`,
      onOk: async () => {
        await removeFromCatalogoMutation.mutateAsync(item.id);
        setSelectedItemId(null); // Limpiamos la selección del panel lateral
      },
    });
  };

  // CONTROLADOR PARA ABRIR MODAL EDICIÓN CON VALORES PREVIOS
  // Tipos de atributos del inventario al que pertenece el item (para saber
  // cuáles son boolean y renderizarlos como Switch en la edición).
  const tiposAtributosItem: Record<string, string> =
    inventarios?.find((inv) => inv.id === selectedItem?.inventario_id)?.atributos ?? {};

  const openEditModal = () => {
    if (!selectedItem) return;
    // Coaccionar los boolean a booleano real: el Switch (valuePropName=checked)
    // necesita true/false, no el string "true"/"false".
    const atributosForm: Record<string, any> = {};
    Object.entries(selectedItem.atributos).forEach(([k, v]) => {
      atributosForm[k] = tiposAtributosItem[k] === 'boolean'
        ? (v === true || String(v).toLowerCase() === 'true')
        : v;
    });
    form.setFieldsValue({
      nombre: selectedItem.nombre,
      cantidad: selectedItem.cantidad,
      ...atributosForm,
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
            <Input
              placeholder="Buscar por nombre, id o atributo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 300 }}
            />
            {canLinkItems && (
              <Tooltip title="Nuevo Artículo">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)} />
              </Tooltip>
            )}
          </Space>
        </div>
      </Card>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* GRILLA DE ITEMS */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 12, scrollbarWidth: 'thin', scrollbarColor: `${token.colorTextTertiary} transparent` }}>
          {itemsFiltrados.length > 0 ? (
            <Row gutter={[16, 16]}>
              {itemsFiltrados.map((item: any) => {
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
                          // "contain" en vez de "cover": con fotos más altas que
                          // anchas (una carta, una figura de pie) "cover" recorta
                          // el sobrante para llenar el marco y termina cortando
                          // parte de la imagen. "contain" siempre muestra la foto
                          // completa — el fondo relleva el espacio que sobra en
                          // vez de perder contenido. Mismo criterio que ya usaba
                          // el panel de detalle de al lado (más abajo en este
                          // archivo), que quedaba inconsistente con esta tarjeta.
                          <div style={{
                            height: 180, backgroundColor: token.colorFillAlter,
                            borderRadius: `${token.borderRadius}px ${token.borderRadius}px 0 0`,
                            overflow: 'hidden',
                          }}>
                            <img
                              src={urlImagen(item.imagen)}
                              alt={item.nombre}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          </div>
                        ) : (
                          <div style={{
                            height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>{key}:</Text> {renderValorAtributo(value)}
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
                          Cantidad: {item.cantidad}
                        </Text>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          ) : (
            <Empty description={searchTerm ? "No se encontraron artículos" : "No hay artículos"} />
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
                    {selectedItem.inventario_id
                      ? `Perteneciente al Inventario #${selectedItem.inventario_id}${nombreInventario(selectedItem.inventario_id) ? ` - ${nombreInventario(selectedItem.inventario_id)}` : ''}`
                      : "ARTÍCULO INDEPENDIENTE"}
                  </Tag>
                  <Title level={4} style={{ marginTop: 8, marginBottom: 0 }}>{selectedItem.nombre}</Title>
                </div>
                <Button type="text" icon={<CloseOutlined />} onClick={() => setSelectedItemId(null)} />
              </div>

              <Divider style={{ margin: 0 }} />

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', scrollbarWidth: 'thin', scrollbarColor: `${token.colorTextTertiary} transparent` }}>
                {selectedItem.imagen ? (
                  <Image
                    src={urlImagen(selectedItem.imagen)}
                    alt={selectedItem.nombre}
                    // Ant <Image> trae preview integrado: click → lightbox a
                    // pantalla completa con zoom/rotar. wrapperStyle hace que el
                    // contenedor sea block a todo el ancho (como el <img> anterior).
                    wrapperStyle={{ width: '100%', marginBottom: 20 }}
                    style={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: token.borderRadiusLG, backgroundColor: token.colorFillAlter, cursor: 'zoom-in' }}
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
                <Descriptions title="Características" column={1} bordered size="small" contentStyle={{ textAlign: 'center' }}>
                  <Descriptions.Item label="ID de Sistema">{selectedItem.id}</Descriptions.Item>
                  <Descriptions.Item label="Cantidad">
                    {selectedItem.cantidad} unidades
                  </Descriptions.Item>
                  {Object.entries(selectedItem.atributos).map(([key, value]: any) => (
                    <Descriptions.Item key={key} label={key}>
                      {renderValorAtributo(value)}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </div>

              {/* FOOTER DEL ACCIONES LATERALES — solo si el usuario tiene al
                  menos una acción disponible; si no, no mostramos la barra */}
              {(canEditItems || canLinkItems || canDeleteItems) && (
                <div style={{
                  padding: 20,
                  borderTop: `1px solid ${token.colorBorderSecondary}`,
                  backgroundColor: token.colorFillAlter
                }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {canEditItems && (
                      <Button
                        type="primary"
                        block
                        icon={<EditOutlined />}
                        size="large"
                        onClick={openEditModal} // ACCIÓN ACTUALIZAR
                      >
                        Actualizar Datos
                      </Button>
                    )}
                    {selectedItem.inventario_id ? (
                      <>
                        {canLinkItems && (
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
                        )}
                        {canDeleteItems && (
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
                        )}
                      </>
                    ) : (
                      canDeleteItems && (
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
                      )
                    )}
                  </Space>
                </div>
              )}
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
          
          <Form.Item name="cantidad" label="Cantidad" rules={[{ required: true, message: 'Ingrese la cantidad' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          {/* Generación dinámica de inputs basados en los atributos actuales de este item */}
          {selectedItem && Object.keys(selectedItem.atributos || {}).length > 0 && (
            <>
              <Divider style={{ fontSize: 12, margin: '12px 0' }}>Atributos específicos</Divider>
              {Object.keys(selectedItem.atributos).map((key) => {
                const esBool = tiposAtributosItem[key] === 'boolean';
                return (
                  <Form.Item
                    key={key}
                    name={key}
                    label={key.toUpperCase()}
                    valuePropName={esBool ? 'checked' : 'value'}
                  >
                    {esBool
                      ? <Switch checkedChildren={<CheckOutlined />} unCheckedChildren={<CloseOutlined />} />
                      : <Input />}
                  </Form.Item>
                );
              })}
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