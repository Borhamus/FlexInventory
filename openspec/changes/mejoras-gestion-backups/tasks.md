## 1. Migración y modelo de datos

- [x] 1.1 Agregar columna `google_drive_root_folder_id` (String(255), nullable) a `Tenant` en `app/Core/models.py`, junto a los otros campos de Drive
- [x] 1.2 En `app/database_manager/migraciones.py`, agregar al bloque de `public` ya existente: `ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS google_drive_root_folder_id VARCHAR(255)`
- [ ] 1.3 Verificar contra una BD con tenants previos que la columna se agrega y que re-ejecutar `run_migrations()` no rompe nada

## 2. Resolución por ID: carpetas, imágenes y limpieza de IDs

- [x] 2.1 Implementar `_resolver_carpeta(access_token, id_cacheado, nombre, parent_id=None) -> str` en `app/database_manager/router.py`: verifica el ID con `GET /files/{id}?fields=id,trashed`, y si no sirve cae a `_get_or_create_folder`
- [x] 2.2 En `ejecutar_backup()`: resolver raíz y `backups` con `_resolver_carpeta` usando `tenant.google_drive_root_folder_id` y `tenant.google_drive_folder_id`, y persistir ambos IDs resueltos
- [x] 2.3 En `list_backups()`: usar la misma resolución, reemplazando las dos llamadas directas a `_get_or_create_folder`
- [x] 2.4 En `restore_from_drive_by_id()`: resolver la raíz con `_resolver_carpeta` y buscar `images.zip` por nombre dentro de ella (`name='images.zip' and '{root_id}' in parents and trashed=false`), usando `tenant.google_drive_images_file_id` solo como atajo cuando siga válido; si no aparece ningún `images.zip`, completar el restore informando que no había fotos (sin error)
- [x] 2.5 En `disconnect_drive()`: agregar `tenant.google_drive_images_file_id = None` y `tenant.google_drive_root_folder_id = None` a las columnas que ya se nulifican, para que reconectar otra cuenta no reutilice IDs viejos
- [x] 2.5b Implementar `_resolver_archivo(access_token, id_cacheado, name, folder_id) -> str | None` (simétrico a `_resolver_carpeta`, pero para archivos únicos): verifica el id cacheado, cae a búsqueda por nombre dentro de `folder_id`, y devuelve `None` si no existe (para que el llamador lo cree). Usarlo en `ejecutar_backup()` para `current.json` e `images.zip` antes de subir, y en `restore_from_drive_by_id()` en lugar del lookup inline. Evita que un id perdido cree un duplicado (bug observado: 4 `current.json` y 2 `images.zip` acumulados en Drive)
- [x] 2.5c Limpieza única de los duplicados ya existentes en el Drive del tenant: conservar la copia viva (el id cacheado, recién reescrito) y mandar el resto a la papelera de Drive (recuperable). Verificado: queda 1 `current.json` y 1 `images.zip`
- [x] 2.13 Verificar que un backup con el id cacheado de `current.json`/`images.zip` en NULL, pero con el archivo presente, actualiza el existente y NO crea una segunda copia (verificado contra el Drive real: con ambos ids en NULL, el conteo quedó en 4 y 2, sin crear copias nuevas)
- [ ] 2.6 Verificar el caso feliz: dos backups seguidos usan la misma carpeta y no crean duplicados
- [ ] 2.7 Verificar renombre: renombrar la carpeta raíz en Drive, ejecutar un backup y confirmar que usa la misma carpeta y que la lista sigue mostrando los backups anteriores
- [ ] 2.8 Verificar recuperación: mandar la carpeta raíz a la papelera, ejecutar un backup y confirmar que se recrea sin error
- [ ] 2.9 Verificar tenant sin IDs guardados (simulando `disconnect_drive`): resuelve por nombre y guarda los IDs
- [ ] 2.10 Verificar restore de fotos con `google_drive_images_file_id` en NULL pero con `images.zip` presente en Drive: las fotos se restauran (hoy no) e informa `fotos_restauradas: true`
- [ ] 2.11 Verificar restore de un tenant sin `images.zip`: el restore de datos se completa e informa que no había fotos, sin error
- [ ] 2.12 Verificar reconexión con otra cuenta de Google tras un `disconnect`: el backup no da 502 por PATCH sobre un `file_id` ajeno; resuelve/crea en la cuenta nueva

## 3. Etiqueta en el backup manual

- [x] 3.1 Implementar `_sanitizar_etiqueta(texto) -> str | None` en `router.py`: lista blanca `[A-Za-z0-9 _-]`, espacios a guiones bajos, truncado a 40 caracteres, `None` si queda vacía
- [x] 3.2 Agregar el parámetro `etiqueta: str | None = None` a `ejecutar_backup()` y componer el nombre como `backup_{ts}_{etiqueta}.json`, dejando `backup_{ts}.json` cuando no hay etiqueta
- [x] 3.3 Agregar el modelo `BackupRequest` (campo `etiqueta: Optional[str]`) y hacer que `POST /backup/now` acepte un cuerpo **opcional**, sin romper las llamadas sin cuerpo
- [x] 3.4 Confirmar que `scheduler.py` no necesita cambios y que los backups automáticos siguen usando el nombre por defecto
- [ ] 3.5 Verificar: con etiqueta, sin etiqueta, sin cuerpo, etiqueta con caracteres prohibidos, etiqueta que queda vacía al sanitizar, etiqueta larguísima
- [ ] 3.6 Verificar que restaurar un backup etiquetado funciona igual que uno con nombre por defecto

## 4. Frontend

- [x] 4.1 `api/database.service.ts`: `backupNow(etiqueta?: string)` envía el cuerpo solo cuando hay etiqueta
- [x] 4.2 `pages/DatabasePage.tsx`: modal previo al backup manual con un input opcional de etiqueta, texto que aclare que se puede dejar en blanco, y el nombre resultante en el mensaje de éxito
- [x] 4.3 `pages/DatabasePage.tsx`: aviso sobre la carpeta de almacenamiento, distinguiendo renombrar/mover (seguro) de eliminar o vaciar la papelera (destructivo)
- [ ] 4.4 Verificar el flujo completo en la UI: backup con y sin etiqueta, y que el nombre aparece en la lista de restauración

## 5. Verificación final

- [ ] 5.1 Confirmar que `POST /backup/now` sigue siendo llamable sin cuerpo (compatibilidad durante el despliegue)
- [x] 5.2 Confirmar que la etiqueta no aparece en ninguna consulta `q=` contra la API de Drive (verificado por inspección: solo se usa en `backup_name` → `metadata` de la subida, nunca en un `params={"q": ...}`)
- [x] 5.3 Confirmar que `current.json` e `images.zip` conservan sus nombres fijos: la etiqueta solo afecta a los `backup_FECHA.json`, no al archivo de imágenes, así que la búsqueda de `images.zip` por nombre sigue siendo estable
- [x] 5.4 Confirmar que `reset_database` NO cambia: sigue sin tocar `uploads/{tenant_schema}/` (los archivos en disco se dejan a propósito, ver Non-Goals)
- [x] 5.5 Correr el typecheck del frontend (`npx tsc -b`) y comprobar que no aparecen errores nuevos respecto de la rama base (los errores existentes son ajenos: `CatalogosLayout`, `useCatalogos`, `useUsuarios`, `CatalogDashboard`, `InventoryDashboard`, `routes.config`; ninguno en `DatabasePage`/`database.service`)
