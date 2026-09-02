import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Spin, Tag, Typography, Button, Space, Popconfirm, message, Input, Result, Popover, Checkbox, Divider, Tooltip, Select, DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ControlOutlined, BarChartOutlined, SortAscendingOutlined } from '@ant-design/icons';
import { useInventory, useDeleteInventory, useDeleteItem } from '../hooks/useInventory';
import { useAuthContext } from '../context/AuthContext';

import { ModalAddItemInventory } from '../components/ModalAddItemInventory';
import { ModalEditItemInventory } from '../components/ModalEditItemInventory';
import { ModalEditInventory } from '../components/ModalEditInventory';
import { ModalStatsInventory } from '../components/ModalStatsInventory';
import ModalBulkEdit from '../components/ModalBulkEditItems';
import { InventoryTable } from '../components/InventoryTable';
import { useDeleteItemsBulk, useItems } from '../hooks/useItems';

const ATRIBUTOS_FILTRABLES = ['integer', 'int', 'float', 'number', 'date'];

const { Title, Text } = Typography;

function claveColumnasOcultas(inventoryId?: number): string | null {
  return inventoryId ? `flexinv_columnas_ocultas_${inventoryId}` : null;
}

// Qué columnas tildó ocultar el usuario en "Columnas visibles" — se guarda
// en localStorage por inventario, mismo criterio que el orden/ancho de
// columnas en InventoryTable.tsx: sin esto, cambiar de ruta (por ejemplo a
// Ajustes) y volver desmonta InventoryPage y el useState vuelve a [],
// mostrando de nuevo columnas que el usuario había ocultado.
function cargarColumnasOcultas(inventoryId?: number): string[] {
  const key = claveColumnasOcultas(inventoryId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const InventoryPage: React.FC = () => {
  const { hasPermission, isTenant } = useAuthContext();
  const { id } = useParams();
  const navigate = useNavigate();

  // Queries y Mutations
  const { data, isLoading, error, refetch } = useInventory(Number(id));
  const { mutate: deleteInventory, isPending } = useDeleteInventory();
  const { mutate: deleteItem } = useDeleteItem();
  const { mutate: bulkDelete, isPending: isDeletingBulk } = useDeleteItemsBulk(Number(id));

  // Estados de Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Estados de la Tabla
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => cargarColumnasOcultas(Number(id)));
  const [searchTerm, setSearchTerm] = useState('');
  const [columnSearch, setColumnSearch] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // La ruta no remonta InventoryPage al navegar entre inventarios (mismo
  // componente, cambia el :id) — sin este efecto, las columnas ocultas del
  // inventario anterior se quedarían pegadas al entrar a otro.
  useEffect(() => {
    setHiddenColumns(cargarColumnasOcultas(Number(id)));
  }, [id]);

  useEffect(() => {
    const key = claveColumnasOcultas(Number(id));
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(hiddenColumns));
    } catch {
      // localStorage puede fallar (modo privado, cuota llena) — la
      // preferencia simplemente no persiste, no rompemos la página por esto.
    }
  }, [id, hiddenColumns]);

  // Estados de orden y filtro por atributo (Fase 5 del backend). Mientras no
  // se use ninguno, la tabla sigue usando los items que ya vienen embebidos
  // en useInventory (comportamiento sin cambios); apenas se elige un orden o
  // filtro, se activa esta query aparte contra GET /items/.
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [filtroAtributo, setFiltroAtributo] = useState<string | undefined>(undefined);
  const [filtroDesde, setFiltroDesde] = useState<string | undefined>(undefined);
  const [filtroHasta, setFiltroHasta] = useState<string | undefined>(undefined);

  const ordenFiltroActivo = Boolean(sortBy || filtroAtributo);
  const { data: itemsOrdenados, isFetching: isFetchingOrden } = useItems(
    Number(id),
    { sortBy, order, filtroAtributo, filtroDesde, filtroHasta },
    ordenFiltroActivo
  );
  const itemsParaTabla = ordenFiltroActivo ? itemsOrdenados : (data?.items || []);

  const tipoFiltroSeleccionado = filtroAtributo ? data?.atributos?.[filtroAtributo] : undefined;
  const esFiltroFecha = tipoFiltroSeleccionado === 'date';

  const limpiarOrdenFiltro = () => {
    setSortBy(undefined);
    setFiltroAtributo(undefined);
    setFiltroDesde(undefined);
    setFiltroHasta(undefined);
  };

  const handleDeleteInventory = () => {
    deleteInventory(Number(id), {
      onSuccess: () => {
        message.success('Inventario eliminado correctamente');
        navigate('/dashboard/inventario');
      },
      onError: (err) => {
        console.error("Error al borrar:", err);
        message.error('No se pudo eliminar el inventario. Verificá que esté vacío.');
      }
    });
  }

  // Manejadores para pasarle a la tabla
  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setIsEditItemModalOpen(true);
  };

  const handleDeleteItem = (itemId: number) => {
    if (deleteItem) deleteItem(itemId);
  };

  if (!isTenant && !hasPermission('items', 'read')) {
    return <Result status="403" title="Sin acceso" subTitle="No tenés permiso para ver los artículos." />;
  }

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error) return <Alert message="Error" description="No se pudo cargar el inventario" type="error" showIcon />;

  const canAddItems = isTenant || hasPermission('items', 'create');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '40px' }}>

        {/* ENCABEZADO */}
        <Space size="small">
          <Title level={3} style={{ margin: 0 }}>{data?.nombre}</Title>
          <Tooltip title="Ver estadísticas">
            <Button type="default" shape="circle" icon={<BarChartOutlined />} onClick={() => setIsStatsModalOpen(true)} />
          </Tooltip>
          <Button type="default" shape="circle" icon={<EditOutlined />} onClick={() => setIsEditModalOpen(true)} />
          <Popconfirm
            title="Eliminar Inventario"
            description="¿Estás seguro de que querés borrar este inventario? Esta operacion es irreversible!"
            onConfirm={handleDeleteInventory}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true, loading: isPending }}
          >
            <Button danger type="primary" shape="circle" icon={<DeleteOutlined />} />
          </Popconfirm>
          <Tag color="blue" style={{ margin: 0, padding: '4px 8px', fontSize: '14px' }}>ID: {data?.id}</Tag>
        </Space>

        {/* BARRA DE HERRAMIENTAS SUPERIOR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 10 }}>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', gap: 16 }}>
            <Input
              placeholder="Buscar artículo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
            />
            <Popover
              title="Columnas visibles"
              trigger="click"
              placement="right"
              content={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 220 }}>
                  <Input
                    placeholder="Buscar columna..."
                    prefix={<SearchOutlined />}
                    value={columnSearch}
                    onChange={(e) => setColumnSearch(e.target.value)}
                    allowClear
                    size="small"
                  />
                  {(!columnSearch || 'id'.includes(columnSearch.toLowerCase())) && (
                    <Checkbox
                      checked={!hiddenColumns.includes('id')}
                      onChange={(e) => {
                        if (e.target.checked) setHiddenColumns(prev => prev.filter(k => k !== 'id'));
                        else setHiddenColumns(prev => [...prev, 'id']);
                      }}
                    >
                      ID
                    </Checkbox>
                  )}
                  {(!columnSearch || 'fecha de creación'.includes(columnSearch.toLowerCase())) && (
                    <Checkbox
                      checked={!hiddenColumns.includes('creado_en')}
                      onChange={(e) => {
                        if (e.target.checked) setHiddenColumns(prev => prev.filter(k => k !== 'creado_en'));
                        else setHiddenColumns(prev => [...prev, 'creado_en']);
                      }}
                    >
                      Fecha de Creación
                    </Checkbox>
                  )}
                  <Divider style={{ margin: '4px 0' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>Atributos dinámicos</Text>
                  <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                    {data?.atributos && Object.keys(data.atributos)
                      .filter((key) => key.toLowerCase().includes(columnSearch.toLowerCase()))
                      .map((key) => (
                        <Checkbox
                          key={key}
                          checked={!hiddenColumns.includes(key)}
                          onChange={(e) => {
                            if (e.target.checked) setHiddenColumns(prev => prev.filter(k => k !== key));
                            else setHiddenColumns(prev => [...prev, key]);
                          }}
                        >
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Checkbox>
                      ))}
                  </div>
                </div>
              }
            >
              <Tooltip title="Configurar columnas">
                <Button icon={<ControlOutlined />} />
              </Tooltip>
            </Popover>
            <Popover
              title="Ordenar y filtrar por atributo"
              trigger="click"
              placement="right"
              content={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 300 }}>
                  <Text strong style={{ fontSize: 12 }}>Ordenar por</Text>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Select
                      allowClear
                      placeholder="Sin ordenar"
                      style={{ flex: 1 }}
                      value={sortBy}
                      onChange={(v) => setSortBy(v)}
                      getPopupContainer={(trigger) => trigger.parentElement as HTMLElement}
                      options={Object.entries(data?.atributos || {}).map(([nombre, tipo]) => ({ value: nombre, label: `${nombre} (${tipo})` }))}
                    />
                    <Select
                      style={{ width: 90 }}
                      value={order}
                      onChange={setOrder}
                      disabled={!sortBy}
                      getPopupContainer={(trigger) => trigger.parentElement as HTMLElement}
                      options={[{ value: 'asc', label: 'Asc' }, { value: 'desc', label: 'Desc' }]}
                    />
                  </div>

                  <Divider style={{ margin: '4px 0' }} />

                  <Text strong style={{ fontSize: 12 }}>Filtrar por rango (numérico o fecha)</Text>
                  <Select
                    allowClear
                    placeholder="Sin filtro"
                    value={filtroAtributo}
                    onChange={(v) => { setFiltroAtributo(v); setFiltroDesde(undefined); setFiltroHasta(undefined); }}
                    getPopupContainer={(trigger) => trigger.parentElement as HTMLElement}
                    options={Object.entries(data?.atributos || {})
                      .filter(([, tipo]) => ATRIBUTOS_FILTRABLES.includes(tipo))
                      .map(([nombre, tipo]) => ({ value: nombre, label: `${nombre} (${tipo})` }))}
                  />
                  {filtroAtributo && (
                    esFiltroFecha ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <DatePicker placeholder="Desde" style={{ flex: 1 }} getPopupContainer={(trigger) => trigger.parentElement as HTMLElement} onChange={(d: Dayjs | null) => setFiltroDesde(d ? d.format('YYYY-MM-DD') : undefined)} />
                        <DatePicker placeholder="Hasta" style={{ flex: 1 }} getPopupContainer={(trigger) => trigger.parentElement as HTMLElement} onChange={(d: Dayjs | null) => setFiltroHasta(d ? d.format('YYYY-MM-DD') : undefined)} />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Input placeholder="Desde" style={{ flex: 1 }} onChange={(e) => setFiltroDesde(e.target.value || undefined)} />
                        <Input placeholder="Hasta" style={{ flex: 1 }} onChange={(e) => setFiltroHasta(e.target.value || undefined)} />
                      </div>
                    )
                  )}

                  {ordenFiltroActivo && (
                    <Button size="small" onClick={limpiarOrdenFiltro} style={{ marginTop: 4 }}>
                      Limpiar orden y filtro
                    </Button>
                  )}
                </div>
              }
            >
              <Tooltip title="Ordenar / filtrar por atributo">
                <Button icon={<SortAscendingOutlined />} loading={ordenFiltroActivo && isFetchingOrden} />
              </Tooltip>
            </Popover>
            {canAddItems && (
              <Tooltip title="Agregar Artículo">
                <Button type='primary' icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)} />
              </Tooltip>
            )}
          </div>
        </div>

        {/* ACCIONES MASIVAS */}
        {selectedRowKeys.length > 0 && (
          <div style={{ padding: '16px', marginBottom: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
            <span>Seleccionaste <b>{selectedRowKeys.length}</b> artículos.</span>
            <Space>

              {/* BOTON EDICION MASIVA*/}
              <Button type="default" onClick={() => setIsBulkModalVisible(true)}>
                Editar Atributo Masivamente
              </Button>

              {/* BOTON ELIMINACION MASIVA */}
              <Popconfirm
                title={`¿Eliminar ${selectedRowKeys.length} artículos?`}
                description="Esta acción no se puede deshacer."
                okText="Sí, eliminar"
                cancelText="No"
                okButtonProps={{ danger: true }}
                onConfirm={() => {
                  const idsNumeric = selectedRowKeys.map(key => Number(key));
                  bulkDelete(idsNumeric, {
                    onSuccess: () => setSelectedRowKeys([]) 
                  });
                }}
              >
                <Button type="primary" danger loading={isDeletingBulk}>
                  Eliminar Seleccionados
                </Button>
              </Popconfirm>
            </Space>
          </div>
        )}

        {/* LLAMAMOS AL COMPONENTE DE LA TABLA */}
        <InventoryTable
          items={itemsParaTabla || []}
          atributos={data?.atributos || {}}
          searchTerm={searchTerm}
          hiddenColumns={hiddenColumns}
          selectedRowKeys={selectedRowKeys}
          setSelectedRowKeys={setSelectedRowKeys}
          onEditItem={handleEditItem}
          onDeleteItem={handleDeleteItem}
          preserveOrder={ordenFiltroActivo}
          fotosHabilitadas={data?.fotos_habilitadas}
          inventoryId={Number(id)}
        />

      </div>

      {/* MODALES */}
      <ModalAddItemInventory open={isModalOpen} onClose={() => setIsModalOpen(false)} inventoryId={Number(id)} atributosRequeridos={data?.atributos || {}} fotosHabilitadas={data?.fotos_habilitadas} />
      <ModalEditInventory isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} inventoryId={Number(id)} currentName={data?.nombre || ''} currentAtributos={data?.atributos || {}} currentRolesAtributos={data?.roles_atributos || {}} currentFotosHabilitadas={data?.fotos_habilitadas} />
      <ModalEditItemInventory open={isEditItemModalOpen} onClose={() => { setIsEditItemModalOpen(false); setSelectedItem(null); }} item={selectedItem} atributosRequeridos={data?.atributos || {}} fotosHabilitadas={data?.fotos_habilitadas} />
      <ModalBulkEdit visible={isBulkModalVisible} onClose={() => setIsBulkModalVisible(false)} selectedIds={selectedRowKeys} atributosInventario={Object.entries(data?.atributos || {}).map(([key, val]: any) => ({ nombre: key, tipo: val }))} onSuccess={() => { refetch(); setSelectedRowKeys([]); }} />
      <ModalStatsInventory open={isStatsModalOpen} onClose={() => setIsStatsModalOpen(false)} inventoryId={Number(id)} />
    </div>
  );
};

export default InventoryPage;