// src/components/HybridModal.js
import React, { useEffect, useRef } from "react";
import "../styles/Modal2.css";
import Button from "./Button";

function Modal2({ isOpen, onClose, title, children, actions = [] }) {
  const dialogRef = useRef(null);

  // Control apertura/cierre del <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="ModalContainer bg-transparent border-0"
      onCancel={onClose} // fallback accesible
    >
      {/* Overlay */}
      <div
        className="modal__overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Caja modal */}
      <div className="modal">
        {/* Header */}
        <header className="modal__header">
          <h2 className="">{title}</h2>
          <button
            onClick={onClose}
            className="close-button"
          >
            &times;
          </button>
        </header>

        {/* Body */}
        <main className="modal__main">{children}</main>

        {/* Footer con acciones */}
        {actions.length > 0 && (
          <footer className="">
            {actions.map((action, i) => (

              <Button
                key={i}
                onClick={() => action.onClick?.(onClose)}
                name={action.label}
                color={action.color}
                size={action.size}
              />

            ))}
          </footer>
        )}
      </div>
    </dialog>
  );
}

export default Modal2;
