## Context

La aplicación ya almacena atributos de inventarios e items como JSONB en schemas por tenant (`app/tenant/models.py`): `inventario.atributos = {nombre: tipo}` define el schema y `item.atributos = {nombre: valor}` los datos. Se validó que la solución **no es volver a EAV**: Postgres 15 soporta operar el JSONB en el servidor con `->>`, casts tipados y agregados. El schema tipado del inventario es la metadata que habilita generarlo. Ver proposal.md - Why y las specs para el contrato de comportamiento.

Restricciones del entorno que condicionan el diseño:
- No hay Alembic; `create_tenant_schema` (db_config.py:66-90) solo crea tablas al registrar un tenant. Los tenants existentes necesitan migración.
- `Base.metadata.create_all` se ejecuta en startup (main.py:60) solo para `public`; las tablas de tenant no.
- APScheduler ya corre en el lifespan (scheduler.py) con el patrón de job por tenant.
- Los nombres de atributos vienen del schema del inventario (validators.py los normaliza con `.strip()`, pero pueden contener espacios/unicode), por lo que no deben interpolarse en SQL.

## Goals / Non-Goals

**Goals:**
- Calcular estadísticas por inventario con una sola operación de BD, generando SQL tipado desde `inventario.atributos`.
- Configurar la fecha de reposición por inventario y detectar items a reponer (próximos/vencidos) con proveedor.
- Entregar notificaciones in-app, aisladas por tenant, generadas por un job diario idempotente.
- Migración idempotente de schemas existentes (nuevas columnas + tabla `notificaciones`).

**Non-Goals:**
- No normalizar a tablas EAV ni agregar metadata por atributo (unidades, opciones, etc.).
- No envío de email/SMS (solo in-app).
- No filtros/orden/transformaciones masivas generales sobre atributos; eso queda fuera de esta propuesta.

## Decisions

### 1. Operar el JSONB en el servidor (sin EAV, sin deserializar en Python)
Las agregaciones se ejecutan en Postgres con `atributos->>:key` + cast según tipo (`::int`, `::float8`, `::date`, `::boolean`) y funciones `AVG/SUM/MIN/MAX/COUNT`. Los `COUNT(expr)` ignoran NULL, así los items sin el atributo quedan excluidos automáticamente. Esto cumple la spec "Cálculo eficiente sobre grandes volúmenes".
**Alternativa descartada:** deserializar los items en Python y agregar en memoria (N+1, no escala a cientos de items).

### 2. Claves de atributos siempre como parámetros enlazados
Los nombres de atributos se pasan como parámetros enlazados (el operador `->>` de jsonb acepta un texto como operando derecho: `atributos ->> :key`), nunca interpolados en el string SQL. Evita inyección SQL aun con claves que contienen espacios o unicode (validators.py:125-151). El módulo de estadísticas arma un dict de claves `:key_<n>` → valor real del schema.

### 3. Generación tipada desde el schema del inventario
Nuevo módulo `app/tenant/estadisticas.py` con mapa de cast `CASTS = {"integer": "::int", "int": "::int", "float": "::float8", "number": "::float8", "date": "::date"}`. Dado el schema, construye una sola query con un `SELECT` por atributo agregable. Errores de cast (datos viejos/extra) se capturan y devuelven como 400 informativo (spec: "Dato almacenado no convertible").

### 4. Config de reposición en columnas de `inventario`
Columnas nuevas en `models.py`: `atributo_reposicion VARCHAR`, `dias_aviso INTEGER DEFAULT 7`, `atributo_proveedor VARCHAR`. La fuente de verdad de los tipos sigue siendo `inventario.atributos`; la config solo referencia claves. Validación en el endpoint `PATCH /inventarios/{id}/reposicion`: el atributo debe existir y ser `date` (proveedor: existir y ser `string`).
**Alternativa descartada:** tabla separada de configuración — sobre-ingeniería para 3 campos que viven con el inventario.
Limpieza de referencias: en `update_inventario` (inventarios.py:121-142), cuando se quita un atributo, si coincide con `atributo_reposicion`/`atributo_proveedor` se limpia (spec: "Se elimina el atributo configurado").

### 5. Migración idempotente sin Alembic
Nuevo módulo `app/database_manager/migraciones.py` con `run_migrations()`: por cada tenant activo, con `schema_translate_map={None: schema}` ejecuta `TenantBase.metadata.create_all` (crea `notificaciones`) y `ALTER TABLE inventario ADD COLUMN IF NOT EXISTS ...` para las 3 columnas. Se invoca en el lifespan antes de `init_scheduler()`. Es idempotente y seguro para tenants nuevos y existentes.

### 6. Tabla `notificaciones` en el schema del tenant
`models.py`: `id, tipo, titulo, mensaje, inventario_id, item_id, atributo, fecha_aviso, proveedor, leida BOOLEAN, creado_en`. Al vivir en el schema del tenant, el aislamiento multitenant es automático (spec: "aisladas por tenant"). `inventario_id`/`item_id` se guardan sin FK a tablas de tenant para no interferir con el CASCADE de borrado de items (las notificaciones históricas sobreviven a la eliminación del item).
Dedupe por "pendiente": antes de insertar se consulta si ya existe una notificación pendiente (`leida=false`) para el mismo `(inventario_id, item_id, fecha_aviso, tipo)`. No se usa constraint único para no impedir re-notificar luego de marcarla como leída.

### 7. Job diario de reposición en APScheduler
Se extiende `scheduler.py` con el mismo patrón del backup (scheduler.py:25-74): `_run_reposicion_jobs_for_tenant(tenant_id)` abre su propia sesión, itera los inventarios configurados del tenant, calcula los items a reponer y crea notificaciones con dedupe. Se registra un job cron diario por tenant activo junto a los de backup. Así la generación ocurre aunque nadie esté usando la app.

### 8. Endpoints y ubicación
- `GET /inventarios/{inventario_id}/stats` → en `app/tenant/estadisticas.py` (router propio), permiso `inventarios:read`.
- `PATCH /inventarios/{inventario_id}/reposicion` → en `inventarios.py`, permiso `inventarios:update`, con dependency `Auditor`.
- `GET /inventarios/{inventario_id}/alertas?dias=N` → en `estadisticas.py` o `alertas.py`, permiso `inventarios:read`. Reutiliza la lógica del job para cálculo.
- `GET /notificaciones`, `PATCH /notificaciones/{id}` → router `app/tenant/notificaciones.py`, permiso `inventarios:read` (marcar leída es housekeeping de lectura). `PATCH` con dependency `Auditor`.
- Rutas registradas en `main.py`; schemas nuevos en `app/tenant/schemas.py`.

### 9. Frontend
- `api/inventory.service.ts`: `getStats`, `configurarReposicion`. Nuevo `api/notifications.service.ts` + hook.
- `ModalStatsInventory`: consume `/stats` y muestra métricas por atributo.
- Config de reposición: sección en `ModalEditInventory` (selector del atributo date, días de aviso, selector del atributo string proveedor).
- `NotificationBell` + panel (drawer) en el layout: lista, badge de pendientes, marcar leída, link al inventario.
- Reutiliza patrones existentes (Antd, react-query en hooks, `inventory.service.ts`).

## Risks / Trade-offs

- **[Cast falla por datos viejos/extra]** → Se captura y responde 400 con el atributo y valor problemático (spec lo exige); los items extra sin tipo (validators.py:276-280) quedan fuera de las operaciones.
- **[Config apunta a un atributo luego eliminado/renombrado]** → Limpieza en `update_inventario` al remover claves; validación estricta en el `PATCH` de reposición.
- **[Migración sobre schemas existentes sin Alembic]** → DDL idempotente (`ADD COLUMN IF NOT EXISTS`, `create_all`); probar contra una BD con tenants previos antes de liberar.
- **[Estado de leído compartido por todo el tenant]** → Para MVP el flag `leida` es del tenant, no por usuario. Aceptable; ver Open Questions.
- **[Crecimiento del job diario por tenant]** → Despreciable (un job cron por tenant activo).

## Migration Plan

1. `run_migrations()` en el startup (antes del scheduler): crea `notificaciones` y las 3 columnas en los schemas existentes. Idempotente; se puede correr en cualquier momento como script.
2. Rollback: la feature es aditiva (columnas nullable, tabla nueva, endpoints nuevos). Eliminar el job y los endpoints deja el sistema como antes; los datos de `notificaciones` se pueden descartar sin afectar inventarios/items.

## Open Questions

- Resuelto: el estado "leída" es **compartido por todo el tenant** (sin `user_id`; el `PATCH /notificaciones/{id}` no requiere contexto de usuario). Decisión de negocio confirmada con el usuario.
