import React, { useMemo, useState } from 'react';
import { Modal, Spin, Empty, Select, Button, Statistic, Tooltip, theme } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useMediana, usePromedioRango } from '../hooks/useEstadisticas';

interface Props {
  inventoryId: number;
  atributo: string;
  onClose: () => void;
}

// 0 = "Automático" (el backend aplica la regla de Sturges cuando no le mandás
// el parámetro). Se usa 0 como centinela en vez de undefined porque un Select
// de antd con value undefined muestra el placeholder en lugar de la opción.
const AUTOMATICO = 0;

const OPCIONES_INTERVALOS = [
  { value: AUTOMATICO, label: 'Automático' },
  ...[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((n) => ({ value: n, label: `${n} intervalos` })),
];

// Histograma armado con divs (altura proporcional a la frecuencia), sin
// librería de gráficos: @ant-design/plots está en package.json pero no está
// instalado de verdad en node_modules, y una docena de barras no justifica
// arrastrar esa dependencia rota. Ver DOC/Atributos_Doc.md, Fase 7.
export const AtributoHistograma: React.FC<Props> = ({ inventoryId, atributo, onClose }) => {
  const [intervalos, setIntervalos] = useState<number>(AUTOMATICO);
  const { data, isLoading } = useMediana(inventoryId, atributo, intervalos || undefined);
  const { token } = theme.useToken();
  const [desdeIdx, setDesdeIdx] = useState<number | null>(null);
  const [hastaIdx, setHastaIdx] = useState<number | null>(null);
  const { mutate: calcularPromedio, data: rango, isPending: calculandoRango, reset: resetRango } = usePromedioRango(inventoryId);

  // Cambiar la cantidad de intervalos redefine los buckets: los índices que el
  // usuario tenía elegidos para el promedio por rango dejan de significar lo
  // mismo (y pueden ni existir con menos intervalos, lo que rompería
  // handleCalcularRango al indexar el histograma). Se limpian la selección y
  // el resultado anterior.
  const handleIntervalosChange = (valor: number) => {
    setIntervalos(valor);
    setDesdeIdx(null);
    setHastaIdx(null);
    resetRango();
  };

  const maxFrecuencia = useMemo(
    () => Math.max(1, ...(data?.histograma.map((b) => b.frecuencia) ?? [1])),
    [data]
  );

  const opcionesIntervalo = (data?.histograma ?? []).map((b, i) => ({
    value: i,
    label: `${b.desde.toFixed(2)} – ${b.hasta.toFixed(2)} (${b.frecuencia} items)`,
  }));

  const handleCalcularRango = () => {
    if (desdeIdx === null || hastaIdx === null || !data) return;
    const i = Math.min(desdeIdx, hastaIdx);
    const j = Math.max(desdeIdx, hastaIdx);
    calcularPromedio({ atributo, desde: data.histograma[i].desde, hasta: data.histograma[j].hasta });
  };

  return (
    <Modal title={`Mediana e histograma — ${atributo}`} open onCancel={onClose} footer={null} width={560} destroyOnClose>
      {isLoading && <Spin style={{ display: 'block', margin: '24px auto' }} />}

      {data && data.con_valor === 0 && <Empty description="Este atributo no tiene valores cargados todavía" />}

      {data && data.con_valor > 0 && (
        <>
          <Statistic
            title="Mediana (agrupada por intervalos, no es el percentil exacto)"
            value={data.mediana ?? 0}
            precision={2}
            style={{ marginBottom: 20 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}>Dividir en</span>
            <Select
              size="small"
              style={{ width: 150 }}
              options={OPCIONES_INTERVALOS}
              value={intervalos}
              onChange={handleIntervalosChange}
            />
            <Tooltip title="El histograma parte el rango de valores (del mínimo al máximo) en tramos de igual ancho y cuenta cuántos items caen en cada uno. Si hay pocos valores distintos y separados, los tramos del medio quedan vacíos: no faltan items, es que ahí no hay ninguno. Bajá la cantidad de tramos para verlos agrupados.">
              <InfoCircleOutlined style={{ color: token.colorTextTertiary, cursor: 'help' }} />
            </Tooltip>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 130, marginBottom: 4 }}>
            {data.histograma.map((b, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }} title={`${b.desde.toFixed(2)} – ${b.hasta.toFixed(2)}: ${b.frecuencia} items`}>
                <div
                  style={{
                    height: Math.max(4, (b.frecuencia / maxFrecuencia) * 100),
                    background: token.colorPrimary,
                    borderRadius: '2px 2px 0 0',
                  }}
                />
                <div style={{ fontSize: 10, color: token.colorTextTertiary, marginTop: 4 }}>{b.frecuencia}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 24 }}>
            {data.n_intervalos} intervalos de ancho {data.ancho_intervalo?.toFixed(2)}, entre {data.minimo?.toFixed(2)} y {data.maximo?.toFixed(2)}. Las barras suman {data.con_valor} item(s), todos los que tienen valor cargado.
          </div>

          <div style={{ fontWeight: 500, marginBottom: 8 }}>Promedio de un rango de intervalos</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Select placeholder="Desde" style={{ flex: 1 }} options={opcionesIntervalo} value={desdeIdx} onChange={setDesdeIdx} />
            <Select placeholder="Hasta" style={{ flex: 1 }} options={opcionesIntervalo} value={hastaIdx} onChange={setHastaIdx} />
            <Button type="primary" onClick={handleCalcularRango} loading={calculandoRango} disabled={desdeIdx === null || hastaIdx === null}>
              Calcular
            </Button>
          </div>

          {rango && (
            <Statistic
              title={`Promedio entre ${rango.desde.toFixed(2)} y ${rango.hasta.toFixed(2)}`}
              value={rango.promedio ?? 0}
              precision={2}
              suffix={`(${rango.cantidad} items)`}
            />
          )}
        </>
      )}
    </Modal>
  );
};
