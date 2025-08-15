import React, { useState } from 'react';
import '../styles/LoginPage.css';
import "primeicons/primeicons.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
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
        <div className="flex-container">
            <div className="login">
                <h4>Login</h4>
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
                    <input
                        type="submit"
                        value="LOGIN"
                        className="btn"
                    />
                </form>
                <a className="link" href="/signup">Sign Up</a>
            </div>
        </div>
    );
}

export default Login;
