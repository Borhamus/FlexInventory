import React from 'react';
import { Form, Input } from 'antd';

interface CatalogFormProps {
  form: any; // Instancia de Form de Antd
  onFinish: (values: any) => void;
}

export const CatalogForm: React.FC<CatalogFormProps> = ({ form, onFinish }) => {
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{ nombre: '', descripcion: '' }}
    >
      <Form.Item
        name="nombre"
        label="Nombre del Catálogo"
        rules={[{ required: true, message: 'El nombre es obligatorio.' }, { min: 3, message: 'Mínimo 3 caracteres' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="descripcion"
        label="Descripción"
        rules={[{ required: false }, { max: 100, message: 'Máximo 100 caracteres' }]}
      >
        <Input.TextArea rows={3} />
      </Form.Item>
    </Form>
  );
};