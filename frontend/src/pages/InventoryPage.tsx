import React, { useState } from 'react';
import { useInventory, useDeleteInventory } from '../hooks/useInventory';
import dayjs from 'dayjs';
import { Alert, Card, Spin, Table, Tag, Typography, Button, Space, Popconfirm, message, Input, Tooltip } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { ModalAddItem } from '../components/ModalAddItem';
import { ModalEditInventory } from '../components/ModalEditInventory';

const { Title } = Typography;

const InventoryPage: React.FC = () => {

  const { id } = useParams();
  const { data, isLoading, error } = useInventory(Number(id));
  const { mutate: deleteInventory, isPending } = useDeleteInventory();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const navigate = useNavigate();

  const datosFicticios = [
    {
      id: 1,
      nombre: "Remera Oversize Básica",
      cantidad: 45,
      atributos: { color: "Negro", talle: "L" },
      creado_en: "2026-04-06T10:00:00Z"
    },
    {
      id: 1,
      nombre: "Remera Oversize Básica",
      cantidad: 45,
      atributos: { color: "Negro", talle: "L" },
      creado_en: "2026-04-06T10:00:00Z"
    },
    {
      id: 1,
      nombre: "Remera Oversize Básica",
      cantidad: 45,
      atributos: { color: "Negro", talle: "L" },
      creado_en: "2026-04-06T10:00:00Z"
    },
    {
      id: 1,
      nombre: "Remera Oversize Básica",
      cantidad: 45,
      atributos: { color: "Negro", talle: "L" },
      creado_en: "2026-04-06T10:00:00Z"
    },
    {
      id: 1,
      nombre: "Remera Oversize Básica",
      cantidad: 45,
      atributos: { color: "Negro", talle: "L" },
      creado_en: "2026-04-06T10:00:00Z"
    },
    {
      id: 1,
      nombre: "Remera Oversize Básica",
      cantidad: 45,
      atributos: { color: "Negro", talle: "L" },
      creado_en: "2026-04-06T10:00:00Z"
    },
    {
      id: 1,
      nombre: "Remera Oversize Básica",
      cantidad: 45,
      atributos: { color: "Negro", talle: "L" },
      creado_en: "2026-04-06T10:00:00Z"
    },
    {
      id: 1,
      nombre: "Remera Oversize Básica",
      cantidad: 45,
      atributos: { color: "Negro", talle: "L" },
      creado_en: "2026-04-06T10:00:00Z"
    },
    {
      id: 1,
      nombre: "Remera Oversize Básica",
      cantidad: 45,
      atributos: { color: "Negro", talle: "L" },
      creado_en: "2026-04-06T10:00:00Z"
    },
    {
      id: 1,
      nombre: "Remera Oversize Básica",
      cantidad: 45,
      atributos: { color: "Negro", talle: "L" },
      creado_en: "2026-04-06T10:00:00Z"
    },
  ]

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error) return <Alert message="Error" description="No se pudo cargar el inventario" type="error" showIcon />;

  const columns: any[] = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70, align: 'center' },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad', align: 'center' },
  ];

  if (data?.atributos) {
    Object.keys(data.atributos).forEach((key) => {
      columns.push({
        title: key.charAt(0).toUpperCase() + key.slice(1),
        dataIndex: ['atributos', key],
        key: key,
        render: (value: any) => (value !== undefined && value !== null && value !== '') ? value : <Tag color="default">N/A</Tag>,
      });
    });
  }

  columns.push({
    title: 'Creado el',
    dataIndex: 'creado_en',
    key: 'creado_en',
    render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
  });

  columns.push({
    title: 'Acciones',
    key: 'acciones',
    align: 'center',
    // 1. Agregamos '_', 'record' como parámetros de la función
    render: (_: any, record: any) => (
      <Space size="small">
        <Button
          type="text"
          icon={<EditOutlined />}
          // 2. Le pasamos el ID específico de esta fila al onClick
          onClick={() => console.log('Editar item:', record.id)}
        />
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          // 3. Lo mismo para eliminar
          onClick={() => console.log('Eliminar item:', record.id)}
        />
      </Space>
    )
  });

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
          dataSource={datosFicticios}
          //dataSource={data?.items ?? []}
          rowKey="id"
          bordered
          pagination={{
            pageSize: 10,
            style: { marginBottom: 0, marginTop: 15 }
          }}
          scroll={{ y: 'calc(90vh - 200px)' }}
          footer={() => (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}> Agregar Artículo </Button>
            </div>
          )}
        />

      </Card>

      <ModalAddItem
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <ModalEditInventory 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        inventoryId={Number(id)}
        currentName={data?.nombre || ''}
      />

    </div>
  );
};

export default InventoryPage;