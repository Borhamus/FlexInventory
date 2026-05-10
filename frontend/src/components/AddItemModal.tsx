import React, { useState } from 'react';
import { Modal, Table, Input, message, Tag } from 'antd';
import { useItems } from '../hooks/useItems';
import { useAddItemsToCatalogo } from '../hooks/useCatalogos';
import { SearchOutlined } from '@ant-design/icons';

interface Props {
  catalogoId: number;
  open: boolean;
  onClose: () => void;
  itemsActualesIds: number[];
}

export const AddItemModal: React.FC<Props> = ({ catalogoId, open, onClose, itemsActualesIds }) => {
  const { data: allItems = [], isLoading } = useItems(); // Default a []
  const { mutateAsync: addItems, isPending } = useAddItemsToCatalogo(catalogoId);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');

  // Usamos Array.isArray para estar 100% seguros antes de filtrar
  const filteredData = Array.isArray(allItems) 
    ? allItems.filter(item => 
        !itemsActualesIds.includes(item.id) &&
        item.nombre.toLowerCase().includes(searchText.toLowerCase())
      )
    : [];

  const handleOk = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      await addItems(selectedRowKeys as number[]);
      message.success('Ítems añadidos correctamente');
      setSelectedRowKeys([]);
      onClose();
    } catch (error) {
      message.error('Error al añadir ítems');
    }
  };

  return (
    <Modal
      title="Añadir ítems existentes al catálogo"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={isPending}
      width={700}
      okText="Añadir seleccionados"
    >
      <Input
        placeholder="Buscar por nombre..."
        prefix={<SearchOutlined />}
        style={{ marginBottom: 16 }}
        onChange={e => setSearchText(e.target.value)}
      />
      <Table
        loading={isLoading}
        dataSource={filteredData}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 5 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
          { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
          { 
            title: 'Inventario', 
            dataIndex: 'inventario_id', 
            key: 'inv',
            render: (id) => <Tag color="blue">Inv #{id}</Tag>
          },
          { title: 'Stock', dataIndex: 'cantidad', key: 'qty' },
        ]}
      />
    </Modal>
  );
};