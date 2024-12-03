import React, { useState, useEffect } from 'react';
import InventoryService from '../services/InventoryService';
import InventoryTable from '../components/InventoryTable';
import MenuLateral from '../components/MenuLateral';
import CrearInventario from '../components/CrearInventario'; // Importamos el componente de crear inventario

function Inventories() {
    const [elementos, setElementos] = useState([]); // Estado para los inventarios
    const [selectedId, setSelectedId] = useState(null);
    const [showCrearModal, setShowCrearModal] = useState(false); // Estado para mostrar el modal de crear inventario
    const [showInventoryTable, setShowInventoryTable] = useState(true); // Estado para controlar la visualización de las tablas

    // Función para manejar la apertura del modal de crear inventario
    const handleCrearInventario = () => {
        setShowCrearModal(true);
        setShowInventoryTable(false); // Ocultar las tablas cuando se abre el modal
    };

    // Función para manejar la creación de inventarios (pasada desde el modal)
    const handleInventoryCreated = (newInventory) => {
        setElementos((prevElementos) => [...prevElementos, newInventory]);
        setShowCrearModal(false); // Cerrar el modal después de crear el inventario
        setShowInventoryTable(true); // Mostrar nuevamente las tablas de inventario
    };

    // Función para manejar la selección de un inventario
    const handleSeleccionarElemento = (id) => {
        console.log('Elemento seleccionado con ID:', id);
        setSelectedId(id);
    };

    useEffect(() => {
        InventoryService.getAllInventories()
            .then(data => setElementos(data)) // Guardamos los datos en el estado
            .catch(error => console.error('Error al cargar inventarios:', error));
    }, []); // Ejecutar una vez al cargar
    
    return (
        <div className="App">
            <div className="container-fluid bg-primary pb-5">
                <div className="row">
                    <div className="col-2 p-0">
                        <MenuLateral
                            elementos={elementos}
                            onElementoSeleccionado={handleSeleccionarElemento}
                            onCrearInventario={handleCrearInventario} // Pasamos la función para mostrar el modal
                        />
                    </div>
                    <div className="col">
                        {showInventoryTable && selectedId && (
                            <div>
                                <InventoryTable num={selectedId} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mostrar modal si showCrearModal es true */}
            {showCrearModal && (
                <CrearInventario 
                    onClose={() => setShowCrearModal(false)} // Cerrar el modal
                    onInventoryCreated={handleInventoryCreated} // Pasar función para agregar inventario
                />
            )}
        </div>
    );
}

export default Inventories;
