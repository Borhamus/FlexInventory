import api from './axios.config';
import type {
  UserResponse,
  CustomRoleResponse,
  CreateEmployeeRequest,
  AssignRoleRequest,
  ChangePasswordRequest,
  CustomRoleCreate,
  PermissionIn,
} from '../schemas/usuarios.schema';

// ── Empleados ──────────────────────────────────────────────
export const usuariosService = {
  listEmpleados: () =>
    api.get<UserResponse[]>('/empleados/').then((r) => r.data),

  createEmpleado: (data: CreateEmployeeRequest) =>
    api.post<UserResponse>('/empleados/', data).then((r) => r.data),

  assignRole: (id: number, data: AssignRoleRequest) =>
    api.put<UserResponse>(`/empleados/${id}`, data).then((r) => r.data),

  changePassword: (id: number, data: ChangePasswordRequest) =>
    api.patch(`/empleados/${id}/password`, data).then((r) => r.data),

  deactivateEmpleado: (id: number) =>
    api.delete(`/empleados/${id}`).then((r) => r.data),

  activateEmpleado: (id: number) =>
    api.patch<UserResponse>(`/empleados/${id}/activate`).then((r) => r.data),

  updateUsername: (id: number, data: { username: string }) =>
    api.patch<UserResponse>(`/empleados/${id}/username`, data).then((r) => r.data),

  updateEmail: (id: number, email: string | null) =>
    api.patch<UserResponse>(`/empleados/${id}/email`, { email }).then((r) => r.data),

  // ── Roles ────────────────────────────────────────────────
  listRoles: () =>
    api.get<CustomRoleResponse[]>('/roles/').then((r) => r.data),

  createRole: (data: CustomRoleCreate) =>
    api.post<CustomRoleResponse>('/roles/', data).then((r) => r.data),

  renameRole: (id: number, name: string) =>
    api.put<CustomRoleResponse>(`/roles/${id}`, { name }).then((r) => r.data),

  deleteRole: (id: number) =>
    api.delete(`/roles/${id}`).then((r) => r.data),

  addPermission: (roleId: number, data: PermissionIn) =>
    api.post<CustomRoleResponse>(`/roles/${roleId}/permissions`, data).then((r) => r.data),

  removePermission: (roleId: number, data: PermissionIn) =>
    api.delete<void>(`/roles/${roleId}/permissions`, { data }).then((r) => r.data),
};
