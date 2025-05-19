import React, { useState } from 'react';
import '../styles/LoginPage.css';
import "primeicons/primeicons.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import axios from "axios";


function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post("http://localhost:8080/auth/login", {
                username,
                password
            });

            const token = response.data.token;

            // Guardar token en localStorage (o sessionStorage)
            localStorage.setItem("token", token);

            // Activar el contexto
            login();

            // Redirigir a la página principal
            navigate("/");
        } catch (err) {
            console.error("Error de login:", err);
            setError("Usuario o contraseña incorrectos");
        }
    };

    return (
        <div className="login-container">
            <form onSubmit={handleSubmit}>
                <h2>Iniciar Sesión</h2>

                {error && <p className="error">{error}</p>}

                <div>
                    <label>Usuario</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label>Contraseña</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button type="submit">Ingresar</button>
            </form>
        </div>
    );
}

export default Login;
