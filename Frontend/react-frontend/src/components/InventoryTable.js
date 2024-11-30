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

    // Generar columnas dinámicamente para los atributos
    const dynamicColumns = inventory.attributes.map(attribute => (
        <Column
            key={attribute.id}
            field={attribute.name} // Vinculamos el campo dinámico
            header={attribute.name}
        />
    ));

    return (
        <div>
            <h2>Detalles del Inventario</h2>
            <DataTable value={processedItems}>
                {/* Columna para el nombre del item */}
                <Column field="name" header="Nombre del Item" />
                {/* Generar columnas dinámicas basadas en los atributos */}
                {dynamicColumns}
            </DataTable>
        </div>
    );
}

export default InventoryTable;