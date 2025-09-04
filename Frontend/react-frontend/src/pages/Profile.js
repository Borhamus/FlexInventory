import React, { useState } from "react";
import "../styles/Profile.css";
import AvatarCard from "../components/AvatarCard";
import RolesBadgeList from "../components/RolesBadgeList";
import RolePermissionsCard from "../components/RolePermissionsCard";

function Profile() {
  const [user, setUser] = useState({
    name: "",
    avatar: "/profile.jpg",
    roles: [],
  });

  const [availableRoles, setAvailableRoles] = useState([
    "Inventarios",
    "Catálogos",
    "Artículos",
    "Etiquetas",
    "Usuarios",
    "Atributos",
  ]);

  const rolePermissions = {
    Inventarios: ["Crear", "Actualizar", "Ver", "Borrar"],
    Catálogos: ["Crear", "Actualizar", "Ver", "Borrar"],
    Artículos: ["Crear", "Actualizar", "Ver", "Borrar"],
    Etiquetas: ["Crear", "Actualizar", "Ver", "Borrar"],
    Usuarios: ["Crear", "Actualizar", "Ver", "Borrar"],
    Atributos: ["Crear", "Actualizar", "Ver", "Borrar"],
  };

  // Función para agregar un rol desde disponibles
  const addRole = (role) => {
    if (!user.roles.includes(role)) {
      setUser((prevState) => ({
        ...prevState,
        roles: [...prevState.roles, role],
      }));
      setAvailableRoles((prev) => prev.filter((r) => r !== role));
    }
  };

  // Función para quitar un rol y devolverlo a disponibles
  const removeRole = (role) => {
    setUser((prevState) => ({
      ...prevState,
      roles: prevState.roles.filter((r) => r !== role),
    }));
    setAvailableRoles((prev) => [...prev, role]);
  };

  return (
    <div className="profile-page">
      <div className="grid profile-content">
        {/* Columna Avatar + Mis Roles */}
        <div className="col-12 md:col-4 role-selection-container">
          <div className="avatar-section">
            <AvatarCard name={user.name} avatar={user.avatar} />
            <div className="card card-roles">
              <h4 className="mb-3">Mis Roles:</h4>
              <RolesBadgeList roles={user.roles} onRemove={removeRole} />
            </div>
          </div>
        </div>

        {/* Columna Roles Disponibles */}
        <div className="col-12 md:col-4 roles-permissions-container">
          <div className="card card-roles-available">
            <h4 className="mb-3">Roles Disponibles:</h4>
            <div className="available-roles">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => addRole(role)}
                  className="btn-role"
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Columna Permisos */}
        <div className="col-12 md:col-4">
          <RolePermissionsCard
            selectedRole={user.roles[0]}
            permissions={rolePermissions}
          />
        </div>
      </div>
    </div>
  );
}

export default Profile;
