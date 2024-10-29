import { Component } from 'react';
import './App.css';
import { InventoryService } from './services/InventoryService';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import {Panel} from "primereact/panel";

import "primereact/resources/themes/nova/theme.css"
import "primereact/resources/primereact.min.css"
import "primeicons/primeicons.css"
import InventoryTable from './components/InventoryTable';

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