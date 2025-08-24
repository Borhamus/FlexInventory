import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Importamos las páginas principales
import Home from '../pages/Home';
import Base from '../pages/Base';
import Inventories from '../pages/Inventories';
import Catalogs from '../pages/Catalogs';
import Users from '../pages/Users';
import Settings from '../pages/Settings';
import NotFound from '../pages/NotFound';
import LoginPage from "../pages/LoginPage";
import SignUp from '../pages/SignUp';
import Invite from '../pages/Invite';
import Test from '../pages/Test';

// Función para verificar si el token es válido
const checkToken = () => {
  const token = localStorage.getItem("token");
  const tokenExpiration = localStorage.getItem("tokenExpiration");

  if (token && tokenExpiration) {
    const currentTime = new Date().getTime(); // Tiempo actual en milisegundos
    const expirationTime = parseInt(tokenExpiration, 10); // Convertir a número

    // Verificar si el token ha expirado
    if (currentTime > expirationTime) {
      // Si ha expirado, eliminar el token y la expiración
      localStorage.removeItem("token");
      localStorage.removeItem("tokenExpiration");
      return false;  // Token inválido o expirado
    }

    return true;  // Token válido
  }

  return false;  // No hay token
};

// Ruta pública, redirige si el token está presente y válido
const PublicRoute = ({ element }) => {
  return !checkToken() ? element : <Navigate to="/inventories" />;
};

// Ruta protegida, redirige si no hay token o si está expirado
const ProtectedRoute = ({ element }) => {
  return checkToken() ? element : <Navigate to="/login" />;
};

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas accesibles solo si el usuario NO tiene un token válido */}
        <Route path="/login" element={<PublicRoute element={<LoginPage />} />} />
        <Route path="/signup" element={<PublicRoute element={<SignUp />} />} />
        <Route path="/invite" element={<PublicRoute element={<Invite />} />} />

        {/* Rutas protegidas (requieren un token válido) */}
        <Route 
          path="/Home" 
          element={<ProtectedRoute element={<Base page={<Home />} />} />} 
        />
        <Route 
          path="/inventories" 
          element={<ProtectedRoute element={<Base page={<Inventories />} />} />} 
        />
        <Route 
          path="/catalogs" 
          element={<ProtectedRoute element={<Base page={<Catalogs />} />} />} 
        />
        <Route 
          path="/users" 
          element={<ProtectedRoute element={<Base page={<Users />} />} />} 
        />
        <Route 
          path="/settings" 
          element={<ProtectedRoute element={<Base page={<Settings />} />} />} 
        />
        <Route 
          path="/test" 
          element={<Base page={<Test />} />}
        />

        {/* Ruta para páginas no encontradas */}
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;
