import React from "react";
import "../styles/UsuariosActivos.css"

function UsuariosActivos({titulo}){
    return (
        <div className="usuariosActivos shadow-6 hover:shadow-8">
            <div className="usuariosActivosTitulo">{titulo}</div>
            <div className="usuariosActivosMovimientos">Movimientos</div>
        </div>
    );
}

export default UsuariosActivos;