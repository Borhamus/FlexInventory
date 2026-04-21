import React, { useState } from 'react';
import {
  Layout,
  Typography,
  Table,
  Tag,
  Button,
  Space,
  Popconfirm,
  Select,
  Tooltip,
  Divider,
  Card,
  Empty,
  Spin,
  Input,
  Badge,
  Switch,
  Collapse,
  theme,
} from 'antd';
import {
  PlusOutlined,
  LockOutlined,
  UserDeleteOutlined,
  TeamOutlined,
  SafetyOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useEmpleados,
  useRoles,
  useAssignRole,
  useDeactivateEmpleado,
  useActivateEmpleado,
  useCreateRole,
  useDeleteRole,
  useRenameRole,
  useTogglePermission,
  useUpdateUsername,
  useUpdateEmail,
} from '../hooks/useUsuarios';
import { ModalChangePassword } from '../components/ModalChangePassword';
import { ModalCreateUser } from '../components/ModalCreateUser';
import { useAuthContext } from '../context/AuthContext';
import type { UserResponse, CustomRoleResponse, PermissionIn } from '../schemas/usuarios.schema';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const RESOURCES = ['inventarios', 'items', 'catalogos', 'empleados', 'roles'] as const;
const ACTIONS   = ['create', 'read', 'update', 'delete'] as const;

type Resource = typeof RESOURCES[number];
type Action   = typeof ACTIONS[number];

const RESOURCE_LABELS: Record<Resource, string> = {
  inventarios: 'Inventarios',
  items:       'Artículos',
  catalogos:   'Catálogos',
  empleados:   'Empleados',
  roles:       'Roles',
};

const ACTION_LABELS: Record<Action, string> = {
  create: 'Crear',
  read:   'Ver',
  update: 'Editar',
  delete: 'Eliminar',
};

function roleHasPermission(role: CustomRoleResponse, resource: Resource, action: Action): boolean {
  return role.permissions.some((p) => p.resource === resource && p.action === action);
}

// ─── Panel de Roles ───────────────────────────────────────────────────────────

const RolesPanel: React.FC = () => {
  const { token }                                    = theme.useToken();
  const { isTenant, hasPermission }                  = useAuthContext();
  const { data: roles = [], isLoading, isError }     = useRoles();
  const { mutate: createRole, isPending: creating }  = useCreateRole();
  const { mutate: deleteRole }                       = useDeleteRole();
  const { mutate: renameRole }                       = useRenameRole();
  const { mutate: togglePermission, isPending: togglingPerm } = useTogglePermission();
  const [newRoleName, setNewRoleName]                = useState('');

  const canCreateRole = isTenant || hasPermission('roles', 'create');
  const canEditRole   = isTenant || hasPermission('roles', 'update');
  const canDeleteRole = isTenant || hasPermission('roles', 'delete');

  const handleCreateRole = () => {
    const name = newRoleName.trim();
    if (!name) return;
    createRole({ name }, { onSuccess: () => setNewRoleName('') });
  };

  const handleToggle = (
    role: CustomRoleResponse,
    resource: Resource,
    action: Action,
    currentlyActive: boolean,
  ) => {
    const permission: PermissionIn = { resource, action };
    togglePermission({ roleId: role.id, permission, active: !currentlyActive });
  };

  if (isLoading) return <Spin style={{ display: 'block', marginTop: 40 }} />;
  if (isError)   return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Crear rol — solo si tiene permiso */}
      {canCreateRole && (
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="Nombre del nuevo rol"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            onPressEnter={handleCreateRole}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={creating}
            onClick={handleCreateRole}
            disabled={!newRoleName.trim()}
          >
            Crear
          </Button>
        </div>
      )}

      {/* Lista de roles */}
      {roles.length === 0 ? (
        <Empty description="No hay roles creados todavía" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Collapse
          accordion
          items={roles.map((role) => ({
            key: role.id,
            label: (
              <Space onClick={(e) => e.stopPropagation()}>
                <SafetyOutlined />
                {/* Nombre editable solo si tiene permiso de editar */}
                {canEditRole ? (
                  <Text
                    strong
                    editable={{
                      tooltip: 'Renombrar rol',
                      onChange: (val: string) => {
                        const trimmed = (val ?? '').trim();
                        if (trimmed && trimmed !== role.name) {
                          renameRole({ id: role.id, name: trimmed });
                        }
                      },
                    }}
                  >
                    {role.name}
                  </Text>
                ) : (
                  <Text strong>{role.name}</Text>
                )}
                <Badge count={role.permissions.length} color="#1677ff" />
              </Space>
            ),
            extra: canDeleteRole ? (
              <Popconfirm
                title="¿Eliminar este rol?"
                description="Los empleados con este rol quedarán sin acceso."
                onConfirm={(e) => { e?.stopPropagation(); deleteRole(role.id); }}
                onCancel={(e) => e?.stopPropagation()}
                okText="Eliminar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            ) : undefined,
            children: (
              <div>
                {role.description && (
                  <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    {role.description}
                  </Text>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', paddingBottom: 8, color: token.colorTextSecondary, fontSize: 12 }}>
                        RECURSO
                      </th>
                      {ACTIONS.map((action) => (
                        <th
                          key={action}
                          style={{ textAlign: 'center', paddingBottom: 8, color: token.colorTextSecondary, fontSize: 12 }}
                        >
                          {ACTION_LABELS[action].toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {RESOURCES.map((resource) => (
                      <tr key={resource} style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                        <td style={{ padding: '8px 0', fontWeight: 500 }}>
                          {RESOURCE_LABELS[resource]}
                        </td>
                        {ACTIONS.map((action) => {
                          const active = roleHasPermission(role, resource, action);
                          return (
                            <td key={action} style={{ textAlign: 'center', padding: '8px 0' }}>
                              <Switch
                                size="small"
                                checked={active}
                                loading={togglingPerm}
                                disabled={!canEditRole}
                                onChange={() => canEditRole && handleToggle(role, resource, action, active)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ),
          }))}
        />
      )}
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

const UsuariosPage: React.FC = () => {
  const { token }                          = theme.useToken();
  const { isTenant, hasPermission }        = useAuthContext();
  const { data: empleados = [], isLoading } = useEmpleados();
  const { data: roles = [], isError: rolesError } = useRoles();
  const { mutate: assignRole }             = useAssignRole();
  const { mutate: deactivate }             = useDeactivateEmpleado();
  const { mutate: activate }              = useActivateEmpleado();
  const { mutate: updateUsername }        = useUpdateUsername();
  const { mutate: updateEmail } = useUpdateEmail();

  // Permisos del usuario actual sobre empleados
  const canCreate      = isTenant || hasPermission('empleados', 'create');
  const canEdit        = isTenant || hasPermission('empleados', 'update');
  const canDelete      = isTenant || hasPermission('empleados', 'delete');
  const canAssignRoles = isTenant || hasPermission('empleados', 'update');

  const [createOpen, setCreateOpen]       = useState(false);
  const [passwordModal, setPasswordModal] = useState<{
    open: boolean;
    empleado: UserResponse | null;
  }>({ open: false, empleado: null });

  const openPasswordModal  = (emp: UserResponse) => setPasswordModal({ open: true, empleado: emp });
  const closePasswordModal = () => setPasswordModal({ open: false, empleado: null });

  const columns: ColumnsType<UserResponse> = [
    {
      title:     'Usuario',
      dataIndex: 'username',
      key:       'username',
      render: (username: string, record: UserResponse) =>
        canEdit ? (
          <Text
            strong
            editable={{
              tooltip: 'Editar nombre de usuario',
              onChange: (val: string) => {
                const trimmed = (val ?? '').trim();
                if (trimmed && trimmed !== username) {
                  updateUsername({ id: record.id, username: trimmed });
                }
              },
            }}
          >
            {username}
          </Text>
        ) : (
          <Text strong>{username}</Text>
        ),
    },
    {
      title:     'Email',
      dataIndex: 'email',
      key:       'email',
      render: (email: string | null, record: UserResponse) =>
        canEdit ? (
          <Text
            editable={{
              tooltip: 'Editar email',
              onChange: (val: string) => {
                const trimmed = (val ?? '').trim();
                // Si borra el email lo mandamos como null
                const newEmail = trimmed || null;
                if (newEmail !== email) {
                  updateEmail({ id: record.id, email: newEmail });
                }
              },
            }}
          >
            {email ?? ''}
          </Text>
        ) : (
          email ? <Text>{email}</Text> : <Text type="secondary">—</Text>
        ),
    },
    {
      title:     'Estado',
      dataIndex: 'is_active',
      key:       'is_active',
      width:     100,
      render: (active: boolean) =>
        active
          ? <Tag color="success">Activo</Tag>
          : <Tag color="default">Inactivo</Tag>,
    },
    // Columna de rol — solo si puede asignar roles
    ...(canAssignRoles ? [{
      title:  'Rol asignado',
      key:    'custom_role_id',
      width:  200,
      render: (_: any, record: UserResponse) => (
        <Select
          style={{ width: '100%' }}
          placeholder="Sin rol"
          value={record.custom_role_id ?? undefined}
          allowClear
          onChange={(value) =>
            assignRole({ id: record.id, data: { custom_role_id: value ?? null } })
          }
          options={roles.map((r) => ({ value: r.id, label: r.name }))}
        />
      ),
    }] : [{
      title:  'Rol asignado',
      key:    'custom_role_id',
      width:  200,
      render: (_: any, record: UserResponse) => {
        const roleName = roles.find((r) => r.id === record.custom_role_id)?.name;
        return roleName
          ? <Tag color="blue">{roleName}</Tag>
          : <Text type="secondary">Sin rol</Text>;
      },
    }]),
    // Columna acciones — solo si tiene algún permiso de acción
    ...((canEdit || canDelete) ? [{
      title:  'Acciones',
      key:    'actions',
      width:  120,
      render: (_: any, record: UserResponse) => (
        <Space>
          {/* Cambiar contraseña — solo con permiso de editar */}
          {canEdit && (
            <Tooltip title="Cambiar contraseña">
              <Button
                icon={<LockOutlined />}
                size="small"
                onClick={() => openPasswordModal(record)}
              />
            </Tooltip>
          )}

          {/* Activar/desactivar — solo con permiso de eliminar */}
          {canDelete && (
            record.is_active ? (
              <Popconfirm
                title="¿Desactivar este empleado?"
                description="Perderá acceso al sistema inmediatamente."
                onConfirm={() => deactivate(record.id)}
                okText="Desactivar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Desactivar empleado">
                  <Button danger icon={<UserDeleteOutlined />} size="small" />
                </Tooltip>
              </Popconfirm>
            ) : (
              <Popconfirm
                title="¿Reactivar este empleado?"
                description="Recuperará acceso al sistema."
                onConfirm={() => activate(record.id)}
                okText="Reactivar"
                cancelText="Cancelar"
              >
                <Tooltip title="Reactivar empleado">
                  <Button
                    icon={<CheckCircleOutlined />}
                    size="small"
                    style={{ color: '#52c41a', borderColor: '#52c41a' }}
                  />
                </Tooltip>
              </Popconfirm>
            )
          )}
        </Space>
      ),
    }] : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Content style={{ padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Space>
            <TeamOutlined style={{ fontSize: 24, color: '#1677ff' }} />
            <Title level={3} style={{ margin: 0 }}>
              Gestión de Usuarios
            </Title>
          </Space>

          {/* Botón crear — solo si tiene permiso */}
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              Nuevo empleado
            </Button>
          )}
        </div>

        <Card>
          <Table
            dataSource={empleados}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            locale={{ emptyText: 'No hay empleados todavía.' }}
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        </Card>
      </Content>

      {/* Panel de roles — solo si puede ver roles */}
      {!rolesError && (
        <Sider
          width={380}
          theme="light"
          style={{
            padding:    24,
            borderLeft: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorBgContainer,
            overflowY:  'auto',
          }}
        >
          <Space style={{ marginBottom: 16 }}>
            <SafetyOutlined style={{ fontSize: 20, color: '#1677ff' }} />
            <Title level={4} style={{ margin: 0 }}>
              Roles y Permisos
            </Title>
          </Space>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Configurá qué puede hacer cada rol con los toggles.
            Hacé click en el nombre de un rol para renombrarlo.
          </Text>
          <Divider style={{ margin: '12px 0' }} />
          <RolesPanel />
        </Sider>
      )}

      {canCreate && (
        <ModalCreateUser
          open={createOpen}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {canEdit && (
        <ModalChangePassword
          open={passwordModal.open}
          onClose={closePasswordModal}
          empleado={passwordModal.empleado}
        />
      )}
    </Layout>
  );
};

export default UsuariosPage;