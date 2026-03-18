import { Navigate, type RouteObject } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/MainLayout';
import InventoryPage from '../pages/InventoryPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'usuarios',
        element: <InventoryPage />,
      },
      {
        path: 'inventario/:id',
        element: <InventoryPage />,
      },
      // Puedes agregar más sub-rutas aquí: asistencia, reportes, etc.
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  }
];