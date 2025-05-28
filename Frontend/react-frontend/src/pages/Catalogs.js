import React, { useState, useEffect } from 'react';
import MenuLateralInventario from "../components/MenuLateralnventario";
import Button from "../components/Button";
import CatalogService from '../services/CatalogService';


function Catalogs() {

      const [elementos, setElementos] = useState([]); 
      const [selectedId, setSelectedId] = useState(1); 
      const [showCrearModal, setShowCrearModal] = useState(false);
      const [showCatalogTable, setShowCatalogTable] = useState(true);
      const [showModal, setShowModal] = useState(false)

      const catalogs = [
        ...elementos.map((elemento) => ({
          label: elemento.name,
          icon: 'pi pi-table',
          command: () => handleSeleccionarElemento(elemento.id),
    
        }))
      ]

      useEffect(() => {
            CatalogService.getAllCatalogs()
              .then(data => setElementos(data))
              .catch(error => console.error('Error al cargar catalogos:', error));
      }, []);
  
      // Manejar la eliminación de los catalogos STAND BY
      const handleDeleteCatalog = () => {
          setShowModal(true)
          /*InventoryService.deleteInventoryById(selectedId)
              .then(() => {
                  setElementos(prev => prev.filter(el => el.id !== selectedId));
                  setSelectedId(null);
              })
              .catch(error => alert('No se pudo eliminar el inventario.')); */
      };
  
      // Mostrar modal de crear inventario
      const handleCrearCatalogo = () => {
          setShowCrearModal(true);
          //setShowInventoryTable(false);
      };
  
      // Agregar un nuevo inventario
      const handleCatalogoCreado = (newInventory) => {
          setElementos(prev => [...prev, newInventory]);
          setShowCrearModal(false);
          //setShowInventoryTable(true);
      };
  
      // Seleccionar un inventario
      const handleSeleccionarElemento = (id) => {
          setSelectedId(id);
      };


  return (
     
    <div className="catalog">
      <div className="MenuLateral">
          
          <MenuLateralInventario 
                        titulo = "Catalogos"
                        elementos={catalogs}
                        onSelect={handleCrearCatalogo}
                        onCreate={handleCatalogoCreado}
                        onDelete={handleSeleccionarElemento}>
          </MenuLateralInventario>

      </div>
    </div>

  )
}



export default Catalogs;