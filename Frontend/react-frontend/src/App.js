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

function App(){
  const [elementos, setElementos] = useState([]); // Estado para los inventarios
  const [selectedId, setSelectedId] = useState(null);

  const handleSeleccionarElemento = (id) => {
    console.log('Elemento seleccionado con ID:', id);
    setSelectedId(id);
    // Aquí puedes manejar la selección, como navegar o actualizar el estado
};

  // Efecto para cargar los inventarios al montar el componente
  useEffect(() => {
    InventoryService.getAllInventories()
        .then(data => setElementos(data)) // Guardamos los datos en el estado
        .catch(error => console.error('Error al cargar inventarios:', error));
  }, []); // Ejecutar una vez al cargar

  return (
    <div className='App'>
      <div className='container-fluid bg-secondary pt-5'>
        <div className='row'>
          <Panel></Panel>
        </div>
        <div className='row'>
          <Navbar />
        </div>
        <div className='row'>
          <div className='col-2'>
            <MenuLateral
                elementos={elementos}
                onElementoSeleccionado={handleSeleccionarElemento}
            />
          </div>
          <div className='col'>
            {selectedId && <InventoryTable num={selectedId} />}
          </div>
        </div>
        <div className='row'>
          <Panel></Panel>
        </div>
      </div>
    </div>
  )
}

export default App;
