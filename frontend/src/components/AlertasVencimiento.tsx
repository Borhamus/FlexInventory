import React, { useState } from 'react';
import { Card, List, Tag, Empty, Spin, Typography, theme } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAlertasVencimiento } from '../hooks/useEstadisticas';

const { Text } = Typography;

// Widget de dashboard: junta las alertas de vencimiento de TODOS los
// inventarios del tenant en una sola vista (GET /inventarios/alertas),
// que ya hace ese trabajo del lado del backend). Reutiliza el rol
// fecha_reposicion configurado por inventario — no hay nada que
// configurar acá, si no hay inventarios con ese rol, simplemente no
// aparece nada que mostrar.
export const AlertasVencimiento: React.FC = () => {
  const { data: alertas, isLoading } = useAlertasVencimiento(7);
  const navigate = useNavigate();
  const { token } = theme.useToken();
  // Cantidad de alertas por página, elegible por el usuario (mismo criterio
  // que la tabla de inventario y el listado de catálogos).
  const [pageSize, setPageSize] = useState(5);

  const colorPorDias = (dias: number) => {
    if (dias < 0) return token.colorError;
    if (dias <= 2) return token.colorWarning;
    return token.colorTextSecondary;
  };

  return (
    <Card
      title={
        <span>
          <WarningOutlined style={{ color: token.colorWarning, marginRight: 8 }} />
          Alertas de vencimiento
        </span>
      }
      style={{ borderRadius: token.borderRadiusLG, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      {isLoading ? (
        <Spin style={{ display: 'block', margin: '24px auto' }} />
      ) : !alertas || alertas.length === 0 ? (
        <Empty
          description="No hay artículos por vencer en los próximos 7 días"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          dataSource={alertas}
          style={{ paddingBottom: token.paddingLG }}
          pagination={
            // Paginador visible solo con más de 5 (el mínimo elegible); una
            // vez visible, incluye el selector de cantidad por página.
            alertas.length > 5
              ? {
                  pageSize,
                  size: 'small',
                  align: 'center',
                  showSizeChanger: true,
                  pageSizeOptions: ['5', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100'],
                  onChange: (_page, nuevoPageSize) => setPageSize(nuevoPageSize),
                }
              : false
          }
          renderItem={(alerta) => (
            <List.Item
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/dashboard/inventario/${alerta.inventario_id}`)}
            >
              <List.Item.Meta
                title={<Text strong>{alerta.item_nombre}</Text>}
                description={
                  <>
                    <Text type="secondary">{alerta.inventario_nombre}</Text>
                    {alerta.proveedor && (
                      <Text type="secondary"> · Proveedor: {alerta.proveedor}</Text>
                    )}
                  </>
                }
              />
              <div style={{ textAlign: 'right' }}>
                <Tag
                  color={alerta.dias_restantes < 0 ? 'error' : alerta.dias_restantes <= 2 ? 'warning' : 'default'}
                  style={{ marginInlineEnd: 0 }}
                >
                  {alerta.dias_restantes < 0
                    ? `Vencido hace ${Math.abs(alerta.dias_restantes)} día(s)`
                    : alerta.dias_restantes === 0
                      ? 'Vence hoy'
                      : `Vence en ${alerta.dias_restantes} día(s)`}
                </Tag>
                <div style={{ fontSize: 11, color: colorPorDias(alerta.dias_restantes), marginTop: 2 }}>
                  {dayjs(alerta.fecha_vencimiento).format('DD/MM/YYYY')}
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

export default AlertasVencimiento;
