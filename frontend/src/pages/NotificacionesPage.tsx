import React, { useState } from 'react';
import { Typography, Card, Table, Tag, Button, Segmented, Select, Space, theme } from 'antd';
import { CheckOutlined, BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import {
  useNotificaciones,
  useMarcarNotificacionLeida,
  useMarcarTodasNotificacionesLeidas,
} from '../hooks/useNotificaciones';
import { useInventories } from '../hooks/useInventory';
import type { Notificacion } from '../api/notificaciones.service';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Title, Text } = Typography;

// Mismo criterio de color que ya usa AlertasVencimiento (rojo = ya pasó/fuera
// de rango, amarillo = ventana de recordatorio) — acá se deriva del "evento"
// guardado en vez de recalcularse, porque ya viene resuelto del backend.
const COLOR_POR_EVENTO: Record<Notificacion['evento'], string> = {
  vencido: 'error',
  minimo: 'error',
  maximo: 'error',
  recordatorio: 'warning',
};

const TEXTO_POR_EVENTO: Record<Notificacion['evento'], string> = {
  vencido: 'Vencido',
  minimo: 'Por debajo del mínimo',
  maximo: 'Por encima del máximo',
  recordatorio: 'Recordatorio',
};

type Filtro = 'no-leidas' | 'todas';

const NotificacionesPage: React.FC = () => {
  const { token } = theme.useToken();
  const navigate = useNavigate();

  const [filtro, setFiltro] = useState<Filtro>('no-leidas');
  const [inventarioId, setInventarioId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: inventarios = [] } = useInventories();

  const { data, isLoading } = useNotificaciones({
    leida: filtro === 'no-leidas' ? false : undefined,
    inventario_id: inventarioId,
    skip: (page - 1) * pageSize,
    limit: pageSize,
  });

  const { mutate: marcarLeida } = useMarcarNotificacionLeida();
  const { mutate: marcarTodasLeidas, isPending: marcandoTodas } = useMarcarTodasNotificacionesLeidas();

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', width: '100%' }}>
      <Card
        title={<Title level={4} style={{ margin: 0 }}><BellOutlined style={{ marginRight: 8 }} />Notificaciones</Title>}
        bordered={false}
        extra={
          <Button icon={<CheckOutlined />} loading={marcandoTodas} onClick={() => marcarTodasLeidas()}>
            Marcar todas como leídas
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Segmented
            value={filtro}
            onChange={(v) => { setFiltro(v as Filtro); setPage(1); }}
            options={[
              { label: 'No leídas', value: 'no-leidas' },
              { label: 'Todas', value: 'todas' },
            ]}
          />
          <Select
            allowClear
            placeholder="Filtrar por inventario"
            style={{ width: 220 }}
            value={inventarioId}
            onChange={(v) => { setInventarioId(v); setPage(1); }}
            options={inventarios.map((inv) => ({ value: inv.id, label: inv.nombre }))}
          />
        </Space>

        <Table<Notificacion>
          rowKey="id"
          loading={isLoading}
          dataSource={data?.items || []}
          onRow={(record) => ({
            style: { backgroundColor: record.leida ? undefined : token.colorFillAlter },
          })}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
          columns={[
            {
              title: 'Estado',
              dataIndex: 'evento',
              key: 'evento',
              width: 170,
              render: (evento: Notificacion['evento']) => (
                <Tag color={COLOR_POR_EVENTO[evento]}>{TEXTO_POR_EVENTO[evento]}</Tag>
              ),
            },
            {
              title: 'Artículo',
              key: 'item',
              render: (_: unknown, record) => (
                <div>
                  <Text strong>{record.item_nombre ?? `#${record.item_id}`}</Text>
                  {record.inventario_nombre && (
                    <>
                      <br />
                      <Text
                        type="secondary"
                        style={{ fontSize: 12, cursor: 'pointer' }}
                        onClick={() => navigate(`/dashboard/inventario/${record.inventario_id}`)}
                      >
                        {record.inventario_nombre}
                      </Text>
                    </>
                  )}
                </div>
              ),
            },
            { title: 'Detalle', dataIndex: 'mensaje', key: 'mensaje' },
            {
              title: 'Cuándo',
              dataIndex: 'creada_en',
              key: 'creada_en',
              width: 160,
              render: (fecha: string) => dayjs(fecha).fromNow(),
            },
            {
              title: '',
              key: 'accion',
              width: 140,
              render: (_: unknown, record) => (
                <Button
                  size="small"
                  onClick={() => marcarLeida({ id: record.id, leida: !record.leida })}
                >
                  {record.leida ? 'Marcar no leída' : 'Marcar leída'}
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default NotificacionesPage;
