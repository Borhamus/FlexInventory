import React, { useState, useEffect } from 'react';
import MenuLateral from "../components/MenuLateral";
import Button from "../components/Button";
import CatalogService from '../services/CatalogService';
import CatalogItem from '../components/CatalogItem';
import Modal from '../components/Modal2';

function Catalogs() {

      const [elementos, setElementos] = useState([]); 
      const [selectedId, setSelectedId] = useState(1); 
      const [showCrearModal, setShowCrearModal] = useState(false);
      const [showCatalogTable, setShowCatalogTable] = useState(true);
      const [showModal, setShowModal] = useState(false);

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
  
      // Modal - Crear Inventario
      const modalCreateCatalog = {
        title: "Nuevo Catalogo",
        body: (
          <div>
              
          </div>
        )
      }

      const modalDeleteCatalog = {
        title: "Borrar este Catalogo",
        body: (
          <div>
              
          </div>
        )
      }

      const handleCrearCatalogo = () => {
          setShowCrearModal(true);
      };
  
      // Seleccionar un Catalogo
      const handleSeleccionarElemento = (id) => {
          setSelectedId(id);
      };


  return (
     
    <div className="catalog">

        <div className="catalog--MenuLateral">
            
            <MenuLateral 
              titulo="Catalogos"
                    elementos={catalogs}
                    onCreate={() => { }}
                    onDelete={() => {  }}           
            />
        </div>

        <div className="CatalogContainer">

          <div className='items'>
            <CatalogItem/>
          
          </div>
          
          <div className='lower_buttons'>
            <Button icon="pi pi-plus-circle" name="Crear Articulo"/>
            <Button icon="pi pi-trash" name="Eliminar Articulo"/>
            <Button icon="pi pi-arrow-right" name="Mover Articulo"/>
          </div>
          
          <div contentEditable suppressContentEditableWarning={true} className='catalog--description'>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </div>

        </div>

    <Modal
      isOpen={{}}
      onClose={{}}
      title={{}}
      actions={{}}
      >
        {{}}
      </Modal>   

    </div> 

  );
}



export default Catalogs;