import React from "react";
import "../styles/Estadisticas.css"

function Estadisticas({titulo}){
    return (
        <div className="estadisticas shadow-6">
            <div className="estadisticasTitulo">{titulo}</div>
            <div className="estadisticasGraficos">Estadisticas</div>
        </div>
    );
}

export default Estadisticas;