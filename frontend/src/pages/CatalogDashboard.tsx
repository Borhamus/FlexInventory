import { useState } from 'react';
import { Card, Row, Col, Empty, Button, Space, Typography, Tooltip, Modal, Form, List, Avatar, Result, Input, Select, theme } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  BlockOutlined,
  FolderOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined
} from '@ant-design/icons';
import { useCatalogos, useCreateCatalogo, useDeleteCatalogo, useUpdateCatalogo } from '../hooks/useCatalogos';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { CatalogForm } from '../forms/CatalogForm';
import { useAuthContext } from '../context/AuthContext';
import { EmojiPicker, useEmojiPreference } from '../components/EmojiPicker';
import { Modal as AntModal } from 'antd';

const { Title, Text } = Typography;

const CatalogoEmojiAvatar = ({ catalogoId }: { catalogoId: number }) => {
  // Namespaced por tenant: los ids de catálogo se repiten entre tenants, así que
  // sin el tenant en la clave el emoji se filtraba de un tenant a otro en el
  // mismo navegador.
  const { user } = useAuthContext();
  const { token } = theme.useToken();
  const [emoji, setEmoji] = useEmojiPreference(`flexinv_emoji_catalogo_${user?.tenant_id ?? 'anon'}_${catalogoId}`);
  return (
    <EmojiPicker value={emoji} onChange={setEmoji}>
      {/* Mismo look que el avatar del dashboard principal (DashboardPage):
          fondo con el color primario configurable y sombra suave. Antes
          tenía un azul fijo que no seguía el tema. */}
      <Avatar
        size={48}
        icon={emoji ? undefined : <FolderOutlined />}
        style={{
          backgroundColor: token.colorPrimary,
          boxShadow:       `0 4px 14px ${token.colorPrimary}59`,
          cursor:          'pointer',
          fontSize:        emoji ? 24 : undefined,
        }}
      >
        {emoji}
      </Avatar>
    </EmojiPicker>
  );
};

type CriterioOrden = 'nombre' | 'total_items' | 'actualizado_en';

const OPCIONES_ORDEN: { value: CriterioOrden; label: string }[] = [
  { value: 'nombre',         label: 'Nombre' },
  { value: 'total_items',    label: 'Cantidad de artículos' },
  { value: 'actualizado_en', label: 'Última modificación' },
];

// Cada criterio tiene el sentido que se espera al elegirlo: los nombres
// arrancan de la A, pero "más artículos" y "modificado más recientemente"
// son lo primero que uno quiere ver. Al cambiar de criterio se vuelve a este
// default, y desde ahí el usuario puede invertirlo con el botón.
const DIRECCION_POR_DEFECTO: Record<CriterioOrden, 'asc' | 'desc'> = {
  nombre:         'asc',
  total_items:    'desc',
  actualizado_en: 'desc',
};

export const CatalogoDashboard = () => {
  const { data: catalogos, isLoading } = useCatalogos();
  const { mutate: createCatalogo, isPending: isCreating } = useCreateCatalogo();
  const { mutate: updateCatalogo, isPending: isUpdating } = useUpdateCatalogo(); // Nuevo
  const { mutate: deleteCatalogo } = useDeleteCatalogo(); // Nuevo
  const { hasPermission, isTenant } = useAuthContext();
  const [editingCatalogo, setEditingCatalogo] = useState<any | null>(null); // Nuevo estado
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  // estado para barra de busqueda
  const [searchText, setSearchText] = useState('');
  // Cantidad de catálogos por página, elegible por el usuario (mismo
  // criterio que la tabla de inventario).
  const [pageSize, setPageSize] = useState(6);
  const [orden, setOrden] = useState<CriterioOrden>('nombre');
  const [direccion, setDireccion] = useState<'asc' | 'desc'>(DIRECCION_POR_DEFECTO.nombre);

  // Permisos de catálogos
  const canCreate = isTenant || hasPermission('catalogos', 'create');
  const canEdit = isTenant || hasPermission('catalogos', 'update');
  const canDelete = isTenant || hasPermission('catalogos', 'delete');
  const canRead = isTenant || hasPermission('catalogos', 'read');

  // Permisos de artículos — necesarios para ver el contenido del catálogo
  const canReadItems = isTenant || hasPermission('items', 'read');

  if (isLoading) return null;

  // Si no puede ver catálogos, mostrar mensaje
  if (!canRead) {
    return (
      <Result
        status="403"
        title="Sin acceso"
        subTitle="No tenés permiso para ver los catálogos. Hablá con el administrador."
      />
    );
  }

  const hasCatalogos = catalogos && catalogos.length > 0;

  // (handleCreate se eliminó: handleSubmit de más abajo ya cubre crear y
  // editar, y era el único que usaba el modal.)

  const handleOpenEdit = (cat: any) => {
    setEditingCatalogo(cat);
    form.setFieldsValue(cat); // Cargamos los datos del catálogo en el form
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCatalogo(null);
    form.resetFields();
  };

  const handleSubmit = (values: any) => {
    if (editingCatalogo) {
      updateCatalogo({ id: editingCatalogo.id, data: values }, {
        onSuccess: handleCloseModal
      });
    } else {
      createCatalogo(values, {
        onSuccess: handleCloseModal
      });
    }
  };

  const showDeleteConfirm = (id: number, nombre: string) => {
    AntModal.confirm({
      title: '¿Estás seguro de eliminar este catálogo?',
      content: `El catálogo "${nombre}" será borrado. Los artículos no se eliminarán, solo se desvincularán.`,
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => deleteCatalogo(id),
    });
  };

  // filtrado en vivo
  const filteredCatalogos = catalogos
    ?.filter(cat => cat.nombre.toLowerCase().includes(searchText.toLowerCase()))
    // Copia antes de ordenar: sort() muta el array, y `catalogos` es el
    // objeto que tiene cacheado react-query.
    .slice()
    .sort((a: any, b: any) => {
      const factor = direccion === 'asc' ? 1 : -1;
      // localeCompare con 'es' para que los acentos y la ñ caigan donde
      // corresponde; numeric hace que "Catálogo 10" vaya después de
      // "Catálogo 2" y no antes.
      const porNombre = a.nombre.localeCompare(b.nombre, 'es', { numeric: true, sensitivity: 'base' });

      switch (orden) {
        case 'total_items': {
          const diff = (a.total_items ?? 0) - (b.total_items ?? 0);
          // Entre catálogos con la misma cantidad, alfabético — si no, el
          // empate lo resuelve el orden en que vinieron y la lista "salta"
          // sin motivo entre recargas.
          return diff !== 0 ? factor * diff : porNombre;
        }
        case 'actualizado_en': {
          // Una fecha inválida o ausente cuenta como la más vieja: sin esto
          // valueOf() devuelve NaN, toda comparación con NaN es false y el
          // sort queda en un orden arbitrario en vez de fallar a la vista.
          const ts = (f: string | null | undefined) => {
            const d = dayjs(f);
            return f && d.isValid() ? d.valueOf() : 0;
          };
          const diff = ts(a.actualizado_en) - ts(b.actualizado_en);
          return diff !== 0 ? factor * diff : porNombre;
        }
        default:
          return factor * porNombre;
      }
    });

  return (
    <div style={{ padding: '24px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      <Title level={2} style={{ margin: 0, marginBottom: '16px' }}>Catálogos</Title> 

      {/* NUEVO HEADER ESTILO INVENTARIO */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Input
            placeholder="Buscar catálogo..."
            size="large"
            allowClear
            prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />} // Ajustá el color según tu tema oscuro
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: '300px' }}
          />

          <Select<CriterioOrden>
            size="large"
            value={orden}
            // Cambiar de criterio reinicia el sentido al que se espera para
            // ese criterio (ver DIRECCION_POR_DEFECTO): pasar de "Nombre A-Z"
            // a "Cantidad de artículos" y que arranque de menor a mayor sería
            // desconcertante.
            onChange={(value) => { setOrden(value); setDireccion(DIRECCION_POR_DEFECTO[value]); }}
            options={OPCIONES_ORDEN}
            style={{ width: 210 }}
          />

          <Tooltip title={direccion === 'asc' ? 'Orden ascendente' : 'Orden descendente'}>
            <Button
              size="large"
              icon={direccion === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
              onClick={() => setDireccion((d) => (d === 'asc' ? 'desc' : 'asc'))}
              // Medidas fijas: los dos íconos no tienen exactamente el mismo
              // ancho, así que sin esto el botón cambiaba de tamaño cada vez
              // que se invertía el orden — y cambiar de criterio invierte el
              // orden solo (ver DIRECCION_POR_DEFECTO), así que el salto se
              // veía también al tocar el Select. flexShrink evita que el flex
              // lo apriete cuando el header queda corto.
              style={{ width: 40, height: 40, flexShrink: 0 }}
            />
          </Tooltip>
        </div>

        {/* Crear queda a la derecha del todo, separado de los controles de
            búsqueda y orden: marginLeft auto empuja contra el borde. */}
        {canCreate && (
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            iconPosition="end"
            onClick={() => setIsModalOpen(true)}
            style={{ marginLeft: 'auto', flexShrink: 0 }}
          >
            Crear catálogo
          </Button>
        )}
      </div>

      {/* LISTA DE CATÁLOGOS FILTRADA */}
      <div style={{ flex: '1', overflowY: 'auto' }}>
        {!hasCatalogos ? (
          <div style={{ padding: '100px 0', textAlign: 'center', borderRadius: '8px', border: '1px dashed #444' }}>
            <Empty description={searchText ? "No se encontraron catálogos con ese nombre." : "No hay catálogos creados todavía."}>
              {!searchText && canCreate && (
                <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                  Crear mi primer catálogo
                </Button>
              )}
            </Empty>
          </div>
        ) : (
          <List
            dataSource={filteredCatalogos}
            pagination={
              // Se muestra el paginador solo si hay más de 5 (el mínimo
              // elegible); una vez visible, incluye el selector de cantidad.
              (filteredCatalogos?.length ?? 0) > 5
                ? {
                    pageSize,
                    size: 'small',
                    align: 'center',
                    showSizeChanger: true,
                    pageSizeOptions: ['5', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100'],
                    onChange: (_page, nuevoPageSize) => setPageSize(nuevoPageSize),
                  }
                : false
            }
            renderItem={(cat) => (
              // La tarjeta entera abre el catálogo (antes era el botón del
              // ojo). Solo es clickeable si el usuario puede ver los
              // artículos — mismo permiso que gateaba ese botón — y el
              // `hoverable` acompaña, para no señalar como clickeable algo
              // que no va a hacer nada.
              <Card
                hoverable={canReadItems}
                onClick={canReadItems ? () => navigate(`/dashboard/catalogos/${cat.id}`) : undefined}
                style={{ marginBottom: 12, width: '100%' }}
                styles={{ body: { padding: '16px 24px' } }}
              >
               {/* ... El interior de la Card queda idéntico a lo que ya tenías ... */}
               <Row align="middle" gutter={24}>
                  {/* El avatar abre el selector de emoji: sin frenar acá el
                      burbujeo, clickearlo también navegaría al catálogo. */}
                  <Col flex="none" onClick={(e) => e.stopPropagation()}>
                    <CatalogoEmojiAvatar key={cat.id} catalogoId={cat.id} />
                  </Col>

                  <Col flex="auto">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <Text strong style={{ fontSize: '16px' }}>{cat.nombre}</Text>
                      <Text type="secondary" ellipsis={{ tooltip: cat.descripcion }} style={{ maxWidth: '600px' }}>
                        {cat.descripcion || 'Sin descripción disponible.'}
                      </Text>
                    </div>
                  </Col>

                  {/* FECHAS Y ESTADÍSTICAS */}
                  <Col flex="none" style={{ minWidth: '150px' }}>
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <CalendarOutlined /> Creado: {dayjs(cat.creado_en).format('DD/MM/YYYY')}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <CalendarOutlined /> Editado: {dayjs(cat.actualizado_en).format('DD/MM/YYYY')}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <BlockOutlined /> {cat.total_items} artículos
                      </Text>
                    </Space>
                  </Col>

                  {/* BOTONES DE ACCIÓN (Editar, Eliminar) — el de "Ver" se
                      sacó: abrir el catálogo es clickear la tarjeta. Cada uno
                      corta el burbujeo para que editar o borrar no navegue
                      además de abrir su diálogo. */}
                  <Col flex="none">
                    <Space>
                      {canEdit && (
                        <Tooltip title="Editar">
                          <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(cat); }}
                          />
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip title="Eliminar">
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => { e.stopPropagation(); showDeleteConfirm(cat.id, cat.nombre); }}
                          />
                        </Tooltip>
                      )}
                    </Space>
                  </Col>
                </Row>
              </Card>
            )}
          />
        )}
      </div>

      {/* MODAL ÚNICO PARA CREAR/EDITAR */}
      <Modal
        title={editingCatalogo ? "Editar Catálogo" : "Nuevo Catálogo"}
        open={isModalOpen}
        onCancel={handleCloseModal}
        confirmLoading={isCreating || isUpdating}
        onOk={() => form.submit()}
        okText={editingCatalogo ? "Guardar Cambios" : "Crear Catálogo"}
        destroyOnClose
      >
        <CatalogForm form={form} onFinish={handleSubmit} />
      </Modal>
    </div>
  );
};

export default CatalogoDashboard;
