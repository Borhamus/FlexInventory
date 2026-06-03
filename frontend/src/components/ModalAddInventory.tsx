import React from 'react';
import { Modal, Form, Input, Button, Space, Select, theme } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useCreateInventory } from '../hooks/useInventory';

const TIPO_OPTIONS = [
  { value: 'string',  label: 'Texto' },
  { value: 'integer', label: 'Número entero' },
  { value: 'float',   label: 'Número decimal' },
  { value: 'boolean', label: 'Booleano' },
  { value: 'date',    label: 'Fecha' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ModalAddInventory: React.FC<Props> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const { token } = theme.useToken();

  const { mutate: createInventory, isPending } = useCreateInventory();

  const handleSubmit = () => {
    form.validateFields().then((values) => {

      const atributosFormateados: Record<string, string> = {};
      if (values.atributos_dinamicos) {
        values.atributos_dinamicos.forEach((item: { llave: string; tipo: string }) => {
          if (item?.llave) {
            atributosFormateados[item.llave] = item.tipo;
          }
        });
      }

      const payloadFinal = {
        nombre:      values.nombre,
        descripcion: values.descripcion,
        atributos:   atributosFormateados,
      };

      createInventory(payloadFinal, {
        onSuccess: () => {
          form.resetFields();
          onClose();
        },
        onError: (error) => {
          console.error("Falló el POST", error);
        }
      });
    }).catch((error) => {
      console.log("Validación fallida", error);
    });
  };

  return (
    <Modal
      title="Crear Nuevo Inventario"
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      okText={isPending ? "Creando..." : "Crear"}
      cancelText="Cancelar"
      confirmLoading={isPending}
      destroyOnClose
    >
      <p style={{ marginBottom: 20, color: token.colorTextSecondary }}>
        Define los detalles del inventario y los atributos base que tendrán sus artículos.
      </p>

      <Form form={form} layout="vertical">
        <Form.Item
          label="Nombre del Inventario"
          name="nombre"
          rules={[{ required: true, message: 'El nombre es obligatorio' }]}
        >
          <Input placeholder="Ej: Depósito Central" size="large" />
        </Form.Item>

        <Form.Item label="Descripción" name="descripcion">
          <Input.TextArea rows={2} placeholder="Detalles opcionales..." />
        </Form.Item>

        <div style={{
          padding:      '16px',
          background:   token.colorFillAlter,
          borderRadius: token.borderRadiusLG,
          marginBottom: '24px',
          border:       `1px solid ${token.colorBorderSecondary}`,
        }}>
          <h4 style={{ marginTop: 0, marginBottom: 8, color: token.colorText }}>
            Atributos del Inventario
          </h4>
          <p style={{ fontSize: '12px', color: token.colorTextTertiary, marginBottom: 16 }}>
            Definí qué datos se le pedirán a cada artículo (ej: Color, Talle, Material).
          </p>

          <Form.List name="atributos_dinamicos">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'llave']}
                      rules={[{ required: true, message: 'Ingresá el nombre' }]}
                      style={{ margin: 0 }}
                    >
                      <Input
                        placeholder="Nombre (ej: Color)"
                        style={{ width: '220px' }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'tipo']}
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
                      onClick={() => remove(name)}
                      style={{ color: token.colorError, marginLeft: '8px' }}
                    />
                  </Space>
                ))}

                <Form.Item style={{ marginBottom: 0, marginTop: fields.length ? 8 : 0 }}>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Agregar Atributo
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
