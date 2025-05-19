import React, { useState } from 'react';
import '../styles/LoginPage.css';
import "primeicons/primeicons.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import axios from "axios";

function LoginPage() {

  const [username, setUsername] = useState("Nombre de usuario");
  const [password, setPassword] = useState("***** ");
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
    
  return(
    <div className='LoginPage'>
        <form className='formLogin' onSubmit={handleSubmit}>

          <h2 className='titulo pi pi-user'> Iniciar Sesión</h2>

          <div className='usuarioLabel'>
            <label>Usuario</label>
            <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
            />
          </div>

          <div className='passwordLabel'>
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
  )
}

export default Login;