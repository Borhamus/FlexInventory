export interface UserResponse {
  id: number;
  username: string;
  email: string | null;
  role: 'tenant' | 'employee';
  custom_role_id: number | null;
  tenant_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionOut {
  id: number;
  resource: string;
  action: string;
}

export interface CustomRoleResponse {
  id: number;
  name: string;
  description: string | null;
  permissions: PermissionOut[];
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeRequest {
  username: string;
  password: string;
  email?: string;
}

export interface AssignRoleRequest {
  custom_role_id: number | null;
}

export interface ChangePasswordRequest {
  new_password: string;
}

export interface CustomRoleCreate {
  name: string;
  description?: string;
}

export interface PermissionIn {
  resource: 'inventarios' | 'items' | 'catalogos' | 'empleados' | 'roles';
  action: 'create' | 'read' | 'update' | 'delete';
}