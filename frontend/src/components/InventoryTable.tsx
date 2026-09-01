import React, { useMemo, useState } from 'react';
import { Table, Tag, Button, Space, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthContext } from '../context/AuthContext';

interface InventoryTableProps {
  items: any[];
  atributos: any;
  searchTerm: string;
  hiddenColumns: string[];
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: (keys: React.Key[]) => void;
  onEditItem: (item: any) => void;
  onDeleteItem: (id: number) => void;
  // true cuando `items` ya viene ordenado por el backend (sort_by de
  // GET /items/, Fase 5) — evita que el re-orden por id de más abajo lo pise.
  preserveOrder?: boolean;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  atributos,
  searchTerm,
  hiddenColumns,
  selectedRowKeys,
  setSelectedRowKeys,
  onEditItem,
  onDeleteItem,
  preserveOrder = false,
}) => {
  const { hasPermission, isTenant } = useAuthContext();

  // El tamaño de página tiene que vivir en un estado propio: si le
  // pasáramos a <Table> un objeto de pagination armado de cero en cada
  // render (como estaba antes), Ant Design lo toma como una configuración
  // nueva en cada render y pisa el "20 / page" que acaba de elegir el
  // usuario, volviendo siempre a 10 — mismo criterio que Historial
  // (AuditoriaPage), 5/10/20 y de ahí de 10 en 10 hasta 100.
  const [pageSize, setPageSize] = useState(10);

  const columns = useMemo(() => {
    if (!items) return [];

    const cols: any[] = [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 70, align: 'center' },
      { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', align: 'center' },
      { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad', align: 'center' },
    ];

    if (atributos) {
      Object.keys(atributos).forEach((key) => {
        const tipoAtributo = atributos[key];
        cols.push({
          title: key.charAt(0).toUpperCase() + key.slice(1),
          dataIndex: ['atributos', key],
          key: key,
          align: 'center',
          render: (value: any) => {
            if (value === undefined || value === null || value === '') {
              return <Tag color="default">N/A</Tag>;
            }
            if (tipoAtributo === 'boolean' || typeof value === 'boolean' || value === 'true' || value === 'false') {
              const esVerdadero = value === true || String(value).toLowerCase() === 'true';
              return <Tag color={esVerdadero ? 'green' : 'red'}>{esVerdadero ? 'Sí' : 'No'}</Tag>;
            }
            if (tipoAtributo === 'date') {
              return dayjs(value).format('DD/MM/YYYY');
            }
            return String(value);
          }
        });
      });
    }

    cols.push({
      title: 'Creado el',
      dataIndex: 'creado_en',
      key: 'creado_en',
      align: 'center',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    });

    cols.push({
      title: 'Acciones',
      key: 'acciones',
      align: 'center',
      fixed: 'right',
      width: 100,
      render: (_: any, record: any) => {
        const canEdit = isTenant || hasPermission('items', 'update');
        const canDelete = isTenant || hasPermission('items', 'delete');

        if (!canEdit && !canDelete) return null;

        return (
          <Space size="small">
            {canEdit && (
              <Button type="text" icon={<EditOutlined />} onClick={() => onEditItem(record)} />
            )}
            {canDelete && (
              <Popconfirm
                title="¿Eliminar artículo?"
                onConfirm={() => onDeleteItem(record.id)}
                okText="Sí"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </Space>
        );
      }
    });

    return cols.filter(
      (col) => !hiddenColumns.includes(col.key as string) || ['id', 'nombre', 'acciones'].includes(col.key as string)
    );
  }, [items, atributos, isTenant, hasPermission, hiddenColumns, onEditItem, onDeleteItem]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    let itemsAFiltrar = items;

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      itemsAFiltrar = itemsAFiltrar.filter((item: any) => {
        const matchNombre = item.nombre?.toLowerCase().includes(lowerSearch);
        const matchId = item.id?.toString().includes(lowerSearch);
        return matchNombre || matchId;
      });
    }
    return preserveOrder ? itemsAFiltrar : [...itemsAFiltrar].sort((a: any, b: any) => a.id - b.id);
  }, [items, searchTerm, preserveOrder]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (nuevosIdsSeleccionados: React.Key[]) => {
      setSelectedRowKeys(nuevosIdsSeleccionados);
    },
  };

  return (
    <Table
      rowSelection={rowSelection}
      columns={columns}
      dataSource={filteredItems}
      rowKey="id"
      bordered
      pagination={{
        pageSize,
        showSizeChanger: true,
        // Mismo criterio que Historial (AuditoriaPage): 5, 10, 20, y de ahí
        // de 10 en 10 hasta 100 — acá es paginado 100% del lado del cliente
        // (los items ya vienen todos cargados), así que no hace falta tocar
        // el backend para esto.
        pageSizeOptions: ['5', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100'],
        onChange: (_page, nuevoPageSize) => setPageSize(nuevoPageSize),
        style: { marginBottom: 0, marginTop: 15 }
      }}
      scroll={{
        y: 'calc(90vh - 200px)',
        x: 'max-content'
      }}
    />
  );
};