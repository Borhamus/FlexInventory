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
        rules={[{ required: true, message: 'El nombre es obligatorio' }, { min: 3, message: 'Mínimo 3 caracteres' }]}
      >
        <Input placeholder="Ej: Temporada Verano 2026" />
      </Form.Item>

      <Form.Item
        name="descripcion"
        label="Descripción"
      >
        <Input.TextArea rows={3} placeholder="Opcional: Breve descripción del catálogo" />
      </Form.Item>
    </Form>
  );
};