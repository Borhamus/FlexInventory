## Why

Los atributos de los inventarios se guardan como JSONB (`inventario.atributos` define el schema `{nombre: tipo}`, `item.atributos` los valores), pero esos datos son hoy inertes: solo se muestran como columnas en la tabla. Se quiere que los datos de los atributos tengan utilidad real: calcular promedios/media sobre atributos numéricos y que las fechas sirvan para algo (avisar cuándo reponer stock o contactar a un proveedor).

## What Changes

- **Estadísticas por inventario**: nuevo endpoint `GET /inventarios/{inventario_id}/stats` que, usando el schema tipado del inventario, devuelve agregaciones por atributo: promedio, suma, min y max para numéricos (int/float); próxima y última fecha (más días restantes) para atributos `date`.
- **Config de reposición por inventario**: se puede marcar qué atributo `date` del inventario es la "fecha de reposición", cuántos días de aviso (default 7) y qué atributo string es el "proveedor". Validación de que los atributos existan y sean del tipo correcto.
- **Alertas de reposición in-app**: endpoint que lista los items a reponer (fecha dentro de N días o vencida) con su proveedor, tabla `notificaciones` por tenant, endpoints para listarlas/marcarlas como leídas y job diario de APScheduler que las genera.
- **Migración de schemas existentes**: como no hay Alembic y las tablas de tenant solo se crean al registrar, se agrega un paso de migración en el startup (nuevas columnas en `inventario` + tabla `notificaciones`) para tenants ya existentes.
- **Frontend**: modal de estadísticas en la página del inventario, configuración de reposición en la edición del inventario y campanita con panel de notificaciones.

## Capabilities

### New Capabilities

- `estadisticas-inventario`: cálculo de estadísticas (promedio, suma, min, max, fechas próximas) por inventario, a partir del schema tipado de sus atributos.
- `alertas-reposicion`: configuración de la fecha de reposición por inventario, detección de items a reponer (próximos/vencidos) con proveedor, y notificaciones in-app.

### Modified Capabilities

## Impact

- **Backend**:
  - `app/tenant/models.py`: nuevas columnas en `inventario` (`atributo_reposicion`, `dias_aviso`, `atributo_proveedor`) y nueva tabla `notificaciones`.
  - `app/tenant/schemas.py`: schemas para stats, config de reposición y notificaciones.
  - `app/tenant/estadisticas.py` (nuevo): generación de SQL tipado sobre JSONB (`->>` + casts según tipo).
  - `app/tenant/alertas.py` (nuevo) o rutas en `inventarios.py`/`items.py`: endpoints `/stats`, `/reposicion`, `/alertas`, `/notificaciones`.
  - `app/tenant/inventarios.py`: limpiar la config de reposición si se elimina/renombra el atributo configurado.
  - `app/database_manager/migraciones.py` (nuevo): migración por tenant existente.
  - `app/database_manager/scheduler.py`: job diario de alertas de reposición.
  - `app/main.py`: registrar routers y paso de migración en el lifespan.
- **Frontend**: `InventoryPage`, `ModalEditInventory` (o modal dedicado), nuevo componente de notificaciones, `api/inventory.service.ts` (y un `notifications.service.ts`).
- **API**: nuevos endpoints documentados en FastAPI.
- **Dependencias**: ninguna nueva (Postgres 15 ya soporta todo lo necesario).
