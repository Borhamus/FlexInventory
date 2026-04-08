import React from 'react';
import { Modal, Form, Input, Button, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useCreateInventory } from '../hooks/useInventory';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ModalAddInventory: React.FC<Props> = ({ open, onClose }) => {
  const [form] = Form.useForm();

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

      // 3. Armamos el paquete final exacto como lo pide tu backend
      const payloadFinal = {
        nombre: values.nombre,
        descripcion: values.descripcion,
        atributos: atributosFormateados // ¡Acá va el JSON perfecto!
      };

      console.log("JSON empaquetado y listo para FastAPI:", payloadFinal);
      
      createInventory(payloadFinal, {
        onSuccess: () => {
          form.resetFields();
          onClose(); // Se cierra el modal y se recarga la barra lateral sola
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
      okText={isPending ? "Creando..." : "Crear"} // ¡Acá!
      cancelText="Cancelar"
      confirmLoading={isPending} // ¡Y acá!
      destroyOnClose
    >
      <p style={{ marginBottom: 20, color: '#666' }}>
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

        {/* --- INICIO ZONA DE ESQUEMA DE ATRIBUTOS (Solo nombres) --- */}
        <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '24px' }}>
        <h4 style={{ marginTop: 0, marginBottom: 8 }}>Atributos del Inventario</h4>
        <p style={{ fontSize: '12px', color: '#888', marginBottom: 16 }}>
            Definí qué datos se le pedirán a cada artículo (ej: Color, Talle, Material).
        </p>
        
            <Form.List name="atributos_dinamicos">
                {(fields, { add, remove }) => (
                <>
                    {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item
                        {...restField}
                        name={[name, 'llave']} // Mantenemos 'llave' para no romper el mapeo
                        rules={[{ required: true, message: 'Nombre del Atributo' }]}
                        >
                        {/* Expandimos el ancho a 350px ya que ahora está solo */}
                        <Input placeholder="Nombre del atributo (ej: Color)" style={{ width: '350px' }} />
                        </Form.Item>
                        
                        {/* ELIMINAMOS EL FORM.ITEM DE 'VALOR' AQUÍ */}
                        
                        <MinusCircleOutlined 
                        onClick={() => remove(name)} 
                        style={{ color: '#ff4d4f', marginLeft: '8px' }} 
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