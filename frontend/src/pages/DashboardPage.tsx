import React, { useMemo } from 'react';
import { Row, Col, Typography, Avatar, Skeleton, theme } from 'antd';
import {
  DatabaseOutlined,
  AppstoreOutlined,
  TeamOutlined,
  InboxOutlined,
  CalendarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useInventories } from '../hooks/useInventory';
import { useCatalogos } from '../hooks/useCatalogos';
import { useItems } from '../hooks/useItems';
import { useEmpleados } from '../hooks/useUsuarios';
import { StatCard } from '../components/StatCard';
import type { DashListItem } from '../components/StatCard';
import { EmojiPicker, useEmojiPreference } from '../components/EmojiPicker';
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
  total_notificaciones_sin_leer: number;
}

const fetchStats = () =>
  api.get<DashboardStats>('/auth/me/stats').then((r) => r.data);

// ─── Página principal ─────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const { token }  = theme.useToken();
  const { isTenant, user } = useAuthContext();

  const navigate   = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn:  fetchStats,
  });

  const { data: inventarios = [], isLoading: loadingInv } = useInventories();
  const { data: catalogos   = [], isLoading: loadingCat } = useCatalogos();
  const { data: articulos   = [], isLoading: loadingArt } = useItems();
  const { data: empleados   = [], isLoading: loadingEmp } = useEmpleados({ enabled: isTenant });

  const nombrePorInventario = useMemo(() => {
    const mapa = new Map<number, string>();
    inventarios.forEach((inv) => mapa.set(inv.id, inv.nombre));
    return mapa;
  }, [inventarios]);

  const itemsInventarios: DashListItem[] = inventarios.map((inv) => ({
    key:     inv.id,
    label:   inv.nombre,
    onClick: () => navigate(`/dashboard/inventario/${inv.id}`),
  }));

  const itemsArticulos: DashListItem[] = articulos.map((art) => ({
    key:      art.id,
    label:    art.nombre,
    sublabel: nombrePorInventario.get(art.inventario_id),
    onClick:  () => navigate(`/dashboard/inventario/${art.inventario_id}`),
  }));

  const itemsCatalogos: DashListItem[] = catalogos.map((cat) => ({
    key:     cat.id as React.Key,
    label:   String(cat.nombre),
    onClick: () => navigate(`/dashboard/catalogos/${String(cat.id)}`),
  }));

  const itemsEmpleados: DashListItem[] = empleados.map((emp) => ({
    key:      emp.id,
    label:    emp.username,
    sublabel: emp.email ?? undefined,
  }));

  const fechaHoy = dayjs().format('dddd, D [de] MMMM [de] YYYY');
  // Capitalizar primera letra
  const fechaFormateada = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

  const hora   = dayjs().hour();
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  const inicial = stats?.username?.charAt(0).toUpperCase();
  // Clave namespaced por usuario: sin esto el emoji quedaba en una clave global
  // de localStorage y se filtraba al siguiente usuario que entraba en el mismo
  // navegador.
  const [avatarEmoji, setAvatarEmoji] = useEmojiPreference(`flexinv_emoji_avatar_${user?.id ?? 'anon'}`);

  return (
    <div style={{
      height:     '100%',
      overflowY:  'auto',
      padding:    32,
      width:      '100%',
      background: token.colorBgLayout,
    }}>

      {/* Encabezado: avatar + saludo por hora + fecha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 40 }}>
        <EmojiPicker value={avatarEmoji} onChange={setAvatarEmoji}>
          <Avatar
            size={60}
            icon={avatarEmoji ? undefined : <UserOutlined />}
            style={{
              flexShrink:      0,
              fontSize:        26,
              fontWeight:      600,
              cursor:          'pointer',
              backgroundColor: token.colorPrimary,
              boxShadow:       `0 4px 14px ${token.colorPrimary}59`,
            }}
          >
            {avatarEmoji ?? inicial}
          </Avatar>
        </EmojiPicker>

        <div style={{ minWidth: 0 }}>
          {isLoading ? (
            <Skeleton active title={{ width: 260 }} paragraph={{ rows: 1, width: 180 }} />
          ) : (
            <>
              <Title level={2} style={{ margin: 0, fontWeight: 700, lineHeight: 1.2 }}>
                {saludo}
                {stats?.username && (
                  <span style={{ color: token.colorPrimary }}>, {stats.username}</span>
                )}
              </Title>
              <Text type="secondary" style={{ fontSize: 15 }}>
                <CalendarOutlined style={{ marginRight: 8 }} />
                {fechaFormateada}
              </Text>
            </>
          )}
        </div>
      </div>

      {/* Cards de estadísticas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 4, height: 18, borderRadius: 2, background: token.colorPrimary }} />
        <Text style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1.2, color: token.colorTextSecondary }}>
          RESUMEN GENERAL
        </Text>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Inventarios"
            value={stats?.total_inventarios ?? 0}
            icon={<DatabaseOutlined />}
            color="#1677ff"
            isLoading={isLoading}
            items={itemsInventarios}
            listLoading={loadingInv}
            emptyText="Sin inventarios todavía"
            onSeeAll={() => navigate('/dashboard/inventario')}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Artículos"
            value={stats?.total_items ?? 0}
            icon={<InboxOutlined />}
            color="#52c41a"
            isLoading={isLoading}
            items={itemsArticulos}
            listLoading={loadingArt}
            emptyText="Sin artículos todavía"
            onSeeAll={() => navigate('/dashboard/inventario')}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Catálogos"
            value={stats?.total_catalogos ?? 0}
            icon={<AppstoreOutlined />}
            color="#722ed1"
            isLoading={isLoading}
            items={itemsCatalogos}
            listLoading={loadingCat}
            emptyText="Sin catálogos todavía"
            onSeeAll={() => navigate('/dashboard/catalogos')}
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
              items={itemsEmpleados}
              listLoading={loadingEmp}
              emptyText="Sin empleados todavía"
              onSeeAll={() => navigate('/dashboard/usuarios')}
            />
          </Col>
        )}
        {/* El panel de Notificaciones vive ahora en el dashboard de
            inventarios (InventoryDashboard), donde queda al lado de los datos
            que lo originan. */}
      </Row>
    </div>
  );
};

export default DashboardPage;