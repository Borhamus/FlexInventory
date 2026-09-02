import React, { useState } from 'react';
import { Modal, Input, Select, InputNumber, DatePicker, Button, Tag, Space, Tooltip, theme, message } from 'antd';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import type { BloquePersonalizado, MetricaPersonalizada, TerminoFormula, OperadorAritmetico } from '../api/inventory.service';

// ==================== Vocabulario en criollo (espejo del backend) ====================

const OPERADOR_ARITMETICO_SIMBOLOS: Record<OperadorAritmetico, string> = { mul: '×', div: '÷', add: '+', sub: '−' };
const OPERADOR_ARITMETICO_OPCIONES: { value: OperadorAritmetico; label: string }[] = [
  { value: 'mul', label: '× Multiplicar' },
  { value: 'div', label: '÷ Dividir' },
  { value: 'add', label: '+ Sumar' },
  { value: 'sub', label: '− Restar' },
];

const EXPLICACION_ORDEN =
  'El cálculo se resuelve paso a paso, en el orden en que armás la fórmula (de izquierda a derecha) — no hay una operación que "se calcule primero" como en la matemática de la escuela. Si armás A + B × C, el resultado es (A + B) × C. Para cambiar el resultado, cambiá el orden en que agregás los pasos.';

const OPERADOR_LABELS: Record<string, string> = {
  eq: 'es igual a',
  neq: 'es distinto de',
  gt: 'es mayor que',
  lt: 'es menor que',
  gte: 'es mayor o igual a',
  lte: 'es menor o igual a',
};

// Qué operadores de FILTRO tiene sentido ofrecer según el tipo — mismo
// criterio que app/tenant/bloques_personalizados.py (_OPERADORES_POR_TIPO).
const OPERADORES_POR_TIPO: Record<string, string[]> = {
  boolean: ['eq', 'neq'], bool: ['eq', 'neq'],
  string: ['eq', 'neq'], str: ['eq', 'neq'],
  integer: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte'], int: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte'],
  float: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte'], number: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte'],
  date: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte'],
};

// Etiqueta cortita del tipo, para mostrar al lado del nombre del atributo
// en los chips — nada de "string"/"boolean" técnico.
const TIPO_LABEL_CORTO: Record<string, string> = {
  string: 'texto', str: 'texto',
  integer: 'número', int: 'número', float: 'número', number: 'número',
  boolean: 'sí/no', bool: 'sí/no',
  date: 'fecha',
};

const ES_NUMERICO = (tipo: string) => ['integer', 'int', 'float', 'number'].includes(tipo);
const ES_BOOLEAN = (tipo: string) => ['boolean', 'bool'].includes(tipo);
const ES_FECHA = (tipo: string) => tipo === 'date';

function terminoLegible(t: TerminoFormula): string {
  if (t.tipo === 'cantidad') return 'Cantidad';
  if (t.tipo === 'constante') return String(t.valor ?? '');
  return t.atributo || '?';
}

function formatearValorFiltro(valor: unknown): string {
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (valor === null || valor === undefined || valor === '') return '…';
  return String(valor);
}

// Cada métrica en edición: la "clave" (id interno para armar {llaves} en la
// plantilla) NO la escribe ni la ve el usuario en ningún momento — ni
// siquiera le pone nombre al cálculo. El nombre que representa a cada
// cálculo (en el botón para insertarlo en el texto, y adentro del propio
// {clave} que se guarda) se arma solo a partir de lo que clickeó: la
// condición y la fórmula. Ver etiquetaCalculo() y slugify() más abajo.
interface MetricaEnEdicion extends Omit<MetricaPersonalizada, 'clave'> {
  _uid: string;
}

let contadorUid = 0;
const nuevoUid = () => `m${++contadorUid}`;

// Descripción en criollo de lo que hace un cálculo, derivada 100% de su
// condición y su fórmula — nunca escrita a mano por el usuario. Se usa
// tanto de encabezado dentro de la tarjeta del cálculo como de texto del
// botón "insertar en el texto".
function etiquetaCalculo(m: MetricaEnEdicion): string {
  let texto: string;
  if (m.terminos.length === 0) {
    texto = 'Cantidad de artículos';
  } else {
    const partes = [terminoLegible(m.terminos[0])];
    m.operadores.forEach((op, i) => {
      // Mientras se arma la fórmula, puede haber un operador ya elegido
      // sin su término siguiente todavía (ej. justo después de clickear
      // "Multiplicar", antes de clickear el próximo atributo) — ese paso
      // pendiente ya se muestra aparte en la tira de la fórmula (chip
      // colgando), acá simplemente no se lo suma todavía al resumen.
      if (i + 1 >= m.terminos.length) return;
      partes.push(OPERADOR_ARITMETICO_SIMBOLOS[op]);
      partes.push(terminoLegible(m.terminos[i + 1]));
    });
    texto = partes.join(' ');
  }
  if (m.filtro_atributo && m.filtro_operador) {
    const opLabel = OPERADOR_LABELS[m.filtro_operador] ?? m.filtro_operador;
    texto += ` donde ${m.filtro_atributo} ${opLabel} ${formatearValorFiltro(m.filtro_valor)}`;
  }
  return texto;
}

// El {clave} interno que va adentro de la plantilla se arma a partir de la
// descripción de arriba (pedido explícito: "si hace falta que exista ese
// id, puede armarse con el nombre del cálculo") — el usuario nunca lo ve,
// pero si hubiera que depurarlo alguna vez, no es un string random.
function slugify(texto: string): string {
  const base = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'calculo';
  return /^[a-z_]/.test(base) ? base : `c_${base}`;
}

// El texto del bloque no se escribe como un string plano con {llaves} a la
// vista — se arma como una secuencia de pedacitos de texto libre y
// "cálculos insertados" (referenciados por _uid, no por el {clave} final,
// que recién se decide al guardar). Así el usuario arma la frase clickeando
// sin ver ningún id ni sintaxis técnica en ningún momento.
type SegmentoPlantilla = { tipo: 'texto'; texto: string } | { tipo: 'calculo'; metricaUid: string };

function parsePlantillaASegmentos(plantilla: string, metricas: MetricaEnEdicion[]): SegmentoPlantilla[] {
  if (!plantilla) return [];
  const uids = new Set(metricas.map((m) => m._uid));
  const partes = plantilla.split(/(\{[a-zA-Z_][a-zA-Z0-9_]*\})/g);
  const segmentos: SegmentoPlantilla[] = [];
  for (const parte of partes) {
    if (!parte) continue;
    const match = parte.match(/^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/);
    if (match && uids.has(match[1])) {
      segmentos.push({ tipo: 'calculo', metricaUid: match[1] });
    } else {
      segmentos.push({ tipo: 'texto', texto: parte });
    }
  }
  return segmentos;
}

interface Props {
  open: boolean;
  onClose: () => void;
  atributos: Record<string, string>;
  bloqueInicial?: BloquePersonalizado | null;
  onGuardar: (bloque: BloquePersonalizado) => void;
  guardando?: boolean;
}

export const ModalBloquePersonalizado: React.FC<Props> = ({ open, onClose, atributos, bloqueInicial, onGuardar, guardando }) => {
  const { token } = theme.useToken();

  // Al editar un bloque existente, _uid = clave ya guardada (la plantilla
  // original ya referencia esas claves, así que sirve de puente).
  const metricasIniciales: MetricaEnEdicion[] = (bloqueInicial?.metricas ?? []).map((m) => ({ ...m, _uid: m.clave }));

  const [nombre, setNombre] = useState(bloqueInicial?.nombre ?? '');
  const [metricas, setMetricas] = useState<MetricaEnEdicion[]>(metricasIniciales);
  const [segmentos, setSegmentos] = useState<SegmentoPlantilla[]>(() =>
    parsePlantillaASegmentos(bloqueInicial?.plantilla ?? '', metricasIniciales)
  );
  const [textoActual, setTextoActual] = useState('');

  const resetear = () => {
    setNombre('');
    setMetricas([]);
    setSegmentos([]);
    setTextoActual('');
  };

  const agregarMetrica = () => {
    const uid = nuevoUid();
    setMetricas((prev) => [
      ...prev,
      { _uid: uid, operacion: 'count', terminos: [], operadores: [], filtro_atributo: null, filtro_operador: null, filtro_valor: null },
    ]);
  };

  const actualizarMetrica = (uid: string, cambios: Partial<MetricaEnEdicion>) => {
    setMetricas((prev) => prev.map((m) => (m._uid === uid ? { ...m, ...cambios } : m)));
  };

  const quitarMetrica = (uid: string) => {
    setMetricas((prev) => prev.filter((m) => m._uid !== uid));
    // Si ese cálculo ya estaba insertado en el texto, sacarlo también —
    // nunca dejar una referencia a un cálculo que ya no existe.
    setSegmentos((prev) => prev.filter((s) => s.tipo !== 'calculo' || s.metricaUid !== uid));
  };

  const agregarCalculoAlTexto = (uid: string) => {
    setSegmentos((prev) => {
      const siguiente = [...prev];
      if (textoActual) siguiente.push({ tipo: 'texto', texto: textoActual });
      siguiente.push({ tipo: 'calculo', metricaUid: uid });
      return siguiente;
    });
    setTextoActual('');
  };

  const quitarUltimoPasoTexto = () => {
    if (textoActual) {
      setTextoActual('');
      return;
    }
    setSegmentos((prev) => prev.slice(0, -1));
  };

  const etiquetaPorUid = (uid: string): string => {
    const m = metricas.find((x) => x._uid === uid);
    return m ? etiquetaCalculo(m) : '(cálculo eliminado)';
  };

  const handleGuardar = () => {
    if (!nombre.trim()) {
      message.error('Ponele un nombre al bloque');
      return;
    }
    if (metricas.length === 0) {
      message.error('Agregá al menos un cálculo');
      return;
    }

    const segmentosFinales: SegmentoPlantilla[] = textoActual ? [...segmentos, { tipo: 'texto', texto: textoActual }] : segmentos;
    if (segmentosFinales.length === 0) {
      message.error('Escribí el texto del bloque');
      return;
    }

    const usadosEnTexto = new Set(segmentosFinales.filter((s) => s.tipo === 'calculo').map((s) => s.metricaUid));
    const huerfanos = metricas.filter((m) => !usadosEnTexto.has(m._uid));
    if (huerfanos.length > 0) {
      message.warning(`Hay cálculos que armaste pero no insertaste en el texto: ${huerfanos.map(etiquetaCalculo).join(', ')}`);
      return;
    }

    // El {clave} final se arma recién acá, a partir de la descripción de
    // cada cálculo (nunca lo escribe el usuario) y se garantiza que no se
    // repita dentro del mismo bloque.
    const usados = new Set<string>();
    const claveFinal = new Map<string, string>();
    for (const m of metricas) {
      const base = slugify(etiquetaCalculo(m));
      let clave = base;
      let n = 2;
      while (usados.has(clave)) clave = `${base}_${n++}`;
      usados.add(clave);
      claveFinal.set(m._uid, clave);
    }

    const plantilla = segmentosFinales
      .map((s) => (s.tipo === 'texto' ? s.texto : `{${claveFinal.get(s.metricaUid)}}`))
      .join('');

    onGuardar({
      nombre: nombre.trim(),
      plantilla,
      metricas: metricas.map((m) => {
        const { _uid, ...resto } = m;
        return {
          ...resto,
          clave: claveFinal.get(_uid)!,
          // La operación no la elige el usuario: se infiere de si armó
          // fórmula o no. Ver bloques_personalizados.py.
          operacion: m.terminos.length > 0 ? 'sum' : 'count',
        };
      }),
    });
  };

  return (
    <Modal
      title={bloqueInicial ? 'Editar Bloque Personalizado' : 'Nuevo Bloque Personalizado'}
      open={open}
      onCancel={() => { resetear(); onClose(); }}
      onOk={handleGuardar}
      okText={guardando ? 'Guardando...' : 'Guardar'}
      cancelText="Cancelar"
      confirmLoading={guardando}
      width={720}
      destroyOnClose
    >
      <p style={{ color: token.colorTextSecondary, marginBottom: 20 }}>
        Armá tu cálculo haciendo click en los atributos y en los símbolos matemáticos — sin escribir fórmulas.
        Después armá la frase que querés ver de la misma forma: escribiendo y haciendo click.
      </p>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Nombre del bloque</label>
        <Input
          placeholder="Ej: Cuánto me falta para completar la colección"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Tus cálculos</label>

        {metricas.map((m) => (
          <MetricaRow
            key={m._uid}
            metrica={m}
            atributos={atributos}
            onChange={(cambios) => actualizarMetrica(m._uid, cambios)}
            onQuitar={() => quitarMetrica(m._uid)}
          />
        ))}

        <Button type="dashed" block icon={<PlusOutlined />} onClick={agregarMetrica}>
          Agregar otro cálculo
        </Button>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Armá el texto del bloque</label>
        <p style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 8 }}>
          Escribí la frase como quieras verla. Para meter un cálculo en el medio, escribí hasta ahí y tocá su
          botón — se inserta solo, justo donde quedaste escribiendo.
        </p>

        <div
          style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, minHeight: 40,
            padding: '8px 10px', background: token.colorBgContainer, borderRadius: token.borderRadius,
            border: `1px dashed ${token.colorBorder}`,
          }}
        >
          {segmentos.map((s, i) =>
            s.tipo === 'texto' ? (
              <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{s.texto}</span>
            ) : (
              <Tag key={i} color="gold">{etiquetaPorUid(s.metricaUid)}</Tag>
            )
          )}
          <Input
            variant="borderless"
            placeholder={
              segmentos.length === 0
                ? 'Ej: Me faltan cartas para completar la colección, y me falta gastar para conseguirlas.'
                : 'seguí escribiendo…'
            }
            value={textoActual}
            onChange={(e) => setTextoActual(e.target.value)}
            style={{ flex: 1, minWidth: 160, padding: 0 }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
          {metricas.map((m) => (
            <Chip key={m._uid} color="gold" onClick={() => agregarCalculoAlTexto(m._uid)}>
              + {etiquetaCalculo(m)}
            </Chip>
          ))}
          {(segmentos.length > 0 || Boolean(textoActual)) && (
            <Button size="small" type="text" danger onClick={quitarUltimoPasoTexto}>
              Quitar último paso
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ==================== Chip clickeable genérico ====================

const Chip: React.FC<{ onClick: () => void; color?: string; children: React.ReactNode; title?: string }> = ({ onClick, color, children, title }) => {
  const { token } = theme.useToken();
  return (
    <Tag
      onClick={onClick}
      title={title}
      color={color}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        padding: '3px 10px',
        fontSize: 13,
        borderStyle: color ? 'solid' : 'dashed',
        borderColor: color ? undefined : token.colorBorder,
      }}
    >
      {children}
    </Tag>
  );
};

// ==================== Fila de una métrica: condición + fórmula (todo a clicks) ====================

interface MetricaRowProps {
  metrica: MetricaEnEdicion;
  atributos: Record<string, string>;
  onChange: (cambios: Partial<MetricaEnEdicion>) => void;
  onQuitar: () => void;
}

const MetricaRow: React.FC<MetricaRowProps> = ({ metrica, atributos, onChange, onQuitar }) => {
  const { token } = theme.useToken();

  const [agregandoConstante, setAgregandoConstante] = useState(false);
  const [valorConstantePendiente, setValorConstantePendiente] = useState<number | undefined>(undefined);

  const atributosNumericos = Object.entries(atributos).filter(([, tipo]) => ES_NUMERICO(tipo));

  // Estado del constructor de fórmula: se alterna entre "esperando un
  // término" (atributo/Cantidad/número fijo) y "esperando un operador"
  // (×÷+−) — nunca se puede clickear dos términos ni dos operadores
  // seguidos, así se garantiza que la fórmula quede siempre bien formada.
  const esperandoOperador = metrica.terminos.length > metrica.operadores.length;

  const agregarTermino = (t: TerminoFormula) => {
    onChange({ terminos: [...metrica.terminos, t] });
  };

  const agregarOperador = (op: OperadorAritmetico) => {
    onChange({ operadores: [...metrica.operadores, op] });
  };

  const confirmarConstante = () => {
    if (valorConstantePendiente === undefined || valorConstantePendiente === null) {
      message.warning('Escribí el número');
      return;
    }
    agregarTermino({ tipo: 'constante', valor: valorConstantePendiente });
    setValorConstantePendiente(undefined);
    setAgregandoConstante(false);
  };

  const quitarUltimoPaso = () => {
    if (metrica.operadores.length === metrica.terminos.length && metrica.operadores.length > 0) {
      onChange({ operadores: metrica.operadores.slice(0, -1) });
    } else if (metrica.terminos.length > 0) {
      onChange({ terminos: metrica.terminos.slice(0, -1) });
    }
  };

  return (
    <div
      style={{
        padding: 12,
        marginBottom: 10,
        background: token.colorFillAlter,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
        {/* Este cálculo no tiene nombre para escribir — se describe solo,
            en vivo, a partir de la condición y la fórmula que armaste. */}
        <div style={{ fontWeight: 600, fontSize: 14 }}>{etiquetaCalculo(metrica)}</div>
        <Button danger type="text" size="small" icon={<DeleteOutlined />} onClick={onQuitar} />
      </div>

      {/* ---- 1. Condición (opcional) ---- */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
          1. Condición <span style={{ fontWeight: 400, color: token.colorTextTertiary }}>(opcional — dejalo vacío para calcular sobre todos los artículos)</span>
        </div>

        {!metrica.filtro_atributo ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(atributos).map(([nombreAttr, tipo]) => (
              <Chip
                key={nombreAttr}
                onClick={() => onChange({ filtro_atributo: nombreAttr, filtro_operador: 'eq', filtro_valor: null })}
              >
                {nombreAttr} <span style={{ opacity: 0.6 }}>({TIPO_LABEL_CORTO[tipo.toLowerCase().trim()] ?? tipo})</span>
              </Chip>
            ))}
            {Object.keys(atributos).length === 0 && (
              <span style={{ color: token.colorTextTertiary, fontSize: 13 }}>Este inventario todavía no tiene atributos.</span>
            )}
          </div>
        ) : (
          <FiltroRow atributos={atributos} metrica={metrica} onChange={onChange} />
        )}
      </div>

      {/* ---- 2. Fórmula (opcional) ---- */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>2. Fórmula</span>
          <span style={{ fontWeight: 400, color: token.colorTextTertiary, fontSize: 13 }}>
            (opcional — vacía = contar cuántos artículos cumplen la condición)
          </span>
          <Tooltip title={EXPLICACION_ORDEN}>
            <InfoCircleOutlined style={{ color: token.colorTextTertiary, cursor: 'help' }} />
          </Tooltip>
        </div>

        <div
          style={{
            display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', minHeight: 32, marginBottom: 8,
            padding: '6px 10px', background: token.colorBgContainer, borderRadius: token.borderRadius,
            border: `1px dashed ${token.colorBorder}`,
          }}
        >
          {metrica.terminos.length === 0 ? (
            <span style={{ color: token.colorTextTertiary, fontSize: 13 }}>Sin fórmula — se va a contar</span>
          ) : (
            <>
              {metrica.terminos.map((t, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <Tag color="purple">{OPERADOR_ARITMETICO_SIMBOLOS[metrica.operadores[i - 1]]}</Tag>}
                  <Tag color="blue">{terminoLegible(t)}</Tag>
                </React.Fragment>
              ))}
              {/* Operador ya elegido pero todavía sin el término siguiente
                  (esperandoOperador === false pero acabamos de agregar un
                  operador): mostrarlo igual, si no el click de "Multiplicar"
                  no tiene ningún reflejo visual hasta el próximo término. */}
              {metrica.operadores.length === metrica.terminos.length && (
                <Tag color="purple">{OPERADOR_ARITMETICO_SIMBOLOS[metrica.operadores[metrica.operadores.length - 1]]}</Tag>
              )}
            </>
          )}
          {metrica.terminos.length > 0 && (
            <Button size="small" type="text" danger onClick={quitarUltimoPaso}>
              Quitar último paso
            </Button>
          )}
        </div>

        {!esperandoOperador ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <Chip onClick={() => agregarTermino({ tipo: 'cantidad' })}>Cantidad</Chip>
            {atributosNumericos.map(([nombreAttr]) => (
              <Chip key={nombreAttr} onClick={() => agregarTermino({ tipo: 'atributo', atributo: nombreAttr })}>
                {nombreAttr}
              </Chip>
            ))}
            {!agregandoConstante ? (
              <Chip onClick={() => setAgregandoConstante(true)}>Número fijo…</Chip>
            ) : (
              <Space size={4}>
                <InputNumber
                  autoFocus
                  size="small"
                  placeholder="Número"
                  style={{ width: 90 }}
                  value={valorConstantePendiente}
                  onChange={(v) => setValorConstantePendiente(v ?? undefined)}
                  onPressEnter={confirmarConstante}
                />
                <Button size="small" type="text" icon={<CheckOutlined />} onClick={confirmarConstante} />
                <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => { setAgregandoConstante(false); setValorConstantePendiente(undefined); }} />
              </Space>
            )}
            {atributosNumericos.length === 0 && (
              <span style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                (este inventario no tiene atributos numéricos — solo se puede usar "Cantidad" o un número fijo)
              </span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {OPERADOR_ARITMETICO_OPCIONES.map((op) => (
              <Chip key={op.value} color="purple" onClick={() => agregarOperador(op.value)}>
                {op.label}
              </Chip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== Fila de condición ya elegida (atributo + operador + valor) ====================

interface FiltroRowProps {
  atributos: Record<string, string>;
  metrica: MetricaEnEdicion;
  onChange: (cambios: Partial<MetricaEnEdicion>) => void;
}

const FiltroRow: React.FC<FiltroRowProps> = ({ atributos, metrica, onChange }) => {
  const tipoFiltro = metrica.filtro_atributo ? (atributos[metrica.filtro_atributo] ?? 'string').toLowerCase().trim() : 'string';
  const operadoresValidos = OPERADORES_POR_TIPO[tipoFiltro] ?? ['eq', 'neq'];

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <Tag
        color="blue"
        closable
        onClose={() => onChange({ filtro_atributo: null, filtro_operador: null, filtro_valor: null })}
        style={{ padding: '3px 10px', fontSize: 13 }}
      >
        {metrica.filtro_atributo}
      </Tag>
      <Select
        style={{ width: 170 }}
        value={metrica.filtro_operador ?? undefined}
        options={operadoresValidos.map((op) => ({ value: op, label: OPERADOR_LABELS[op] }))}
        onChange={(value) => onChange({ filtro_operador: value as MetricaPersonalizada['filtro_operador'] })}
      />
      <ValorFiltroInput tipo={tipoFiltro} valor={metrica.filtro_valor} onChange={(v) => onChange({ filtro_valor: v })} />
      <span style={{ fontSize: 13, color: '#8c8c8c' }}>→</span>
    </div>
  );
};

const ValorFiltroInput: React.FC<{ tipo: string; valor: unknown; onChange: (v: unknown) => void }> = ({ tipo, valor, onChange }) => {
  if (ES_BOOLEAN(tipo)) {
    return (
      <Select
        style={{ width: 100 }}
        placeholder="Valor"
        value={typeof valor === 'boolean' ? valor : undefined}
        options={[{ value: true, label: 'Sí' }, { value: false, label: 'No' }]}
        onChange={onChange}
      />
    );
  }
  if (ES_FECHA(tipo)) {
    return (
      <DatePicker
        placeholder="Fecha"
        value={undefined}
        onChange={(d: Dayjs | null) => onChange(d ? d.format('YYYY-MM-DD') : null)}
      />
    );
  }
  if (ES_NUMERICO(tipo)) {
    return (
      <InputNumber
        style={{ width: 120 }}
        placeholder="Valor"
        value={typeof valor === 'number' ? valor : undefined}
        onChange={onChange}
      />
    );
  }
  return (
    <Input
      style={{ width: 140 }}
      placeholder="Valor"
      value={typeof valor === 'string' ? valor : ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default ModalBloquePersonalizado;
