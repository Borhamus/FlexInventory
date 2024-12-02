import React, { useState, useEffect } from 'react';

import InventoryService from '../services/InventoryService';
import InventoryTable from '../components/InventoryTable';
import MenuLateral from '../components/MenuLateral';

function Inventories() {
    const [elementos, setElementos] = useState([]); // Estado para los inventarios
    const [selectedId, setSelectedId] = useState(null);

    // Función para manejar selección de inventario
    const handleSeleccionarElemento = (id) => {
        console.log('Elemento seleccionado con ID:', id);
        setSelectedId(id);
    };

    // Efecto para cargar los inventarios al montar el componente
    useEffect(() => {
        InventoryService.getAllInventories()
            .then(data => setElementos(data)) // Guardamos los datos en el estado
            .catch(error => console.error('Error al cargar inventarios:', error));
    }, []); // Ejecutar una vez al cargar
    
    return (
        <div className='App'>
            {/* Contenedor principal */}
            <div className='container-fluid bg-primary pb-5'>

                {/* Menú lateral e inventario */}
                <div className='row'>
                    <div className='col-2 p-0'>
                        <MenuLateral
                            elementos={elementos}
                            onElementoSeleccionado={handleSeleccionarElemento}
                        />
                    </div>
                    <div className='col'>
                        {selectedId ? (
                            <InventoryTable num={selectedId} />
                        ) : (
                            <p>Selecciona un elemento del menú para verlo.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Inventories;