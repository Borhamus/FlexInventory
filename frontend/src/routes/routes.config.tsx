import { Navigate, type RouteObject } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import RegisterTenantPage from '../pages/RegisterTenantPage';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/MainLayout';
import InventoryPage from '../pages/InventoryPage';
import { InventoryDashboard } from '../pages/InventoryDashboard';
import { InventoryLayout } from '../components/InventoryLayout';
import CatalogosPage from '../pages/CatalogosPage';
import CatalogoDashboard from '../pages/CatalogDashboard';
import UsuariosPage from '../pages/UsuariosPage';   
import ConfigPage from '../pages/ConfigPage';
import DashboardPage from '../pages/DashboardPage';
import DatabasePage from '../pages/DatabasePage'; 
import AuditoriaPage from '../pages/AuditoriaPage';
import NotificacionesPage from '../pages/NotificacionesPage';
import WelcomePage from '../pages/WelcomePage';


export const routes: RouteObject[] = [
  {
    path: '/',
    element: <WelcomePage />, 
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/registro',
    element: <RegisterTenantPage />,
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
          element: <CatalogoDashboard />,
        },
        {
          path: 'catalogos/:id',
          element: <CatalogosPage />,
        },
      {
        path: 'usuarios',
        element: <UsuariosPage />,   
      },
      { 
        path: 'config', element: <ConfigPage /> 
      },
      {
        path: 'database',        
        element: <DatabasePage />,
      },
      {
        path: 'historial',
        element: <AuditoriaPage />,
      },
      {
        path: 'notificaciones',
        element: <NotificacionesPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];