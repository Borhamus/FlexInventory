import React from 'react';
import { Modal, Form, Input, InputNumber, message } from 'antd';
import { useCreateItem } from '../hooks/useInventory';

interface Props {
  open: boolean;
  onClose: () => void;
  inventoryId: number;
  // NUEVA PROP: Recibimos una lista con los nombres de los atributos que exige el backend
  atributosRequeridos: string[]; 
}

export const ModalAddItemInventory: React.FC<Props> = ({ 
  open, 
  onClose, 
  inventoryId, 
  atributosRequeridos = [] // Por defecto un array vacío por si no requiere nada
}) => {
  const [form] = Form.useForm();
  const { mutate: createItem, isPending } = useCreateItem();

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      // Gracias al truco del "name" en los Form.Item, "values" ya tiene 
      // adentro el objeto "atributos" armadito. ¡No hay que hacer nada extra!
      
      const payloadCompleto = {
        ...values,
        inventario_id: inventoryId 
      };

      console.log("JSON listo con atributos dinámicos:", payloadCompleto);

      createItem(payloadCompleto, {
        onSuccess: () => {
          message.success('Artículo agregado correctamente');
          form.resetFields();
          onClose();
        },
        onError: (error) => {
          console.error("Falló la petición:", error);
          message.error('No se pudo guardar el artículo en la base de datos');
        }
      });
    }).catch((error) => {
      console.log("Falló la validación del formulario", error);
    });
  };

  return (
    <Modal
      title="Agregar Nuevo Artículo"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={isPending}
      okText="Guardar"
      cancelText="Cancelar"
      destroyOnClose // Muy importante para limpiar los inputs al cerrar
    >
      <Form form={form} layout="vertical">
        
        {/* --- CAMPOS ESTÁTICOS (Siempre están) --- */}
        <Form.Item name="nombre" label="Nombre del Artículo" rules={[{ required: true }]}>
          <Input placeholder="Ej: Remera Básica" />
        </Form.Item>
        <Form.Item name="precio" label="Precio" rules={[{ required: true }]}>
          <InputNumber prefix="$" style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="cantidad" label="Cantidad Inicial" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>

        {/* --- CAMPOS DINÁMICOS (Se dibujan según el inventario) --- */}
        {atributosRequeridos.map((atributo) => (
          <Form.Item
            key={atributo}
            // ¡ESTA ES LA MAGIA! Lo anida en values.atributos[atributo]
            name={['atributos', atributo]} 
            label={`Atributo: ${atributo}`}
            rules={[{ required: true, message: `El campo ${atributo} es obligatorio` }]}
          >
            <Input placeholder={`Ingresar ${atributo.toLowerCase()}`} />
          </Form.Item>
        ))}

      </Form>
    </Modal>
  );
};