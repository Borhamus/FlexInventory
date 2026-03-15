import React from 'react';
import { useInventory } from '../hooks/useInventory';
import dayjs from 'dayjs'; // Antd recomienda dayjs para fechas
import { Alert, Card, Spin, Table, Tag, Typography } from 'antd';

const { Title } = Typography;

const InventoryPage: React.FC = () => {
  // Hardcodeamos el ID 1 por ahora como en tu curl
  const { data, isLoading, error } = useInventory(1);

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error) return <Alert message="Error" description="No se pudo cargar el inventario" type="error" showIcon />;

  // --- LÓGICA DE COLUMNAS DINÁMICAS ---
  const dynamicColumns = [
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
  ];

  // Agregamos una columna por cada atributo dinámico (color, talle, etc)
  if (data?.atributos) {
    Object.keys(data.atributos).forEach((key) => {
      dynamicColumns.push({
        title: key.toUpperCase(),
        dataIndex: ['atributos', key], // Acceso a objeto anidado
        key: key,
        render: (value: any) => value || <Tag color="default">N/A</Tag>,
      });
    });
  }

  dynamicColumns.push({
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
        columns={dynamicColumns} 
        dataSource={data ? [data] : []} // El API devuelve un objeto, Table espera un array
        rowKey="id"
        pagination={false}
        bordered
      />
    </Card>
  );
};

export default InventoryPage;