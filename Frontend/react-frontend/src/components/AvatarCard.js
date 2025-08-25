import React, { useState } from "react";

function AvatarCard({ name, avatar }) {
  const [displayName, setDisplayName] = useState(name);

  return (
    <div className="card avatar-card">
      <div className="avatar-wrapper">
        <img src={avatar} alt="Avatar de usuario" className="avatar-img" />
        <button className="avatar-edit-btn" type="button" disabled title="Próximamente">
          <i className="pi pi-pencil"></i>
        </button>
      </div>

      <div className="name-row">
        <input
          className="name-input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled                          
        />
        <button className="name-edit-icon" type="button" disabled title="Próximamente">
          <i className="pi pi-pencil"></i>
        </button>
      </div>
    </div>
  );
}

export default AvatarCard;
