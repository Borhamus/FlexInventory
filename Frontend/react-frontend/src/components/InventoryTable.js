import { useEffect, useState } from "react";
import InventoryService from "../services/InventoryService";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

function InventoryTable({ num }) {
    
    // Estado para almacenar el inventario
    const [inventory, setInventory] = useState(null);

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
    const dynamicColumns = inventory.attributes.map(attribute => (
        <Column
            key={attribute.id}
            field={attribute.name} // Vinculamos el campo dinámico
            header={attribute.name}
        />
    ));

    // Header de la talba
    const header = inventory.name;

    // Footer de la tabla
    const footer = `En total hay ${processedItems ? processedItems.length : 0} productos.`;

    return (
        <div className='container-fluid p-0'>
            <div className="row">
                <h2>Detalles del Inventario</h2>
            </div>
            <div className="row">
                <DataTable value={processedItems} footer={footer} header={header} showGridlines stripedRows tableStyle={{ minWidth: '50rem' }}>
                    {/* Aquí también agregamos la columna del nombre del item dentro del mapeo dinámico */}
                    <Column field="name" header="Name" />
                    {/* Generar columnas dinámicas basadas en los atributos */}
                    {dynamicColumns}
                </DataTable>
            </div>
        </div>
    );
}

export default InventoryTable;
