import React, { useState } from "react";
import "/node_modules/primeflex/primeflex.css";
import "../styles/ModalConfiguracion.css";

function ModalConfiguracion({ onClose }) {
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const handleLogout = () => {
    // Eliminar el token del localStorage
    localStorage.removeItem('token');
    // Redirigir a la página de login
    window.location.href = '/login';
  };

  return (
    <div className="configuracion-modal-content">
      <div className="configuracion-option">
        <button 
          className="logout-button"
          onClick={() => setShowLogoutConfirmation(true)}
        >
          <i className="pi pi-sign-out"></i>
          <span>Cerrar sesión</span>
        </button>
      </div>

      {/* Popup de confirmación de logout */}
      {showLogoutConfirmation && (
        <div className="logout-confirmation-overlay">
          <div className="logout-confirmation-dialog">
            <p>¿Seguro quieres desloguearte?</p>
            <div className="logout-confirmation-buttons">
              <button
                className="logout-confirmation-button no"
                onClick={() => setShowLogoutConfirmation(false)}
              >
                No
              </button>
              <button
                className="logout-confirmation-button yes"
                onClick={handleLogout}
              >
                Sí
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModalConfiguracion;