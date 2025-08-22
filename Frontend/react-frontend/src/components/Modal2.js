// src/components/HybridModal.js
import React, { useEffect, useRef } from "react";
import "../styles/Modal2.css";

function Modal2({ isOpen, onClose, title, children, actions = [] }) {
  const dialogRef = useRef(null);

  // Control apertura/cierre del <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  // Cerrar con Escape (aunque <dialog> ya lo hace, garantizamos onClose)
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!isOpen) return null;

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
              <button
                key={i}
                onClick={action.onClick}
                className={``}
              >
                {action.label}
              </button>
            ))}
          </footer>
        )}
      </div>
    </dialog>
  );
}

export default Modal2;
