import React from "react";
import "../styles/UltimosMovimientosHome.css"

// Movimientos del usuario.
function UltimosMovimientosHome({titulo}){


    return(
        <div class = "UltimosMovimientosHome shadow-6 hover:shadow-8">
            <div className="ultimosMovimientosTitulo">{titulo}</div>
            <div className="ultimosMovimientosMovimientos">Movimientos</div>
        </div>
    )
}

export default UltimosMovimientosHome;