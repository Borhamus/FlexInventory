import { Component } from 'react';
import './App.css';

import "primereact/resources/themes/nova/theme.css"
import "primereact/resources/primereact.min.css"
import "primeicons/primeicons.css"
import Navbar from './api-base/components/Navbar';
import InventoryTable from './api-base/components/InventoryTable';

// App.js es la APP principal y central de react.
function App(){
  return(
    <>
      <div className='App'>
        <Navbar></Navbar>
        <InventoryTable></InventoryTable>
      </div>
    </>
  );
}

export default App;