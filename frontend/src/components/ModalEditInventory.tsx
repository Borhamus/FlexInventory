import React, { useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { useUpdateInventory } from '../hooks/useInventory';

interface ModalEditInventoryProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryId: number;
  currentName: string; // Recibimos el nombre actual para pre-llenar el input
}

export const ModalEditInventory: React.FC<ModalEditInventoryProps> = ({ 
  isOpen, 
  onClose, 
  inventoryId, 
  currentName 
}) => {
  const [form] = Form.useForm();
  const { mutate: updateInventory, isPending } = useUpdateInventory();

  // Este hook es vital: Llena el input con el nombre actual cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      form.setFieldsValue({ nombre: currentName });
    }
  }, [isOpen, currentName, form]);

  const handleFinish = (values: { nombre: string }) => {
    updateInventory(
      { id: inventoryId, payload: values },
      {
        onSuccess: () => {
          message.success('Inventario actualizado correctamente');
          form.resetFields();
          onClose(); // Cerramos el modal
        },
        onError: (error) => {
          console.error("Error actualizando:", error);
          message.error('No se pudo actualizar el inventario');
        }
      }
    );
  };

  return (
    <Modal
      title="Editar Inventario"
      open={isOpen}
      onCancel={onClose}
      onOk={() => form.submit()} // Conecta el botón "OK" del modal con el formulario
      confirmLoading={isPending}
      okText="Guardar Cambios"
      cancelText="Cancelar"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
      >
        <Form.Item
          name="nombre"
          label="Nombre del Inventario"
          rules={[
            { required: true, message: 'Por favor ingresá un nombre' },
            { min: 3, message: 'El nombre debe tener al menos 3 caracteres' }
          ]}
        >
          <Input placeholder="Ej: Indumentaria, Ferretería..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};