import React from "react";
import { Avatar } from 'primereact/avatar';
import "../styles/Movimiento.css"

function Movimiento({showProfilePicture, showName, nombre, movimiento}){
    let profilePicture;
    let userName;

    // mostrar foto de perfil
    if (showProfilePicture) {
        profilePicture = (
            <div className="movimientoFotoPerfil">
                    <Avatar label="P" shape="circle" />
            </div>
        )
    }

    // mostrar el nombre
    if (showName) {
        userName = (
            <div  className="movimientoDatosNombre">
                {nombre} 
            </div>
        )
    }
    
    return(
        <div className="movimiento">

            {/* Imagen de perfil */}
            {profilePicture}

            {/* Nombre y movimiento */}
            <div className="movimientoDatos shadow-6 hover:shadow-8">

                {/* Nombre */}
                {userName}

                {/* Movimiento */}
                <div className="movimientoDatosMovimiento">
                    <p> Ultimo movimiento: </p>
                    <p># {movimiento}</p>
                </div>
            </div>
        </div>
    )
}

export default Movimiento;