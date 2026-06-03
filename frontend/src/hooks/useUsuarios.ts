import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notification } from 'antd';
import { usuariosService } from '../api/usuarios.service';
import type {
  AssignRoleRequest,
  ChangePasswordRequest,
  CreateEmployeeRequest,
  CustomRoleCreate,
  PermissionIn,
} from '../schemas/usuarios.schema';

const EMPLEADOS_KEY = ['empleados'];
const ROLES_KEY     = ['roles'];

// ── Empleados ──────────────────────────────────────────────

export const useEmpleados = () =>
  useQuery({ queryKey: EMPLEADOS_KEY, queryFn: usuariosService.listEmpleados });

export const useCreateEmpleado = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeRequest) => usuariosService.createEmpleado(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMPLEADOS_KEY });
      notification.success({ message: 'Empleado creado correctamente.' });
    },
    onError: (e: any) =>
      notification.error({ message: e.response?.data?.detail || 'Error al crear empleado.' }),
  });
};

export const useAssignRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AssignRoleRequest }) =>
      usuariosService.assignRole(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMPLEADOS_KEY });
      notification.success({ message: 'Rol asignado correctamente.' });
    },
    onError: (e: any) =>
      notification.error({ message: e.response?.data?.detail || 'Error al asignar rol.' }),
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: ({ id, data }: { id: number; data: ChangePasswordRequest }) =>
      usuariosService.changePassword(id, data),
    onSuccess: () =>
      notification.success({ message: 'Contraseña actualizada correctamente.' }),
    onError: (e: any) =>
      notification.error({ message: e.response?.data?.detail || 'Error al cambiar contraseña.' }),
  });

export const useDeactivateEmpleado = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usuariosService.deactivateEmpleado(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMPLEADOS_KEY });
      notification.success({ message: 'Empleado desactivado.' });
    },
    onError: (e: any) =>
      notification.error({ message: e.response?.data?.detail || 'Error al desactivar empleado.' }),
  });
};

export const useActivateEmpleado = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usuariosService.activateEmpleado(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMPLEADOS_KEY });
      notification.success({ message: 'Empleado reactivado.' });
    },
    onError: (e: any) =>
      notification.error({ message: e.response?.data?.detail || 'Error al reactivar empleado.' }),
  });
};

export const useUpdateUsername = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, username }: { id: number; username: string }) =>
      usuariosService.updateUsername(id, { username }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMPLEADOS_KEY });
      notification.success({ message: 'Nombre de usuario actualizado.' });
    },
    onError: (e: any) =>
      notification.error({ message: e.response?.data?.detail || 'Error al actualizar nombre.' }),
  });
};

// ── Roles ─────────────────────────────────────────────────

export const useRoles = () =>
  useQuery({
    queryKey: ROLES_KEY,
    queryFn:  usuariosService.listRoles,
    retry: (failureCount, error: any) => {
      // Si es 403 no reintentamos — el usuario no tiene permiso
      if (error?.response?.status === 403) return false;
      return failureCount < 3;
    },
  });

export const useCreateRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CustomRoleCreate) => usuariosService.createRole(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROLES_KEY });
      notification.success({ message: 'Rol creado correctamente.' });
    },
    onError: (e: any) =>
      notification.error({ message: e.response?.data?.detail || 'Error al crear rol.' }),
  });
};

export const useRenameRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      usuariosService.renameRole(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROLES_KEY });
      notification.success({ message: 'Rol renombrado correctamente.' });
    },
    onError: (e: any) =>
      notification.error({ message: e.response?.data?.detail || 'Error al renombrar rol.' }),
  });
};

export const useDeleteRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usuariosService.deleteRole(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROLES_KEY });
      notification.success({ message: 'Rol eliminado.' });
    },
    onError: (e: any) =>
      notification.error({ message: e.response?.data?.detail || 'Error al eliminar rol.' }),
  });
};

export const useTogglePermission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      permission,
      active,
    }: {
      roleId:     number;
      permission: PermissionIn;
      active:     boolean;
    }) =>
      active
        ? usuariosService.addPermission(roleId, permission)
        : usuariosService.removePermission(roleId, permission),
    onSuccess: () => qc.invalidateQueries({ queryKey: ROLES_KEY }),
    onError: (e: any) =>
      notification.error({ message: e.response?.data?.detail || 'Error al modificar permiso.' }),
  });
};

export const useUpdateEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, email }: { id: number; email: string | null }) =>
      usuariosService.updateEmail(id, email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMPLEADOS_KEY });
      notification.success({ message: 'Email actualizado correctamente.' });
    },
    onError: (e: any) =>
      notification.error({ message: e.response?.data?.detail || 'Error al actualizar email.' }),
  });
};
