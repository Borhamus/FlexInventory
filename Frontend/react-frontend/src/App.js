import { Component } from 'react';
import './App.css';

import "primereact/resources/themes/nova/theme.css"
import "primereact/resources/primereact.min.css"
import "primeicons/primeicons.css"
import InventoryTable from './modules/api-base/components/InventoryTable';

// App.js es la APP principal y central de react.
function App(){
  return(
    <>
      <div className='App'>
        <h1>FlexInventory</h1>
        <InventoryTable />
      </div>
    </>
  );
}

export default App;