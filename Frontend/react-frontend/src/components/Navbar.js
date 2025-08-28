import React, { useState } from 'react';
import { Menubar } from 'primereact/menubar';
import { Avatar } from 'primereact/avatar';
import { Button as PButton } from 'primereact/button';
import "/node_modules/primeflex/primeflex.css";
import "../styles/Navbar.css";

import Modal2 from "./Modal2";  // Asegúrate de que el Modal2.js esté bien importado
import ProfileModal from "./ProfileModal";  // Asegúrate de que ProfileModal.js esté bien importado

function Navbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
          {/* Botón para abrir el modal */}
          <button
            type="button"
            className="linkNavbar linkNavbar--user"
            onClick={() => setIsProfileOpen(true)}
            aria-label="Abrir perfil"
          >
            <i className="pi pi-fw pi-user"></i>
          </button>

          <a className='linkNavbar linkNavbar--settings' href="/settings">
            <i className="pi pi-fw pi-cog"></i>
          </a>
        </div>
      </nav>

      {/* Abrir el modal cuando el estado 'isProfileOpen' es verdadero */}
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
    </>
  );
}

export default Navbar;
