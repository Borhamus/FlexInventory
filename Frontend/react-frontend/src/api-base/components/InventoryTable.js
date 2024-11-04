import { useEffect, useState } from "react";
import InventoryService from "../services/InventoryService";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

function InventoryTable() {
    // Estado para almacenar el inventario
    const [inventory, setInventory] = useState(null);

    // Cuando el componente se monta, se llama a la API para obtener el inventario por ID
    useEffect(() => {
        InventoryService.getInventoryById(3).then(data => setInventory(data));
    }, []);

    // Renderizar loading mientras se obtiene el inventario
    if (!inventory){
        return(
            <div>
                <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
            </div>
        ) 
    } 

    return (
        <div>
            <h2>Detalles del Inventario</h2>
            <DataTable header={inventory.name} value={[inventory]} style={{ maxWidth: "80%", margin: "0 auto" }}>
                {/* Generar columnas dinámicas basadas en los atributos sin valores */}
                {inventory.attributes.map(attribute => (
                    <Column key={attribute.id} header={attribute.name} />
                ))}
            </DataTable>
        </div>
    );
}

export default InventoryTable;