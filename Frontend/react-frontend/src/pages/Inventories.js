import React, { useState, useEffect } from 'react';
import InventoryService from '../services/InventoryService';
import InventoryTable from '../components/InventoryTable';
import CrearInventario from '../components/CrearInventario';
import "../styles/Inventories.css"
import MenuLateral from '../components/MenuLateral';
import Modal from '../components/Modal';

function Inventories() {

    const [elementos, setElementos] = useState([]); // Inventarios disponibles
    const [selectedId, setSelectedId] = useState(1); // ID del inventario seleccionado, por ahora toma el primero, proximamente deberia comprobar si existe
    const [showCrearModal, setShowCrearModal] = useState(false);
    const [showInventoryTable, setShowInventoryTable] = useState(true);


    const [showModal, setShowModal] = useState(false)

    // Cargar los inventarios al inicio
    useEffect(() => {
        InventoryService.getAllInventories()
            .then(data => setElementos(data))
            .catch(error => console.error('Error al cargar inventarios:', error));
    }, []);

    const inventories = [
        ...elementos.map((elemento) => ({
            label: elemento.name,
            icon: 'pi pi-table',
            attributes: elemento.attributes,
            command: () => handleSeleccionarElemento(elemento.id),

        }))
    ]

    // Manejar la eliminación de inventarios
    const handleDeleteInventory = () => {
        InventoryService.deleteInventoryById(selectedId)
            .then(() => {
                setElementos(prev => prev.filter(el => el.id !== selectedId));
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
        <div className="inventory">

            <div className="MenuLateral">
                <MenuLateral
                    titulo="Inventarios"
                    elementoNombre = "Inventario"
                    elementos={inventories}
                    onCreate={handleCrearInventario}
                    onDelete={handleDeleteInventory}
                />
            </div>
            <div className="inventarioTabla">
                {showInventoryTable && selectedId && (
                    <div>
                        <InventoryTable num={selectedId} />
                    </div>
                )}
            </div>
        </div>
    );
}

export default Inventories;
