import './App.css';

import React, { useState, useEffect } from 'react';
import InventoryService from './services/InventoryService';

import "primereact/resources/themes/nova/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import Navbar from './components/Navbar';
import InventoryTable from './components/InventoryTable';
import MenuLateral from './components/MenuLateral';
import Panel from './components/Panel';
import UserSession from "./components/UserSession"; 

function App() {
    const [elementos, setElementos] = useState([]); // Estado para los inventarios
    const [selectedId, setSelectedId] = useState(null);

    // Función para manejar selección de inventario
    const handleSeleccionarElemento = (id) => {
        console.log('Elemento seleccionado con ID:', id);
        setSelectedId(id);
    };

    // Función para manejar cierre de sesión
    const handleLogout = () => {
        console.log("Cerrando sesión...");
        // Aquí puedes agregar la lógica adicional para limpiar el estado, cerrar sesión, etc.
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
            <div className='container-fluid bg-secondary pt-0'>
                <div className='row'>
                    {/* Panel superior (opcional, puede omitirse si ya está arriba) */}
                    <Panel />
                </div>

                {/* Barra de navegación */}
                <div className='row'>
                    <div className='col-10'>
                    <Navbar></Navbar>

                    </div>
                    <div className='col-2'>
                    <UserSession></UserSession>

                    </div>
                </div>

                {/* Menú lateral e inventario */}
                <div className='row'>
                    <div className='col-2'>
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

            {/* Panel inferior */}
            <Panel />
        </div>
    );
}

export default App;
