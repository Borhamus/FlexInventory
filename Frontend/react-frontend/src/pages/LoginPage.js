import React, { useState, useEffect } from 'react';
import '../styles/LoginPage.css';
import "primeicons/primeicons.css";
import { useNavigate } from "react-router-dom";
import AuthService from '../services/AuthService';

function Login() {
    // Estados para los campos del formulario
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    // Para redirigir después del login
    const navigate = useNavigate();

    // useEffect que revisa si el usuario ya está logueado
    useEffect(() => {
        // Verificar si el token existe en localStorage
        const token = localStorage.getItem("token");
        if (token) {
            // Si hay un token, redirigir al usuario a la página de inventarios
            navigate("/inventories");
        }
    }, [navigate]); // El useEffect solo se ejecuta cuando el componente se monta

    const handleLogin = async (event) => {
        event.preventDefault(); // Evita que el navegador recargue la página
        try {
            const loginForm = {
                name: username,
                password: password
            }

            const response = await AuthService.login(loginForm);
            const token = response.token;

            // Guardar el token en localStorage
            localStorage.setItem("token", token);
            console.log("Token: " + localStorage.getItem("token"))

            // Redirigir al usuario a la página de inventarios
            navigate("/inventories");

        } catch (error) {
            console.error("Login fallido:", error);
            alert("Usuario o contraseña incorrectos");
        }
    };

    return (
        <div className="container">
            <div className="left-panel">
                <h1>Hola, Bienvenido a FlexInventory!</h1>
                <p>
                    Si ya contás con una cuenta, iniciá sesión.<br />
                    Por otro lado, si tenés una invitación{" "}
                    <a href="/invite">ingresá aquí</a>.
                </p>
            </div>

            <div className="right-panel">
                <div className="login-box">
                    <h2>Iniciar Sesión</h2>
                    <form onSubmit={handleLogin}>
                        <div className="text_area">
                            <input
                                type="text"
                                id="username"
                                name="username"
                                className="text_input"
                                placeholder="Nombre de usuario"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="text_area">
                            <input
                                type="password"
                                id="password"
                                name="password"
                                className="text_input"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className="btn-group">
                            <button type="submit" className="btn btn-primary">
                                Iniciar Sesión
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate("/signup")}
                            >
                                Registrarse
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Login;
