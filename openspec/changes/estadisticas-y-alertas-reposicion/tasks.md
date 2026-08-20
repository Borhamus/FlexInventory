## 1. Migración y modelo de datos

- [ ] 1.1 Agregar columnas a `Inventario` en `app/tenant/models.py`: `atributo_reposicion` (String, nullable), `dias_aviso` (Integer, default 7), `atributo_proveedor` (String, nullable)
- [ ] 1.2 Crear modelo `Notificacion` en `app/tenant/models.py` (tabla `notificaciones` en TenantBase): id, tipo, titulo, mensaje, inventario_id, item_id, atributo, fecha_aviso, proveedor, leida (Boolean, default False), creado_en
- [ ] 1.3 Crear `app/database_manager/migraciones.py` con `run_migrations()`: por cada tenant activo, `create_all` con `schema_translate_map` (tabla `notificaciones`) + `ALTER TABLE inventario ADD COLUMN IF NOT EXISTS` para las 3 columnas
- [ ] 1.4 Invocar `run_migrations()` en el lifespan de `app/main.py` antes de `init_scheduler()`
- [ ] 1.5 Probar migración contra una BD con tenants previos (verificar columnas y tabla nuevas, idempotencia al re-ejecutar)

## 2. Estadísticas por inventario

- [ ] 2.1 Crear `app/tenant/estadisticas.py` con mapa de cast por tipo (`integer/int → ::int`, `float/number → ::float8`, `date → ::date`) y función que genera el SQL tipado (claves como parámetros enlazados `:key_n`)
- [ ] 2.2 Agregar schemas `AtributoStats` e `InventarioStatsResponse` en `app/tenant/schemas.py`
- [ ] 2.3 Implementar `GET /inventarios/{inventario_id}/stats` (permiso `inventarios:read`): promedio/suma/min/max/count por numérico; próxima/última fecha, count y días restantes por date; count por string/boolean; 404 si no existe; 400 informativo si un valor no castea
- [ ] 2.4 Registrar el router en `app/main.py`
- [ ] 2.5 Verificar el endpoint con un inventario poblado (promedios correctos, fecha próxima y días restantes, inventario inexistente, dato no convertible)

## 3. Configuración de reposición

- [ ] 3.1 Agregar schemas de config de reposición (`ReposicionConfig`, `ReposicionConfigUpdate`) en `app/tenant/schemas.py` e incluirlos en `InventarioResponse`
- [ ] 3.2 Implementar `PATCH /inventarios/{inventario_id}/reposicion` (permiso `inventarios:update`, dependency `Auditor`): valida que `atributo_reposicion` exista y sea `date`, `atributo_proveedor` exista y sea `string`, `dias_aviso` >= 1; 400 con detalle si falla; 404 si el inventario no existe
- [ ] 3.3 En `update_inventario` (inventarios.py): limpiar `atributo_reposicion`/`atributo_proveedor` cuando se elimina el atributo configurado
- [ ] 3.4 Verificar: config válida, atributo inexistente, tipo incorrecto, proveedor inválido, limpieza al eliminar el atributo

## 4. Alertas de reposición

- [ ] 4.1 Implementar `GET /inventarios/{inventario_id}/alertas?dias=N` (permiso `inventarios:read`): items con fecha de reposición entre hoy y hoy+N o vencidos, con días restantes y proveedor; inventario sin config → lista vacía; 404 si no existe
- [ ] 4.2 Verificar: item en ventana, item vencido (días negativos), item fuera de ventana, inventario sin config, item sin fecha

## 5. Notificaciones in-app y job diario

- [ ] 5.1 Crear `app/tenant/notificaciones.py` con `GET /notificaciones` (filtro leídas/pendientes, más recientes primero) y `PATCH /notificaciones/{id}` (marcar leída; 404 si no existe), permiso `inventarios:read`, `PATCH` con `Auditor`
- [ ] 5.2 Crear función compartida de cálculo de alertas (usada por `/alertas` y el job) que devuelva los items a reponer por inventario configurado
- [ ] 5.3 En `app/database_manager/scheduler.py`: job cron diario por tenant activo que genera notificaciones con dedupe (no duplicar notificación pendiente para el mismo item+fecha+tipo)
- [ ] 5.4 Registrar el router de notificaciones en `app/main.py`
- [ ] 5.5 Verificar: listar, filtrar pendientes, marcar leída, 404, idempotencia del job al correr dos veces, aislamiento entre tenants

## 6. Frontend

- [ ] 6.1 `api/inventory.service.ts`: agregar `getStats` y `configurarReposicion`; crear `api/notifications.service.ts` + hook de react-query
- [ ] 6.2 `ModalStatsInventory`: consumir `/stats` y mostrar métricas por atributo numérico y fechas próximas; botón desde `InventoryPage`
- [ ] 6.3 Config de reposición en `ModalEditInventory`: selector del atributo `date`, días de aviso, selector del atributo string proveedor
- [ ] 6.4 `NotificationBell` + panel: badge de pendientes, lista, marcar leída, link al inventario/item
- [ ] 6.5 Verificar flujo completo en la UI (stats, config, notificaciones)

## 7. Verificación final

- [ ] 7.1 Revisar que todos los endpoints respetan permisos y dependencias de `Auditor`
- [ ] 7.2 Probar el flujo end-to-end: inventario con datos → stats → config de reposición → job/alertas → notificación → marcar leída
- [ ] 7.3 Correr lint/typecheck del backend y frontend si el repo los define
