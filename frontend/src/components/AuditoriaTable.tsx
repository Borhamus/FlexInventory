import React, { useState } from 'react';
import { Table, Tag, Typography, Button, Popconfirm, message, Tooltip, Input, Space } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthContext } from '../context/AuthContext';
import { auditoriaService, type AuditLog } from '../api/auditoria.service';

const { Text } = Typography;

interface AuditoriaTableProps {
  data: AuditLog[];
  loading: boolean;
  pagination: TablePaginationConfig;
  onChange: (pagination: TablePaginationConfig) => void;
  // Se llama después de vaciar el historial para que el padre recargue la
  // tabla (que queda vacía) — si no, seguía mostrando los registros viejos.
  onVaciado?: () => void;
}

// ─── Interpretación de un registro ─────────────────────────────────────
// El backend guarda tres campos que se pisan entre sí (accion, metodo,
// entidad_afectada) y esconde lo único descriptivo (resumen). Acá se
// reducen a una sola frase: "[Verbo] Tipo Nombre — detalle". El verbo y
// el color salen del TEXTO de `accion`, no del método HTTP: por método,
// "agregar a catálogo" salía como CREACIÓN y "sacar del catálogo" o
// "borrar la foto" como ELIMINACIÓN en rojo, cuando el artículo sigue
// existiendo.

interface Interpretacion {
  verbo: string;
  color: string;
}

const interpretarAccion = (log: AuditLog): Interpretacion => {
  const a = log.accion.toLowerCase();
  if (a.includes('foto')) {
    return { verbo: log.metodo === 'DELETE' ? 'Quitó la foto de' : 'Cambió la foto de', color: 'purple' };
  }
  if (a.includes('agregar') && a.includes('catálogo')) return { verbo: 'Agregó al catálogo', color: 'blue' };
  if (a.includes('remover') && a.includes('catálogo')) return { verbo: 'Quitó del catálogo', color: 'blue' };
  const masivo = a.includes('masivo') ? ' en masa' : '';
  if (a.startsWith('crear'))    return { verbo: `Creó${masivo}`,    color: 'green' };
  if (a.startsWith('editar'))   return { verbo: `Editó${masivo}`,   color: 'orange' };
  if (a.startsWith('eliminar')) return { verbo: `Eliminó${masivo}`, color: 'volcano' };
  return { verbo: log.accion, color: 'default' };
};

// El backend arma entidad_afectada como cadena "Tipo: Nombre · Tipo: Nombre"
// (SEP_ENTIDADES en auditor.py): el artículo, de qué inventario es y a qué
// catálogo fue. Se parte por el mismo separador. Los registros viejos, con
// una sola entidad, entran igual (cadena de un elemento).
const SEP_ENTIDADES = ' · ';

interface Entidad { tipo: string; nombre: string }

const partirEntidades = (entidad: string | null | undefined): Entidad[] => {
  if (!entidad) return [{ tipo: '', nombre: '—' }];
  return entidad.split(SEP_ENTIDADES).map((parte) => {
    const idx = parte.indexOf(':');
    if (idx === -1) return { tipo: '', nombre: parte.trim() };
    return { tipo: parte.slice(0, idx).trim(), nombre: parte.slice(idx + 1).trim() };
  });
};

// Resúmenes ceremoniales del backend que solo repiten el verbo: no aportan
// nada al lado de "Creó" / "Eliminó" / "Quitó la foto", así que no se muestran.
const RESUMENES_VACIOS = new Set([
  'Registro inicial creado', 'Registro creado', 'Registro actualizado',
  'Registro eliminado', 'Eliminado permanentemente', 'Removido del catálogo',
  'Agregado al catálogo', 'Foto actualizada', 'Foto eliminada',
]);

// Segmentos ("a | b | c") del resumen que sí dicen algo, ya limpios.
const segmentosUtiles = (resumen: string | null | undefined): string[] =>
  (resumen ?? '')
    .split(' | ')
    .map((s) => s.trim())
    .filter((s) => s && !RESUMENES_VACIOS.has(s));

// "Hoy 20:03" / "Ayer 19:15" / "12/09 22:06" / "12/09/2025 22:06". La fecha
// completa va en un tooltip.
const fechaCorta = (iso: string): string => {
  const d = dayjs(iso);
  const hoy = dayjs();
  if (d.isSame(hoy, 'day')) return `Hoy ${d.format('HH:mm')}`;
  if (d.isSame(hoy.subtract(1, 'day'), 'day')) return `Ayer ${d.format('HH:mm')}`;
  return d.format(d.isSame(hoy, 'year') ? 'DD/MM HH:mm' : 'DD/MM/YYYY HH:mm');
};

// ─── Fila desplegable: el detalle completo, un cambio por línea ─────────
const DetalleAuditoria: React.FC<{ record: AuditLog }> = ({ record }) => {
  const cambios = segmentosUtiles(record.resumen);
  return (
    <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {cambios.map((linea, i) => (
        <Text key={i} type="secondary">{linea}</Text>
      ))}
    </div>
  );
};
// ───────────────────────────────────────────────────────────────────────

const AuditoriaTable: React.FC<AuditoriaTableProps> = ({ data, loading, pagination, onChange, onVaciado }) => {

  const { isTenant } = useAuthContext();
  // Filtro local sobre la página cargada (el backend no filtra todavía).
  const [busqueda, setBusqueda] = useState('');

  const handleVaciarHistorial = async () => {
    try {
      await auditoriaService.vaciarHistorial();
      message.success('Historial de operaciones vaciado correctamente');
      onVaciado?.();
    } catch (error) {
      console.error(error);
      message.error('No se pudo vaciar el historial');
    }
  };

  const q = busqueda.trim().toLowerCase();
  const filas = q
    ? data.filter((log) =>
        [log.usuario, log.accion, log.entidad_afectada, log.resumen]
          .some((campo) => (campo ?? '').toLowerCase().includes(q)))
    : data;

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 130,
      render: (iso: string) => (
        <Tooltip title={dayjs(iso).format('DD/MM/YYYY HH:mm:ss')}>
          <Text style={{ whiteSpace: 'nowrap' }}>{fechaCorta(iso)}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Usuario',
      dataIndex: 'usuario',
      key: 'usuario',
      width: 140,
      ellipsis: true,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Movimiento',
      key: 'movimiento',
      render: (_, log) => {
        const { verbo, color } = interpretarAccion(log);
        const entidades = partirEntidades(log.entidad_afectada);
        // La fila dice solo qué pasó y a qué; los cambios en sí viven en el
        // desplegable (habilitado cuando hay alguno — ver rowExpandable).
        return (
          <Space size={6} wrap>
            <Tag color={color} style={{ marginInlineEnd: 0 }}>{verbo}</Tag>
            {entidades.map((e, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Text type="secondary">·</Text>}
                {e.tipo && <Text type="secondary">{e.tipo.toLowerCase()}</Text>}
                <Text strong>{e.nombre}</Text>
              </React.Fragment>
            ))}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          allowClear
          placeholder="Filtrar por usuario, artículo, catálogo o cambio…"
          prefix={<SearchOutlined />}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 420 }}
        />
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
            <Button danger icon={<DeleteOutlined />}>
              Vaciar historial
            </Button>
          </Popconfirm>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={filas}
        rowKey="id"
        loading={loading}
        size="middle"
        pagination={pagination}
        onChange={onChange}
        expandable={{
          expandedRowRender: (record) => <DetalleAuditoria record={record} />,
          // Solo se puede expandir cuando el detalle tiene más de un cambio —
          // con uno solo ya se ve entero en la fila.
          rowExpandable: (record) => segmentosUtiles(record.resumen).length > 0,
        }}
      />
    </>
  );
};

export default AuditoriaTable;
