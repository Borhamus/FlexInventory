import React, { useState, useEffect } from "react";
import '../styles/UserSession.css';
import useImagePreloader from "../utils/useImagePreloader";
import "/node_modules/primeflex/primeflex.css";

function UserSession({ userName, userAvatar, onLogout }) {
    const fallbackAvatar = "/avatar(1).png";
    const avatar = useImagePreloader(userAvatar, fallbackAvatar); // Precargar imagen

    const [startTime] = useState(new Date()); // Hora de inicio de sesión
    const [elapsedTime, setElapsedTime] = useState("00:00");

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const diff = Math.floor((now - startTime) / 1000);

            const hours = String(Math.floor(diff / 3600)).padStart(2, "0");
            const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");

            setElapsedTime(`${hours}:${minutes}`);
        }, 1000);

        return () => clearInterval(timer); // Limpiar intervalo al desmontar
    }, [startTime]);

    return (
        <div className="user-session">
            {/* GRID SUPERIOR - NOMBRE, TIMER Y FOTO */}
            <div class="grid">

                {/* COLUMNA - NOMBRE DE USHUARIO */}
                <div class='col-8'>
                    <div className="user-details">
                        <div className="user-info">

                            {/* Nombre de Usuario */}
                            <p className="user-name" class = ""><strong>{userName}</strong></p>

                            {/* Timer */}
                            <p className="session-timer">
                                <strong>Log-in Timer:</strong> {elapsedTime}
                            </p>

                            {/* Boton */}
                            <a href="#" className="logout-button">
                                Log out
                            </a>
                            
                        </div>
                    </div>
                </div>

                <div class='col-4'>
                    <div className="avatar-container">
                        <img src={avatar} alt="Avatar" className="user-avatar" />
                        
                        {/* Editar foto */}
                        <a href="#" className="edit-avatar-link">
                            Editar Foto
                        </a>
                    </div>
                </div>
            </div>
            
            {/* GRID INFERIOR - BOTONES */}
                <div class = "col">
                    
                </div>
            
        </div>
    );
}

export default UserSession;
