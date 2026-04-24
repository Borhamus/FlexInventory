import React, { useState } from 'react';
import { Modal, Form, Select, Input, InputNumber, DatePicker, Switch, message } from 'antd';
import api from '../api/axios.config';

interface ModalBulkEditProps {
  visible: boolean;
  onClose: () => void;
  selectedIds: React.Key[];
  atributosInventario: any[]; 
  onSuccess: () => void;
}

const ModalBulkEdit: React.FC<ModalBulkEditProps> = ({ 
  visible, onClose, selectedIds, atributosInventario, onSuccess 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedAttr, setSelectedAttr] = useState<any>(null);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      let valorFinal = values.nuevoValor;

      if (valorFinal === undefined || valorFinal === '') {
        valorFinal = null;
      } 
      else if (valorFinal && typeof valorFinal === 'object' && valorFinal.format) {
        valorFinal = valorFinal.format('YYYY-MM-DD');
      }

      const payload = {
        item_ids: selectedIds,
        atributos: {
          [values.atributoKey]: valorFinal
        }
      };

      await api.patch('/items/bulk-update', payload);
            
      message.success(`Se actualizaron ${selectedIds.length} artículos correctamente`);
      onSuccess();
      onClose();
      form.resetFields();
    } catch (error) {
      console.error("Error en bulk update:", error); 
      message.error("Error al realizar la actualización masiva");
    } finally {
      setLoading(false);
    }
  };

  const renderInput = () => {
    if (!selectedAttr) return <Input disabled placeholder="Seleccioná un atributo primero" />;

    switch (selectedAttr.tipo) {
      case 'integer':
      case 'number':
      case 'float':
        return <InputNumber style={{ width: '100%' }} placeholder="Ingresá el número" />;
      case 'boolean':
        return <Switch />;
      case 'date':
        return <DatePicker style={{ width: '100%' }} />;
      default:
        return <Input placeholder="Ingresá el nuevo texto" />;
    }
  };

  return (
    <Modal
      title="Edición Masiva de Atributos"
      open={visible}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
    >
      <p>Vas a editar <b>{selectedIds.length}</b> artículos seleccionados.</p>
      
      <Form form={form} layout="vertical" onFinish={handleFinish}>
      <Form.Item 
          name="atributoKey" 
          label="¿Qué atributo querés cambiar?"
          rules={[{ message: 'Seleccioná un atributo' }]}
        >
          <Select 
            placeholder="Elegí una columna"
            onChange={(value) => {
              const atributoEncontrado = atributosInventario.find(attr => attr.nombre === value);
              const tipoDelAtributo = atributoEncontrado?.tipo; 
              
              setSelectedAttr({ nombre: value, tipo: tipoDelAtributo });
              
              form.setFieldsValue({ nuevoValor: tipoDelAtributo === 'boolean' ? false : undefined }); 
            }}
          >
            {atributosInventario?.map(attr => (
              <Select.Option key={attr.nombre} value={attr.nombre}>
                {attr.nombre}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item 
          name="nuevoValor" 
          label="Nuevo Valor"
          valuePropName={selectedAttr?.tipo === 'boolean' ? 'checked' : 'value'}
          rules={[]}
        >
          {renderInput()}
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ModalBulkEdit;