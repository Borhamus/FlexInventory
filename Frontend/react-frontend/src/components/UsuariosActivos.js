import React from "react";
import "../styles/UsuariosActivos.css"
import Movimiento from "./Movimiento";

function UsuariosActivos({titulo}){
    return (
        <div className="usuariosActivos">
            <div className="usuariosActivosTitulo">{titulo}</div>
            <div className="usuariosActivosMovimientos">
                <Movimiento showProfilePicture={true} showName={true} nombre={"Usuario"} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={true} showName={true} nombre={"Usuario"} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={true} showName={true} nombre={"Usuario"} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={true} showName={true} nombre={"Usuario"} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={true} showName={true} nombre={"Usuario"} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={true} showName={true} nombre={"Usuario"} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={true} showName={true} nombre={"Usuario"} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={true} showName={true} nombre={"Usuario"} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={true} showName={true} nombre={"Usuario"} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={true} showName={true} nombre={"Usuario"} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={true} showName={true} nombre={"Usuario"} movimiento={"Crear inventario 'Electronicos'"}/>
                <Movimiento showProfilePicture={true} showName={true} nombre={"Usuario"} movimiento={"Crear inventario 'Electronicos'"}/>
                
            </div>
        </div>
    );
}

export default UsuariosActivos;