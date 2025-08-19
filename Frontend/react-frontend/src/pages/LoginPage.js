import React, { useState } from 'react';
import '../styles/LoginPage.css';
import "primeicons/primeicons.css";
import { useNavigate } from "react-router-dom";
import AuthService from '../services/AuthService';


function Login() {
    // Estados para los campos del formulario
    // useState actualiza el estado del componente cada vez que el usuario escribe,
    // lo usamos para guardar lo que escribe 
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    // Para redirigir después del login
    const navigate = useNavigate();


    // Función que se ejecuta al enviar el formulario
    const handleLogin = async (event) => {
        event.preventDefault(); // Evita que el navegador recargue la página
        try {
            // Llamamos al backend
            console.log("Formulario: " + username + " | " + password)
            const loginForm = {
                name: username,
                password: password
            }

            // Bienvenido a concurrencia, el await hace esperar a que el authService responda
            const response = await AuthService.login(loginForm);
            
            // Obtenemos el token
            const token = response.token;

            // Lo guardamos en localStorage
            localStorage.setItem("token", token);
            console.log("Token: " + localStorage.getItem("token"))

            // Redirigimos al usuario a la página principal (o donde quieras)
            navigate("/inventories");

        } catch (error) {
            console.log("Formulario: " + username + " | " + password)
            console.error("Login fallido:", error);
            alert("Usuario o contraseña incorrectos");
        }
    };

    return (
        <div className="container">
            {/* Panel Izquierdo */}
            <div className="left-panel">
                <h1>Hola, Bienvenido a FlexInventory!</h1>
                <p>
                    Si ya contás con una cuenta, iniciá sesión.<br />
                    Por otro lado, si tenés una invitación{" "}
                    <a href="/invite">ingresá aquí</a>.
                </p>
            </div>

            {/* Panel Derecho */}
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
