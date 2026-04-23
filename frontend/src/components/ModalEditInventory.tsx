import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, Space, Select, message } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useUpdateInventory } from '../hooks/useInventory';

const TIPO_OPTIONS = [
  { value: 'string',  label: 'Texto' },
  { value: 'integer', label: 'Entero' },
  { value: 'float',   label: 'Decimal' },
  { value: 'boolean', label: 'Casilla' },
  { value: 'date',    label: 'Fecha' },
];

interface ModalEditInventoryProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryId: number;
  currentName: string;
  currentAtributos: Record<string, string>;
}

export const ModalEditInventory: React.FC<ModalEditInventoryProps> = ({
  isOpen,
  onClose,
  inventoryId,
  currentName,
  currentAtributos = {}
}) => {
  const [form] = Form.useForm();
  const { mutate: updateInventory, isPending } = useUpdateInventory();

  useEffect(() => {
    if (isOpen) {
      form.setFieldsValue({
        nombre: currentName,
        atributos: Object.entries(currentAtributos).map(([nombre, tipo]) => ({ nombre, tipo })),
      });
    }
  }, [isOpen, currentName, currentAtributos, form]);

  const makeDefaultValidator = (fieldName: number) => ({
    validator(_: unknown, value: string) {
      if (!value) return Promise.resolve();
      const tipo: string = form.getFieldValue(['atributos', fieldName, 'tipo']);
      switch (tipo) {
        case 'integer':
          return /^-?\d+$/.test(value)
            ? Promise.resolve()
            : Promise.reject(new Error('Debe ser un número entero'));
        case 'float':
        case 'number':
          return /^-?\d+(\.\d+)?$/.test(value)
            ? Promise.resolve()
            : Promise.reject(new Error('Debe ser un número decimal'));
        case 'boolean':
          return ['true', 'false'].includes(value.toLowerCase())
            ? Promise.resolve()
            : Promise.reject(new Error('Debe ser true o false'));
        case 'date':
          return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value))
            ? Promise.resolve()
            : Promise.reject(new Error('Formato inválido (YYYY-MM-DD)'));
        default:
          return Promise.resolve();
      }
    },
  });

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const atributosFormateados: Record<string, string> = {};
      const defaults: Record<string, unknown> = {};

      if (values.atributos) {
        values.atributos.forEach((attr: { nombre: string; tipo: string; default?: string }) => {
          if (attr?.nombre) {
            atributosFormateados[attr.nombre] = attr.tipo;
            if (attr.default) defaults[attr.nombre] = attr.default;
          }
        });
      }

      const payload: { nombre: string; atributos: Record<string, string>; defaults?: Record<string, unknown> } = {
        nombre: values.nombre,
        atributos: atributosFormateados,
      };
      if (Object.keys(defaults).length > 0) payload.defaults = defaults;

      updateInventory(
        { id: inventoryId, payload },
        {
          onSuccess: () => {
            message.success('Inventario y atributos actualizados');
            form.resetFields();
            onClose();
          },
          onError: (error) => {
            console.error(error);
            message.error('No se pudo actualizar el inventario');
          }
        }
      );
    }).catch(console.log);
  };

  return (
    <Modal
      title="Editar Inventario y Atributos"
      open={isOpen}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={isPending}
      okText="Guardar Cambios"
      cancelText="Cancelar"
      destroyOnClose
    >
      <Form form={form} layout="vertical">

        <Form.Item
          name="nombre"
          label="Nombre del Inventario"
          rules={[{ required: true, message: 'Ingresá un nombre' }]}
        >
          <Input placeholder="Ej: Verdulería" />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', paddingBottom: 8 }}>Columnas / Atributos del Inventario</label>
          <Form.List name="atributos">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      name={[field.name, 'nombre']}
                      rules={[{ required: true, message: 'El nombre no puede estar vacío' }]}
                      style={{ margin: 0 }}
                    >
                      <Input placeholder="Ej: Marca, Tamaño" style={{ width: '160px' }} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'tipo']}
                      rules={[{ required: true, message: 'Elegí un tipo' }]}
                      style={{ margin: 0 }}
                    >
                      <Select
                        placeholder="Tipo"
                        style={{ width: '120px' }}
                        options={TIPO_OPTIONS}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'default']}
                      rules={[makeDefaultValidator(field.name)]}
                      style={{ margin: 0 }}
                    >
                      <Input placeholder="Default (opcional)" style={{ width: '160px' }} />
                    </Form.Item>
                    <MinusCircleOutlined
                      style={{ color: 'red', fontSize: '18px' }}
                      onClick={() => remove(field.name)}
                    />
                  </Space>
                ))}

                <Form.Item style={{ marginTop: 16 }}>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Agregar nuevo atributo
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </div>

      </Form>
    </Modal>
  );
};
