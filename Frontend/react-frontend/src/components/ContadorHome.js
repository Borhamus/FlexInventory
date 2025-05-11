import React from "react";
import "../styles/ContadorHome.css"

/*
    Recibo el titulo del contador y el numero de este
    El contador es un componente altamente reutilizable.
*/
function ContadorHome ({titulo, numero}){

    /* 
        FUNCIONALIDAD
    */

    return(
        <div className="contadorHome" class = "contadorHome shadow-6 hover:shadow-8" >
            {/* Numero */}
            <div className="contadorNumero" class = "contadorNumero col-12">
                <p>
                    {numero}
                </p>
            </div>

            {/* Titulo */}
            <div className="contadorTitulo" class = "contadorTitulo col-12 border-top-2">
                <p>
                    {titulo}
                </p>
            </div>
        </div>
    );

}

export default ContadorHome;