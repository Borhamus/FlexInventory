import React from 'react';
import { Modal, Form, Input } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import { useCreateEmpleado } from '../hooks/useUsuarios';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ModalCreateUser: React.FC<Props> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const { mutate: createEmpleado, isPending } = useCreateEmpleado();

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      createEmpleado(
        {
          username: values.username,
          password: values.password,
          email: values.email || undefined,
        },
        {
          onSuccess: () => {
            form.resetFields();
            onClose();
          },
        }
      );
    });
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <span>
          <UserAddOutlined style={{ marginRight: 8, color: '#1677ff' }} />
          Crear nuevo empleado
        </span>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="Crear empleado"
      cancelText="Cancelar"
      confirmLoading={isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          label="Nombre de usuario"
          name="username"
          rules={[
            { required: true, message: 'El nombre de usuario es obligatorio' },
            { min: 3, message: 'Mínimo 3 caracteres' },
          ]}
        >
          <Input placeholder="Ej: juan_gomez" />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[{ type: 'email', message: 'Ingresá un email válido' }]}
        >
          <Input placeholder="Ej: juan@empresa.com (opcional)" />
        </Form.Item>

        <Form.Item
          label="Contraseña"
          name="password"
          rules={[
            { required: true, message: 'La contraseña es obligatoria' },
            { min: 8, message: 'Mínimo 8 caracteres' },
          ]}
        >
          <Input.Password placeholder="Mínimo 8 caracteres" />
        </Form.Item>

        <Form.Item
          label="Confirmar contraseña"
          name="confirm_password"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Confirmá la contraseña' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Las contraseñas no coinciden'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="Repetí la contraseña" />
        </Form.Item>
      </Form>
    </Modal>
  );
};