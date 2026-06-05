import React from 'react';
import { Table, Tag, Typography, Descriptions } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';

const { Text } = Typography;

export interface AuditLog {
  id: number;
  usuario_id: number;
  usuario: string;
  endpoint: string;
  metodo: string;
  accion: string;
  payload_cambios: any;
  fecha: string;
}

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

const AuditoriaTable: React.FC<AuditoriaTableProps> = ({ data, loading, pagination, onChange }) => {
  
  // Función helper para capitalizar la primera letra y limpiar guiones bajos
  const limpiarTexto = (texto: string) => {
    return texto.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Fecha y Hora',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm:ss'),
      width: 160,
    },
    {
      title: 'Usuario',
      dataIndex: 'usuario',
      key: 'usuario',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      // El "endpoint" lo sacamos de la vista principal porque al tenant no le sirve de mucho,
      // con la "Acción" (ej: "Editar Artículo") ya entiende qué pasó.
      title: 'Acción Realizada',
      dataIndex: 'accion',
      key: 'accion',
      render: (text) => <Text>{text}</Text>,
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
        
        // Buscamos la traducción, si por algún motivo llega algo raro, muestra el original
        const textoLegible = traduccionMetodos[metodo] || metodo;
        
        return <Tag color={color}>{textoLegible}</Tag>;
      },
      width: 160,
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      size="middle"
      pagination={pagination}
      onChange={onChange}
      expandable={{
        expandedRowRender: (record) => {
          const payload = record.payload_cambios;
          
          return (
            <div style={{ backgroundColor: '#fafafa', padding: '16px', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
              <Text strong style={{ display: 'block', marginBottom: '12px', color: '#1890ff' }}>
                Detalle de los datos registrados:
              </Text>
              
              {/* Iteramos el JSON y lo mostramos como una lista de descripciones amigable */}
              <Descriptions size="small" column={{ xxl: 3, xl: 3, lg: 2, md: 1, sm: 1, xs: 1 }} bordered>
                {Object.entries(payload).map(([key, value]) => {
                  // Si el valor es un objeto anidado (como los "atributos" dinámicos), lo pasamos a string
                  const valorMostrar = typeof value === 'object' && value !== null 
                    ? JSON.stringify(value) 
                    : String(value);

                  return (
                    <Descriptions.Item key={key} label={limpiarTexto(key)}>
                      {valorMostrar}
                    </Descriptions.Item>
                  );
                })}
              </Descriptions>
            </div>
          );
        },
        rowExpandable: (record) => record.payload_cambios !== null && Object.keys(record.payload_cambios).length > 0,
      }}
    />
  );
};

export default AuditoriaTable;