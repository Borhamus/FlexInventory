import React from 'react';

// Importamos las herramientas necesarias de React Router
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

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

// Configuramos las rutas
function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Rutas principales */}
        <Route path="/Home" element={<Base page = {<Home />} />} />
        <Route path="/inventories" element={<Base page = {<Inventories />} />} />
        <Route path="/catalogs" element={<Base page = {<Catalogs />} />} />
        <Route path="/users" element={<Base page = {<Users />} />} />
        <Route path="/settings" element={<Base page = {<Settings />} />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/" element={<LoginPage />} />

        {/* Ruta para páginas no encontradas */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;