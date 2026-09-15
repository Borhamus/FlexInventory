import { Card, Row, Col, Statistic } from 'antd';
import { BoxPlotOutlined, PartitionOutlined, BuildOutlined, BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useInventories } from '../hooks/useInventory';
import { useAuthContext } from '../context/AuthContext';
import { useNotificaciones, useNotificacionesNoLeidasCount } from '../hooks/useNotificaciones';
import { StatCard } from '../components/StatCard';
import type { DashListItem } from '../components/StatCard';
import { resaltarComillas } from '../utils/resaltarComillas';
// Panel viejo de alertas de vencimiento — reemplazado por el de
// Notificaciones de acá abajo, que lee del motor del backend en vez de
// recalcular los vencimientos en el cliente. Se deja importado y comentado
// (no borrado) por si hay que volver atrás.
// import AlertasVencimiento from '../components/AlertasVencimiento';

export const InventoryDashboard = () => {

  const { data: inventories, isLoading } = useInventories();
  const { user, isTenant, hasPermission } = useAuthContext();
  const navigate = useNavigate();

  // Mismo gate que el ítem "Avisos" del Sider — dueño siempre, empleado solo
  // si su rol tiene notificaciones:read.
  const puedeVerNotificaciones = isTenant || hasPermission('notificaciones', 'read');

  const { data: notificacionesData, isLoading: loadingNotif } = useNotificaciones(
    { leida: false, limit: 6 },
    puedeVerNotificaciones,
  );
  // El total sin leer sale del contador que ya existe (y que refresca solo
  // cada 60s para el badge del Sider), en vez de pedir /auth/me/stats como
  // hacía el dashboard de inicio: es el mismo número y evita una query más.
  const { data: totalSinLeer = 0, isLoading: loadingTotal } = useNotificacionesNoLeidasCount(puedeVerNotificaciones);

  const itemsNotificaciones: DashListItem[] = (notificacionesData?.items || []).map((n) => ({
    key:      n.id,
    label:    resaltarComillas(n.mensaje),
    sublabel: n.inventario_nombre ?? undefined,
    onClick:  () => navigate(n.inventario_id ? `/dashboard/inventario/${n.inventario_id}` : '/dashboard/notificaciones'),
  }));

  if (isLoading) return null;

  const totalInventarios = inventories?.length || 0;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '40px' }}>
      <h2 style={{ marginBottom: '24px' }}>Resumen General de Inventarios</h2>

      <Row gutter={16}>
        <Col span={8}>
          <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Total de Inventarios"
              value={totalInventarios}
              prefix={<BoxPlotOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Estado del Sistema"
              value="Activo"
              prefix={<PartitionOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Usuario"
              value={user?.sub}
              prefix={<BuildOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {puedeVerNotificaciones && (
        // Mismo gutter={16} que la Row de arriba: con span={24} el panel
        // arranca y termina exactamente en los bordes de la fila de las tres
        // tarjetas (el gutter compensa el padding de las columnas).
        <Row gutter={16} style={{ marginTop: 32 }}>
          <Col span={24}>
            <StatCard
              title="Notificaciones"
              value={totalSinLeer}
              icon={<BellOutlined />}
              color="#f5222d"
              isLoading={loadingTotal}
              items={itemsNotificaciones}
              listLoading={loadingNotif}
              emptyText="Sin notificaciones sin leer"
              onSeeAll={() => navigate('/dashboard/notificaciones')}
            />
          </Col>
        </Row>
      )}

      {/* <div style={{ marginTop: 32 }}>
        <AlertasVencimiento />
      </div> */}
    </div>
  );
};
export default InventoryDashboard;
