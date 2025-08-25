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

  const rolePermissions = {
    Inventarios: ["Crear", "Actualizar", "Ver", "Borrar"],
    Catálogos: ["Crear", "Actualizar", "Ver", "Borrar"],
    Artículos: ["Crear", "Actualizar", "Ver", "Borrar"],
    Etiquetas: ["Crear", "Actualizar", "Ver", "Borrar"],
    Usuarios: ["Crear", "Actualizar", "Ver", "Borrar"],
    Atributos: ["Crear", "Actualizar", "Ver", "Borrar"],
  };

  return (
    <div className="profile-page">
      <div className="grid justify-content-center">
        <div className="col-12 md:col-4">
          <AvatarCard name={user.name} avatar={user.avatar} />
          <div className="card card-roles">
            <h4 className="mb-3">Mis Roles:</h4>
            <RolesBadgeList roles={user.roles} />
          </div>
        </div>

        <div className="col-12 md:col-6">
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
