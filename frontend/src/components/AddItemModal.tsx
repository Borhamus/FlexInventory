import React, { useState } from 'react';
import { Modal, Table, Input, Tag } from 'antd';
import { useItems } from '../hooks/useItems';
import { useInventories } from '../hooks/useInventory';
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
  // Los items solo traen inventario_id; el nombre sale de la lista de
  // inventarios (mismo criterio que CatalogosPage.nombreInventario).
  const { data: inventarios } = useInventories();
  const { mutateAsync: addItems, isPending } = useAddItemsToCatalogo(catalogoId);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');

  const nombreInventario = (invId: number | null | undefined) =>
    inventarios?.find((inv) => inv.id === invId)?.nombre;

  // La búsqueda matchea contra el nombre del artículo O el del inventario al
  // que pertenece, así se puede tipear "lácteos" y ver todos los de ese
  // inventario sin tener que conocer el nombre de cada artículo.
  const q = searchText.trim().toLowerCase();
  const filteredData = Array.isArray(allItems)
    ? allItems.filter(item =>
        !itemsActualesIds.includes(item.id) &&
        (
          item.nombre.toLowerCase().includes(q) ||
          (nombreInventario(item.inventario_id) ?? '').toLowerCase().includes(q)
        )
      )
    : [];

  // Los mensajes de éxito/error los muestra el hook (useAddItemsToCatalogo)
  // en sus callbacks, como el resto de las mutaciones — acá no se repiten.
  // El catch solo evita cerrar el modal si falló.
  const handleOk = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      await addItems(selectedRowKeys as number[]);
      setSelectedRowKeys([]);
      onClose();
    } catch {
      /* ya notificado por el hook */
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
        placeholder="Buscar por nombre de artículo o inventario..."
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
            // Fallback al #id solo si la lista de inventarios todavía no
            // cargó o el item quedó suelto.
            render: (id) => <Tag color="blue">{nombreInventario(id) ?? `Inv #${id}`}</Tag>
          },
          { title: 'Cantidad', dataIndex: 'cantidad', key: 'qty' },
        ]}
      />
    </Modal>
  );
};
