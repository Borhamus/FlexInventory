import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber } from 'antd';
import { useUpdateItem } from '../hooks/useInventory'; // Asumo que tenés este hook

interface Props {
  open: boolean;
  onClose: () => void;
  item: any; // El ítem seleccionado para editar
  atributosRequeridos: string[];
}
export const ModalEditItemInventory: React.FC<Props> = ({ 
    open, 
    onClose, 
    item, 
    atributosRequeridos 
  }) => {
    const [form] = Form.useForm();
    
    // 1. Instanciamos nuestro nuevo hook
    const { mutate: updateItem, isPending } = useUpdateItem();

    useEffect(() => {
        if (open && item) {
          form.setFieldsValue({
            nombre: item.nombre,
            cantidad: item.cantidad,
            // Importante: si tu backend manda los atributos anidados, Ant los mapea solos
            atributos: item.atributos 
          });
        }
      }, [open, item, form]);
  
    const onOk = () => {
      form.validateFields().then((values) => {
        // 2. Llamamos a la mutación pasando el ID y los valores del form
        updateItem({ 
          id: item.id, 
          payload: {
            ...values,
            inventario_id: item.inventario_id // Mantenemos la relación
          } 
        }, {
          onSuccess: () => onClose() // Cerramos solo si salió bien
        });
      });
    };

  return (
    <Modal
      title="Editar Artículo"
      open={open}
      onOk={onOk}
      onCancel={onClose}
      confirmLoading={isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="cantidad" label="Cantidad" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>

        {/* Campos dinámicos */}
        {atributosRequeridos.map((attr) => (
          <Form.Item key={attr} name={['atributos', attr]} label={attr}>
            <Input />
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
};