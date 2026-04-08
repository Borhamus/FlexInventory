import React from 'react';
import { Modal, Form, Input, InputNumber } from 'antd';

// Esto es como definir los tipos de datos que va a recibir este "endpoint" (componente)
interface Props {
  open: boolean;
  onClose: () => void;
}

export const ModalAddItem: React.FC<Props> = ({ open, onClose }) => {
  // Instanciamos el formulario de Ant Design
  const [form] = Form.useForm();

  // Esta función se ejecuta cuando el usuario hace clic en "Guardar"
  const handleSubmit = () => {
    // 1. Validamos y extraemos los datos como un JSON
    form.validateFields().then((values) => {
      console.log("JSON listo para mandar a FastAPI:", values);
      
      // TODO: Acá en el próximo paso llamaremos a Axios (tu cartero)
      
      // 2. Cerramos el modal y limpiamos los campos para la próxima vez
      form.resetFields();
      onClose();
    }).catch((error) => {
      console.log("Falló la validación del formulario", error);
    });
  };

  return (
    <Modal
      title="Agregar Nuevo Artículo"
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      okText="Guardar"
      cancelText="Cancelar"
      destroyOnClose
    >
      {/* El layout="vertical" pone las etiquetas arriba de los inputs */}
      <Form form={form} layout="vertical">
        <Form.Item 
          label="Nombre del Artículo" 
          name="nombre" 
          rules={[{ required: true, message: 'El nombre es obligatorio' }]}
        >
          <Input placeholder="Ej: Manzanas" />
        </Form.Item>
        
        <Form.Item 
          label="Precio" 
          name="precio" 
          rules={[{ required: true, message: 'El precio es obligatorio' }]}
        >
          <InputNumber style={{ width: '100%' }} prefix="$" min={0} />
        </Form.Item>

        <Form.Item 
          label="Cantidad Inicial" 
          name="cantidad" 
          rules={[{ required: true, message: 'La cantidad es obligatoria' }]}
        >
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
      </Form>
    </Modal>
  );
};