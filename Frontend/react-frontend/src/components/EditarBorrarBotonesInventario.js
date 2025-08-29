// src/components/EditarBorrarBotonesInventario.js
import { useState } from "react";
import "../styles/EditarBorrarBotonesInventario.css";
import Modal from "./Modal2";
import Button from "./Button";

export default function EditarBorrarBotonesInventario({itemId}) {
  const [isOpen, setIsOpen] = useState(false);
  const [formFields, setFormFields] = useState(null);

  const handleBorrarItem = () =>{
    
  }

  /* ------------------------| MODAL ELIMINAR |------------------------ */
  const modalEliminar = {
    title: "Eliminar elemento",
    customView: (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5em" }}>
        ¿Desea eliminar este artículo?
      </div>
    ),
    actions: [
      {label: "Cancelar", onClick: (close) => close(), color: "secondary", size: "small"},
      {label: "Eliminar",onClick: async (close) => {
          try {
            console.log("Artículo eliminado! ID:", itemId);
            close();
          } catch {
            alert("No se pudo eliminar el artículo.");
          }
        },
        color: "primary",
        size: "small",
      },
    ],
  };

  /* ------------------------| MODAL ELIMINAR |------------------------ */
  const modalEditar = {
    title: "Editar elemento",
    customView: (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5em" }}>
        ¿Desea editar este artículo?
      </div>
    ),
    actions: [
      {
        label: "Cancelar",
        onClick: (close) => close(),
        color: "secondary",
        size: "small",
      },
      {
        label: "Editar",
        onClick: async (close) => {
          try {
            // TODO: Lógica de edición real
            console.log("Artículo editado!");
            close();
          } catch {
            alert("No se pudo editar el artículo.");
          }
        },
        color: "primary",
        size: "small",
      },
    ],
  };

  // SETEO EL FORMULARIO DE BORRAR
  // ABRO LA MODAL
  const handleModalEliminar = () => {
    setFormFields(modalEliminar);
    setIsOpen(true);
  };

  // SETEO EL FORMULARIO DE EDITAR
  // ABRO LA MODAL
  const handleModalEditar = () => {
    setFormFields(modalEditar);
    setIsOpen(true);
  };

  return (
    <div className="contenedorBotonesEditarBorrar">
      <div className="botonEditar">
        <button
          className="inventoryButtonDeleteEdit"
          onClick={handleModalEditar}
        >
          <i className="pi pi-fw pi-pencil"></i>
        </button>
      </div>

      <div className="separadorEditarEliminar"></div>

      <div className="botonEliminar">
        <button
          className="inventoryButtonDeleteEdit"
          onClick={handleModalEliminar}
        >
          <i className="pi pi-fw pi-trash"></i>
        </button>
      </div>

      {/* Modal con la nueva API */}
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setFormFields(null);
        }}
        title={formFields?.title}
        actions={formFields?.actions || []}
      >
        {formFields?.customView}
      </Modal>
    </div>
  );
}
