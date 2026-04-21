import React from 'react';
import { Modal, Form, Input, Button, Space, theme } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useCreateInventory } from '../hooks/useInventory';

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

      const atributosFormateados: Record<string, any> = {};
      
      if (values.atributos_dinamicos) {
        values.atributos_dinamicos.forEach((item: any) => {
          if (item && item.llave) {
            atributosFormateados[item.llave] = "";
          }
        });
      }

      const payloadFinal = {
        nombre:      values.nombre,
        descripcion: values.descripcion,
        atributos:   atributosFormateados,
      };

      console.log("JSON empaquetado y listo para FastAPI:", payloadFinal);
      
      createInventory(payloadFinal, {
        onSuccess: () => {
          form.resetFields();
          onClose();
        },
        onError: (error) => {
          console.error("Falló el POST", error);
        }
      });
      
      form.resetFields();
      onClose();
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
                      rules={[{ required: true, message: 'Nombre del Atributo' }]}
                    >
                      <Input
                        placeholder="Nombre del atributo (ej: Color)"
                        style={{ width: '350px' }}
                      />
                    </Form.Item>
                    <MinusCircleOutlined
                      onClick={() => remove(name)}
                      style={{ color: token.colorError, marginLeft: '8px' }}
                    />
                  </Space>
                ))}
                
                <Form.Item style={{ marginBottom: 0 }}>
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