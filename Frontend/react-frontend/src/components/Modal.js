import { React, useEffect } from "react";
import "../styles/Modal.css";


function Modal({ open, onClose, children }) {

  // useEffect(setup, dependencies)
  // en este caso las dependencies son null -> []
  // Esta función escucha si se apretó el escape, en caso de que sea paretado cierra la modal
  useEffect(() => {
      const handleKeyPressed = (e) => {
        if(e.key === "Escape"){
          onClose()
        }
      }
      window.addEventListener('keydown', handleKeyPressed)
    return () => window.removeEventListener('keydown', handleKeyPressed)
  },[])

  if (!open) return null;

  return (
    <dialog open className="ModalContainer" >
      <div className="modal__overlay" onClick={onClose} />
      <div className="modal">
        <header className="modal__header">
          <div className="modal__header__title">{children.title}</div>
          <button onClick={onClose} className="close-button">&times;</button>
        </header>
        <main className="modal__main">
          {children.body}
        </main>
      </div>
    </dialog>
  );
}

export default Modal;