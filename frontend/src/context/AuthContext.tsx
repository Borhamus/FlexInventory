import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAuthToken, registerTokenRefreshHandler } from '../api/axios.config';

export type Resource = 'inventarios' | 'items' | 'catalogos' | 'empleados' | 'roles';
export type Action   = 'create' | 'read' | 'update' | 'delete';

export interface UserPermission {
  resource: Resource;
  action:   Action;
}

interface AuthContextType {
  token:              string | null;
  isAuthenticated:    boolean;
  initializing:       boolean;
  userRole:           string | null;
  permissions:        UserPermission[];
  isTenant:           boolean;
  loadingPermissions: boolean;
  user:               Record<string, any> | null;
  hasPermission:      (resource: Resource, action: Action) => boolean;
  setToken:           (token: string) => void;
  logout:             () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function decodeJWT(token: string): Record<string, any> | null {
  try {
    // El payload de un JWT es base64url (-, _) y puede venir sin padding;
    // atob solo acepta base64 estándar, así que normalizamos primero.
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isTokenExpired(decoded: Record<string, any> | null): boolean {
  if (!decoded?.exp) return false;
  return decoded.exp * 1000 < Date.now();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // El token vive en memoria (estado React + módulo axios), NUNCA en localStorage.
  const [token, setTokenState]        = useState<string | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState<boolean>(true);

  const decoded  = token ? decodeJWT(token) : null;
  // Un token vencido o indecodificable se trata como no autenticado
  const isValidToken = !!token && !!decoded && !isTokenExpired(decoded);
  const userRole = isValidToken ? decoded?.role ?? null : null;
  const isTenant = userRole === 'tenant';

  // ── Bootstrap de sesión ──────────────────────────────────────────────
  // Al montar la app intentamos renovar la sesión con la cookie httpOnly
  // del refresh token. Si existe sesión previa válida, el usuario entra
  // sin re-loguearse (incluso tras recargar la página o cerrar la pestaña).
  useEffect(() => {
    localStorage.removeItem('token'); // migración: el token ya no se persiste

    // Cuando el interceptor de axios renueva el token en silencio,
    // sincronizamos el estado de React para que la UI no expire.
    registerTokenRefreshHandler((t) => setTokenState(t));

    api.post('/auth/refresh')
      .then((res) => {
        setAuthToken(res.data.access_token);
        setTokenState(res.data.access_token);
      })
      .catch(() => {
        // Sin sesión previa: se queda en el login
      })
      .finally(() => setInitializing(false));
  }, []);

  useEffect(() => {
    if (!isValidToken) {
      setPermissions([]);
      setLoadingPermissions(false);
      return;
    }

    if (isTenant) {
      setPermissions([]);
      setLoadingPermissions(false);
      return;
    }

    setLoadingPermissions(true);
    // Usar el endpoint propio que no requiere roles:read
    api.get('/auth/me/permissions')
      .then((res) => {
        setPermissions(res.data.permissions as UserPermission[]);
        setLoadingPermissions(false);
      })
      .catch(() => {
        setPermissions([]);
        setLoadingPermissions(false);
      });
  }, [token, isTenant, isValidToken]);

  const hasPermission = (resource: Resource, action: Action): boolean => {
    if (isTenant) return true;
    return permissions.some((p) => p.resource === resource && p.action === action);
  };

  const setToken = (newToken: string) => {
    setAuthToken(newToken);
    setTokenState(newToken);
  };

  const logout = () => {
    // Borra la cookie httpOnly del refresh token en el backend
    api.post('/auth/logout').catch(() => {});
    setAuthToken(null);
    setTokenState(null);
    setPermissions([]);
  };

  return (
    <AuthContext.Provider value={{
      token,
      isAuthenticated: isValidToken,
      initializing,
      userRole,
      permissions,
      isTenant,
      loadingPermissions,
      user: decoded,
      hasPermission,
      setToken,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext debe usarse dentro de AuthProvider');
  return context;
};
