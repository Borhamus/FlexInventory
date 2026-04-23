import React, { useMemo, useState } from 'react';
import { useInventory, useDeleteInventory, useDeleteItem } from '../hooks/useInventory';
import dayjs from 'dayjs';
import { Alert, Card, Spin, Table, Tag, Typography, Button, Space, Popconfirm, message, Input, Result, Popover, Checkbox, Divider, Tooltip } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ControlOutlined } from '@ant-design/icons';
import { ModalAddItemInventory } from '../components/ModalAddItemInventory';
import { ModalEditItemInventory } from '../components/ModalEditItemInventory';
import { ModalEditInventory } from '../components/ModalEditInventory';
import { useAuthContext } from '../context/AuthContext';

const { Title, Text } = Typography;

const InventoryPage: React.FC = () => {
  const { hasPermission, isTenant } = useAuthContext();
  const { id } = useParams();
  const { data, isLoading, error } = useInventory(Number(id));
  const { mutate: deleteInventory, isPending } = useDeleteInventory();
  const { mutate: deleteItem } = useDeleteItem();


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnSearch, setColumnSearch] = useState('');

  const navigate = useNavigate();


  const columns = useMemo(() => {

    if (!data?.items) return [];

    // 1. Columnas estáticas iniciales
    const cols: any[] = [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 70, align: 'center' },
      { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', align: 'center' },
      { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad', align: 'center' },
    ];

    // 2. Columnas dinámicas (Tus atributos: Color, Vencimiento, etc.)
    if (data?.atributos) {
      Object.keys(data.atributos).forEach((key) => {
        cols.push({
          title: key.charAt(0).toUpperCase() + key.slice(1),
          dataIndex: ['atributos', key], 
          key: key,
          align: 'center',
          render: (value: any) => { 
            
            if (typeof value === 'boolean') {
              return <Tag color={value ? 'green' : 'red'}>{value ? 'Sí' : 'No'}</Tag>;
            }
            
            return (value !== undefined && value !== null && value !== '') 
              ? String(value) 
              : <Tag color="default">N/A</Tag>;
          }
        });
      });
    }

    // 3. Columna de fecha 
    cols.push({
      title: 'Creado el',
      dataIndex: 'creado_en',
      key: 'creado_en',
      align: 'center',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    });

    // 4. Columna de Acciones
    cols.push({
      title: 'Acciones',
      key: 'acciones',
      align: 'center',
      fixed: 'right',
      width: 100,
      render: (_: any, record: any) => {
        const canEdit = isTenant || hasPermission('items', 'update');
        const canDelete = isTenant || hasPermission('items', 'delete');

        if (!canEdit && !canDelete) return null;

        return (
          <Space size="small">
            {canEdit && (
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => {
                  setSelectedItem(record);
                  setIsEditItemModalOpen(true);
                }}
              />
            )}
            {canDelete && (
              <Popconfirm
                title="¿Eliminar artículo?"
                onConfirm={() => {
                  if (deleteItem) {
                    deleteItem(record.id);
                  }
                }
                }
                okText="Sí"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </Space>
        );
      }
    });

    const columnasVisibles = cols.filter(
      (col) => !hiddenColumns.includes(col.key as string) || ['id', 'nombre', 'acciones'].includes(col.key as string)
    );

    return columnasVisibles;
  }, [data, isTenant, hasPermission, hiddenColumns]); // Se recalcula si cambian los datos o permisos

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    let itemsAFiltrar = data.items;

    return [...itemsAFiltrar].sort((a: any, b: any) => a.id - b.id);
  }, [data?.items, searchTerm]);

  const handleDelete = () => {
    deleteInventory(Number(id), {
      onSuccess: () => {
        message.success('Inventario eliminado correctamente');
        navigate('/dashboard/inventario');
      },
      onError: (error) => {
        console.error("Error al borrar:", error);
        message.error('No se pudo eliminar el inventario. Verificá que esté vacío.');
      }
    });
  }

  if (!isTenant && !hasPermission('items', 'read')) {
    return (
      <Result
        status="403"
        title="Sin acceso"
        subTitle="No tenés permiso para ver los artículos. Hablá con el administrador."
      />
    );
  }

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error) return <Alert message="Error" description="No se pudo cargar el inventario" type="error" showIcon />;



  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      <Card style={{ flexGrow: 1, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>

        <Space size="small">

          <Title level={3} style={{ margin: 0 }}>
            {data?.nombre}
          </Title>

          {/* EDITAR INVENTARIO*/}
          <Button
            type="default"
            shape="circle"
            icon={<EditOutlined />}
            onClick={() => setIsEditModalOpen(true)}
          />

          {/* ELIMINAR INVENTARIO*/}
          <Popconfirm
            title="Eliminar Inventario"
            description="¿Estás seguro de que querés borrar este inventario? Esta operacion es irreversible! "
            onConfirm={handleDelete}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true, loading: isPending }}
          >
            <Button
              danger
              type="primary"
              shape="circle"
              icon={<DeleteOutlined />}
            />
          </Popconfirm>

          {/* ID DEL INVENTARIO */}
          <Tag color="blue" style={{ margin: 0, padding: '4px 8px', fontSize: '14px' }}>
            ID: {data?.id}
          </Tag>

        </Space>



        {/* --- BARRA DE HERRAMIENTAS SUPERIOR --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 10 }}>
          {/* 1. IZQUIERDA: Buscador */}
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
              placement="bottomLeft"
              content={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 220 }}>

                  {/* 1. EL BUSCADOR INTERNO (Exclusivo para las columnas) */}
                  <Input
                    placeholder="Buscar columna..."
                    prefix={<SearchOutlined />}
                    value={columnSearch}
                    onChange={(e) => setColumnSearch(e.target.value)}
                    allowClear
                    size="small" // Clave para que se vea como un sub-buscador
                  />

                  {/* 2. FECHA DE CREACIÓN */}
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

                  {/* 3. CONTENEDOR CON SCROLL */}
                  <div style={{
                    maxHeight: 250,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    paddingRight: 4
                  }}>
                    {/* Renderizamos solo los atributos que coinciden con el mini-buscador */}
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

                    {/* Mensaje de "No encontrado" si tipea algo que no existe */}
                    {data?.atributos &&
                      Object.keys(data.atributos).filter(k => k.toLowerCase().includes(columnSearch.toLowerCase())).length === 0 && (
                        <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
                          No hay coincidencias
                        </Text>
                      )}
                  </div>
                </div>
              }
            >
              <Tooltip title="Configurar columnas">
                <Button
                  icon={<ControlOutlined />}
                />
              </Tooltip>
            </Popover>
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={filteredItems}
          rowKey="id"
          bordered
          pagination={{
            pageSize: 10,
            style: { marginBottom: 0, marginTop: 15 }
          }}
          scroll={{
            y: 'calc(90vh - 200px)',
            x: 'max-content'
          }}
          footer={() => {
            const canAddItems = isTenant || hasPermission('items', 'create');
            return canAddItems ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                  Agregar Artículo
                </Button>
              </div>
            ) : null;
          }}
        />

      </Card>

      <ModalAddItemInventory
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        inventoryId={Number(id)}
        atributosRequeridos={data?.atributos || {}}
      />

      <ModalEditInventory
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        inventoryId={Number(id)}
        currentName={data?.nombre || ''}
        currentAtributos={data?.atributos || {}}
      />

      <ModalEditItemInventory
        open={isEditItemModalOpen}
        onClose={() => {
          setIsEditItemModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        atributosRequeridos={data?.atributos || {}}
      />

    </div>
  );
};

export default InventoryPage;