import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Layout, Card, Form, Input, Button, Typography, theme } from 'antd';
import { ShopOutlined, UserOutlined, MailOutlined, LockOutlined, UserAddOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useAuthContext } from '../context/AuthContext';
import type { RegisterTenantData } from '../schemas/auth.schema';

const { Content } = Layout;
const { Title, Text } = Typography;

interface RegisterFormValues extends RegisterTenantData {
  confirm_password: string;
}

const RegisterTenantPage: React.FC = () => {
  const { token } = theme.useToken();
  const { registerTenant, isRegistering } = useAuth();
  const { isAuthenticated, initializing } = useAuthContext();

  if (!initializing && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onFinish = (values: RegisterFormValues) => {
    const { confirm_password, ...data } = values;
    void confirm_password;
    registerTenant(data);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Card
          style={{ width: 420, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '8px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title level={2} style={{ marginBottom: 0 }}>FlexInventory</Title>
            <Text type="secondary">Creá tu cuenta para empezar a gestionar tu stock</Text>
          </div>

          <Form
            name="register_tenant_form"
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
          >
            <Form.Item
              label="Nombre del comercio"
              name="name"
              rules={[
                { required: true, message: 'El nombre del comercio es obligatorio' },
                { min: 3, message: 'Mínimo 3 caracteres' },
              ]}
            >
              <Input
                prefix={<ShopOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                placeholder="Ej: Ferretería Central"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Usuario administrador"
              name="owner_username"
              rules={[
                { required: true, message: 'El nombre de usuario es obligatorio' },
                { min: 3, message: 'Mínimo 3 caracteres' },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                placeholder="Ej: admin_ferreteria"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Email"
              name="owner_email"
              rules={[
                { required: true, message: 'El email es obligatorio' },
                { type: 'email', message: 'Ingresá un email válido' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                placeholder="Ej: admin@ferreteria.com"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Contraseña"
              name="owner_password"
              rules={[
                { required: true, message: 'La contraseña es obligatoria' },
                { min: 8, message: 'Mínimo 8 caracteres' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                placeholder="Mínimo 8 caracteres"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Confirmar contraseña"
              name="confirm_password"
              dependencies={['owner_password']}
              rules={[
                { required: true, message: 'Confirmá la contraseña' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('owner_password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Las contraseñas no coinciden'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                placeholder="Repetí la contraseña"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                icon={<UserAddOutlined />}
                loading={isRegistering}
              >
                Crear cuenta
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">¿Ya tenés una cuenta? <Link to="/">Iniciá sesión</Link></Text>
          </div>
        </Card>
      </Content>
    </Layout>
  );
};

export default RegisterTenantPage;
