import { Navigate, type RouteObject } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/MainLayout';
import InventoryPage from '../pages/InventoryPage';
import InventoryLayout from '../components/InventoryLayout';

// Placeholder rápido para secciones que aún no creamos
const Placeholder = ({ title }: { title: string }) => (
  <div style={{ padding: 20 }}><h2>{title}</h2><p>Próximamente...</p></div>
);

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: (<ProtectedRoute> <MainLayout /> </ProtectedRoute>
    ),
    children: [
      {
        index: true, // Esto hace que /dashboard muestre el Inicio por defecto
        element: <Placeholder title="Inicio / Dashboard General" />,
      },
      {
        path: 'inventario',
        element: <InventoryLayout />,
        children: [
          { index: true, element: <Placeholder title="Seleccione un inventario" /> },
          { path: ':id', element: <InventoryPage /> },
        ]
      },
      {
        path: 'catalogos',
        element: <Placeholder title="Gestión de Catálogos" />,
      },
      {
        path: 'usuarios',
        element: <Placeholder title="Gestión de Usuarios" />,
      },
      {
        path: 'config',
        element: <Placeholder title="Configuración del Sistema" />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  }
];