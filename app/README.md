# FlexInventory — Backend API

API REST multi-tenant para gestión de inventarios, items y catálogos. Cada tenant opera con su propio schema aislado en PostgreSQL.

---

## Stack tecnológico

| Componente | Tecnología |
|------------|------------|
| Framework | FastAPI 0.128 |
| ORM | SQLAlchemy 2.0 |
| Base de datos | PostgreSQL 15 |
| Autenticación | JWT (python-jose) + bcrypt |
| Validación | Pydantic 2.12 |
| Servidor | Uvicorn |

---

## Arquitectura general

El sistema usa **aislamiento por schema de PostgreSQL**. Cada tenant tiene su propio schema con tablas independientes, todo dentro de una misma base de datos.

```
┌─────────────────────────────────────────────────┐
│                  Schema "public"                 │
│  ┌─────────┐  ┌──────┐  ┌────────────┐         │
│  │ tenants │──│ users│──│custom_roles │         │
│  └─────────┘  └──────┘  └────────────┘         │
│                       role_permissions           │
└─────────────────────────────────────────────────┘
          │                           │
          │  SET search_path          │  SET search_path
          ▼                           ▼
┌─────────────────────┐   ┌─────────────────────┐
│  Schema "tenant_A"  │   │  Schema "tenant_B"  │
│ ┌──────────┐        │   │ ┌──────────┐        │
│ │inventario│──┐     │   │ │inventario│──┐     │
│ └──────────┘  │     │   │ └──────────┘  │     │
│ ┌──────────┐  │     │   │ ┌──────────┐  │     │
│ │   item   │◄─┘     │   │ │   item   │◄─┘     │
│ └──────────┘        │   │ └──────────┘        │
│ ┌──────────┐        │   │ ┌──────────┐        │
│ │ catalogo │◄──N:N──┘   │ │ catalogo │◄──N:N──┘
│ └──────────┘        │   │ └──────────┘        │
└─────────────────────┘   └─────────────────────┘
```

### Flujo de autorización

1. El usuario hace login y recibe un **JWT** (expira en 30 min).
2. El JWT contiene: `sub` (username), `id`, `role`, `tenant_id`.
3. Se busca el tenant en `public` y se verifica que esté activo.
4. Se ejecuta `SET search_path TO tenant_xxx` para apuntar al schema correcto.
5. Se verifica el permiso: el **owner** (`role=tenant`) bypasea todo; los **empleados** necesitan un `custom_role` con el permiso `(resource, action)` en `role_permissions`.

### Patrón Factory para permisos

Cada endpoint se protege con una línea:

```python
def _perm(resource: str, action: str):
    return Depends(require_permission(resource, action))

# Uso en endpoint
@router.post("/")
def create(..., _: dict = _perm("inventarios", "create")):
    ...
```

---

## Estructura de archivos

```
app/
├── main.py              # Punto de entrada FastAPI, CORS, routers
├── db_config.py         # Engine, session, creación de schemas
├── __init__.py          # (vacío)
│
├── Core/                # Capa central (schema public)
│   ├── models.py        # Modelos: Tenant, Users, CustomRole, RolePermission
│   ├── schemas.py       # Schemas Pydantic para tenant, roles, empleados
│   ├── auth.py          # Login, JWT, endpoints de perfil propio
│   ├── endpoints.py     # CRUD de tenants (solo developer)
│   └── roles.py         # CRUD de roles y empleados
│
└── tenant/              # Capa de dominio del negocio
    ├── models.py        # Modelos: Inventario, Item, Catalogo (+ tabla N:N)
    ├── schemas.py       # Schemas Pydantic para inventarios, items, catálogos
    ├── dependencies.py  # JWT → tenant → sesión BD + verificación de permisos
    ├── validators.py    # Validación de tipos para atributos JSONB
    ├── inventarios.py   # Endpoints CRUD de inventarios
    ├── items.py         # Endpoints CRUD de items + bulk update
    └── catalogos.py     # Endpoints CRUD de catálogos + gestión de items
```

---

## Descripción de cada archivo

### `main.py`
Punto de entrada de la aplicación. Configura CORS para el frontend (localhost:5173), incluye los 6 routers, crea las tablas del schema public al iniciar, y expone un health check en `GET /`.

### `db_config.py`
Configuración de base de datos. Crea el engine con pool de conexiones (size=10, overflow=20). Define dos `declarative_base` separadas: `Base` para el schema public y `TenantBase` para los schemas de tenants. Expone `get_db()`, `get_tenant_db_context()` y `create_tenant_schema()`.

### `Core/models.py`
Modelos ORM del schema public. Define los enums `UserRole` (tenant/employee), `Resource` y `Action` para el sistema de permisos. Las tablas son: `tenants`, `users`, `custom_roles` y `role_permissions`.

### `Core/schemas.py`
Schemas Pydantic para la capa central. Define la estructura de request/response para tenants, roles, permisos, empleados, y operaciones de perfil (cambio de contraseña, username, email).

### `Core/auth.py`
Endpoints de autenticación y gestión de perfil propio. Maneja login con JWT (HS256, expira en 30 min), decodificación del token, y endpoints para consultar/editar el perfil del usuario autenticado. El endpoint `GET /auth/me/stats` devuelve estadísticas del dashboard.

### `Core/endpoints.py`
Endpoints de gestión de tenants, protegidos con header `X-Developer-Key`. Solo accesibles por desarrolladores. Permite crear, listar y consultar tenants. Al crear un tenant, se genera su schema y un usuario owner automáticamente.

### `Core/roles.py`
Endpoints de CRUD de roles personalizados y empleados. Los roles definen qué permisos tiene cada empleado. Reglas inamovibles: nadie puede tocar al owner, y nadie puede quitarse su propio rol o desactivarse a sí mismo.

### `tenant/models.py`
Modelos ORM de la capa de negocio. `Inventario` define la estructura de atributos (JSONB), `Item` almacena los valores concretos, y `Catalogo` es una colección de items de distintos inventarios (relación N:N a través de `catalogo_item`).

### `tenant/schemas.py`
Schemas Pydantic para inventarios, items y catálogos. Define Create, Update, Response y variantes con items anidados. También incluye schemas para operaciones masivas (`ItemBulkUpdate`).

### `tenant/dependencies.py`
Archivo más crítico de seguridad. Define el flujo completo: JWT → buscar tenant activo → verificar usuario activo → abrir sesión en schema del tenant → verificar permiso. La función `require_permission()` es un factory que retorna dependencias FastAPI.

### `tenant/validators.py`
Sistema de validación de tipos para atributos JSONB. Los inventarios definen esquemas tipados (ej: `{"color": "string", "peso": "float"}`) y este módulo valida que los items cumplan con esos tipos. Soporta: string, integer, float, boolean, date.

### `tenant/inventarios.py`
Endpoints CRUD de inventarios. Al actualizar atributos, detecta atributos eliminados (los borra de todos los items) y atributos nuevos (agrega valores por defecto a todos los items existentes).

### `tenant/items.py`
Endpoints CRUD de items más operación de bulk update. Al crear un item, valida sus atributos contra la definición de su inventario. El bulk update verifica que todos los items pertenezcan al mismo inventario.

### `tenant/catalogos.py`
Endpoints CRUD de catálogos. Permite agregar y quitar items individuales o en lote. Eliminar un catálogo no elimina sus items, solo los desvincula.

---

## Endpoints

### Auth (públicos)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/token` | Login con JSON body |
| POST | `/auth/token-form` | Login con form data (Swagger) |

### Auth (requiere JWT)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/auth/me` | Datos del JWT decodificado |
| GET | `/auth/me/profile` | Perfil completo de BD |
| PATCH | `/auth/me/username` | Cambiar username |
| PATCH | `/auth/me/password` | Cambiar contraseña (verifica la actual) |
| GET | `/auth/me/permissions` | Permisos del rol asignado |
| GET | `/auth/me/stats` | Estadísticas del dashboard |

### Tenants (requiere X-Developer-Key)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/tenants/` | Crear tenant + owner + schema BD |
| GET | `/tenants/` | Listar tenants (paginable) |
| GET | `/tenants/{id}` | Detalle de tenant |

### Roles (requiere permiso)
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | `/roles/` | roles:create | Crear rol |
| GET | `/roles/` | roles:read | Listar roles |
| GET | `/roles/{id}` | roles:read | Detalle rol |
| PUT | `/roles/{id}` | roles:update | Editar rol |
| DELETE | `/roles/{id}` | roles:delete | Eliminar rol |
| POST | `/roles/{id}/permissions` | roles:update | Agregar permiso |
| DELETE | `/roles/{id}/permissions` | roles:update | Quitar permiso |

### Empleados (requiere permiso)
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | `/empleados/` | empleados:create | Crear empleado |
| GET | `/empleados/` | empleados:read | Listar empleados |
| GET | `/empleados/{id}` | empleados:read | Detalle empleado |
| PUT | `/empleados/{id}` | empleados:update | Asignar/quitar rol |
| DELETE | `/empleados/{id}` | empleados:delete | Desactivar empleado |
| PATCH | `/empleados/{id}/password` | empleados:update | Cambiar contraseña |
| PATCH | `/empleados/{id}/activate` | empleados:update | Reactivar empleado |
| PATCH | `/empleados/{id}/username` | empleados:update | Cambiar username |
| PATCH | `/empleados/{id}/email` | empleados:update | Cambiar email |

### Inventarios (requiere permiso)
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | `/inventarios/` | inventarios:create | Crear inventario |
| GET | `/inventarios/all` | inventarios:read | Listar inventarios |
| GET | `/inventarios/{id}` | inventarios:read | Detalle con items |
| PUT | `/inventarios/{id}` | inventarios:update | Actualizar inventario |
| DELETE | `/inventarios/{id}` | inventarios:delete | Eliminar inventario + items |

### Items (requiere permiso)
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | `/items/` | items:create | Crear item |
| PATCH | `/items/bulk-update` | items:update | Actualización masiva |
| GET | `/items/` | items:read | Listar items (filtro por inventario_id) |
| GET | `/items/{id}` | items:read | Detalle item |
| PUT | `/items/{id}` | items:update | Actualizar item |
| DELETE | `/items/{id}` | items:delete | Eliminar item |

### Catálogos (requiere permiso)
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | `/catalogos/` | catalogos:create | Crear catálogo |
| GET | `/catalogos/` | catalogos:read | Listar catálogos (paginable) |
| GET | `/catalogos/{id}` | catalogos:read | Detalle con items |
| PUT | `/catalogos/{id}` | catalogos:update | Actualizar catálogo |
| DELETE | `/catalogos/{id}` | catalogos:delete | Eliminar catálogo |
| POST | `/catalogos/{id}/items` | catalogos:update | Agregar items |
| DELETE | `/catalogos/{id}/items/{item_id}` | catalogos:update | Quitar item |

---

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión a PostgreSQL |
| `DB_PORT` | Puerto de PostgreSQL (default: 5432) |
| `SECRET_KEY` | Clave secreta para firmar JWT (HS256) |
| `DEVELOPER_API_KEY` | API key para endpoints de tenant (header `X-Developer-Key`) |
