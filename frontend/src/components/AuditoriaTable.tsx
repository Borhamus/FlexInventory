import React from 'react';
import { Table, Tag, Typography, Button, Popconfirm, message, Descriptions } from 'antd';
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

const ETIQUETAS: Record<string, string> = {
  nombre: 'Nombre',
  cantidad: 'Stock',
  descripcion: 'Descripción',
  inventario_id: 'Inventario',
  catalogo_id: 'Catálogo',
  item_id: 'Artículo',
  item_ids: 'Artículos',
  fotos_habilitadas: 'Fotos habilitadas',
  roles_atributos: 'Roles de atributos',
  bloques_personalizados: 'Bloques personalizados',
  defaults: 'Valores por defecto',
  atributos: 'Atributos',
};

const humanizarClave = (k: string): string =>
  ETIQUETAS[k] ?? k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const humanizarValor = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v);
};

interface FilaDetalle {
  label: string;
  value: string;
}

const formatearDetalle = (payload: unknown): FilaDetalle[] => {
  if (!payload || typeof payload !== 'object') return [];
  const filas: FilaDetalle[] = [];

  for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(v)) {
      const n = v.length;
      const sustantivo =
        k === 'item_ids' ? (n === 1 ? 'artículo' : 'artículos')
        : k === 'bloques_personalizados' ? (n === 1 ? 'bloque' : 'bloques')
        : (n === 1 ? 'elemento' : 'elementos');
      filas.push({ label: humanizarClave(k), value: `${n} ${sustantivo}` });
    } else if (v && typeof v === 'object') {
      const prefijo = k === 'atributos' ? '' : `${humanizarClave(k)} · `;
      for (const [nk, nv] of Object.entries(v as Record<string, unknown>)) {
        filas.push({ label: `${prefijo}${humanizarClave(nk)}`, value: humanizarValor(nv) });
      }
    } else {
      filas.push({ label: humanizarClave(k), value: humanizarValor(v) });
    }
  }
  return filas;
};

const DetalleAuditoria: React.FC<{ record: AuditLog }> = ({ record }) => {
  const cambios = record.resumen ? record.resumen.split(' | ') : [];
  const filas = formatearDetalle(record.payload_cambios);

  if (cambios.length === 0 && filas.length === 0) {
    return <Text type="secondary" italic>Sin datos adicionales para mostrar.</Text>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
      {cambios.length > 0 && (
        <div>
          <Text strong style={{ display: 'block', marginBottom: 6 }}>Cambios</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {cambios.map((linea, i) => (
              <Text key={i} type="secondary">{linea}</Text>
            ))}
          </div>
        </div>
      )}

      {filas.length > 0 && (
        <div>
          <Text strong style={{ display: 'block', marginBottom: 6 }}>Datos de la operación</Text>
          <Descriptions size="small" column={1} bordered style={{ maxWidth: 520 }}>
            {filas.map((f, i) => (
              <Descriptions.Item key={i} label={f.label}>{f.value}</Descriptions.Item>
            ))}
          </Descriptions>
        </div>
      )}
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
        rowExpandable: (record) =>
          Boolean(record.resumen) || formatearDetalle(record.payload_cambios).length > 0,
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