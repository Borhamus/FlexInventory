import React, { useEffect } from 'react';
import {
  Typography,
  Card,
  Form,
  Input,
  Button,
  Divider,
  Space,
  Spin,
  Row,
  Col,
  notification,
  Tooltip
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  BgColorsOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useTheme } from '../context/ThemeContext';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios.config';

const { Text } = Typography;

// ─── API calls ────────────────────────────────────────────────────────────────

const fetchMyProfile = () =>
  api.get<{ id: number; username: string; email: string; role: string }>('/auth/me/profile')
    .then((r) => r.data);

const updateMyUsername = (username: string) =>
  api.patch('/auth/me/username', { username }).then((r) => r.data);

const changeMyPassword = (data: { current_password: string; new_password: string }) =>
  api.patch('/auth/me/password', data).then((r) => r.data);

// PALETA DE COLORES PARA LOS TEMAS
const PRESET_COLORS = [
  { name: 'Azul', hex: '#1677ff' },
  { name: 'Añil / Indigo', hex: '#2f54eb' },
  { name: 'Azul Marino', hex: '#003eb3' },
  { name: 'Violeta', hex: '#722ed1' },
  { name: 'Lima', hex: '#a0d911' },
  { name: 'Verde', hex: '#52c41a' },
  { name: 'Verde Esmeralda', hex: '#08979c' },
  { name: 'Oro / Mostaza', hex: '#faad14' },
  { name: 'Naranja', hex: '#fa8c16' },
  { name: 'Terracota', hex: '#fa541c' },    
  { name: 'Rojo', hex: '#f5222d' },
  { name: 'Cian', hex: '#13c2c2' },
  { name: 'Rosa', hex: '#eb2f96' },
  { name: 'Magenta', hex: '#c41d7f' },            
  { name: 'Gris Pizarra', hex: '#595959' },
  { name: 'negro', hex: '#000000'}
];

const ThemeSettingsCard: React.FC = () => {
  const { primaryColor, setPrimaryColor } = useTheme();

  return (
    <Card title={<Space><BgColorsOutlined />Tema y Apariencia</Space>}>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Elegí el color principal para tu espacio de trabajo.
      </Text>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {PRESET_COLORS.map((color) => {
          const isSelected = primaryColor === color.hex;
          return (
            <Tooltip title={color.name} key={color.hex}>
              <div
                onClick={() => setPrimaryColor(color.hex)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: color.hex,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? `0 0 0 3px ${color.hex}33` : 'none',
                  border: isSelected ? `2px solid ${color.hex}` : '2px solid transparent',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {isSelected && <CheckOutlined style={{ color: '#fff', fontSize: 16 }} />}
              </div>
            </Tooltip>
          );
        })}
      </div>
    </Card>
  );
};

// ─── Lado Izquierdo: Info y Username ──────────────────────────────────────────

const ProfileSection: React.FC = () => {
  const qc = useQueryClient();
  const [usernameForm] = Form.useForm();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: fetchMyProfile,
  });

  useEffect(() => {
    if (profile) {
      usernameForm.setFieldsValue({ username: profile.username });
    }
  }, [profile, usernameForm]);

  const { mutate: saveUsername, isPending: savingUsername } = useMutation({
    mutationFn: (username: string) => updateMyUsername(username),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-profile'] });
      notification.success({ message: 'Nombre de usuario actualizado.' });
    },
    onError: (e: any) =>
      notification.error({ message: e.response?.data?.detail || 'Error al actualizar nombre.' }),
  });

  const handleUsernameSubmit = () => {
    usernameForm.validateFields().then(({ username }) => {
      if (username !== profile?.username) {
        saveUsername(username);
      }
    });
  };

  if (isLoading) return <Spin />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          Rol
        </Text>
        <div>
          <Text strong style={{ textTransform: 'capitalize' }}>
            {profile?.role}
          </Text>
        </div>
      </div>

      <div>
        <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          Email
        </Text>
        <div>
          <Text>{profile?.email ?? '—'}</Text>
        </div>
        <Text type="secondary" style={{ fontSize: 11 }}>
          El email no puede modificarse desde aquí.
        </Text>
      </div>

      <Divider style={{ margin: '4px 0' }} />

      <div>
        <Text strong style={{ display: 'block', marginBottom: 12 }}>
          Cambiar nombre de usuario
        </Text>
        <Form form={usernameForm} layout="vertical">
          <Form.Item
            name="username"
            rules={[
              { required: true, message: 'El nombre de usuario es obligatorio' },
              { min: 3, message: 'Mínimo 3 caracteres' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nombre de usuario" />
          </Form.Item>
          <Button
            type="primary"
            loading={savingUsername}
            onClick={handleUsernameSubmit}
          >
            Guardar nombre
          </Button>
        </Form>
      </div>
    </div>
  );
};

// ─── Lado Derecho: Contraseña ─────────────────────────────────────────────────

const PasswordSection: React.FC = () => {
  const [passwordForm] = Form.useForm();

  const { mutate: savePassword, isPending: savingPassword } = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      changeMyPassword(data),
    onSuccess: () => {
      passwordForm.resetFields();
      notification.success({ message: 'Contraseña cambiada correctamente.' });
    },
    onError: (e: any) =>
      notification.error({ message: e.response?.data?.detail || 'Error al cambiar contraseña.' }),
  });

  const handlePasswordSubmit = () => {
    passwordForm.validateFields().then((values) => {
      savePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
    });
  };

  return (
    <div>
      <Text strong style={{ display: 'block', marginBottom: 12 }}>
        Cambiar contraseña
      </Text>
      <Form form={passwordForm} layout="vertical">
        <Form.Item
          name="current_password"
          label="Contraseña actual"
          rules={[{ required: true, message: 'Ingresá tu contraseña actual' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Contraseña actual" />
        </Form.Item>

        <Form.Item
          name="new_password"
          label="Nueva contraseña"
          rules={[
            { required: true, message: 'Ingresá la nueva contraseña' },
            { min: 8, message: 'Mínimo 8 caracteres' },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Mínimo 8 caracteres" />
        </Form.Item>

        <Form.Item
          name="confirm_password"
          label="Confirmar nueva contraseña"
          dependencies={['new_password']}
          rules={[
            { required: true, message: 'Confirmá la nueva contraseña' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Las contraseñas no coinciden'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Repetí la nueva contraseña" />
        </Form.Item>

        <Button
          type="primary"
          loading={savingPassword}
          onClick={handlePasswordSubmit}
        >
          Actualizar contraseña
        </Button>
      </Form>
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

const ConfigPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', width: '100%' }}>

      <Row gutter={[24, 24]}>

        <Col span={24}>
          <ThemeSettingsCard />
        </Col>

        {/* Tarjeta Única de Perfil (Ocupa todo el ancho disponible) */}
        <Col span={24}>
          <Card title={<Space><UserOutlined />Mi Perfil y Seguridad</Space>}>

            {/* EL SECRETO: Una fila adentro de la tarjeta */}
            <Row gutter={[64, 24]}>

              {/* Mitad Izquierda: Perfil y Username */}
              <Col xs={24} lg={12}>
                <ProfileSection />
              </Col>

              {/* Mitad Derecha: Contraseña */}
              <Col xs={24} lg={12}>
                <PasswordSection />
              </Col>

            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ConfigPage;