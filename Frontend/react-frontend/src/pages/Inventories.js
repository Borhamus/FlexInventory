import React, { useState, useEffect } from 'react';
import InventoryService from '../services/InventoryService';
import InventoryTable from '../components/InventoryTable';
import MenuLateral from '../components/MenuLateral';
import CrearInventario from '../components/CrearInventario';
import ConfirmDelInv from '../components/ConfirmDelInv'; // Importamos el componente de confirmación
import { ConfirmDialog } from 'primereact/confirmdialog'; // Importa ConfirmDialog

function Inventories() {
    const [elementos, setElementos] = useState([]); // Inventarios disponibles
    const [selectedId, setSelectedId] = useState(null); // ID del inventario seleccionado
    const [showCrearModal, setShowCrearModal] = useState(false);
    const [showInventoryTable, setShowInventoryTable] = useState(true);

    // Cargar los inventarios al inicio
    useEffect(() => {
        InventoryService.getAllInventories()
            .then(data => setElementos(data))
            .catch(error => console.error('Error al cargar inventarios:', error));
    }, []);

    // Manejar la eliminación de inventarios
    const handleDeleteInventory = (inventoryId) => {
        InventoryService.deleteInventoryById(inventoryId)
            .then(() => {
                setElementos(prev => prev.filter(el => el.id !== inventoryId));
                setSelectedId(null);
            })
            .catch(error => alert('No se pudo eliminar el inventario.'));
    };

    // Mostrar modal de crear inventario
    const handleCrearInventario = () => {
        setShowCrearModal(true);
        setShowInventoryTable(false);
    };

    // Agregar un nuevo inventario
    const handleInventoryCreated = (newInventory) => {
        setElementos(prev => [...prev, newInventory]);
        setShowCrearModal(false);
        setShowInventoryTable(true);
    };

    // Seleccionar un inventario
    const handleSeleccionarElemento = (id) => {
        setSelectedId(id);
    };

    return (
        <div className="App">
            {/* Esto asegura que el popup funcione */}
            <ConfirmDialog />

            <div className="container-fluid bg-primary pb-5">
                <div className="row">
                    <div className="col-2 p-0">
                        <MenuLateral
                            elementos={elementos}
                            onElementoSeleccionado={handleSeleccionarElemento}
                            onCrearInventario={handleCrearInventario}
                        />
                    </div>
                    <div className="col">
                        {showInventoryTable && selectedId && (
                            <div>
                                <InventoryTable num={selectedId} />
                                <div className="mt-3">
                                    {/* Botón para eliminar inventario */}
                                    <ConfirmDelInv
                                        inventoryId={selectedId}
                                        onConfirm={handleDeleteInventory}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal para crear inventario */}
            {showCrearModal && (
                <CrearInventario
                    onClose={() => setShowCrearModal(false)}
                    onInventoryCreated={handleInventoryCreated}
                />
            )}
        </div>
    );
}

export default Inventories;
