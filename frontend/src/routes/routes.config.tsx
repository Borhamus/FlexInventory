import { Navigate, type RouteObject } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/MainLayout';
import InventoryPage from '../pages/InventoryPage';
import { InventoryDashboard } from '../pages/InventoryDashboard';
import { InventoryLayout } from '../components/InventoryLayout';
import { CatalogLayout } from '../components/CatalogosLayout';
import CatalogosPage from '../pages/CatalogosPage';
import CatalogoDashboard from '../pages/CatalogDashboard';
import UsuariosPage from '../pages/UsuariosPage';   
import ConfigPage from '../pages/ConfigPage';
import DashboardPage from '../pages/DashboardPage';


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
    element: (<ProtectedRoute> <MainLayout /> </ProtectedRoute>),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'inventario',
        element: <InventoryLayout />,
        children: [
          { index: true, element: <InventoryDashboard /> },
          { path: ':id', element: <InventoryPage /> },
        ],
      },
      {
        path: 'catalogos',
        element: <CatalogLayout />,
        children: [
          { index: true, element: <CatalogoDashboard /> },
          { path: ':id', element: <CatalogosPage /> },
        ],
      },
      {
        path: 'usuarios',
        element: <UsuariosPage />,   // ← reemplaza el Placeholder
      },
      { 
        path: 'config', element: <ConfigPage /> 
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];