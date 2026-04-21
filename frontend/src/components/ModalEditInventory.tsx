import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, Space, message } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useUpdateInventory } from '../hooks/useInventory';

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
      // Extraemos solo las llaves ["Color", "Talle"] para mostrarlas en la lista
      const atributosArray = Object.keys(currentAtributos);
      
      form.setFieldsValue({ 
        nombre: currentName,
        atributos: atributosArray 
      });
    }
  }, [isOpen, currentName, currentAtributos, form]);

  // Este hook es vital: Llena el input con el nombre actual cada vez que se abre el modal
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      
      // Si tu backend sigue esperando un objeto como {"Color": "", "Talle": ""}
      const atributosFormateados: Record<string, string> = {};
      if (values.atributos) {
        values.atributos.forEach((attr: string) => {
          if (attr) atributosFormateados[attr] = ""; // Le ponemos un string vacío de valor
        });
      }

      // IMPORTANTE: Si ya arreglaste tu backend para que acepte un array ["Color", "Talle"], 
      // borrá lo de arriba y pasale directamente `values.atributos` al payload.
      const payloadCompleto = {
        nombre: values.nombre,
        atributos: atributosFormateados 
      };

      updateInventory(
        { id: inventoryId, payload: payloadCompleto },
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
                      {...field}
                      rules={[{ required: true, message: 'El nombre del atributo no puede estar vacío' }]}
                      style={{ margin: 0 }}
                    >
                      <Input placeholder="Ej: Marca, Tamaño, Peso" style={{ width: 300 }} />
                    </Form.Item>
                    
                    {/* Botón rojo para eliminar esta fila */}
                    <MinusCircleOutlined 
                      style={{ color: 'red', fontSize: '18px' }} 
                      onClick={() => remove(field.name)} 
                    />
                  </Space>
                ))}
                
                {/* Botón para agregar una nueva fila */}
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