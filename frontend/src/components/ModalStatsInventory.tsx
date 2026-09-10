import React, { useState } from 'react';
import { Modal, Spin, Empty, Row, Col, Card, Statistic, Tag, Button, Tooltip, Popconfirm, Space, theme, message } from 'antd';
import { FontSizeOutlined, NumberOutlined, CalendarOutlined, CheckSquareOutlined, InfoCircleOutlined, PlusOutlined, EditOutlined, DeleteOutlined, BulbOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useInventoryStats, useBloquesPersonalizados, useConfigurarBloques } from '../hooks/useEstadisticas';
import { useInventory } from '../hooks/useInventory';
import { useAuthContext } from '../context/AuthContext';
import { AtributoHistograma } from './AtributoHistograma';
import { ModalBloquePersonalizado } from './ModalBloquePersonalizado';
import type { AtributoStats, BloquePersonalizado, MetricaPersonalizada, TerminoFormula, OperadorAritmetico } from '../api/inventory.service';

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

const OPERADOR_SIMBOLO: Record<OperadorAritmetico, string> = { mul: '×', div: '÷', add: '+', sub: '−' };

const FILTRO_TEXTO: Record<string, string> = {
  eq: 'es igual a', neq: 'es distinto de',
  gt: 'es mayor que', lt: 'es menor que',
  gte: 'es mayor o igual a', lte: 'es menor o igual a',
};

function describirTermino(t: TerminoFormula): string {
  if (t.tipo === 'atributo') return `"${t.atributo ?? '?'}"`;
  if (t.tipo === 'cantidad') return 'cantidad';
  return String(t.valor ?? 0);
}

// Arma la fórmula legible con paréntesis explícitos: refleja que el motor la
// evalúa de izquierda a derecha, sin precedencia (ver bloques_personalizados.py).
function describirFormula(terminos: TerminoFormula[], operadores: OperadorAritmetico[]): string {
  if (terminos.length === 0) return '';
  let expr = describirTermino(terminos[0]);
  operadores.forEach((op, i) => {
    expr = `(${expr} ${OPERADOR_SIMBOLO[op]} ${describirTermino(terminos[i + 1])})`;
  });
  return expr;
}

function describirFiltro(m: MetricaPersonalizada): string {
  if (!m.filtro_atributo || !m.filtro_operador) return '';
  const op = FILTRO_TEXTO[m.filtro_operador] ?? m.filtro_operador;
  return ` donde "${m.filtro_atributo}" ${op} ${String(m.filtro_valor)}`;
}

function etiquetaMetrica(m: MetricaPersonalizada): string {
  if (m.operacion === 'count') return 'Cantidad de ítems';
  return describirFormula(m.terminos, m.operadores);
}

function describirMetrica(m: MetricaPersonalizada): string {
  const filtro = describirFiltro(m);
  if (m.operacion === 'count') {
    return `Cuenta cuántos ítems hay${filtro || ' en el inventario'}.`;
  }
  return `Se calcula en cada ítem y se suman los resultados de todo el inventario${filtro}.`;
}

const esNumerico = (tipo: string) => ['integer', 'int', 'float', 'number'].includes(tipo);
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
  const { hasPermission, isTenant } = useAuthContext();
  const canEditInventory = isTenant || hasPermission('inventarios', 'update');

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

  const total = data?.total_items ?? 0;

  type TipoInfo = { label: string; color: string; icono: React.ReactNode; descripcion: string };
  const infoDe = (tipo: string): TipoInfo =>
    TIPO_INFO[tipo] ?? { label: tipo, color: 'default', icono: null, descripcion: 'Tipo de dato de este atributo.' };

  const renderCobertura = (conValor: number) => (
    <Tooltip title={CON_VALOR_EXPLICACION}>
      <span style={{ fontSize: 12, color: token.colorTextTertiary, cursor: 'help', whiteSpace: 'nowrap' }}>
        {conValor}/{total} cargados <InfoCircleOutlined style={{ opacity: 0.6 }} />
      </span>
    </Tooltip>
  );

  const renderNombre = (nombre: string, info: TipoInfo, esNativo: boolean) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      {info.icono}
      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre}</span>
      {esNativo && (
        <Tooltip title="Campo propio del sistema: lo tiene todo artículo, no hace falta definirlo como atributo del inventario.">
          <Tag style={{ cursor: 'help' }}>del sistema</Tag>
        </Tooltip>
      )}
      <Tooltip title={info.descripcion}>
        <Tag color={info.color} style={{ cursor: 'help' }}>
          {info.label} <InfoCircleOutlined style={{ marginLeft: 2, opacity: 0.6 }} />
        </Tag>
      </Tooltip>
    </span>
  );

  const renderFilaCompacta = (nombre: string, stats: AtributoStats, esNativo: boolean) => {
    const info = infoDe(stats.tipo);
    const verdaderos = stats.verdaderos ?? 0;
    const falsos = stats.falsos ?? 0;
    const totalVF = verdaderos + falsos;
    const pctV = totalVF > 0 ? (verdaderos / totalVF) * 100 : 0;
    return (
      <div
        key={nombre}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          padding: '8px 12px', marginBottom: 8,
          borderLeft: `3px solid ${token.colorPrimary}`,
          background: token.colorFillQuaternary, borderRadius: token.borderRadius,
        }}
      >
        <div style={{ flex: 1, minWidth: 160 }}>{renderNombre(nombre, info, esNativo)}</div>
        {esBoolean(stats.tipo) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', width: 90, height: 8, borderRadius: 4, overflow: 'hidden', background: token.colorFillSecondary }}>
              <span style={{ width: `${pctV}%`, background: token.colorSuccess }} />
              <span style={{ width: `${100 - pctV}%`, background: token.colorError }} />
            </span>
            <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
              <span style={{ color: token.colorSuccess }}>Sí {verdaderos}</span>
              <span style={{ color: token.colorTextQuaternary, margin: '0 6px' }}>·</span>
              <span style={{ color: token.colorError }}>No {falsos}</span>
            </span>
          </div>
        )}
        {renderCobertura(stats.con_valor)}
      </div>
    );
  };

  const renderTarjeta = (nombre: string, stats: AtributoStats, esNativo: boolean) => {
    const info = infoDe(stats.tipo);
    return (
      <Card
        key={nombre}
        size="small"
        title={renderNombre(nombre, info, esNativo)}
        extra={renderCobertura(stats.con_valor)}
        style={{ marginBottom: 12, borderLeft: `3px solid ${token.colorPrimary}` }}
      >
        {esNumerico(stats.tipo) && (
          <>
            <Row gutter={16}>
              <Col span={6}><Statistic title="Promedio" value={stats.promedio ?? undefined} precision={2} /></Col>
              <Col span={6}><Statistic title="Suma" value={stats.suma ?? undefined} precision={2} /></Col>
              <Col span={6}><Statistic title="Mínimo" value={stats.minimo ?? undefined} /></Col>
              <Col span={6}><Statistic title="Máximo" value={stats.maximo ?? undefined} /></Col>
            </Row>
            {stats.con_valor > 0 && (
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
      </Card>
    );
  };

  // `esNativo` marca las columnas propias de la tabla (cantidad): se calculan
  // igual que un atributo numérico, pero no las definió el usuario al armar el
  // inventario, así que se aclara para que no las busque en la lista de
  // atributos. Texto y Sí/No van como fila compacta; numérico y fecha, que
  // tienen varias métricas, mantienen la tarjeta.
  const renderAtributo = (nombre: string, stats: AtributoStats, esNativo = false) =>
    esNumerico(stats.tipo) || stats.tipo === 'date'
      ? renderTarjeta(nombre, stats, esNativo)
      : renderFilaCompacta(nombre, stats, esNativo);

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
        Una tarjeta por cada atributo del inventario y por cada campo propio del sistema (como la cantidad), con los cálculos que tienen sentido según su tipo de dato (pasá el mouse sobre la etiqueta de color para ver qué significa cada tipo).
      </p>

      {isLoading && <Spin style={{ display: 'block', margin: '40px auto' }} />}
      {isError && <Empty description="No se pudieron cargar las estadísticas" />}

      {data && (
        <>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ color: token.colorTextSecondary }}>Total de items:</span>
            <span style={{ fontSize: 22, fontWeight: 600 }}>{data.total_items}</span>
          </div>

          {data.volumen_total && (
            <Card
              size="small"
              style={{ marginBottom: 16, background: token.colorPrimaryBg, borderColor: token.colorPrimaryBorder }}
            >
              <Statistic
                title={`Total de "${data.volumen_total.atributo}" ponderado por cantidad`}
                value={data.volumen_total.volumen_total ?? 0}
                precision={2}
              />
              <div style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 4 }}>
                Σ (cantidad × {data.volumen_total.atributo}) sobre todos los items — sirve como volumen, peso o valor total del stock según el atributo elegido como "volumen unitario" en los roles del inventario. {data.volumen_total.items_con_valor} item(s) con ese atributo cargado.
              </div>
            </Card>
          )}

          {Object.entries(data.campos_nativos ?? {}).map(([nombre, stats]) => renderAtributo(nombre, stats, true))}

          {Object.keys(data.atributos).length === 0 && (
            <Empty description="Este inventario no tiene atributos propios definidos" />
          )}

          {Object.entries(data.atributos)
            .sort(([, a], [, b]) => Number(!esNumerico(a.tipo)) - Number(!esNumerico(b.tipo)))
            .map(([nombre, stats]) => renderAtributo(nombre, stats))}
        </>
      )}

      {(canEditInventory || bloquesConfigurados.length > 0) && (
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
              title={
                <span>
                  {bloque.nombre}
                  <Tooltip
                    title={
                      <div style={{ maxWidth: 320 }}>
                        {bloque.metricas.map((m) => {
                          const valor = calculado?.valores?.[m.clave];
                          return (
                            <div key={m.clave} style={{ marginBottom: 4 }}>
                              <strong>{etiquetaMetrica(m)}</strong>
                              {valor != null && <> = {Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</>}
                              {' — '}{describirMetrica(m)}
                            </div>
                          );
                        })}
                      </div>
                    }
                  >
                    <InfoCircleOutlined style={{ marginLeft: 6, color: token.colorTextTertiary, cursor: 'help' }} />
                  </Tooltip>
                </span>
              }
              extra={
                canEditInventory ? (
                  <Space size="small">
                    <Button size="small" icon={<EditOutlined />} onClick={() => setBloqueEnEdicion({ index, bloque })} />
                    <Popconfirm
                      title="¿Eliminar este bloque?"
                      onConfirm={() => eliminarBloque(index)}
                      okText="Sí"
                      cancelText="No"
                      getPopupContainer={(trigger) => trigger.parentElement as HTMLElement}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                ) : undefined
              }
            >
              {calculado ? interpolarPlantilla(calculado.plantilla, calculado.valores) : <Spin size="small" />}
            </Card>
          );
        })}

        {canEditInventory && (
          <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setBloqueEnEdicion({ index: null, bloque: null })}>
            Agregar Bloque Personalizado
          </Button>
        )}
      </div>
      )}

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
