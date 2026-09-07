## 1. Migración y modelo de datos

- [ ] 1.1 Agregar columna `google_drive_root_folder_id` (String(255), nullable) a `Tenant` en `app/Core/models.py`, junto a los otros campos de Drive
- [ ] 1.2 En `app/database_manager/migraciones.py`, agregar al bloque de `public` ya existente: `ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS google_drive_root_folder_id VARCHAR(255)`
- [ ] 1.3 Verificar contra una BD con tenants previos que la columna se agrega y que re-ejecutar `run_migrations()` no rompe nada

## 2. Resolución de carpetas por ID

- [ ] 2.1 Implementar `_resolver_carpeta(access_token, id_cacheado, nombre, parent_id=None) -> str` en `app/database_manager/router.py`: verifica el ID con `GET /files/{id}?fields=id,trashed`, y si no sirve cae a `_get_or_create_folder`
- [ ] 2.2 En `ejecutar_backup()`: resolver raíz y `backups` con `_resolver_carpeta` usando `tenant.google_drive_root_folder_id` y `tenant.google_drive_folder_id`, y persistir ambos IDs resueltos
- [ ] 2.3 En `list_backups()`: usar la misma resolución, reemplazando las dos llamadas directas a `_get_or_create_folder`
- [ ] 2.4 Verificar el caso feliz: dos backups seguidos usan la misma carpeta y no crean duplicados
- [ ] 2.5 Verificar renombre: renombrar la carpeta raíz en Drive, ejecutar un backup y confirmar que usa la misma carpeta y que la lista sigue mostrando los backups anteriores
- [ ] 2.6 Verificar recuperación: mandar la carpeta raíz a la papelera, ejecutar un backup y confirmar que se recrea sin error
- [ ] 2.7 Verificar tenant sin IDs guardados (simulando `disconnect_drive`): resuelve por nombre y guarda los IDs

## 3. Etiqueta en el backup manual

- [ ] 3.1 Implementar `_sanitizar_etiqueta(texto) -> str | None` en `router.py`: lista blanca `[A-Za-z0-9 _-]`, espacios a guiones bajos, truncado a 40 caracteres, `None` si queda vacía
- [ ] 3.2 Agregar el parámetro `etiqueta: str | None = None` a `ejecutar_backup()` y componer el nombre como `backup_{ts}_{etiqueta}.json`, dejando `backup_{ts}.json` cuando no hay etiqueta
- [ ] 3.3 Agregar el modelo `BackupRequest` (campo `etiqueta: Optional[str]`) y hacer que `POST /backup/now` acepte un cuerpo **opcional**, sin romper las llamadas sin cuerpo
- [ ] 3.4 Confirmar que `scheduler.py` no necesita cambios y que los backups automáticos siguen usando el nombre por defecto
- [ ] 3.5 Verificar: con etiqueta, sin etiqueta, sin cuerpo, etiqueta con caracteres prohibidos, etiqueta que queda vacía al sanitizar, etiqueta larguísima
- [ ] 3.6 Verificar que restaurar un backup etiquetado funciona igual que uno con nombre por defecto

## 4. Frontend

- [ ] 4.1 `api/database.service.ts`: `backupNow(etiqueta?: string)` envía el cuerpo solo cuando hay etiqueta
- [ ] 4.2 `pages/DatabasePage.tsx`: modal previo al backup manual con un input opcional de etiqueta, texto que aclare que se puede dejar en blanco, y el nombre resultante en el mensaje de éxito
- [ ] 4.3 `pages/DatabasePage.tsx`: aviso sobre la carpeta de almacenamiento, distinguiendo renombrar/mover (seguro) de eliminar o vaciar la papelera (destructivo)
- [ ] 4.4 Verificar el flujo completo en la UI: backup con y sin etiqueta, y que el nombre aparece en la lista de restauración

## 5. Verificación final

- [ ] 5.1 Confirmar que `POST /backup/now` sigue siendo llamable sin cuerpo (compatibilidad durante el despliegue)
- [ ] 5.2 Confirmar que la etiqueta no aparece en ninguna consulta `q=` contra la API de Drive
- [ ] 5.3 Confirmar que `current.json` e `images.zip` conservan sus nombres fijos y que `images.zip` no se ve afectado por ningún cambio de esta propuesta
- [ ] 5.4 Correr el typecheck del frontend (`npx tsc -b`) y comprobar que no aparecen errores nuevos respecto de la rama base
