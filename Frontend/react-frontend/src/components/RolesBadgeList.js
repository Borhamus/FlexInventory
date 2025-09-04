import React from "react";

function RolesBadgeList({ roles = [], onRemove }) {
  if (roles.length === 0)
    return <p className="text-muted">Sin roles asignados</p>;

  return (
    <div className="roles-badges">
      {roles.map((r) => (
        <button
          key={r}
          className="role-badge"
          onClick={() => onRemove(r)}
        >
          {r} ✕
        </button>
      ))}
    </div>
  );
}

export default RolesBadgeList;
