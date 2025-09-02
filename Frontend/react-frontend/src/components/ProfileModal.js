import React, { useState } from "react";
import "/node_modules/primeflex/primeflex.css";
import "../styles/ProfileModal.css";

function ProfileModal() {
  const [name, setName] = useState("Benja");
  const [pwd, setPwd] = useState("".padStart(10, "*"));
  const [showPwd, setShowPwd] = useState(false);
  const roles = ["Empleado"]; // Estos roles pueden ser dinámicos

  return (
    <div className="profile-modal-content">
      {/* Contenedor con dos columnas */}
      <div className="profile-modal-grid">
        {/* Columna izquierda - Campos de entrada */}
        <div className="profile-modal-left">
          <div className="field-set">
            <label>Nombre de Usuario</label>
            <div className="input-with-icon">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Usuario"
              />
              
            </div>
          </div>
          
          <div className="field-set">
            <label>Contraseña</label>
            <div className="input-with-icon">
              <input
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="********"
              />
              <button
                type="button"
                className="icon-eye"
                onClick={() => setShowPwd((s) => !s)}
                aria-label="Mostrar/Ocultar contraseña"
              >
                <i className={`pi ${showPwd ? "pi-eye-slash" : "pi-eye"}`} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Columna derecha - Roles */}
        <div className="profile-modal-right">
          <div className="roles-section">
            <label>Roles del Usuario:</label>
            <div className="roles-box">
              {roles.map((r) => (
                <span className="role-chip" key={r}>{r}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;