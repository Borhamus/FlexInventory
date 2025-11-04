import { useState, useEffect } from 'react';
// componentes
import MenuLateral from "../components/MenuLateral";
import Button from "../components/Button";
import CatalogItem from '../components/CatalogItem';
import Modal from '../components/Modal2';
// servicios
import CatalogService from '../services/CatalogService';
// modales
import CatalogNewCatalogForm from '../Modals/CatalogNewCatalogForm';


function Catalogs() {

  const [elementos, setElementos] = useState([]);
  const [formFields, setFormFields] = useState();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(1);

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
  };

  const formularioCrear = {
    title: "Crear Nuevo Catalogo",
    customView: (
      <CatalogNewCatalogForm />
    ),
    actions: [],
  };

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
            await CatalogService.deleteCatalogyById(selectedId);
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
          <CatalogItem />
          <CatalogItem />
          <CatalogItem />
        </div>

        <div className='lower_buttons'>
          <Button icon="pi pi-plus-circle" name="Crear Articulo" />
          <Button icon="pi pi-trash" name="Eliminar Articulo" />
          <Button icon="pi pi-arrow-right" name="Mover Articulo" />
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