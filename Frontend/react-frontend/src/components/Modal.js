import React, { useState } from "react";
import "../styles/Modal.css";

function Modal() {
  const [isOpen, setIsOpen] = useState(true);

  const openModal = () => {
    setIsOpen(true);
  }

  const closeModal = () => {
    setIsOpen(false);
  }

  return (
    <div className="ModalContainer">
      {isOpen && (
        <>
          <div className="overlay"></div>
          <div className="modal">
            <header className="modal__header">
              <h2>Modal Title</h2>
              <button onClick={closeModal} className="close-button">&times;</button>
            </header>
            <main className="modal__main">
              <p>Some content here!</p>
            </main>
          </div>
        </>
      )}
    </div>
  );
}

export default Modal;