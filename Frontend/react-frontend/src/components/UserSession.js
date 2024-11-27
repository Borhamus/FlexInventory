import React, { useState, useEffect } from "react";
import '../styles/UserSession.css'; // Asegúrate de que esté bien referenciado

function UserSession({ userName, userAvatar, onLogout }) {
    const [startTime] = useState(new Date()); // Hora de inicio de sesión
    const [elapsedTime, setElapsedTime] = useState("00:00");
    const [currentAvatar, setCurrentAvatar] = useState(
        userAvatar || process.env.PUBLIC_URL + "/avatar(1).png"
    );

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

    const handleAvatarChange = () => {
        // Cambiar entre avatares de ejemplo (puedes extender esto para incluir más)
        setCurrentAvatar(
            currentAvatar === process.env.PUBLIC_URL + "/avatar(1).png"
                ? process.env.PUBLIC_URL + "/avatar(2).png"
                : process.env.PUBLIC_URL + "/avatar(3).png"
        );
    };

    return (
        <div className="user-session">
            <div className="avatar-container">
                <img src={currentAvatar} alt="Avatar" className="user-avatar" />
                <button className="edit-avatar-button" onClick={handleAvatarChange}>
                    Editar Foto
                </button>
            </div>
            <div className="user-details">
                <div className="user-info">
                    <p className="user-name">{userName}</p>
                    <p className="session-timer">
                        <strong>Contador de log-in:</strong> {elapsedTime}
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
