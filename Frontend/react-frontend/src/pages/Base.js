import React from "react";
import Navbar from "../components/Navbar";
import "../styles/Base.css"

function Base({ page }) {
  return (
    <div className="base">
      <div className="base-navbar">
          <Navbar />
      </div>

      {/* ------| CONTENIDO PRINCIPAL |------ */}
      <div className="base-body">
        {page}
      </div>
    </div>
  );
}

export default Base;