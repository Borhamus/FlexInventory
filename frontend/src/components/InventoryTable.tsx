import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Table, Tag, Button, Space, Popconfirm, Avatar } from 'antd';
import { EditOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthContext } from '../context/AuthContext';
import { urlImagen } from '../api/axios.config';

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
  // Si el inventario tiene la foto habilitada — si no, ni tiene sentido
  // mostrar una columna que siempre va a estar vacía.
  fotosHabilitadas?: boolean;
  // Id del inventario — clave para persistir en localStorage el ancho y
  // orden de columnas que el usuario arma a mano (ver ANCHO_POR_DEFECTO
  // y aplicarOrdenColumnas más abajo). Sin esto no hay dónde guardar el
  // layout, así que las columnas vuelven a su orden/ancho de fábrica en
  // cada visita.
  inventoryId?: number;
}

// Columnas que NUNCA se reordenan ni se redimensionan a mano: "id" siempre
// va primero (es el identificador de fila) y "acciones" siempre va último,
// fijo a la derecha (fixed: 'right'), con los íconos de editar/borrar —
// no tiene sentido moverla ni angostarla.
const COLUMNAS_FIJAS = new Set(['id', 'acciones']);

const ANCHO_POR_DEFECTO: Record<string, number> = { id: 70, imagen: 70, acciones: 100 };
const ANCHO_MINIMO = 60;

function claveStorage(inventoryId?: number) {
  return inventoryId ? `flexinv_columnas_${inventoryId}` : null;
}

// Lee el layout de columnas (orden + anchos) guardado para este inventario.
// Si no hay nada guardado, o el localStorage falla (modo privado, cuota
// llena, etc.), devuelve valores vacíos — la tabla arma las columnas en su
// orden/ancho de fábrica, sin romperse por esto.
function cargarLayoutColumnas(inventoryId?: number): { orden: string[]; anchos: Record<string, number> } {
  const key = claveStorage(inventoryId);
  if (!key) return { orden: [], anchos: {} };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { orden: [], anchos: {} };
    const parsed = JSON.parse(raw);
    return {
      orden: Array.isArray(parsed?.orden) ? parsed.orden : [],
      anchos: parsed?.anchos && typeof parsed.anchos === 'object' ? parsed.anchos : {},
    };
  } catch {
    return { orden: [], anchos: {} };
  }
}

// Aplica el orden guardado por el usuario sobre la lista de columnas ya
// armada (que ya viene filtrada por hiddenColumns). "id" queda fijo primero
// y "acciones" fijo al final; el resto se reordena según `orden`. Cualquier
// columna nueva que no esté en `orden` todavía (un atributo recién agregado
// al inventario) se agrega al final, antes de "Acciones" — nunca desaparece
// por no tener una posición guardada.
function aplicarOrdenColumnas(cols: any[], orden: string[]): any[] {
  const porClave = new Map(cols.map((c) => [c.key as string, c]));
  const colId = porClave.get('id');
  const colAcciones = porClave.get('acciones');
  porClave.delete('id');
  porClave.delete('acciones');

  const ordenadas: any[] = [];
  orden.forEach((clave) => {
    const col = porClave.get(clave);
    if (col) {
      ordenadas.push(col);
      porClave.delete(clave);
    }
  });
  // Lo que sobra (columnas sin entrada en el orden guardado) va al final,
  // en el orden en que ya venían armadas.
  porClave.forEach((col) => ordenadas.push(col));

  const resultado: any[] = [];
  if (colId) resultado.push(colId);
  resultado.push(...ordenadas);
  if (colAcciones) resultado.push(colAcciones);
  return resultado;
}

// Celda de encabezado custom: agrega el "agarradero" de resize en el borde
// derecho (mousedown + mousemove/mouseup en document, sin librerías) y,
// cuando la columna es reordenable, hace todo el <th> arrastrable (drag
// nativo HTML5) para cambiarla de lugar. El agarradero de resize se marca
// explícitamente draggable={false} para que arrancar un resize ahí no
// dispare también un drag de reorden — son dos gestos distintos sobre el
// mismo encabezado.
const TituloColumna: React.FC<any> = ({
  width,
  onResize,
  dragHandlers,
  isDragOver,
  style,
  children,
  ...restProps
}) => {
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = width || 150;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const nuevoAncho = Math.max(ANCHO_MINIMO, startWidth + (moveEvent.clientX - startX));
      onResize?.(nuevoAncho);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <th
      {...restProps}
      {...dragHandlers}
      title={dragHandlers ? 'Arrastrá para mover esta columna' : restProps.title}
      style={{
        ...style,
        position: 'relative',
        cursor: dragHandlers ? 'move' : style?.cursor,
        backgroundColor: isDragOver ? 'rgba(24, 144, 255, 0.15)' : style?.backgroundColor,
      }}
    >
      {children}
      {onResize && (
        <span
          draggable={false}
          onMouseDown={handleResizeMouseDown}
          onClick={(e) => e.stopPropagation()}
          title="Arrastrá para cambiar el ancho"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 6,
            cursor: 'col-resize',
            zIndex: 2,
            userSelect: 'none',
          }}
        />
      )}
    </th>
  );
};

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
  fotosHabilitadas = false,
  inventoryId,
}) => {
  const { hasPermission, isTenant } = useAuthContext();

  // El tamaño de página tiene que vivir en un estado propio: si le
  // pasáramos a <Table> un objeto de pagination armado de cero en cada
  // render (como estaba antes), Ant Design lo toma como una configuración
  // nueva en cada render y pisa el "20 / page" que acaba de elegir el
  // usuario, volviendo siempre a 10 — mismo criterio que Historial
  // (AuditoriaPage), 5/10/20 y de ahí de 10 en 10 hasta 100.
  const [pageSize, setPageSize] = useState(10);

  // Layout de columnas (orden + ancho) que arma el usuario a mano,
  // arrastrando. Se inicializa leyendo localStorage (lazy) y se vuelve a
  // leer si cambia el inventario — la ruta no remonta el componente al
  // navegar entre inventarios, así que sin este efecto el layout del
  // inventario anterior se quedaría pegado.
  const [columnOrder, setColumnOrder] = useState<string[]>(() => cargarLayoutColumnas(inventoryId).orden);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => cargarLayoutColumnas(inventoryId).anchos
  );
  const dragKeyRef = useRef<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  useEffect(() => {
    const { orden, anchos } = cargarLayoutColumnas(inventoryId);
    setColumnOrder(orden);
    setColumnWidths(anchos);
  }, [inventoryId]);

  useEffect(() => {
    const key = claveStorage(inventoryId);
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify({ orden: columnOrder, anchos: columnWidths }));
    } catch {
      // localStorage puede fallar (modo privado, cuota llena) — el layout
      // simplemente no persiste, no rompemos la tabla por esto.
    }
  }, [inventoryId, columnOrder, columnWidths]);

  const baseColumns = useMemo(() => {
    if (!items) return [];

    const cols: any[] = [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 70, align: 'center' },
    ];

    if (fotosHabilitadas) {
      cols.push({
        title: 'Foto', dataIndex: 'imagen', key: 'imagen', width: 70, align: 'center',
        render: (imagen: string | null) => <Avatar shape="square" icon={<PictureOutlined />} src={urlImagen(imagen)} />,
      });
    }

    cols.push(
      { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', align: 'center' },
      { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad', align: 'center' },
    );

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
      // "id" ahora es ocultable desde "Columnas visibles" (no a todos los
      // usuarios les sirve verlo) — "nombre" y "acciones" quedan siempre
      // forzados: sin nombre no se identifica la fila, y "acciones" tiene
      // los botones de editar/borrar.
      (col) => !hiddenColumns.includes(col.key as string) || ['nombre', 'acciones'].includes(col.key as string)
    );
  }, [items, atributos, isTenant, hasPermission, hiddenColumns, onEditItem, onDeleteItem, fotosHabilitadas]);

  // Segunda pasada: toma las columnas ya armadas y les aplica el orden y
  // ancho que el usuario haya elegido a mano, más los handlers de drag
  // (reordenar) y resize (achicar/agrandar) sobre cada encabezado no fijo.
  const columns = useMemo(() => {
    const ordenadas = aplicarOrdenColumnas(baseColumns, columnOrder);

    return ordenadas.map((col) => {
      const clave = col.key as string;
      const esFija = COLUMNAS_FIJAS.has(clave);
      const anchoActual = columnWidths[clave] ?? col.width ?? ANCHO_POR_DEFECTO[clave] ?? 150;

      const dragHandlers = esFija
        ? undefined
        : {
            draggable: true,
            onDragStart: () => {
              dragKeyRef.current = clave;
            },
            onDragEnter: (e: React.DragEvent) => {
              e.preventDefault();
              if (dragKeyRef.current && dragKeyRef.current !== clave) setDragOverKey(clave);
            },
            onDragOver: (e: React.DragEvent) => {
              e.preventDefault(); // necesario para que el navegador permita soltar acá
            },
            onDragLeave: () => {
              setDragOverKey((prev) => (prev === clave ? null : prev));
            },
            onDrop: (e: React.DragEvent) => {
              e.preventDefault();
              const origen = dragKeyRef.current;
              setDragOverKey(null);
              dragKeyRef.current = null;
              if (!origen || origen === clave) return;

              setColumnOrder((ordenActual) => {
                const base = ordenActual.length ? ordenActual : baseColumns.map((c) => c.key as string);
                const sinOrigen = base.filter((k) => k !== origen);
                const idxDestino = sinOrigen.indexOf(clave);
                sinOrigen.splice(idxDestino === -1 ? sinOrigen.length : idxDestino, 0, origen);
                return sinOrigen;
              });
            },
            onDragEnd: () => {
              dragKeyRef.current = null;
              setDragOverKey(null);
            },
          };

      return {
        ...col,
        width: anchoActual,
        onHeaderCell: () => ({
          width: anchoActual,
          onResize: esFija
            ? undefined
            : (nuevoAncho: number) => setColumnWidths((prev) => ({ ...prev, [clave]: nuevoAncho })),
          dragHandlers,
          isDragOver: dragOverKey === clave,
        }),
      };
    });
  }, [baseColumns, columnOrder, columnWidths, dragOverKey]);

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
      tableLayout="fixed"
      components={{ header: { cell: TituloColumna } }}
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
