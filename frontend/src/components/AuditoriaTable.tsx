import React from 'react';
import { Table, Tag, Typography, Button, Popconfirm, message } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthContext } from '../context/AuthContext';
import { auditoriaService, type AuditLog } from '../api/auditoria.service'; 

const { Text } = Typography;

interface AuditoriaTableProps {
  data: AuditLog[];
  loading: boolean;
  pagination: TablePaginationConfig;
  onChange: (pagination: TablePaginationConfig) => void;
}

// ─── DICCIONARIO DE TRADUCCIÓN PARA EL TENANT ──────────────────────────
const traduccionMetodos: Record<string, string> = {
  POST: 'CREACIÓN',
  PUT: 'EDICIÓN',
  PATCH: 'EDICIÓN',
  DELETE: 'ELIMINACIÓN',
};
// ───────────────────────────────────────────────────────────────────────

// La fila desplegable muestra únicamente los cambios aplicados: el resumen
// que arma el backend ya viene legible ("Campo: viejo ➔ nuevo"), así que
// volcar además el payload crudo de la request solo repetía la misma
// información en un formato más difícil de leer.
const DetalleAuditoria: React.FC<{ record: AuditLog }> = ({ record }) => {
  const cambios = record.resumen ? record.resumen.split(' | ') : [];

  if (cambios.length === 0) {
    return <Text type="secondary" italic>Sin datos adicionales para mostrar.</Text>;
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <Text strong style={{ display: 'block', marginBottom: 6 }}>Cambios</Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {cambios.map((linea, i) => (
          <Text key={i} type="secondary">{linea}</Text>
        ))}
      </div>
    </div>
  );
};
// ───────────────────────────────────────────────────────────────────────

const AuditoriaTable: React.FC<AuditoriaTableProps> = ({ data, loading, pagination, onChange }) => {

  const { isTenant } = useAuthContext();

  const handleVaciarHistorial = async () => {
    try {
      await auditoriaService.vaciarHistorial();
      message.success('Historial de operaciones vaciado correctamente');
    } catch (error) {
      console.error(error);
      message.error('No se pudo vaciar el historial');
    }
  };

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Fecha y Hora',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm'),
      width: 160,
    },
    {
      title: 'Usuario',
      dataIndex: 'usuario',
      key: 'usuario',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Acción Realizada',
      dataIndex: 'accion',
      key: 'accion',
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: 'Afectó a',
      dataIndex: 'entidad_afectada',
      key: 'entidad_afectada',
      render: (text) => <Text strong>{text || '-'}</Text>,
    },
    {
      title: 'Tipo de Movimiento',
      dataIndex: 'metodo',
      key: 'metodo',
      render: (metodo: string) => {
        let color = 'default';
        if (metodo === 'POST') color = 'green';
        if (metodo === 'PUT' || metodo === 'PATCH') color = 'orange';
        if (metodo === 'DELETE') color = 'volcano';

        const textoLegible = traduccionMetodos[metodo] || metodo;

        return <Tag color={color}>{textoLegible}</Tag>;
      },
      width: 160,
    },
  ];

  return (
    <>

    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      size="middle"
      pagination={pagination}
      onChange={onChange}
      expandable={{
        expandedRowRender: (record) => <DetalleAuditoria record={record} />,
        rowExpandable: (record) => Boolean(record.resumen),
      }}
    />

    <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 16 
        }}
    >

      {isTenant && (
        <Popconfirm
          title="¿Vaciar historial completo?"
          description="Esta acción es irreversible y eliminará todos los registros."
          onConfirm={handleVaciarHistorial}
          okText="Sí, vaciar"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
          placement="left"
        >
          <Button type="primary" danger icon={<DeleteOutlined />}>
            Vaciar Historial
          </Button>
        </Popconfirm>
      )}
    </div>

    </>
  );
};

export default AuditoriaTable;