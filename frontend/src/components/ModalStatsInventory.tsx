import React, { useState } from 'react';
import { Modal, Spin, Empty, Row, Col, Card, Statistic, Tag, Button, Tooltip, theme } from 'antd';
import { FontSizeOutlined, NumberOutlined, CalendarOutlined, CheckSquareOutlined, InfoCircleOutlined } from '@ant-design/icons';
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

// Explicación en criollo de cada tipo, pensada para gente que no
// necesariamente sabe qué es un "tipo de dato" — aparece como tooltip
// al pasar el mouse sobre la etiqueta de tipo, y también define el color
// y el ícono de cada tarjeta (distinción visual rápida, sin tener que leer).
const TIPO_INFO: Record<string, { label: string; color: string; icono: React.ReactNode; descripcion: string }> = {
  string: {
    label: 'Texto', color: 'default', icono: <FontSizeOutlined />,
    descripcion: 'Texto libre: letras, palabras o cualquier combinación de caracteres. Por ejemplo: nombres, colores, descripciones. No se puede sumar ni promediar.',
  },
  str: {
    label: 'Texto', color: 'default', icono: <FontSizeOutlined />,
    descripcion: 'Texto libre: letras, palabras o cualquier combinación de caracteres. Por ejemplo: nombres, colores, descripciones. No se puede sumar ni promediar.',
  },
  integer: {
    label: 'Número entero', color: 'blue', icono: <NumberOutlined />,
    descripcion: 'Un número sin coma, positivo o negativo. Por ejemplo: 5, 120, -3. Sirve para cantidades, conteos, unidades.',
  },
  int: {
    label: 'Número entero', color: 'blue', icono: <NumberOutlined />,
    descripcion: 'Un número sin coma, positivo o negativo. Por ejemplo: 5, 120, -3. Sirve para cantidades, conteos, unidades.',
  },
  float: {
    label: 'Número con coma', color: 'geekblue', icono: <NumberOutlined />,
    descripcion: 'Un número que puede tener parte decimal (coma). Por ejemplo: 15.50, 3.14, 100.0. Sirve para precios, pesos, medidas.',
  },
  number: {
    label: 'Número con coma', color: 'geekblue', icono: <NumberOutlined />,
    descripcion: 'Un número que puede tener parte decimal (coma). Por ejemplo: 15.50, 3.14, 100.0. Sirve para precios, pesos, medidas.',
  },
  boolean: {
    label: 'Sí / No', color: 'gold', icono: <CheckSquareOutlined />,
    descripcion: 'Un valor que solo puede ser "sí" o "no" (verdadero o falso). Por ejemplo: "¿Está activo?", "¿Fue entregado?".',
  },
  bool: {
    label: 'Sí / No', color: 'gold', icono: <CheckSquareOutlined />,
    descripcion: 'Un valor que solo puede ser "sí" o "no" (verdadero o falso). Por ejemplo: "¿Está activo?", "¿Fue entregado?".',
  },
  date: {
    label: 'Fecha', color: 'purple', icono: <CalendarOutlined />,
    descripcion: 'Un día del calendario. Por ejemplo: 25/12/2026. Se puede ordenar de más vieja a más nueva.',
  },
};

const CON_VALOR_EXPLICACION =
  'Cantidad de items del inventario que tienen este atributo cargado. Las estadísticas de esta tarjeta se calculan solo sobre estos — los items sin este atributo no se cuentan ni afectan el resultado.';

export const ModalStatsInventory: React.FC<Props> = ({ open, onClose, inventoryId }) => {
  const { data, isLoading, isError } = useInventoryStats(inventoryId, open);
  const [atributoHistograma, setAtributoHistograma] = useState<string | null>(null);
  const { token } = theme.useToken();

  const renderAtributo = (nombre: string, stats: AtributoStats) => {
    const info = TIPO_INFO[stats.tipo] ?? { label: stats.tipo, color: 'default', icono: null, descripcion: 'Tipo de dato de este atributo.' };
    return (
    <Card
      key={nombre}
      size="small"
      title={<span>{info.icono} <span style={{ marginLeft: 6 }}>{nombre}</span></span>}
      extra={
        <Tooltip title={info.descripcion}>
          <Tag color={info.color} style={{ cursor: 'help' }}>
            {info.label} <InfoCircleOutlined style={{ marginLeft: 2, opacity: 0.6 }} />
          </Tag>
        </Tooltip>
      }
      style={{ marginBottom: 12, borderLeft: `3px solid ${token.colorPrimary}` }}
    >
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

      <Tooltip title={CON_VALOR_EXPLICACION}>
        <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextTertiary, cursor: 'help', width: 'fit-content' }}>
          {stats.con_valor} item(s) con valor <InfoCircleOutlined style={{ opacity: 0.6 }} />
        </div>
      </Tooltip>
    </Card>
    );
  };

  return (
    <Modal
      title="Estadísticas del Inventario"
      open={open}
      onCancel={() => { setAtributoHistograma(null); onClose(); }}
      footer={null}
      width={720}
      destroyOnClose
    >
      <p style={{ marginTop: -8, marginBottom: 16, color: token.colorTextSecondary, fontSize: 13 }}>
        Una tarjeta por cada atributo del inventario, con los cálculos que tienen sentido según su tipo de dato (pasá el mouse sobre la etiqueta de color para ver qué significa cada tipo).
      </p>

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
