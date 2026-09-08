## Why

El módulo de backups a Drive (`app/database_manager/router.py`) funciona, pero tiene dos problemas de usabilidad que aparecen recién cuando el usuario convive con sus backups durante un tiempo:

1. **Todos los backups se llaman igual.** El nombre está hardcodeado como `backup_{timestamp}.json` (`router.py:569-570`). Después de veinte corridas, la lista de restauración es una pared de fechas: no hay forma de distinguir "el de antes de importar el catálogo nuevo" del backup automático de esa misma tarde. El usuario tiene que acordarse de la fecha exacta o restaurar a ciegas.

2. **Renombrar o mover la carpeta en Drive rompe el sistema en silencio.** `_get_or_create_folder` (`router.py:85-103`) localiza `FlexInventory Storage` y `backups` **por nombre**. Si el usuario las renombra, las mueve a otra ubicación o las reorganiza —cosa perfectamente razonable en su propio Drive—, el sistema no las encuentra, crea carpetas nuevas y vacías, y todos los backups anteriores quedan huérfanos. No hay error, no hay aviso: los backups siguen "funcionando" contra una carpeta distinta y el historial viejo desaparece de la lista.

3. **El restore de fotos falla en silencio.** `restore_from_drive_by_id` (`router.py:704`) decide si restaura las fotos leyendo `tenant.google_drive_images_file_id`, una columna que **solo escribe `ejecutar_backup`** y que queda en NULL tras un `disconnect` o antes del primer backup. Si el tenant tiene un `images.zip` en Drive pero la columna está vacía, el restore termina sin fotos y sin error: los items quedan con `Item.imagen` apuntando a archivos que no existen en disco. Es el mismo antipatrón que el punto 2 —confiar en un ID cacheado en vez de resolver por nombre— aplicado al archivo de imágenes (issue #30).

Los puntos 2 y 3 son la misma clase de bug: pérdida silenciosa provocada por confiar en un identificador cacheado que puede estar vacío o desactualizado. Resolverlos juntos permite construir la resolución robusta una sola vez y reutilizarla para carpetas y para `images.zip`.

## What Changes

- **Etiqueta opcional en el backup manual**: `POST /database/backup/now` acepta un cuerpo opcional con una etiqueta, y genera nombres del tipo `backup_2026-09-07_14-30_antes-de-importar.json`. Sin etiqueta, el nombre queda exactamente como hoy. Los backups automáticos del scheduler nunca llevan etiqueta.
- **Resolución de carpetas por ID en lugar de por nombre**: se cachea el ID de la carpeta raíz en el tenant (ya se cachea el de `backups`, pero no se usa para resolver) y se resuelve por ID, cayendo a la búsqueda por nombre solo si el ID dejó de ser válido. Renombrar o mover las carpetas en Drive pasa a ser inofensivo.
- **Restauración de fotos resuelta por nombre**: `restore_from_drive_by_id` deja de depender exclusivamente de `google_drive_images_file_id` y busca `images.zip` por nombre dentro de la carpeta raíz resuelta, usando el ID cacheado solo como atajo. Un restore con la columna en NULL pero con fotos en Drive deja de terminar sin fotos y sin error (issue #30).
- **Limpieza completa de IDs al desconectar**: `disconnect_drive` pasa a nulificar **todos** los identificadores de Drive del tenant —incluidos `google_drive_images_file_id` (hoy no lo limpia) y la columna raíz nueva—, para que reconectar otra cuenta de Google no reutilice IDs de la cuenta anterior (que hoy produce un 502 al hacer PATCH sobre un `file_id` ajeno, issue #30).
- **Unicidad de `current.json` e `images.zip`**: antes de subir estos archivos únicos, se resuelve su ID **por nombre** en la carpeta raíz (nuevo `_resolver_archivo`) y se actualiza el que exista, creando uno nuevo solo si no hay ninguno. Sin esto, cada backup que corría con el ID en NULL (primer backup, o un disconnect seguido de reconexión) hacía `POST` y creaba un duplicado — se observaron 4 `current.json` y 2 `images.zip` acumulados. Incluye una limpieza única de los duplicados ya existentes (a la papelera de Drive, recuperable).
- **Aviso en la UI**: la pantalla de base de datos explica qué carpeta usa el sistema y qué pasa si se la elimina, en vez de dejar al usuario descubrirlo.
- **Migración**: columna nueva en `public.tenants` para los tenants ya existentes, siguiendo el mecanismo idempotente que ya usa el proyecto.

## Capabilities

### New Capabilities

- `backups-nombre-personalizado`: etiqueta opcional definida por el usuario en el backup manual, sanitizada y combinada con el timestamp.
- `backups-carpetas-drive`: resolución robusta de las carpetas de Drive por ID, con recuperación automática cuando el ID deja de ser válido; resolución de `images.zip` por nombre en la restauración para que no falle en silencio; limpieza completa de los IDs cacheados al desconectar; y transparencia hacia el usuario sobre qué carpeta usa el sistema.

### Modified Capabilities

Ninguna: el módulo de backups no tenía specs previas en openspec.

## Impact

- **Backend**:
  - `app/Core/models.py`: columna `google_drive_root_folder_id` en `Tenant`.
  - `app/database_manager/migraciones.py`: `ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS` para la columna nueva (el bloque de `public` ya existe).
  - `app/database_manager/router.py`: `_resolver_carpeta()` nueva, `_resolver_archivo()` nueva (unicidad de `current.json`/`images.zip`), `ejecutar_backup()` acepta etiqueta y resuelve los archivos únicos por nombre, `_sanitizar_etiqueta()` nueva, `POST /backup/now` acepta cuerpo opcional, `list_backups()` usa la resolución por ID, `restore_from_drive_by_id()` resuelve `images.zip` por nombre vía `_resolver_archivo`, `disconnect_drive()` nulifica todos los IDs de Drive.
  - `app/database_manager/scheduler.py`: **sin cambios** — sigue llamando `ejecutar_backup(tenant, db)` y cae al comportamiento actual por el default del parámetro.
- **Frontend**: `pages/DatabasePage.tsx` (modal de etiqueta + aviso sobre la carpeta), `api/database.service.ts` (la etiqueta en `backupNow`).
- **API**: `POST /database/backup/now` pasa a aceptar un cuerpo opcional; sigue siendo válido llamarlo sin cuerpo.
- **Dependencias**: ninguna nueva.

## Non-Goals

- **Eliminar backups** (punto 3 de la issue #32): queda deliberadamente fuera de esta propuesta. Es la única operación destructiva del módulo y merece su propio ciclo, con la validación de pertenencia a la carpeta `backups` como requisito central — sin ella, un `file_id` arbitrario podría mandar `images.zip` a la papelera, que es la **única** copia de las fotos en Drive (se sobrescribe siempre, sin histórico: ver `router.py:547-550`).
- **Retención o rotación automática** ("conservar los últimos N"): depende de que exista el borrado.
- **Reparar instalaciones ya rotas**: si un usuario ya renombró la carpeta y el sistema creó una duplicada, esta propuesta evita que vuelva a pasar, pero no reunifica las carpetas existentes. Esa migración de datos, si hiciera falta, es un trabajo aparte.
- **Etiquetar backups automáticos**: el scheduler sigue usando el nombre por defecto.
- **Limpieza de fotos en disco al resetear** (issue #30, `reset_database`): queda fuera. `reset_database` borra los datos del tenant pero no toca `uploads/{tenant_schema}/`, y esos archivos se dejan a propósito: son las fotos que el usuario subió y que pudo haber descargado o querer conservar; borrarlas automáticamente sería destruir datos del usuario sin pedírselo. Si más adelante se quiere una limpieza, tiene que ser una acción explícita y opt-in, no un efecto colateral del reset.
- **Histórico de `images.zip`**: el archivo de imágenes se sigue pisando en cada backup (`router.py:547-550`), sin versión por fecha. Restaurar un backup viejo trae los datos de esa fecha pero las fotos del último backup. Es una decisión deliberada ya documentada; darle consistencia punto a punto (versionar el zip o guardar fotos por hash con recolección de basura) es un trabajo aparte (issue #30, limitación conocida).
