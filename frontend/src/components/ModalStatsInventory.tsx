import React, { useState } from 'react';
import { Modal, Spin, Empty, Row, Col, Card, Statistic, Tag, Button, theme } from 'antd';
import dayjs from 'dayjs';
import { useInventoryStats } from '../hooks/useEstadisticas';
import { AtributoHistograma } from './AtributoHistograma';
import type { AtributoStats } from '../api/inventory.service';

interface Props {
  open: boolean;
  onClose: () => void;
  inventoryId: number;
}

const esNumerico = (tipo: string) => ['integer', 'int', 'float', 'number'].includes(tipo);
const esFloat = (tipo: string) => ['float', 'number'].includes(tipo);
const esBoolean = (tipo: string) => ['boolean', 'bool'].includes(tipo);

export const ModalStatsInventory: React.FC<Props> = ({ open, onClose, inventoryId }) => {
  const { data, isLoading, isError } = useInventoryStats(inventoryId, open);
  const [atributoHistograma, setAtributoHistograma] = useState<string | null>(null);
  const { token } = theme.useToken();

  const renderAtributo = (nombre: string, stats: AtributoStats) => (
    <Card key={nombre} size="small" title={nombre} extra={<Tag>{stats.tipo}</Tag>} style={{ marginBottom: 12 }}>
      {stats.tipo === 'string' || stats.tipo === 'str' ? (
        <Statistic title="Items con valor" value={stats.con_valor} />
      ) : null}

      {esBoolean(stats.tipo) && (
        <Row gutter={16}>
          <Col span={12}>
            <Statistic title="Verdaderos" value={stats.verdaderos ?? 0} valueStyle={{ color: token.colorSuccess }} />
          </Col>
          <Col span={12}>
            <Statistic title="Falsos" value={stats.falsos ?? 0} valueStyle={{ color: token.colorError }} />
          </Col>
        </Row>
      )}

      {esNumerico(stats.tipo) && (
        <>
          <Row gutter={16}>
            <Col span={6}><Statistic title="Promedio" value={stats.promedio ?? undefined} precision={2} /></Col>
            <Col span={6}><Statistic title="Suma" value={stats.suma ?? undefined} precision={2} /></Col>
            <Col span={6}><Statistic title="Mínimo" value={stats.minimo ?? undefined} /></Col>
            <Col span={6}><Statistic title="Máximo" value={stats.maximo ?? undefined} /></Col>
          </Row>
          {esFloat(stats.tipo) && stats.con_valor > 0 && (
            <Button type="link" style={{ paddingLeft: 0, marginTop: 4 }} onClick={() => setAtributoHistograma(nombre)}>
              Ver mediana e histograma
            </Button>
          )}
        </>
      )}

      {stats.tipo === 'date' && (
        <Row gutter={16}>
          <Col span={8}>
            <Statistic title="Próxima fecha" value={stats.proxima_fecha ? dayjs(stats.proxima_fecha).format('DD/MM/YYYY') : '—'} />
          </Col>
          <Col span={8}>
            <Statistic title="Última fecha" value={stats.ultima_fecha ? dayjs(stats.ultima_fecha).format('DD/MM/YYYY') : '—'} />
          </Col>
          <Col span={8}>
            <Statistic
              title="Días restantes"
              value={stats.dias_restantes ?? '—'}
              valueStyle={stats.dias_restantes != null && stats.dias_restantes < 0 ? { color: token.colorError } : undefined}
            />
          </Col>
        </Row>
      )}

      <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextTertiary }}>
        {stats.con_valor} item(s) con valor
      </div>
    </Card>
  );

  return (
    <Modal
      title="Estadísticas del Inventario"
      open={open}
      onCancel={() => { setAtributoHistograma(null); onClose(); }}
      footer={null}
      width={720}
      destroyOnClose
    >
      {isLoading && <Spin style={{ display: 'block', margin: '40px auto' }} />}
      {isError && <Empty description="No se pudieron cargar las estadísticas" />}

      {data && (
        <>
          <Statistic title="Total de items" value={data.total_items} style={{ marginBottom: 16 }} />

          {data.volumen_total && (
            <Card
              size="small"
              style={{ marginBottom: 16, background: token.colorPrimaryBg, borderColor: token.colorPrimaryBorder }}
            >
              <Statistic
                title={`Volumen total (atributo: ${data.volumen_total.atributo})`}
                value={data.volumen_total.volumen_total ?? 0}
                precision={2}
              />
              <div style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 4 }}>
                {data.volumen_total.items_con_valor} item(s) con valor. La unidad la define el atributo elegido como "volumen unitario" al configurar los roles del inventario.
              </div>
            </Card>
          )}

          {Object.keys(data.atributos).length === 0 && (
            <Empty description="Este inventario no tiene atributos definidos" />
          )}

          {Object.entries(data.atributos).map(([nombre, stats]) => renderAtributo(nombre, stats))}
        </>
      )}

      {atributoHistograma && (
        <AtributoHistograma inventoryId={inventoryId} atributo={atributoHistograma} onClose={() => setAtributoHistograma(null)} />
      )}
    </Modal>
  );
};
