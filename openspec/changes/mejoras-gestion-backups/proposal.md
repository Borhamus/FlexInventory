## Why

El módulo de backups a Drive (`app/database_manager/router.py`) funciona, pero tiene dos problemas de usabilidad que aparecen recién cuando el usuario convive con sus backups durante un tiempo:

1. **Todos los backups se llaman igual.** El nombre está hardcodeado como `backup_{timestamp}.json` (`router.py:569-570`). Después de veinte corridas, la lista de restauración es una pared de fechas: no hay forma de distinguir "el de antes de importar el catálogo nuevo" del backup automático de esa misma tarde. El usuario tiene que acordarse de la fecha exacta o restaurar a ciegas.

2. **Renombrar o mover la carpeta en Drive rompe el sistema en silencio.** `_get_or_create_folder` (`router.py:85-103`) localiza `FlexInventory Storage` y `backups` **por nombre**. Si el usuario las renombra, las mueve a otra ubicación o las reorganiza —cosa perfectamente razonable en su propio Drive—, el sistema no las encuentra, crea carpetas nuevas y vacías, y todos los backups anteriores quedan huérfanos. No hay error, no hay aviso: los backups siguen "funcionando" contra una carpeta distinta y el historial viejo desaparece de la lista.

El punto 2 es el más grave de los dos: es pérdida silenciosa de acceso al historial, provocada por una acción que al usuario no le parece destructiva.

## What Changes

- **Etiqueta opcional en el backup manual**: `POST /database/backup/now` acepta un cuerpo opcional con una etiqueta, y genera nombres del tipo `backup_2026-09-07_14-30_antes-de-importar.json`. Sin etiqueta, el nombre queda exactamente como hoy. Los backups automáticos del scheduler nunca llevan etiqueta.
- **Resolución de carpetas por ID en lugar de por nombre**: se cachea el ID de la carpeta raíz en el tenant (ya se cachea el de `backups`, pero no se usa para resolver) y se resuelve por ID, cayendo a la búsqueda por nombre solo si el ID dejó de ser válido. Renombrar o mover las carpetas en Drive pasa a ser inofensivo.
- **Aviso en la UI**: la pantalla de base de datos explica qué carpeta usa el sistema y qué pasa si se la elimina, en vez de dejar al usuario descubrirlo.
- **Migración**: columna nueva en `public.tenants` para los tenants ya existentes, siguiendo el mecanismo idempotente que ya usa el proyecto.

## Capabilities

### New Capabilities

- `backups-nombre-personalizado`: etiqueta opcional definida por el usuario en el backup manual, sanitizada y combinada con el timestamp.
- `backups-carpetas-drive`: resolución robusta de las carpetas de Drive por ID, con recuperación automática cuando el ID deja de ser válido, y transparencia hacia el usuario sobre qué carpeta usa el sistema.

### Modified Capabilities

Ninguna: el módulo de backups no tenía specs previas en openspec.

## Impact

- **Backend**:
  - `app/Core/models.py`: columna `google_drive_root_folder_id` en `Tenant`.
  - `app/database_manager/migraciones.py`: `ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS` para la columna nueva (el bloque de `public` ya existe).
  - `app/database_manager/router.py`: `_resolver_carpeta()` nueva, `ejecutar_backup()` acepta etiqueta, `_sanitizar_etiqueta()` nueva, `POST /backup/now` acepta cuerpo opcional, `list_backups()` usa la resolución por ID.
  - `app/database_manager/scheduler.py`: **sin cambios** — sigue llamando `ejecutar_backup(tenant, db)` y cae al comportamiento actual por el default del parámetro.
- **Frontend**: `pages/DatabasePage.tsx` (modal de etiqueta + aviso sobre la carpeta), `api/database.service.ts` (la etiqueta en `backupNow`).
- **API**: `POST /database/backup/now` pasa a aceptar un cuerpo opcional; sigue siendo válido llamarlo sin cuerpo.
- **Dependencias**: ninguna nueva.

## Non-Goals

- **Eliminar backups** (punto 3 de la issue #32): queda deliberadamente fuera de esta propuesta. Es la única operación destructiva del módulo y merece su propio ciclo, con la validación de pertenencia a la carpeta `backups` como requisito central — sin ella, un `file_id` arbitrario podría mandar `images.zip` a la papelera, que es la **única** copia de las fotos en Drive (se sobrescribe siempre, sin histórico: ver `router.py:547-550`).
- **Retención o rotación automática** ("conservar los últimos N"): depende de que exista el borrado.
- **Reparar instalaciones ya rotas**: si un usuario ya renombró la carpeta y el sistema creó una duplicada, esta propuesta evita que vuelva a pasar, pero no reunifica las carpetas existentes. Esa migración de datos, si hiciera falta, es un trabajo aparte.
- **Etiquetar backups automáticos**: el scheduler sigue usando el nombre por defecto.
