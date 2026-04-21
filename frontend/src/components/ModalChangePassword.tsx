import React from 'react';
import { Modal, Form, Input } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useChangePassword } from '../hooks/useUsuarios';
import type { UserResponse } from '../schemas/usuarios.schema';

interface Props {
  open: boolean;
  onClose: () => void;
  empleado: UserResponse | null;
}

export const ModalChangePassword: React.FC<Props> = ({ open, onClose, empleado }) => {
  const [form] = Form.useForm();
  const { mutate: changePassword, isPending } = useChangePassword();

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (!empleado) return;
      changePassword(
        { id: empleado.id, data: { new_password: values.new_password } },
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
          <LockOutlined style={{ marginRight: 8, color: '#1677ff' }} />
          Cambiar contraseña — <strong>{empleado?.username}</strong>
        </span>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="Guardar contraseña"
      cancelText="Cancelar"
      confirmLoading={isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          label="Nueva contraseña"
          name="new_password"
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
          dependencies={['new_password']}
          rules={[
            { required: true, message: 'Confirmá la contraseña' },
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
          <Input.Password placeholder="Repetí la nueva contraseña" />
        </Form.Item>
      </Form>
    </Modal>
  );
};