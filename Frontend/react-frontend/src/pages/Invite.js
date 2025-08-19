import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import AuthService from '../services/AuthService';
import "../styles/LoginPage.css"; 

function Invite() {
    const [inviteKey, setInviteKey] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();

    const handleInvite = async (event) => {
        event.preventDefault();

        try {
            const inviteForm = {
                key: inviteKey,
                name: username,
                password: password
            };

            const response = await AuthService.validateInvite(inviteForm);
            console.log("Invitación válida:", response);

            // si todo va bien podrías redirigir al dashboard o a otro flujo
            navigate("/inventories");

        } catch (error) {
            console.error("Error con la invitación:", error);
            alert("Datos incorrectos o clave inválida");
        }
    };

    return (
        <div className="container">
            {/* Panel Izquierdo */}
            <div className="left-panel">
                <h1>Hola, Bienvenido a FlexInventory!</h1>
                <p>
                    Usa tu clave de acceso para ingresar.<br />
                    Si contas con una cuenta propia, <a href="/login">click aquí</a>.<br />
                    Si quieres registrarte, <a href="/signup">click aquí</a>.
                </p>
            </div>

            {/* Panel Derecho */}
            <div className="right-panel">
                <div className="login-box">
                    <h2>Acceso con Clave</h2>
                    <form onSubmit={handleInvite}>
                        <div className="text_area">
                            <input
                                type="text"
                                placeholder="Clave de Acceso"
                                value={inviteKey}
                                onChange={(e) => setInviteKey(e.target.value)}
                                className="text_input"
                                required
                            />
                        </div>
                        <div className="text_area">
                            <input
                                type="text"
                                placeholder="Nombre de Usuario"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="text_input"
                                required
                            />
                        </div>
                        <div className="text_area">
                            <input
                                type="password"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="text_input"
                                required
                            />
                        </div>
                            <button type="submit" className="btn btn-primary">
                                Acceder
                            </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Invite;
