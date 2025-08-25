import React, { useState, useEffect } from "react";

function RolePermissionsCard({ selectedRole, permissions }) {
  const [selectedPermissions, setSelectedPermissions] = useState({});

  useEffect(() => {
    const initialPermissions = {};
    Object.keys(permissions).forEach((group) => {
      permissions[group].forEach((action) => {
        initialPermissions[`${group}-${action}`] = action === "Crear"; 
      });
    });
    setSelectedPermissions(initialPermissions);
  }, [permissions]);


  const handleCheckboxChange = (group, action) => {
    setSelectedPermissions((prevState) => ({
      ...prevState,
      [`${group}-${action}`]: !prevState[`${group}-${action}`],
    }));
  };

  return (
    <div className="card role-perms-card">
      <div className="role-perms-header">
        <h4>Permisos del rol:</h4>
        <span className="role-chip">{selectedRole || "—"}</span>
      </div>
      <div className="perms-grid">
        {Object.entries(permissions).map(([group, actions]) => (
          <div key={group} className="perm-group">
            <h5 className="perm-group-title">{group}</h5>
            <ul className="perm-actions">
              {actions.map((a) => (
                <li key={a}>
                  <label className="perm-item">
                    <input
                      type="checkbox"
                      checked={selectedPermissions[`${group}-${a}`] || false}
                      onChange={() => handleCheckboxChange(group, a)}
                    />
                    <span>{a}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RolePermissionsCard;
