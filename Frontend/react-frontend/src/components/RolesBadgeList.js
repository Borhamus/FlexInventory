import React from "react";

function RolesBadgeList({ roles = [] }) {
  if (roles.length === null) return <p className="text-muted">Sin roles asignados</p>;
  return (
    <div className="roles-badges">
      {roles.map((r) => (
        <span key={r} className="role-badge">{r}</span>
      ))}
    </div>
  );
}

export default RolesBadgeList;
