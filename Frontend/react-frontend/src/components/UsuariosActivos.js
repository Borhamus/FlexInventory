import React from "react";
import "../styles/UsuariosActivos.css"
import Movimiento from "./Movimiento";

function UsuariosActivos({titulo}){
    return (
        <div className="usuariosActivos shadow-6 hover:shadow-8">
            <div className="usuariosActivosTitulo">{titulo}</div>
            <div className="usuariosActivosMovimientos">
                <Movimiento className="col-12" />
                <Movimiento className="col-12" />
                <Movimiento className="col-12" />
                <Movimiento className="col-12" />  
                <Movimiento className="col-12" />
                <Movimiento className="col-12" />
                <Movimiento className="col-12" />
                <Movimiento className="col-12" /> 
                <Movimiento className="col-12" />
                <Movimiento className="col-12" />
                <Movimiento className="col-12" />
                <Movimiento className="col-12" /> 
                <Movimiento className="col-12" />
                <Movimiento className="col-12" />
                <Movimiento className="col-12" />
                <Movimiento className="col-12" /> 
                <Movimiento className="col-12" />
                <Movimiento className="col-12" />
                <Movimiento className="col-12" />
                <Movimiento className="col-12" /> 
                <Movimiento className="col-12" />
                <Movimiento className="col-12" />
                <Movimiento className="col-12" />
                <Movimiento className="col-12" /> 

            </div>
        </div>
    );
}

export default UsuariosActivos;