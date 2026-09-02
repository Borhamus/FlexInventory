import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Switch, DatePicker, Upload, Button, Avatar, Space, message } from 'antd';
import type { UploadProps } from 'antd';
import { UploadOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useUpdateItem, useUploadItemImage, useDeleteItemImage } from '../hooks/useInventory';
import { urlImagen } from '../api/axios.config';

interface Props {
  open: boolean;
  onClose: () => void;
  item: any;
  atributosRequeridos: Record<string,string>
  // Si el inventario al que pertenece este item tiene la foto habilitada
  // (checkbox al crear/editar el inventario) — si no, ni se muestra el
  // campo, no tiene sentido ofrecerlo si nunca lo van a usar.
  fotosHabilitadas?: boolean
}
export const ModalEditItemInventory: React.FC<Props> = ({
    open,
    onClose,
    item,
    atributosRequeridos,
    fotosHabilitadas = false,
  }) => {

    const [form] = Form.useForm();
    const { mutate: updateItem, isPending } = useUpdateItem();
    const { mutate: subirImagen, isPending: subiendoImagen } = useUploadItemImage();
    const { mutate: borrarImagen, isPending: borrandoImagen } = useDeleteItemImage();

    // `item` es una foto congelada del momento en que se abrió el modal —
    // el padre no la actualiza sola cuando invalidamos la query al subir o
    // borrar la imagen. Sin este estado propio, el modal seguía mostrando
    // la foto vieja (o la seguía "teniendo" para el botón Quitar) aunque el
    // backend y la tabla de atrás ya estuvieran al día.
    const [imagenActual, setImagenActual] = useState<string | null | undefined>(item?.imagen);

    useEffect(() => {
      if (open) setImagenActual(item?.imagen);
    }, [open, item]);

    const handleSubirImagen: UploadProps['customRequest'] = (options) => {
      const archivo = options.file as File;
      subirImagen(
        { id: item.id, archivo },
        {
          onSuccess: (itemActualizado) => {
            setImagenActual(itemActualizado.imagen);
            options.onSuccess?.({});
          },
          onError: (error) => options.onError?.(error as Error),
        }
      );
    };

    const handleQuitarImagen = () => {
      borrarImagen(item.id, {
        onSuccess: (itemActualizado) => setImagenActual(itemActualizado.imagen),
      });
    };

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
        {fotosHabilitadas && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <Avatar
              size={64}
              shape="square"
              icon={<PictureOutlined />}
              src={urlImagen(imagenActual)}
            />
            <Space>
              <Upload showUploadList={false} customRequest={handleSubirImagen} accept="image/jpeg,image/png,image/webp">
                <Button icon={<UploadOutlined />} loading={subiendoImagen}>
                  {imagenActual ? 'Cambiar foto' : 'Subir foto'}
                </Button>
              </Upload>
              {imagenActual && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={borrandoImagen}
                  onClick={handleQuitarImagen}
                >
                  Quitar
                </Button>
              )}
            </Space>
          </div>
        )}

        <Form form={form} layout="vertical">

          <Form.Item name="nombre" label="Nombre del Artículo" >
            <Input />
          </Form.Item>
          <Form.Item name="cantidad" label="Cantidad">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
  
          {listaAtributos.map(([nombreAtributo, tipoAtributo]) => (
            <Form.Item
              key={nombreAtributo}
              name={['atributos', nombreAtributo]} 
              label={nombreAtributo}
              valuePropName={tipoAtributo === 'boolean' ? 'checked' : 'value'}
              rules={[]}
            >
              {renderizarInput(tipoAtributo)}
            </Form.Item>
          ))}
  
        </Form>
      </Modal>
    );
  };