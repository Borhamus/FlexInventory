import { Navigate, type RouteObject } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';

// Simulamos la página de usuarios (luego la haremos real con Antd Table)
const UsuariosPage = () => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload(); // Recargamos para que el router detecte que ya no hay token
  };

  return (
    <div style={{ padding: 50 }}>
      <h1>Panel de Usuarios</h1>
      <button onClick={handleLogout}>Cerrar Sesión</button>
    </div>
  );
};

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/dashboard/usuarios',
    element: (
      <ProtectedRoute>
        <UsuariosPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  }
];