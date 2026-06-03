import React from 'react';
import { Layout, Card, Form, Input, Button, Typography, theme } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import type { LoginCredentials } from '../schemas/auth.schema';


const { Content } = Layout;
const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const { token } = theme.useToken();
  const { login, isLoading } = useAuth();

  const onFinish = (values: LoginCredentials) => {
    login(values);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Card 
          style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '8px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title level={2} style={{ marginBottom: 0 }}>FlexInventory</Title>
            <Text type="secondary">Inicia sesión para gestionar el personal</Text>
          </div>

          <Form
            name="login_form"
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
          >
            <Form.Item
              label="Usuario"
              name="username"
              rules={[{ required: true, message: 'Por favor, ingresa tu usuario' }]}
            >
              <Input 
                prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} 
                placeholder="Ej: milton" 
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Contraseña"
              name="password"
              rules={[{ required: true, message: 'La contraseña es obligatoria' }]}
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} 
                placeholder="********" 
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                size="large" 
                icon={<LoginOutlined />}
                loading={isLoading}
              >
                Entrar al sistema
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">¿Olvidaste tu contraseña? Contacta al administrador</Text>
          </div>
        </Card>
      </Content>
    </Layout>
  );
};

export default LoginPage;