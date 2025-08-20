import React, { useState } from 'react';
import '../styles/Users.css';
import 'primeicons/primeicons.css';  // Asegúrate de tener los íconos de Prime

function Users() {
  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: 'Usuario 1', rol: 'Admin', ultimaConexion: '10:00 AM' },
    { id: 2, nombre: 'Usuario 2', rol: 'Editor', ultimaConexion: '09:30 AM' },
    { id: 3, nombre: 'Usuario 3', rol: 'Viewer', ultimaConexion: '09:00 AM' },
    // Agrega más usuarios según sea necesario
  ]);

  return (
    <div className="users-container">
      
      <div className="search-bar">
        <input type="text" placeholder="Ingrese el nombre de usuario a buscar" />
        <button>
          <i className="pi pi-search"></i> Buscar
        </button>
      </div>

      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>id</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Última Conexión</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id}>
                <td>{usuario.id}</td>
                <td>{usuario.nombre}</td>
                <td>{usuario.rol}</td>
                <td>{usuario.ultimaConexion}</td>
                <td>
                  <button className="btn edit-btn">
                    <i className="pi pi-pencil"></i>
                  </button>

                  <button className="btn delete-btn">
                    <i className="pi pi-trash"></i>
                  </button>
                  
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="button-container">
        <button className="btn create-user">
          <i className="pi pi-user-plus"></i> Crear Usuario
        </button>
        <button className="btn create-role">
          <i className="pi pi-users"></i> Crear Rol
        </button>
        <button className="btn view-movements">
          <i className="pi pi-eye"></i> Ver Movimientos
        </button>
      </div>
      
    </div>
  );
}

export default Users;
