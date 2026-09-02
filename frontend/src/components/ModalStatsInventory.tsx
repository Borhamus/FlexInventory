import React, { useState } from 'react';
import { Modal, Spin, Empty, Row, Col, Card, Statistic, Tag, Button, Tooltip, Popconfirm, Space, theme, message } from 'antd';
import { FontSizeOutlined, NumberOutlined, CalendarOutlined, CheckSquareOutlined, InfoCircleOutlined, PlusOutlined, EditOutlined, DeleteOutlined, BulbOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useInventoryStats, useBloquesPersonalizados, useConfigurarBloques } from '../hooks/useEstadisticas';
import { useInventory } from '../hooks/useInventory';
import { AtributoHistograma } from './AtributoHistograma';
import { ModalBloquePersonalizado } from './ModalBloquePersonalizado';
import type { AtributoStats, BloquePersonalizado } from '../api/inventory.service';

interface Props {
  open: boolean;
  onClose: () => void;
  inventoryId: number;
}

// Reemplaza cada {clave} de la plantilla por su valor calculado. Si un
// valor todavía no llegó (o vino null), muestra "…" en vez de romper el texto.
function interpolarPlantilla(plantilla: string, valores: Record<string, number | null>): string {
  return plantilla.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_match, clave: string) => {
    const valor = valores[clave];
    if (valor === null || valor === undefined) return '…';
    return typeof valor === 'number' ? valor.toLocaleString('es-AR', { maximumFractionDigits: 2 }) : String(valor);
  });
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
  const { data: inventario } = useInventory(inventoryId);
  const { data: bloquesCalculados } = useBloquesPersonalizados(inventoryId, open);
  const { mutate: configurarBloques, isPending: guardandoBloque } = useConfigurarBloques();
  const [atributoHistograma, setAtributoHistograma] = useState<string | null>(null);
  const [bloqueEnEdicion, setBloqueEnEdicion] = useState<{ index: number | null; bloque: BloquePersonalizado | null } | null>(null);
  const { token } = theme.useToken();

  const bloquesConfigurados: BloquePersonalizado[] = inventario?.bloques_personalizados ?? [];

  const guardarBloque = (bloque: BloquePersonalizado) => {
    const nuevaLista = [...bloquesConfigurados];
    if (bloqueEnEdicion?.index !== null && bloqueEnEdicion?.index !== undefined) {
      nuevaLista[bloqueEnEdicion.index] = bloque;
    } else {
      nuevaLista.push(bloque);
    }
    configurarBloques(
      { id: inventoryId, bloques: nuevaLista },
      {
        onSuccess: () => {
          message.success('Bloque guardado');
          setBloqueEnEdicion(null);
        },
        onError: (error: unknown) => {
          const detalle = (error as { response?: { data?: { detail?: { message?: string } } } })?.response?.data?.detail?.message;
          message.error(detalle || 'No se pudo guardar el bloque');
        },
      }
    );
  };

  const eliminarBloque = (index: number) => {
    const nuevaLista = bloquesConfigurados.filter((_, i) => i !== index);
    configurarBloques(
      { id: inventoryId, bloques: nuevaLista },
      { onSuccess: () => message.success('Bloque eliminado') }
    );
  };

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

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>
          <BulbOutlined style={{ color: token.colorWarning, marginRight: 6 }} />
          Bloques Personalizados
        </div>
        <p style={{ fontSize: 13, color: token.colorTextSecondary, marginTop: 0, marginBottom: 12 }}>
          Armá tus propios cálculos con las palabras que quieras — por ejemplo "cuánto me falta gastar para
          completar la colección".
        </p>

        {bloquesConfigurados.map((bloque, index) => {
          const calculado = bloquesCalculados?.find((b) => b.nombre === bloque.nombre);
          return (
            <Card
              key={`${bloque.nombre}-${index}`}
              size="small"
              style={{ marginBottom: 12, borderLeft: `3px solid ${token.colorWarning}` }}
              title={bloque.nombre}
              extra={
                <Space size="small">
                  <Button size="small" icon={<EditOutlined />} onClick={() => setBloqueEnEdicion({ index, bloque })} />
                  <Popconfirm
                    title="¿Eliminar este bloque?"
                    onConfirm={() => eliminarBloque(index)}
                    okText="Sí"
                    cancelText="No"
                    // Sin esto, el popup se monta en document.body y el
                    // cálculo de posición se rompe adentro de un Card
                    // dentro de un Modal (mismo gotcha que Select dentro
                    // de un Popover, ya arreglado en otro lado de este
                    // proyecto con el mismo patrón: anclar al padre del
                    // trigger en vez de al body).
                    getPopupContainer={(trigger) => trigger.parentElement as HTMLElement}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              }
            >
              {calculado ? interpolarPlantilla(calculado.plantilla, calculado.valores) : <Spin size="small" />}
            </Card>
          );
        })}

        <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setBloqueEnEdicion({ index: null, bloque: null })}>
          Agregar Bloque Personalizado
        </Button>
      </div>

      {atributoHistograma && (
        <AtributoHistograma inventoryId={inventoryId} atributo={atributoHistograma} onClose={() => setAtributoHistograma(null)} />
      )}

      {bloqueEnEdicion && (
        <ModalBloquePersonalizado
          open
          onClose={() => setBloqueEnEdicion(null)}
          atributos={inventario?.atributos ?? {}}
          bloqueInicial={bloqueEnEdicion.bloque}
          onGuardar={guardarBloque}
          guardando={guardandoBloque}
        />
      )}
    </Modal>
  );
};
