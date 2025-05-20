import React from "react";
import "/node_modules/primeflex/primeflex.css";
import Navbar from "../components/Navbar";
import "../styles/Base.css"

function Base({page}) {
  return (
    <div className="Base">
                <div className="grid">
                    <div className="col-12">
                        <Navbar />
                    </div>
                </div>

                {/* ------| CONTENIDO PRINCIPAL |------ */}
                <div className="grid">
                    <div className="col">
                        {page}
                    </div>
                </div>
    </div>
  );
}

export default Base;