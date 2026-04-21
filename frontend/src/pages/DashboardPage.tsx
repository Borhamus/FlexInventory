import React from 'react';
import { Row, Col, Card, Statistic, Typography, Spin, theme } from 'antd';
import {
  DatabaseOutlined,
  AppstoreOutlined,
  TeamOutlined,
  InboxOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '../context/AuthContext';
import api from '../api/axios.config';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

const { Title, Text } = Typography;

interface DashboardStats {
  username:          string;
  total_inventarios: number;
  total_items:       number;
  total_catalogos:   number;
  total_empleados:   number;
}

const fetchStats = () =>
  api.get<DashboardStats>('/auth/me/stats').then((r) => r.data);

// ─── Card de estadística ──────────────────────────────────────────────────────

interface StatCardProps {
  title:      string;
  value:      number;
  icon:       React.ReactNode;
  color:      string;
  isLoading:  boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, isLoading }) => {
  const { token } = theme.useToken();
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
    </Card>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const { token }  = theme.useToken();
  const { isTenant } = useAuthContext();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn:  fetchStats,
  });

  const fechaHoy = dayjs().format('dddd, D [de] MMMM [de] YYYY');
  // Capitalizar primera letra
  const fechaFormateada = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

  return (
    <div style={{
      padding:    32,
      width:      '100%',
      minHeight:  '100vh',
      background: token.colorBgLayout,
    }}>

      {/* Saludo */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <SmileOutlined style={{ fontSize: 28, color: token.colorPrimary }} />
          <Title level={2} style={{ margin: 0 }}>
            {isLoading
              ? 'Bienvenido'
              : `Bienvenido, ${stats?.username}`
            }
          </Title>
        </div>
        <Text type="secondary" style={{ fontSize: 15 }}>
          {fechaFormateada}
        </Text>
      </div>

      {/* Cards de estadísticas */}
      <Title level={5} style={{ marginBottom: 16, color: token.colorTextSecondary }}>
        RESUMEN GENERAL
      </Title>

      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Inventarios"
            value={stats?.total_inventarios ?? 0}
            icon={<DatabaseOutlined />}
            color="#1677ff"
            isLoading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Artículos"
            value={stats?.total_items ?? 0}
            icon={<InboxOutlined />}
            color="#52c41a"
            isLoading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Catálogos"
            value={stats?.total_catalogos ?? 0}
            icon={<AppstoreOutlined />}
            color="#722ed1"
            isLoading={isLoading}
          />
        </Col>
        {/* Empleados solo visible para tenant */}
        {isTenant && (
          <Col xs={24} sm={12} xl={6}>
            <StatCard
              title="Empleados"
              value={stats?.total_empleados ?? 0}
              icon={<TeamOutlined />}
              color="#fa8c16"
              isLoading={isLoading}
            />
          </Col>
        )}
      </Row>

    </div>
  );
};

export default DashboardPage;