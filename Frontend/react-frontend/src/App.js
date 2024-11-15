import './App.css';

import "primereact/resources/themes/nova/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import Navbar from './api-base/components/Navbar';
import InventoryTable from './api-base/components/InventoryTable';
import MenuLateral from './api-base/components/MenuLateral';
import Header from './api-base/components/Header';
import Footter from './api-base/components/Footter';

function App(){
  return (
    <div className='App'>
      <Header></Header>
      <Navbar />
      <InventoryTable />
      <MenuLateral />
      <Footter></Footter>
    </div>
  )
}

export default App;
