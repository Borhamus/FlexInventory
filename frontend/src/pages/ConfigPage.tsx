import React, { useEffect } from 'react';
import {
  Typography,
  Card,
  Form,
  Input,
  Button,
  Switch,
  Divider,
  Space,
  Spin,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notification } from 'antd';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios.config';

const { Title, Text } = Typography;

// ─── API calls ────────────────────────────────────────────────────────────────

const fetchMyProfile = () =>
  api.get<{ id: number; username: string; email: string; role: string }>('/auth/me/profile')
    .then((r) => r.data);

const updateMyUsername = (username: string) =>
  api.patch('/auth/me/username', { username }).then((r) => r.data);

const changeMyPassword = (data: { current_password: string; new_password: string }) =>
  api.patch('/auth/me/password', data).then((r) => r.data);

// ─── Sección: Mi Perfil ───────────────────────────────────────────────────────

const ProfileSection: React.FC = () => {
  const qc = useQueryClient();
  const [usernameForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: fetchMyProfile,
  });

  // Inicializar el form cuando carguen los datos
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

  const handleUsernameSubmit = () => {
    usernameForm.validateFields().then(({ username }) => {
      if (username !== profile?.username) {
        saveUsername(username);
      }
    });
  };

  const handlePasswordSubmit = () => {
    passwordForm.validateFields().then((values) => {
      savePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
    });
  };

  if (isLoading) return <Spin />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Info de solo lectura */}
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

      {/* Cambiar username */}
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

      <Divider style={{ margin: '4px 0' }} />

      {/* Cambiar contraseña */}
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
            Cambiar contraseña
          </Button>
        </Form>
      </div>
    </div>
  );
};

// ─── Sección: Apariencia ──────────────────────────────────────────────────────

const AppearanceSection: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
      <div>
        <Text strong style={{ display: 'block' }}>Modo oscuro</Text>
        <Text type="secondary">Cambia entre el tema claro y oscuro de la aplicación.</Text>
      </div>
      <Switch
        checked={isDark}
        onChange={toggleTheme}
        checkedChildren={<BulbOutlined />}
        unCheckedChildren={<BulbOutlined />}
      />
    </Space>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

const ConfigPage: React.FC = () => {
  return (
    <div style={{ padding: 32, maxWidth: 600, width: '100%' }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        Ajustes
      </Title>

      <Card
        title={
          <Space>
            <UserOutlined />
            Mi Perfil
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <ProfileSection />
      </Card>

      <Card
        title={
          <Space>
            <BulbOutlined />
            Apariencia
          </Space>
        }
      >
        <AppearanceSection />
      </Card>
    </div>
  );
};

export default ConfigPage;