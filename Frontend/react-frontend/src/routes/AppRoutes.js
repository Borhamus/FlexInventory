import React from 'react';

// Importamos las herramientas necesarias de React Router
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Importamos las páginas principales
import Home from '../pages/Home';
import Inventories from '../pages/Inventories';
import Catalogs from '../pages/Catalogs';
import Users from '../pages/Users';
import Settings from '../pages/Settings';
import NotFound from '../pages/NotFound';
import LoginPage from "../pages/LoginPage"

// Configuramos las rutas
function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Rutas principales */}
        <Route path="/Home" element={<Home />} />
        <Route path="/inventories" element={<Inventories />} />
        <Route path="/catalogs" element={<Catalogs />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Ruta para páginas no encontradas */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;