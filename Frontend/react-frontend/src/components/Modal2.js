// src/components/HybridModal.js
import React, { useEffect, useRef, isValidElement, cloneElement } from "react";
import "../styles/Modal2.css";
import Button from "./Button";

function Modal2({ isOpen, onClose, title, children, actions = [] }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen) dialog.showModal();
    else dialog.close();
  }, [isOpen]);

  const renderChildren = () => {
    // render-prop: children es una función -> children({ close })
    if (typeof children === "function") {
      return children({ close: onClose });
    }
    // elemento React -> clonamos e inyectamos prop close
    if (isValidElement(children)) {
      return cloneElement(children, { close: onClose });
    }
    // string / null / etc.
    return children;
  };

  return (
    <dialog
      ref={dialogRef}
      className="ModalContainer bg-transparent border-0"
      onCancel={onClose}
    >
      <div className="modal__overlay" onClick={onClose} aria-hidden="true" />
      <div className="modal">
        <header className="modal__header">
          <h2>{title}</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </header>

        <main className="modal__main">{renderChildren()}</main>

        {actions.length > 0 && (
          <footer>
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
