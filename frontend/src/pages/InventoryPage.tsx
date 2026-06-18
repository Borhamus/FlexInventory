import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Spin, Tag, Typography, Button, Space, Popconfirm, message, Input, Result, Popover, Checkbox, Divider, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ControlOutlined } from '@ant-design/icons';
import { useInventory, useDeleteInventory, useDeleteItem } from '../hooks/useInventory';
import { useAuthContext } from '../context/AuthContext';

import { ModalAddItemInventory } from '../components/ModalAddItemInventory';
import { ModalEditItemInventory } from '../components/ModalEditItemInventory';
import { ModalEditInventory } from '../components/ModalEditInventory';
import ModalBulkEdit from '../components/ModalBulkEditItems';
import { InventoryTable } from '../components/InventoryTable'; 

const { Title, Text } = Typography;

const InventoryPage: React.FC = () => {
  const { hasPermission, isTenant } = useAuthContext();
  const { id } = useParams();
  const navigate = useNavigate();

  // Queries y Mutations
  const { data, isLoading, error, refetch } = useInventory(Number(id));
  const { mutate: deleteInventory, isPending } = useDeleteInventory();
  const { mutate: deleteItem } = useDeleteItem();

  // Estados de Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Estados de la Tabla
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnSearch, setColumnSearch] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

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
            {canAddItems && (
              <Tooltip title="Agregar Artículo">
                <Button type='primary' icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)} />
              </Tooltip>
            )}
          </div>
        </div>

        {/* ACCIONES MASIVAS */}
        {selectedRowKeys.length > 0 && (
          <div style={{ padding: '16px', marginBottom: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Seleccionaste <b>{selectedRowKeys.length}</b> artículos.</span>
            <Button type="primary" onClick={() => setIsBulkModalVisible(true)}>Editar Atributo Masivamente</Button>
          </div>
        )}

        {/* LLAMAMOS AL COMPONENTE DE LA TABLA */}
        <InventoryTable 
          items={data?.items || []}
          atributos={data?.atributos || {}}
          searchTerm={searchTerm}
          hiddenColumns={hiddenColumns}
          selectedRowKeys={selectedRowKeys}
          setSelectedRowKeys={setSelectedRowKeys}
          onEditItem={handleEditItem}
          onDeleteItem={handleDeleteItem}
        />

      </div>

      {/* MODALES */}
      <ModalAddItemInventory open={isModalOpen} onClose={() => setIsModalOpen(false)} inventoryId={Number(id)} atributosRequeridos={data?.atributos || {}} />
      <ModalEditInventory isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} inventoryId={Number(id)} currentName={data?.nombre || ''} currentAtributos={data?.atributos || {}} />
      <ModalEditItemInventory open={isEditItemModalOpen} onClose={() => { setIsEditItemModalOpen(false); setSelectedItem(null); }} item={selectedItem} atributosRequeridos={data?.atributos || {}} />
      <ModalBulkEdit visible={isBulkModalVisible} onClose={() => setIsBulkModalVisible(false)} selectedIds={selectedRowKeys} atributosInventario={Object.entries(data?.atributos || {}).map(([key, val]: any) => ({ nombre: key, tipo: val }))} onSuccess={() => { refetch(); setSelectedRowKeys([]); }} />
    </div>
  );
};

export default InventoryPage;