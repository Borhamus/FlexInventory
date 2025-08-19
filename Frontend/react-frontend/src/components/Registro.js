import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import AuthService from '../services/AuthService';
import "../styles/LoginPage.css"; // usamos los mismos estilos del login

function Registro() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const navigate = useNavigate();

    const handleRegister = async (event) => {
        event.preventDefault();

        if (password !== confirmPassword) {
            alert("Las contraseñas no coinciden");
            return;
        }

        try {
            const registerForm = {
                name: username,
                email: email,
                password: password
            };

            const response = await AuthService.register(registerForm);
            console.log("Registro exitoso:", response);

            // Después de registrar, mandamos al login
            navigate("/login");

        } catch (error) {
            console.error("Error en registro:", error);
            alert("No se pudo crear la cuenta. Intenta de nuevo.");
        }
    };

    return (
        <div className="container">
            {/* Panel Izquierdo */}
            <div className="left-panel">
                <h1>Hola, Bienvenido a FlexInventory!</h1>
                <p>
                    Si ya contás con una cuenta,{" "}
                    <a href="/login">iniciá sesión aquí</a>.
                    <br />
                    Por otro lado, si tenés una invitación{" "}
                    <a href="/invite">ingresá aquí</a>.
                </p>
            </div>

            {/* Panel Derecho */}
            <div className="right-panel">
                <div className="login-box">
                    <h2>Crear Cuenta</h2>
                    <form onSubmit={handleRegister}>
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
                                type="email"
                                placeholder="Dirección de Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                        <div className="text_area">
                            <input
                                type="password"
                                placeholder="Confirmar Contraseña"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="text_input"
                                required
                            />
                        </div>
                            <button type="submit" className="btn btn-primary">
                                Registrarse
                            </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Registro;
