import { useState, useEffect } from 'react';
import './App.css';

import "primereact/resources/themes/nova/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import Navbar from './api-base/components/Navbar';
import InventoryTable from './api-base/components/InventoryTable';
import MenuLateral from './api-base/components/MenuLateral';

import InventoryService from './api-base/services/InventoryService';

function App(){
  const [menuSeleccionado, setMenuSeleccionado] = useState('');

  const inventarios = InventoryService.getAllInventories();


  return (
    <div className='App'>
      {/* Navbar con función para actualizar el estado */}
      <Navbar onMenuClick={setMenuSeleccionado} />

      {/* Mostrar InventoryTable solo si 'Inventarios' está seleccionado */}
      {menuSeleccionado === 'Inventarios' && <InventoryTable />}

      {/* MenuLateral con el menú actual y los datos de inventarios y catálogos */}
      <MenuLateral 
        menuSeleccionado={menuSeleccionado} 
        inventarios={inventarios} 
      />
    </div>
  );
}

export default App;
