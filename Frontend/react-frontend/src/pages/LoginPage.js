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

    // useEffect que revisa si el usuario ya está logueado y si el token ha expirado
   useEffect(() => {
    const token = localStorage.getItem("token");
    const tokenExpiration = localStorage.getItem("tokenExpiration");

    if (token && tokenExpiration) {
        const currentTime = new Date().getTime(); // Tiempo actual en milisegundos

        // Convertir tokenExpiration a número para la comparación
        const expirationTime = parseInt(tokenExpiration, 10);

        if (currentTime > expirationTime) { // Ahora comparas dos números
            // Si el token ha expirado, eliminarlo de localStorage
            localStorage.removeItem("token");
            localStorage.removeItem("tokenExpiration");
            console.log("Token expirado");
        } else {
            // Si el token no ha expirado, redirigir al usuario
            navigate("/inventories");
        }
    }
}, [navigate]); // Solo se ejecuta cuando el componente se monta

// Función para renovar el token
    const renewToken = async () => {
        try {
            const response = await AuthService.refreshToken();  // Petición al backend para renovar el token
            const token = response.token;

            // Guardamos el nuevo token y la nueva fecha de expiración (ejemplo: 1 hora)
            const expirationTime = new Date().getTime() + 3600000; // 1 hora de expiración (en milisegundos)

            // Actualizamos el token y la fecha de expiración en localStorage
            localStorage.setItem("token", token);
            localStorage.setItem("tokenExpiration", expirationTime.toString());

            console.log("Token renovado: " + localStorage.getItem("token"));

            // Redirigir al usuario a la página de inventarios
            navigate("/inventories");

        } catch (error) {
            console.error("Error al renovar el token:", error);
            // Si no podemos renovar el token, redirigir al login
            navigate("/login");
        }
    };
    

    // Manejar el login
    const handleLogin = async (event) => {
        event.preventDefault(); // Evita que el navegador recargue la página
        try {
            const loginForm = {
                name: username,
                password: password
            }

            const response = await AuthService.login(loginForm);
            const token = response.token;

            // Guardar el token y la fecha de expiración (ejemplo: 1 hora)
            const expirationTime = new Date().getTime() + 3600000; // 1 hora de expiración (en milisegundos)

            // Guardamos el token y la fecha de expiración en localStorage
            localStorage.setItem("token", token);
            localStorage.setItem("tokenExpiration", expirationTime.toString());

            console.log("Token guardado: " + localStorage.getItem("token"));

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
