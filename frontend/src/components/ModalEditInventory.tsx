import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, Space, Select, message } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useUpdateInventory } from '../hooks/useInventory';

const TIPO_OPTIONS = [
  { value: 'string',  label: 'Texto' },
  { value: 'integer', label: 'Número entero' },
  { value: 'float',   label: 'Número decimal' },
  { value: 'boolean', label: 'Booleano' },
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

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const atributosFormateados: Record<string, string> = {};
      if (values.atributos) {
        values.atributos.forEach((attr: { nombre: string; tipo: string }) => {
          if (attr?.nombre) {
            atributosFormateados[attr.nombre] = attr.tipo;
          }
        });
      }

      updateInventory(
        { id: inventoryId, payload: { nombre: values.nombre, atributos: atributosFormateados } },
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
                      <Input placeholder="Ej: Marca, Tamaño, Peso" style={{ width: '200px' }} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'tipo']}
                      rules={[{ required: true, message: 'Elegí un tipo' }]}
                      style={{ margin: 0 }}
                    >
                      <Select
                        placeholder="Tipo"
                        style={{ width: '150px' }}
                        options={TIPO_OPTIONS}
                      />
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
