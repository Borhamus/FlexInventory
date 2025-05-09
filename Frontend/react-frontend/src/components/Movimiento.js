import React from "react";
import { Avatar } from 'primereact/avatar';
import "../styles/Movimiento.css"

function Movimiento({showProfilePicture, showName, showMovement}){
    return(
        <div className="movimiento" class = "movimiento grid nested-grid ">
            {/* Imagen de perfil */}
            <div className="movimientoFotoPerfil" class="movimientoFotoPerfil col-4">
                <Avatar label="P" size="xlarge" shape="circle" />
            </div>

            {/* Nombre y movimiento */}
            <div className="movimientoDatos" class = "movimientoDatos col-8 shadow-6 hover:shadow-8">
                <div class = "grid">
                    {/* Nombre */}
                    <div  class="col-12">
                        Nombre Usuario  
                    </div>

                    {/* Movimiento */}
                    <div class="col-12">
                        Acción que realizó  
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Movimiento;