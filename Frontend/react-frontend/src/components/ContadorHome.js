import React from "react";
import "../styles/ContadorHome.css";

function ContadorHome({ titulo, numero }) {
    return (
        <div className="contadorHome shadow-6 hover:shadow-8">
            <div className="contadorNumero">{numero}</div>
            <div className="contadorTitulo">{titulo}</div>
        </div>
    );
}

export default ContadorHome;