import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios.config';

export type Resource = 'inventarios' | 'items' | 'catalogos' | 'empleados' | 'roles';
export type Action   = 'create' | 'read' | 'update' | 'delete';

export interface UserPermission {
  resource: Resource;
  action:   Action;
}

interface AuthContextType {
  token:              string | null;
  isAuthenticated:    boolean;
  userRole:           string | null;
  permissions:        UserPermission[];
  isTenant:           boolean;
  loadingPermissions: boolean;          // ← estaba faltando en el interface
  hasPermission:      (resource: Resource, action: Action) => boolean;
  setToken:           (token: string) => void;
  logout:             () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function decodeJWT(token: string): Record<string, any> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState]        = useState<string | null>(localStorage.getItem('token'));
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState<boolean>(true);

  const decoded  = token ? decodeJWT(token) : null;
  const userRole = decoded?.role ?? null;
  const isTenant = userRole === 'tenant';

useEffect(() => {
  if (!token) {
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
}, [token]);

  const hasPermission = (resource: Resource, action: Action): boolean => {
    if (isTenant) return true;
    return permissions.some((p) => p.resource === resource && p.action === action);
  };

  const setToken = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setTokenState(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setTokenState(null);
    setPermissions([]);
  };

  return (
    <AuthContext.Provider value={{
      token,
      isAuthenticated: !!token,
      userRole,
      permissions,
      isTenant,
      loadingPermissions,
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