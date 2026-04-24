import React from 'react';
import { Modal, Form, Input, InputNumber, message, Switch, DatePicker, Select } from 'antd';
import { useCreateItem } from '../hooks/useInventory';
import dayjs from 'dayjs';

interface Props {
  open: boolean;
  onClose: () => void;
  inventoryId: number;
  atributosRequeridos: Record<string, string>; 
}

export const ModalAddItemInventory: React.FC<Props> = ({ 
    open, 
    onClose, 
    inventoryId, 
    atributosRequeridos = [] 
  }) => {
  const [form] = Form.useForm();
  const { mutate: createItem, isPending } = useCreateItem();

  const renderizarInput = (tipo: string) => {
    switch (tipo) {
      case 'integer':
        return <InputNumber style={{ width: '100%' }} />;
      case 'float':
        return <InputNumber step={0.1} style={{ width: '100%' }} />;
      case 'boolean':
        return <Switch checkedChildren="Sí" unCheckedChildren="No" />;
      case 'date':
        return <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />;
      case 'list':
        return (
          <Select>
            <Select.Option value="opcion1">Opción 1</Select.Option>
            <Select.Option value="opcion2">Opción 2</Select.Option>
          </Select>
        );
      case 'string':
      default:
        return <Input />;
    }
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {

      const atributosLimpios = { ...values.atributos };

      if (atributosLimpios) {
        Object.keys(atributosLimpios).forEach((key) => {
          if (dayjs.isDayjs(atributosLimpios[key])) {
            atributosLimpios[key] = atributosLimpios[key].format('YYYY-MM-DD'); 
          }
        });
      }

      const payloadCompleto = {
        ...values,
        atributos: atributosLimpios, 
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

  const listaAtributos = Object.entries(atributosRequeridos);

  return (
    <Modal
      title="Agregar Nuevo Artículo"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={isPending}
      okText="Guardar"
      cancelText="Cancelar"
      destroyOnClose 
    >
      <Form form={form} layout="vertical">
        
        {/* --- CAMPOS ESTÁTICOS (Siempre están) --- */}
        <Form.Item name="nombre" label="Nombre del Artículo">
          <Input placeholder="Ej: Remera Básica" />
        </Form.Item>
        <Form.Item name="cantidad" label="Cantidad Inicial">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>

        {/* --- CAMPOS DINÁMICOS --- */}
        {listaAtributos.map(([nombreAtributo, tipoAtributo]) => (
          <Form.Item
            key={nombreAtributo}
            name={['atributos', nombreAtributo]} 
            label={`Atributo: ${nombreAtributo}`}
            valuePropName={tipoAtributo === 'boolean' ? 'checked' : 'value'}
            initialValue={tipoAtributo === 'boolean' ? false : undefined}
            rules={[{  
              message: `El campo ${nombreAtributo} es obligatorio` 
            }]}
          >
            {renderizarInput(tipoAtributo)} 
          </Form.Item>
        ))}

      </Form>
    </Modal>
  );
};