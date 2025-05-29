import React, { useState } from "react";
import ReactDom from 'react-dom'
import "../styles/Modal.css";

function Modal({ open, children, onClose }) {
  if(!open) return null;

  return ReactDOM.createPortal(
    <div className="ModalContainer">
      {isOpen && (
        <>
          <div className="overlay"></div>
          <div className="modal">
            <header className="modal__header">
              <h2>Modal Title</h2>
              <button onClick={onClose} className="close-button">&times;</button>
            </header>
            <main className="modal__main">
              <p>Some content here!</p>
            </main>
            {children}
          </div>
        </>,
        document.getElementById('portal')
      )}
    </div>
  );
}

export default Modal;