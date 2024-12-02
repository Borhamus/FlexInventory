import React, { useState, useEffect } from 'react';
import InventoryService from '../services/InventoryService';
import InventoryTable from '../components/InventoryTable';
import MenuLateral from '../components/MenuLateral';
import ConfirmDelInv from '../components/ConfirmDelInv';
import { ConfirmDialog } from 'primereact/confirmdialog';  // Importa ConfirmDialog

function Inventories() {
    const [elementos, setElementos] = useState([]); // Estado para los inventarios
    const [selectedId, setSelectedId] = useState(null);

    // Función para manejar selección de inventario
    const handleSeleccionarElemento = (id) => {
        console.log('Elemento seleccionado con ID:', id);
        setSelectedId(id);
    };

    const eliminarInventario = (id) => {
        console.log(`Eliminando inventario con ID: ${id}`);
        InventoryService.deleteInventoryById(id) // Llamada a la API para eliminar el inventario
            .then(() => {
                // Después de eliminar el inventario, actualizamos el estado
                setElementos(elementos.filter(inventory => inventory.id !== id));
                setSelectedId(null); // Limpiamos la selección del inventario
                console.log('Inventario eliminado');
            })
            .catch(error => {
                console.error('Error al eliminar inventario:', error);
            });
    };

    // Efecto para cargar los inventarios al montar el componente
    useEffect(() => {
        InventoryService.getAllInventories()
            .then(data => setElementos(data)) // Guardamos los datos en el estado
            .catch(error => console.error('Error al cargar inventarios:', error));
    }, []); // Ejecutar una vez al cargar
    
    return (
        <div className="App">
            {/* Contenedor principal */}
            <div className="container-fluid bg-primary pb-5">
                {/* Menú lateral e inventario */}
                <div className="row">
                    <div className="col-2 p-0">
                        <MenuLateral
                            elementos={elementos}
                            onElementoSeleccionado={handleSeleccionarElemento} // Pasamos la función para seleccionar el inventario
                        />
                    </div>
                    <div className="col">
                        {selectedId ? (
                            <div>
                                <InventoryTable num={selectedId} /> {/* Mostramos la tabla del inventario seleccionado */}
                                <ConfirmDelInv
                                    inventoryId={selectedId} // Pasamos el ID del inventario
                                    onConfirm={eliminarInventario} // Pasamos la función de eliminación
                                />
                            </div>
                        ) : (
                            <p>Selecciona un elemento del menú para verlo.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Aquí renderizamos el ConfirmDialog para que funcione correctamente */}
            <ConfirmDialog />
        </div>
    );
}

export default Inventories;
