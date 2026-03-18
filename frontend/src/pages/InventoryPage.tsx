import React from 'react';
import { useInventory } from '../hooks/useInventory';
import dayjs from 'dayjs'; // Antd recomienda dayjs para fechas
import { Alert, Card, Spin, Table, Tag, Typography } from 'antd';
import { useParams } from 'react-router-dom';

const { Title } = Typography;

const InventoryPage: React.FC = () => {
  // Hardcodeamos el ID 1 por ahora como en tu curl
  const { id } = useParams();
  const { data, isLoading, error } = useInventory(Number(id));

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error) return <Alert message="Error" description="No se pudo cargar el inventario" type="error" showIcon />;

  // Columnas fijas que todo item tiene
  const columns: any[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (text: string) => <a>{text}</a>,
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
    },
  ];

  // Columnas dinámicas: una por cada atributo definido en el inventario
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

  return (
    <Card>
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
    </Card>
  );
};

export default InventoryPage;