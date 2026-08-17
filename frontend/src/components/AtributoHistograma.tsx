import React, { useMemo, useState } from 'react';
import { Modal, Spin, Empty, Select, Button, Statistic, theme } from 'antd';
import { useMediana, usePromedioRango } from '../hooks/useEstadisticas';

interface Props {
  inventoryId: number;
  atributo: string;
  onClose: () => void;
}

// Histograma armado con divs (altura proporcional a la frecuencia), sin
// librería de gráficos: @ant-design/plots está en package.json pero no está
// instalado de verdad en node_modules, y una docena de barras no justifica
// arrastrar esa dependencia rota. Ver DOC/Atributos_Doc.md, Fase 7.
export const AtributoHistograma: React.FC<Props> = ({ inventoryId, atributo, onClose }) => {
  const { data, isLoading } = useMediana(inventoryId, atributo);
  const { token } = theme.useToken();
  const [desdeIdx, setDesdeIdx] = useState<number | null>(null);
  const [hastaIdx, setHastaIdx] = useState<number | null>(null);
  const { mutate: calcularPromedio, data: rango, isPending: calculandoRango } = usePromedioRango(inventoryId);

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
            {data.n_intervalos} intervalos de ancho {data.ancho_intervalo?.toFixed(2)}, entre {data.minimo?.toFixed(2)} y {data.maximo?.toFixed(2)}.
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
