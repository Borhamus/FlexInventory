import { useEffect, useState } from "react";
import InventoryService from "../services/InventoryService";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

function InventoryTable(){

    // Se usa useState para crear el estado que almacena la lista 
    // de inventarios obtenida por la api.
    const [inventories, setInventories] = useState([]);

    // Cuando el componente es montado se utiliza useEffect para
    // ejecutar codigo, en este caso se llama a getAllInventories
    // y actualiza el estado con los datos obtenidos.
    useEffect(() => {
        //Consumo de api.
        InventoryService.getAllInventories().then(data => setInventories(data));
    }, []);

    return(
        <div>
            <DataTable header = "Inventarios existentes." value={inventories} style={{maxWidth: "80%", margin: "0 auto"}}>
                <Column field="id" header = "ID" />
                <Column field="name" header = "Name" />
                <Column field="description" header = "Description" />
                <Column field="revision_date" header= "Revision Date" />
                <Column field="creation_date" header= "Creation Date" />
            </DataTable>
        </div>
    );

}

export default InventoryTable;