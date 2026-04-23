import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Switch, DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import { useUpdateItem } from '../hooks/useInventory'; 

interface Props {
  open: boolean;
  onClose: () => void;
  item: any; 
  atributosRequeridos: Record<string,string>
}
export const ModalEditItemInventory: React.FC<Props> = ({ 
    open, 
    onClose, 
    item, 
    atributosRequeridos 
  }) => {

    const [form] = Form.useForm();
    const { mutate: updateItem, isPending } = useUpdateItem();

    useEffect(() => {
        if (open && item) {

          const atributosFormateados = {...item.atributos}

          Object.entries(atributosRequeridos).forEach(([nombreAtributo, tipoAtributo]) => {
            if (tipoAtributo === 'date' && atributosFormateados[nombreAtributo]) {
              atributosFormateados[nombreAtributo] = dayjs(atributosFormateados[nombreAtributo]);
            }
          });

          form.setFieldsValue({
            nombre: item.nombre,
            cantidad: item.cantidad,
            atributos: atributosFormateados 
          });
        }
      }, [open, item, form]);

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
        case 'string':
        default:
          return <Input />;
      }
    };

    const handleSubmit = () => {
      form.validateFields().then((values) => {
        
        const atributosLimpios = { ...values.atributos };
  
        // Si editamos una fecha, la volvemos a pasar a texto (YYYY-MM-DD) para el backend
        if (atributosLimpios) {
          Object.keys(atributosLimpios).forEach((key) => {
            if (dayjs.isDayjs(atributosLimpios[key])) {
              atributosLimpios[key] = atributosLimpios[key].format('YYYY-MM-DD'); 
            }
          });
        }
  
        const payloadCompleto = {
          nombre: values.nombre,
          cantidad: values.cantidad,
          atributos: atributosLimpios
        };
  
        updateItem(
          { id: item.id, payload: payloadCompleto }, 
          {
            onSuccess: () => {
              form.resetFields();
              onClose();
            },
            onError: (error) => {
              console.error("Falló la petición:", error);
              message.error('No se pudo actualizar el artículo');
            }
          }
        );
      }).catch((error) => {
        console.log("Falló la validación del formulario", error);
      });
    };

    const listaAtributos = Object.entries(atributosRequeridos);

    return (
      <Modal
        title="Editar Artículo"
        open={open}
        onCancel={() => {
          form.resetFields();
          onClose();
        }}
        onOk={handleSubmit}
        confirmLoading={isPending}
        okText="Guardar Cambios"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          
          <Form.Item name="nombre" label="Nombre del Artículo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="cantidad" label="Cantidad" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
  
          {listaAtributos.map(([nombreAtributo, tipoAtributo]) => (
            <Form.Item
              key={nombreAtributo}
              name={['atributos', nombreAtributo]} 
              label={nombreAtributo}
              // Clave para que los booleanos enganchen bien el Switch al editar:
              valuePropName={tipoAtributo === 'boolean' ? 'checked' : 'value'}
              rules={[{ 
                required: tipoAtributo !== 'boolean', 
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