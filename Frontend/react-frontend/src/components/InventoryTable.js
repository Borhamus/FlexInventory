import { useEffect, useState} from "react";
import InventoryService from "../services/InventoryService";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import "../styles/InventoryTable.css"
import EditarBorrarBotonesInventario from "./EditarBorrarBotonesInventario";

function InventoryTable({ num }) {
    // Estado para almacenar el inventario
    const [inventory, setInventory] = useState(null);

    // Estado para controlar la paginación
    const [first, setFirst] = useState(0); // Página actual
    const [rows, setRows] = useState(5); // Filas por página

    useEffect(() => {
        if (num) {
            // Llamar a la API solo si num tiene un valor
            InventoryService.getInventoryById(num)
                .then(data => setInventory(data))
                .catch(error => console.error("Error al cargar inventario:", error));
        }
    }, [num]); // Aquí agregamos 'num' como dependencia

    // Renderizar loading mientras se obtiene el inventario
    if (!inventory) {
        return (
            <div>
                <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
            </div>
        );
    }

    // Procesar los datos de los items para que coincidan con las columnas
    const processedItems = inventory.items.map(item => {
        // Convertir itemsAttributeValues a un objeto indexado por el nombre del atributo
        const attributes = {};
        item.itemsAttributeValues.forEach(attrValue => {
            attributes[attrValue.attribute.name] = attrValue.value;
        });

        // Devolver el item con los atributos mapeados
        return {
            ...item,
            ...attributes, // Agregamos las propiedades dinámicas directamente al objeto del item
        };
    });

    // Generar las columnas dinámicas para los atributos
    const dynamicColumns = [
        // Agregar manualmente la columna para el nombre del item
        <Column
            key="name"
            field="name" // Vinculamos al campo 'name'
            header="Name" // Etiqueta de encabezado
            sortable={true} // Habilitar el ordenamiento
            headerStyle={{ width: '10%', minWidth: '8rem' }}
            style={{fontSize: "0.9vw"}}
        />,
        // Generar las columnas para los atributos dinámicos
        ...inventory.attributes.map(attribute => (
            <Column
                key={attribute.id}
                field={attribute.name} // Vinculamos el campo dinámico
                header={attribute.name}
                sortable={true} // Habilitar el ordenamiento
                headerStyle={{ width: '10%', minWidth: '8rem' }}
                style={{fontSize: "0.9vw"}}
            />
        ))
    ];

    // Header de la tabla
    const header = inventory.name;

    // Footer de la tabla
    // const footer = `En total hay ${processedItems ? processedItems.length : 0} productos.`;

    return (
        <div className=''>
            <div className="" style={{ marginLeft: "0.5em"}}>
                <DataTable
                    value={processedItems}
                    //footer={footer}
                    header={header}
                    size={"medium"}
                    removableSort
                    showGridlines
                    tableStyle={{}}
                    paginator
                    resizableColumns
                    rows={rows} // Número de filas por página
                    first={first} // Página actual
                    rowsPerPageOptions={[5, 10, 25, 50]} // Opciones de filas por página
                    onPage={(e) => { // Actualizar la página y las filas por página
                        setFirst(e.first);
                        setRows(e.rows);
                    }}
                >
                    {/* Generar columnas dinámicas basadas en los atributos */}
                    {dynamicColumns}
                    <Column // Columna de borrado y edicion
                        headerStyle={{ width: '10%', minWidth: '8rem' }}
                        bodyStyle={{ textAlign: 'center' }}
                        body={EditarBorrarBotonesInventario}
                    />
                </DataTable>
            </div>
        </div>
    );
}

export default InventoryTable;