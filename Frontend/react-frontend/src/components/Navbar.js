import React, { useState } from 'react';
import "/node_modules/primeflex/primeflex.css";
import "../styles/Navbar.css";
import Modal2 from "./Modal2";
import ProfileModal from "./ProfileModal";
import ModalConfiguracion from "./ModalConfiguracion";

function Navbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <nav className='navbar-container'>
        <div className='navbarLeft'>
          <b className='linkNavbar--title'>FlexInventory</b>
        </div>
        <div className='navbarCenter'>
          <a className='linkNavbar linkNavbar--inventories' href="/inventories">Inventarios</a>
          <a className='linkNavbar linkNavbar--catalogs' href="/catalogs">Catalogos</a>
          <a className='linkNavbar linkNavbar--users' href="/users">Users</a>
        </div>
        <div className='navbarRight'>
          {/* Botón para abrir el modal de perfil */}
          <button
            type="button"
            className="linkNavbar linkNavbar--user"
            onClick={() => setIsProfileOpen(true)}
            aria-label="Abrir perfil"
          >
            <i className="pi pi-fw pi-user"></i>
          </button>
          
          {/* Botón para abrir el modal de configuraciones */}
          <button
            type="button"
            className="linkNavbar linkNavbar--settings"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Configuraciones"
          >
            <i className="pi pi-fw pi-cog"></i>
          </button>
        </div>
      </nav>

      {/* Modal de perfil de usuario */}
      <Modal2
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        title="Perfil de Usuario"
        actions={[
          { label: "Volver", color: "secondary", size: "lg", onClick: (close) => close() },
          { label: "Guardar", color: "primary", size: "lg", onClick: (close) => { /* Lógica para guardar */ close(); } }
        ]}
      >
        <ProfileModal onCancel={() => setIsProfileOpen(false)} />
      </Modal2>

      {/* Modal de configuraciones */}
      <Modal2
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Configuraciones"
        actions={[
          { label: "Cerrar", color: "secondary", size: "lg", onClick: (close) => close() }
        ]}
      >
        <ModalConfiguracion onClose={() => setIsSettingsOpen(false)} />
      </Modal2>
    </>
  );
}

export default Navbar;