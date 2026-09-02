import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, message, Switch, DatePicker, Select, Upload, Button, Avatar, Space } from 'antd';
import type { UploadProps } from 'antd';
import { UploadOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import { useCreateItem, useUploadItemImage } from '../hooks/useInventory';
import dayjs from 'dayjs';

interface Props {
  open: boolean;
  onClose: () => void;
  inventoryId: number;
  atributosRequeridos: Record<string, string>;
  // Si el inventario tiene la foto habilitada (checkbox al crear/editar el
  // inventario) — igual que en ModalEditItemInventory, si no está prendida
  // ni se muestra el campo.
  fotosHabilitadas?: boolean;
}

export const ModalAddItemInventory: React.FC<Props> = ({
    open,
    onClose,
    inventoryId,
    atributosRequeridos = [],
    fotosHabilitadas = false,
  }) => {
  const [form] = Form.useForm();
  const { mutate: createItem, isPending } = useCreateItem();
  const { mutate: subirImagen, isPending: subiendoImagen } = useUploadItemImage();

  // Todavía no existe el item (el endpoint de foto necesita un id), así que
  // la imagen elegida se guarda localmente nomás — se sube recién después
  // de que el item se cree, en handleSubmit. previewUrl es un blob: local
  // (URL.createObjectURL) solo para mostrar la miniatura antes de guardar;
  // se libera con revokeObjectURL al cerrar el modal o elegir otra foto.
  const [archivoImagen, setArchivoImagen] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const limpiarImagenSeleccionada = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setArchivoImagen(null);
    setPreviewUrl(null);
  };

  useEffect(() => {
    if (!open) limpiarImagenSeleccionada();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSeleccionarImagen: UploadProps['beforeUpload'] = (file) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setArchivoImagen(file);
    setPreviewUrl(URL.createObjectURL(file));
    return false; // evita que antd intente subirla sola — todavía no hay item_id
  };

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
        onSuccess: (itemCreado) => {
          // El item ya existe (tiene id) recién acá — si el usuario eligió
          // una foto, se sube ahora, encadenada. Si esto falla, el item ya
          // quedó guardado igual: se avisa aparte, no se revierte la
          // creación (mismo criterio "camino B" que el resto de la app).
          if (archivoImagen) {
            subirImagen(
              { id: itemCreado.id, archivo: archivoImagen },
              {
                onSuccess: () => {
                  message.success('Artículo agregado con foto');
                  limpiarImagenSeleccionada();
                  form.resetFields();
                  onClose();
                },
                onError: (error) => {
                  console.error('Se creó el artículo pero falló la foto:', error);
                  message.warning('El artículo se guardó, pero la foto no se pudo subir. Podés cargarla editándolo.');
                  limpiarImagenSeleccionada();
                  form.resetFields();
                  onClose();
                },
              }
            );
            return;
          }

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
      confirmLoading={isPending || subiendoImagen}
      okText="Guardar"
      cancelText="Cancelar"
      destroyOnClose
    >
      {fotosHabilitadas && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <Avatar size={64} shape="square" icon={<PictureOutlined />} src={previewUrl ?? undefined} />
          <Space>
            <Upload showUploadList={false} beforeUpload={handleSeleccionarImagen} accept="image/jpeg,image/png,image/webp">
              <Button icon={<UploadOutlined />}>{previewUrl ? 'Cambiar foto' : 'Subir foto'}</Button>
            </Upload>
            {previewUrl && (
              <Button danger icon={<DeleteOutlined />} onClick={limpiarImagenSeleccionada}>
                Quitar
              </Button>
            )}
          </Space>
        </div>
      )}

      <Form form={form} layout="vertical">

        {/* --- CAMPOS ESTÁTICOS (Siempre están) --- */}
        <Form.Item name="nombre" label="Nombre del Artículo" rules={[{ required: true, message: 'Ingresá el nombre del artículo' }]}>
          <Input placeholder="Ej: Remera Básica" />
        </Form.Item>
        <Form.Item name="cantidad" label="Cantidad" rules={[{ required: true, message: 'Ingresá la cantidad' }]}>
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
            rules={[]}
          >
            {renderizarInput(tipoAtributo)} 
          </Form.Item>
        ))}

      </Form>
    </Modal>
  );
};