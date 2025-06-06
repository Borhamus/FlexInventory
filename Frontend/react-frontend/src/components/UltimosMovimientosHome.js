import React from "react";
import "../styles/UltimosMovimientosHome.css"
import Movimiento from "./Movimiento";

// Movimientos del usuario.
function UltimosMovimientosHome({titulo}){


    return(
        <div class = "UltimosMovimientosHome ">
            <div className="ultimosMovimientosTitulo">{titulo}</div>
            <div className="ultimosMovimientosMovimientos">
                <Movimiento showProfilePicture={false} showName={false} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={false} showName={false} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={false} showName={false} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={false} showName={false} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={false} showName={false} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={false} showName={false} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={false} showName={false} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={false} showName={false} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={false} showName={false} movimiento={"Crear inventario 'Electronicos'"}/>
            </div>
        </div>
    )
}

export default UltimosMovimientosHome;