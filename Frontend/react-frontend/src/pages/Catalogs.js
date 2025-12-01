import { useState, useEffect } from 'react';
// componentes
import MenuLateral from "../components/MenuLateral";
import Button from "../components/Button";
import CatalogItem from '../components/CatalogItem';
import Modal from '../components/Modal2';
// servicios
import CatalogService from '../services/CatalogService';
import ItemService from '../services/ItemService';
// modales
import CatalogoCrear from '../Modals/CatalogoCrear';


function Catalogs() {
  
  const [formFields, setFormFields] = useState(); // hook para setear los formularios
  const [isOpen, setIsOpen] = useState(false);    // hook para abrir y cerrar las modales
  
  // --------------- CATALOGOS -----------

  const [selectedId, setSelectedId] = useState(1);  // id de los catalogos
  const [elementos, setElementos] = useState([]); // hook para los catalogos del menu lateral

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

  // Seleccionar un Catalogo
  const handleSeleccionarElemento = (id) => {
    setSelectedId(id);
    console.log("catalogo con id: ",id);
  };

  // Crear un Catalogo
  const formularioCrear = {
    title: "Crear Nuevo Catalogo",
    customView: (
      <CatalogoCrear />
    ),
    actions: [],
  };

  // Eliminar un Catalogo
  const formularioEliminar = {
    title: "Eliminar este Catalogo",
    customView: (
      <div style={{ display: 'flex', flexDirection: "column", gap: "1.5em" }}>
        ¿Desea eliminar este Catalogo?
      </div>
    ),
    actions: [
      { label: "Cancelar", onClick: (close) => close(), color: "secondary", size: "small" },
      {
        label: "Eliminar", onClick: async (close) => {
          try {
            await CatalogService.deleteCatalogById(selectedId);
            setElementos(prev => prev.filter(el => el.id !== selectedId));
            setSelectedId(null);
            close();
          } catch {
            alert('No se pudo eliminar el catalogo.');
          }
        }, color: "primary", size: "small"
      },
    ],
  }

  // ------------- ARTICULOS -------------------------


  const [selectedItemId, setSelectedItemIds] = useState(new Set()); // IDs para varios articulos seleccionables

  // Seleccionar un Articulo
  const handleSeleccionarArticulo = (CatalogItem) => {
  const itemId = CatalogItem.id; // Obtenemos el ID del artículo

  setSelectedItemIds(prevIds => {
      const newIds = new Set(prevIds); // 1. Crea una COPIA del Set
      if (newIds.has(itemId)) {
          // 2. Si ya está, lo elimina (Deseleccionar)
          newIds.delete(itemId);
        } else {
          // 3. Si no está, lo agrega (Seleccionar)
          newIds.add(itemId);
        }
      console.log("Artículos seleccionados (IDs):", Array.from(newIds));
      // console.log("IDs seleccionados:", newIds); 
      return newIds; // Devuelve el nuevo Set para actualizar el estado
    });
    
  };

  const selectedCatalog = elementos.find(
    (catalog) => catalog.id === selectedId
  );

  const articlesToShow = selectedCatalog ? selectedCatalog.items : [];

  // Handle Eliminar Articulo
  const handleModalEliminar = () => {
    if (!selectedItemId) { 
        alert("Selecciona un artículo primero.");
        return;
    }
    setFormFields(eliminarArticulo); 
    setIsOpen(true);
  };

  // Eliminar un Articulo
  const eliminarArticulo = {
    title: "Eliminar este Articulo",
        customView: (
            <div style={{ display: 'flex', flexDirection: "column", gap: "1.5em" }}>
                ¿Desea eliminar este Articulo?
            </div>
        ),
        actions: [
            { label: "Cancelar", onClick: (close) => close(), color: "secondary", size: "small" },
            {
                label: "Eliminar", onClick: async (close) => {
                    try {
                        await ItemService.deleteItemById(selectedId);
                        setElementos(prev => prev.filter(el => el.id !== selectedId));
                        setSelectedId(null);
                        close();
                    } catch {
                        alert('No se pudo eliminar el articulo.');
                    }
                }, color: "primary", size: "small"
            },
        ],
  }

  const handelModalMover = () => {

  }

  return (

    <div className="catalog">

      <div className="catalog--MenuLateral">
        <MenuLateral
          titulo="Catalogos"
          elementos={catalogs}
          onCreate={() => { setFormFields(formularioCrear); setIsOpen(true); }}
          onDelete={() => { setFormFields(formularioEliminar); setIsOpen(true); }}
        />
      </div>

      <div className="CatalogContainer">
        <div className='items'>
          {articlesToShow.map(articulo => (
            <CatalogItem
              key={articulo.id}
              name={articulo.name}
              image={articulo.image} 
              onClick={() => handleSeleccionarArticulo(articulo)}
              isSelected={selectedItemId.has(articulo.id)}
            />
          ))}
        </div>

        <div className='lower_buttons'>
          <Button icon="pi pi-pencil" name="Editar Articulo" />
          <Button icon="pi pi-trash" onClick={handleModalEliminar} name="Eliminar Articulo" />
          <Button icon="pi pi-arrow-right" name="Mover Articulo" />
          <Button icon="pi pi-plus" name="Crear Articulo" />
        </div>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => (
          setIsOpen(false),
          setFormFields({}) // Esto es para borrar los campos del formulario, asi no queda cargado cuando cerramos la modal
        )}
        title={formFields?.title}
        actions={formFields?.actions || []}
      >
        {formFields?.customView}
      </Modal>   

    </div>
  );
}

export default Catalogs;