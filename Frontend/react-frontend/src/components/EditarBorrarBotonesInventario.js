// src/components/EditarBorrarBotonesInventario.js
import { useState } from "react";
import "../styles/EditarBorrarBotonesInventario.css";
import Modal from "./Modal2";
import Button from "./Button";
import ItemService from "../services/ItemService";

export default function EditarBorrarBotonesInventario({ itemId, onDeleteSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formFields, setFormFields] = useState(null);

  /* ------------------------| MODAL ELIMINAR |------------------------ */
  const modalEliminar = {
    title: "Eliminar elemento",
    customView: (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5em" }}>
        ¿Desea eliminar este artículo?
      </div>
    ),
    actions: [
      { label: "Cancelar", onClick: (close) => close(), color: "secondary", size: "small" },
      {
        label: "Eliminar", onClick: async (close) => {
          try {
            await ItemService.deleteItemById(itemId)

            if (onDeleteSuccess) onDeleteSuccess();

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

  /* ------------------------| MODAL EDITAR |------------------------ */
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
        <Button icon={"pi pi-fw pi-pencil"} onClick={handleModalEditar} color={"secondary"} type={"icon-button"} size="small" />
      </div>

      <div className="separadorEditarEliminar"></div>

      <div className="botonEliminar">
        <Button icon={"pi pi-fw pi-trash"} onClick={handleModalEliminar} color={"secondary"} type={"icon-button"} size="small" />
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
