import React, { useMemo, useState } from 'react';
import { useInventory, useDeleteInventory, useDeleteItem } from '../hooks/useInventory';
import dayjs from 'dayjs';
import { Alert, Card, Spin, Table, Tag, Typography, Button, Space, Popconfirm, message, Input, Result } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { ModalAddItemInventory } from '../components/ModalAddItemInventory';
import { ModalEditItemInventory } from '../components/ModalEditItemInventory';
import { ModalEditInventory } from '../components/ModalEditInventory';
import { useAuthContext } from '../context/AuthContext';

const { Title } = Typography;

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

  const navigate = useNavigate();


  const columns = useMemo(() => {

    if (!data?.items) return [];

    // 1. Columnas estáticas iniciales
    const cols: any[] = [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 70, align: 'center' },
      { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
      { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad', align: 'center' },
    ];
  
    // 2. Columnas dinámicas (Tus atributos: Color, Vencimiento, etc.)
    if (data?.atributos) {
      Object.keys(data.atributos).forEach((key) => {
        cols.push({
          title: key.charAt(0).toUpperCase() + key.slice(1),
          dataIndex: ['atributos', key], // Busca dentro del JSON de la DB
          key: key,
          render: (value: any) => 
            (value !== undefined && value !== null && value !== '') 
              ? value 
              : <Tag color="default">N/A</Tag>,
        });
      });
    }

    // 3. Columna de fecha (Tu captura)
    cols.push({
      title: 'Creado el',
      dataIndex: 'creado_en',
      key: 'creado_en',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    });
  
    // 4. Columna de Acciones (SIEMPRE AL FINAL)
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
  
    return cols;
  }, [data, isTenant, hasPermission]); // Se recalcula si cambian los datos o permisos

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
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
              <Input
                placeholder="Buscar artículo..."
                prefix={<SearchOutlined />}
                style={{ width: 300 }}
              />
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={data?.items ?? []}
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
          atributosRequeridos={Object.keys(data?.atributos || {})}
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
          atributosRequeridos={Object.keys(data?.atributos || {})}
        />

      </div>
    );
  };

  export default InventoryPage;