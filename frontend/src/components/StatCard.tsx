import React from 'react';
import { Card, Statistic, Typography, Spin, List, Empty, theme } from 'antd';

const { Text } = Typography;

// Tarjeta de "un número grande + la lista de los últimos registros detrás".
// Vivía dentro de DashboardPage; se sacó acá cuando el panel de
// Notificaciones se mudó al dashboard de inventarios (InventoryDashboard) y
// pasó a haber dos páginas usándola.

export interface DashListItem {
  key:       React.Key;
  // ReactNode y no string: el panel de Notificaciones resalta en negrita los
  // tramos entrecomillados del mensaje (ver utils/resaltarComillas). El resto
  // de las tarjetas sigue pasando texto plano, que también es un ReactNode.
  label:     React.ReactNode;
  sublabel?: string;
  onClick?:  () => void;
}

export interface StatCardProps {
  title:      string;
  value:      number;
  icon:       React.ReactNode;
  color:      string;
  isLoading:  boolean;
  items?:       DashListItem[];
  listLoading?: boolean;
  emptyText?:   string;
  onSeeAll?:    () => void;
  maxVisible?:  number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title, value, icon, color, isLoading,
  items, listLoading = false, emptyText = 'Sin registros', onSeeAll, maxVisible = 6,
}) => {
  const { token }  = theme.useToken();
  const visibles   = items ? items.slice(0, maxVisible) : [];
  const restantes  = items ? items.length - visibles.length : 0;

  return (
    <Card
      style={{
        borderRadius: token.borderRadiusLG,
        boxShadow:    '0 2px 12px rgba(0,0,0,0.06)',
        height:       '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width:        52,
          height:       52,
          borderRadius: token.borderRadiusLG,
          background:   color + '1a', // color con 10% opacidad
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          fontSize:     24,
          color,
          flexShrink:   0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          {isLoading ? (
            <Spin size="small" />
          ) : (
            <Statistic
              title={title}
              value={value}
              valueStyle={{ color, fontSize: 28, fontWeight: 700 }}
            />
          )}
        </div>
      </div>

      {items && (
        <div style={{ paddingBottom: token.paddingLG }}>
          <div style={{ height: 1, background: token.colorBorderSecondary, margin: '16px 0 4px' }} />
          {listLoading ? (
            <Spin size="small" style={{ display: 'block', margin: '16px auto' }} />
          ) : visibles.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={emptyText}
              style={{ margin: '8px 0' }}
            />
          ) : (
            <>
              <List
                size="small"
                split={false}
                dataSource={visibles}
                renderItem={(it) => (
                  <List.Item
                    onClick={it.onClick}
                    style={{ padding: '9px 0', cursor: it.onClick ? 'pointer' : 'default' }}
                  >
                    <div style={{ width: '100%', minWidth: 0 }}>
                      <Text ellipsis style={{ display: 'block', fontSize: 15 }}>{it.label}</Text>
                      {it.sublabel && (
                        <Text type="secondary" ellipsis style={{ display: 'block', fontSize: 13 }}>
                          {it.sublabel}
                        </Text>
                      )}
                    </div>
                  </List.Item>
                )}
              />
              {(restantes > 0 || onSeeAll) && (
                <Text
                  onClick={onSeeAll}
                  style={{
                    display:   'block',
                    marginTop: 8,
                    fontSize:  12,
                    color:     token.colorPrimary,
                    cursor:    onSeeAll ? 'pointer' : 'default',
                  }}
                >
                  {restantes > 0 ? `+ ${restantes} más — ver todos` : 'Ver todos'}
                </Text>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
};

export default StatCard;
