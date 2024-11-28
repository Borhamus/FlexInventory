import React, { useState, useEffect } from "react";
import '../styles/UserSession.css';
import useImagePreloader from "../hooks/useImagePreloader";

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
            <div className="avatar-container">
                <img src={avatar} alt="Avatar" className="user-avatar" />
                <a href="#" className="edit-avatar-link">
                    Editar Foto
                </a>
            </div>
            <div className="user-details">
                <div className="user-info">
                    <p className="user-name">{userName}</p>
                    <p className="session-timer">
                        <strong>Log-in Timer:</strong> {elapsedTime}
                    </p>
                </div>
                <div className="user-actions">
                    <p className="current-time">
                        <strong>Hora:</strong> {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <button className="logout-button" onClick={onLogout}>
                        Log-out
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UserSession;
