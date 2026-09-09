import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Table, Button, Space, Popconfirm, Typography, Image, theme } from 'antd';
import { EditOutlined, DeleteOutlined, PictureOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthContext } from '../context/AuthContext';
import { urlImagen } from '../api/axios.config';

const CELDA_VACIA = <Typography.Text type="secondary">—</Typography.Text>;

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
  // Ordenamiento controlado por click en el encabezado (issue #36). El orden
  // lo resuelve el backend (GET /items/ con sort_by/order): la tabla solo
  // refleja el estado y avisa los cambios hacia arriba con onSortChange. Las
  // claves de columna coinciden con los sort_by válidos (id, nombre, cantidad,
  // creado_en, y el nombre de cada atributo).
  sortBy?: string;
  order?: 'asc' | 'desc';
  onSortChange?: (sortBy: string | undefined, order: 'asc' | 'desc') => void;
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
  sortBy,
  order = 'asc',
  onSortChange,
}) => {
  const { hasPermission, isTenant } = useAuthContext();
  const { token } = theme.useToken();


  const canEditItems   = isTenant || hasPermission('items', 'update');
  const canDeleteItems = isTenant || hasPermission('items', 'delete');
  const canActuar      = canEditItems || canDeleteItems;

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
      { title: 'ID', dataIndex: 'id', key: 'id', width: 70, align: 'center', sorter: true },
    ];

    if (fotosHabilitadas) {
      cols.push({
        title: 'Foto', dataIndex: 'imagen', key: 'imagen', width: 70, align: 'center',
        // Sin padding en la celda para que la foto llene todo el cuadrado
        // (ancho de columna × alto de fila). aspectRatio:1 la mantiene cuadrada
        // aunque se redimensione la columna; objectFit:cover recorta para llenar.
        onCell: () => ({ style: { padding: 0 } }),
        // Con foto: cuadrado clickeable que abre el preview a pantalla completa
        // (Ant <Image>). Sin foto: placeholder que ocupa el mismo cuadrado.
        render: (imagen: string | null) => imagen ? (
          <Image
            src={urlImagen(imagen)}
            wrapperStyle={{ display: 'block', width: '100%' }}
            style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }}
            preview={{ mask: <EyeOutlined /> }}
          />
        ) : (
          <div style={{
            width: '100%', aspectRatio: '1 / 1', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#bfbfbf',
          }}>
            <PictureOutlined style={{ fontSize: 20 }} />
          </div>
        ),
      });
    }

    cols.push(
      { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', align: 'center', sorter: true },
      { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad', align: 'center', sorter: true },
    );

    if (atributos) {
      Object.keys(atributos).forEach((key) => {
        const tipoAtributo = atributos[key];
        cols.push({
          title: key.charAt(0).toUpperCase() + key.slice(1),
          dataIndex: ['atributos', key],
          key: key,
          align: 'center',
          sorter: true,
          render: (value: any) => {
            if (value === undefined || value === null || value === '') {
              return CELDA_VACIA;
            }
            if (tipoAtributo === 'boolean' || typeof value === 'boolean' || value === 'true' || value === 'false') {
              const esVerdadero = value === true || String(value).toLowerCase() === 'true';
              return esVerdadero
                ? <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                : <CloseCircleOutlined style={{ color: token.colorError }} />;
            }
            if (tipoAtributo === 'date') {
              const fecha = dayjs(value);
              return fecha.isValid() ? fecha.format('DD/MM/YYYY') : CELDA_VACIA;
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
      sorter: true,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    });

    // Columna "Acciones" solo si el usuario puede editar o borrar artículos.
    // Antes se agregaba siempre y los botones de adentro se ocultaban por
    // permiso, dejando una columna vacía (issue #29): ahora directamente no
    // se crea la columna si no hay ninguna acción disponible.
    if (canActuar) {
      cols.push({
        title: 'Acciones',
        key: 'acciones',
        align: 'center',
        fixed: 'right',
        width: 100,
        render: (_: any, record: any) => (
          <Space size="small">
            {canEditItems && (
              <Button type="text" icon={<EditOutlined />} onClick={() => onEditItem(record)} />
            )}
            {canDeleteItems && (
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
        )
      });
    }

    return cols.filter(
      // "id" ahora es ocultable desde "Columnas visibles" (no a todos los
      // usuarios les sirve verlo) — "nombre" y "acciones" quedan siempre
      // forzados: sin nombre no se identifica la fila, y "acciones" tiene
      // los botones de editar/borrar.
      (col) => !hiddenColumns.includes(col.key as string) || ['nombre', 'acciones'].includes(col.key as string)
    );
  }, [items, atributos, canActuar, canEditItems, canDeleteItems, hiddenColumns, onEditItem, onDeleteItem, fotosHabilitadas]);

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

      // Orden controlado: si esta columna es la que está ordenada, reflejar
      // la flecha; el orden real lo hace el backend (sorter: true = server-side).
      const sortOrder = col.sorter && sortBy === clave
        ? (order === 'asc' ? 'ascend' : 'descend')
        : null;

      return {
        ...col,
        width: anchoActual,
        sortOrder,
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
  }, [baseColumns, columnOrder, columnWidths, dragOverKey, sortBy, order]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    let itemsAFiltrar = items;

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      itemsAFiltrar = itemsAFiltrar.filter((item: any) => {
        const matchNombre = item.nombre?.toLowerCase().includes(lowerSearch);
        const matchId = item.id?.toString().includes(lowerSearch);
        if (matchNombre || matchId) return true;
        // También por atributo: matchea el NOMBRE del atributo (ej. "color")
        // o su VALOR (ej. "rojo"). Mismo criterio que la búsqueda de catálogos.
        return Object.entries(item.atributos || {}).some(([key, value]) =>
          key.toLowerCase().includes(lowerSearch) || String(value ?? '').toLowerCase().includes(lowerSearch)
        );
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
      rowSelection={canActuar ? rowSelection : undefined}
      columns={columns}
      dataSource={filteredItems}
      rowKey="id"
      bordered
      tableLayout="fixed"
      components={{ header: { cell: TituloColumna } }}
      // Click en el encabezado → ordenar. Ant cicla ascend → descend → sin
      // orden; mapeamos eso al estado sortBy/order del padre, que dispara la
      // query ordenada al backend.
      onChange={(_pagination: any, _filters: any, sorterInfo: any) => {
        const s = Array.isArray(sorterInfo) ? sorterInfo[0] : sorterInfo;
        if (s && s.order) {
          onSortChange?.(s.columnKey as string, s.order === 'ascend' ? 'asc' : 'desc');
        } else {
          onSortChange?.(undefined, 'asc');
        }
      }}
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
