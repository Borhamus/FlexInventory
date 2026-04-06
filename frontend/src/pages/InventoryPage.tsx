import React, { useState } from 'react';
import { useInventory } from '../hooks/useInventory';
import dayjs from 'dayjs';
import { Alert, Card, Spin, Table, Tag, Typography, Button, Space } from 'antd';
import { useParams } from 'react-router-dom';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ModalAddItem } from '../components/ModalAddItem';

const { Title } = Typography;

const InventoryPage: React.FC = () => {
  const { id } = useParams();
  const { data, isLoading, error } = useInventory(Number(id));
  
  // EL INTERRUPTOR DEL MODAL
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    render: () => (
      <Space size="small">
        <Button type="text" icon={<EditOutlined />} />
        <Button type="text" icon={<DeleteOutlined />} danger />
      </Space>
    )
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      <Card style={{ flexGrow: 1, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            Inventario: {data?.nombre}
          </Title>
          <Tag color="blue">ID: {data?.id}</Tag>
        </div>

        <Table
          columns={columns}
          dataSource={data?.items ?? []}
          rowKey="id"
          pagination={false}
          bordered
        />

        {/* Botonera Inferior */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <Button type="primary" style={{ background: '#6b5b95', borderRadius: 20 }} onClick={() => setIsModalOpen(true)} > Agregar Articulo </Button>
          <Button shape="round" style={{ background: '#f5f5f5', border: 'none' }}>+ Editar Inventario</Button>
        </div>

      </Card>

      {/* COMPONENTE INVISIBLE ESPERANDO */}
      <ModalAddItem 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default InventoryPage;