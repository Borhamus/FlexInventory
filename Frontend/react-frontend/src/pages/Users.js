import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Users.css";
import "primeicons/primeicons.css";
import Modal from "../components/Modal2";
import Button from "../components/Button";
import DynamicForm from "../components/DynamicForm";

function Users() {
  const navigate = useNavigate();

  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: "Usuario 1", rol: "Admin", ultimaConexion: "10:00 AM" },
    { id: 2, nombre: "Usuario 2", rol: "Editor", ultimaConexion: "09:30 AM" },
    { id: 3, nombre: "Usuario 3", rol: "Viewer", ultimaConexion: "09:00 AM" },
    { id: 4, nombre: "Usuario 4", rol: "Admin", ultimaConexion: "08:30 AM" },
    { id: 5, nombre: "Usuario 5", rol: "Editor", ultimaConexion: "08:00 AM" },
    { id: 6, nombre: "Usuario 6", rol: "Viewer", ultimaConexion: "07:30 AM" },
  ]);

  // Modal para crear usuario
  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [formValues, setFormValues] = useState({});

  // Modal de movimientos
  const [isMovimientosOpen, setIsMovimientosOpen] = useState(false);
  const [movimientosValues, setMovimientosValues] = useState({});

  // Campos formularios
  const userFormFields = [
    {
      name: "nombreUsuario",
      label: "Nombre de Usuario:",
      type: "text",
      placeholder: "Ingrese el nombre del nuevo usuario",
    },
    {
      name: "passwordUsuario",
      label: "Password de Usuario:",
      type: "password",
      placeholder: "Ingrese la nueva contraseña",
    },
  ];

  const movimientosFormFields = [
    { name: "fechaDesde", label: "Desde", type: "date" },
    { name: "fechaHasta", label: "Hasta", type: "date" },
  ];

  // Funciones para formularios
  const handleFormChange = useCallback((fieldName, value) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  }, []);

  const handleMovimientosChange = (fieldName, value) => {
    setMovimientosValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setModalType("");
    setFormValues({});
  }, []);

  const closeMovimientosModal = () => {
    setIsMovimientosOpen(false);
    setMovimientosValues({});
  };

  // Crear usuario
  const handleCrearUsuario = () => {
    setModalType("usuario");
    setFormValues({});
    setIsOpen(true);
  };

  const crearUsuario = () => {
    if (formValues.nombreUsuario && formValues.passwordUsuario) {
      const nuevoUsuario = {
        id: usuarios.length + 1,
        nombre: formValues.nombreUsuario,
        rol: "Viewer",
        ultimaConexion: "Ahora",
      };
      setUsuarios((prev) => [...prev, nuevoUsuario]);
      closeModal();
    } else {
      alert("Por favor complete todos los campos requeridos");
    }
  };

  // Consultar movimientos
  const consultarMovimientos = () => {
    console.log("Consultando movimientos:", movimientosValues);
    closeMovimientosModal();
  };

  // Abrir Profile con info del usuario
  const handleEditarUsuario = (usuario) => {
    navigate("/profile", { state: { usuario } });
  };

  // Render del modal
  const renderModalContent = () => {
    if (modalType === "usuario") {
      return (
        <DynamicForm
          fields={userFormFields}
          values={formValues}
          onChange={handleFormChange}
        />
      );
    }
    return null;
  };

  const getModalTitle = () => {
    if (modalType === "usuario") return "Crear Usuario";
    return "";
  };

  const getModalActions = () => {
    if (modalType === "usuario") {
      return [
        { label: "Cancelar", onClick: closeModal, variant: "secondary" },
        { label: "Crear Usuario", onClick: crearUsuario, variant: "primary" },
      ];
    }
    return [];
  };

  return (
    <div className="users-container">
      <div className="search-bar">
        <input type="text" placeholder="Ingrese el nombre de usuario a buscar" />
        <button>
          <i className="pi pi-search"></i> Buscar
        </button>
      </div>

      <div className="table-section">
        <div className="table-wrapper">
          <div className="table-title">
            <h2>Usuarios</h2>
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
                      <div className="actions-cell">
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEditarUsuario(usuario)}
                        >
                          <i className="pi pi-pencil"></i>
                        </button>
                        <button className="action-btn delete-btn">
                          <i className="pi pi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="BotonesBajos">
          <Button
            icon="pi pi-user-plus"
            onClick={handleCrearUsuario}
            color="primary"
            name="Crear Usuario"
          />
          <Button
            icon="pi pi-eye"
            onClick={() => setIsMovimientosOpen(true)}
            color="tertiary"
            name="Ver Movimientos"
          />
        </div>
      </div>

      {/* Modal para crear usuario */}
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={getModalTitle()}
        actions={getModalActions()}
      >
        {renderModalContent()}
      </Modal>

      {/* Modal para movimientos */}
      <Modal
        isOpen={isMovimientosOpen}
        onClose={closeMovimientosModal}
        title="Log de Movimientos"
        actions={[
          { label: "Cancelar", onClick: closeMovimientosModal, variant: "secondary" },
          { label: "Consultar", onClick: consultarMovimientos, variant: "primary" },
        ]}
      >
        <DynamicForm
          fields={movimientosFormFields}
          values={movimientosValues}
          onChange={handleMovimientosChange}
        />
      </Modal>
    </div>
  );
}

export default Users;
