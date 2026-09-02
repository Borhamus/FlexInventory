# Backup a Google Drive: fotos + fix de un bug real

Dos pedidos que terminaron tocando el mismo código
(`app/database_manager/router.py`): que el backup incluya las fotos de los
items, y revisar un bug que un compañero del equipo había reportado sobre
el botón de restaurar.

## 1. Que el backup incluya las fotos

### El problema

El backup a Drive ya existía (JSON con inventarios/items/catálogos, subido
manual o automáticamente vía `POST /database/backup/now` y el scheduler).
Pero las fotos de los items viven como archivos en disco
(`uploads/{tenant_schema}/`, ver `DOC/Fotos_Items.md`) — ese JSON nunca las
tocaba. Restaurar un backup dejaba `Item.imagen` apuntando a una URL cuyo
archivo podía no existir.

### La solución

Se reusa el mismo Drive que ya usa el proyecto — no una integración nueva:
- `_zip_carpeta_imagenes(tenant_schema)`: comprime toda la carpeta de fotos
  del tenant en un `.zip` en memoria (`zipfile` + `io.BytesIO`). Devuelve
  `None` si no hay ninguna foto — no tiene sentido subir un zip vacío.
- `_upload_bytes_to_drive()` / `_download_bytes_from_drive()`: la función
  que ya existía (`_upload_to_drive`) arma el multipart como **string** y
  lo encodea al final — funciona para JSON (texto), pero no para bytes de
  un zip (no son texto UTF-8 válido). Estas son el equivalente en bytes
  desde el principio, mismo protocolo de Drive.
- El zip se sube como `images.zip`, en la carpeta raíz de Drive, al lado de
  `current.json`. **Sin historial** (a diferencia de `current.json`, que sí
  guarda una copia con timestamp en cada backup) — las fotos cambian mucho
  menos seguido que los datos, no tiene sentido duplicar 50 fotos iguales
  cada vez que se actualiza un precio. Se guarda su `file_id` en
  `Tenant.google_drive_images_file_id` (columna nueva) para actualizar en
  vez de duplicar, igual que ya se hace con `current.json`.
- Al restaurar, si el tenant tiene un `images.zip` guardado, se baja y se
  descomprime sobre `uploads/{tenant_schema}/` — reemplazando lo que
  hubiera antes (un restore es "volver a este estado exacto", no un merge).
  Protegido contra zip-slip (path traversal) antes de extraer, mismo
  criterio de "defensa en profundidad" que ya usa `eliminar_imagen()` en
  `app/tenant/imagenes.py`.

### Refactor de paso: se eliminó una duplicación real

`backup_now` (el endpoint manual) y `_run_backup_for_tenant` (el job del
scheduler) tenían la MISMA lógica de armar carpetas, subir `current.json` y
el backup con timestamp, escrita dos veces. Se extrajo a
`ejecutar_backup(tenant, db)` en `router.py`, que ambos llaman — así el
paso nuevo de fotos se agregó en un solo lugar, no en dos.

### Un segundo gap encontrado en la propia verificación (no estaba en el pedido original, pero rompía todo si no se arreglaba)

Verificando el ciclo completo se encontró que `export_tenant_data()` /
`restore_tenant_data()` (el JSON de datos) **tampoco** incluían
`roles_atributos`, `bloques_personalizados` y `fotos_habilitadas` de los
inventarios, ni `imagen` de los items. Sin este fix, aunque el zip de fotos
se restaurara bien en el disco, la base de datos volvía a tener
`Item.imagen = NULL` para todos — el archivo existiría, pero ningún item lo
referenciaría (el bug inverso al que se estaba arreglando). Se agregaron
esos campos al export/import, con `.get(..., default)` para que restaurar
un backup viejo (hecho antes de este fix) no rompa — cae al mismo default
que usa la migración de esas columnas.

### Verificado end-to-end contra Drive real (no un mock)

Con el tenant real (Borhamus) ya conectado a Drive:
1. Backup manual → confirmado `images.zip` subido (`google_drive_images_file_id`
   se guardó) — con las 13 fotos reales de esa sesión.
2. Simulado un `Item.imagen = NULL` + archivo borrado del disco a mano →
   `POST /restore/{file_id}` → confirmado que **tanto** la referencia en la
   base **como** el archivo físico volvieron.
3. Repetido el ciclo completo con `roles_atributos`/`fotos_habilitadas`
   también borrados a mano → confirmado que vuelven igual.
4. En el medio se detectó (sin buscarlo) que un restore hecho con un
   backup **viejo** (de antes del fix de exportar `imagen`) sí borraba las
   referencias de la base, aunque el zip de fotos restaurara los archivos
   — confirmación en vivo del bug que motivó el punto anterior.

## 2. El bug que reportó el compañero: "hay que hacer un backup antes de poder restaurar"

### Diagnóstico (confirmado, no solo aceptado de palabra)

- `list_backups` (`GET /database/backup/list`) resolvía la carpeta de
  Drive usando `tenant.google_drive_file_id` / `google_drive_folder_id` —
  campos que **solo se escriben** dentro de `ejecutar_backup()` (backup
  manual o automático).
- `oauth_callback` (conectar Drive) solo guarda el `refresh_token`, nunca
  busca la carpeta.
- `disconnect_drive` los vuelve a `NULL`.
- Consecuencia: un tenant recién conectado (o que desconectó y reconectó)
  se queda con la lista de backups siempre vacía y el botón de restaurar
  deshabilitado, **aunque ya tenga backups viejos guardados en Drive de
  antes** — no hay forma de restaurar sin haber hecho un backup manual
  primero, ni siquiera para ver qué hay.

### Fix

- `list_backups` ahora resuelve la carpeta **buscándola por nombre** en
  Drive (`_get_or_create_folder`, el mismo mecanismo que ya usa
  `ejecutar_backup` para crearla) en vez de depender de los IDs cacheados
  en la tabla `tenants`. De paso, si encuentra resultados, sincroniza esos
  IDs en el tenant — así `ejecutar_backup`/`restore_from_drive_by_id`
  (que sí los usan para no duplicar archivos) quedan al día sin esperar al
  próximo backup manual.
- `DatabasePage.tsx`: el botón "Restaurar desde Drive" solo dependía de
  `driveConnected`, pero también exigía `status?.drive_file_id` — el mismo
  campo cacheado que causaba el bug. Se sacó esa segunda condición.

### Verificado reproduciendo el bug exacto

Con el tenant real: se pusieron `google_drive_file_id` y
`google_drive_folder_id` en `NULL` a mano (el estado exacto de "tenant
recién conectado"), y se llamó `GET /database/backup/list` — **antes** del
fix esto hubiera devuelto una lista vacía; con el fix encontró los 6
backups reales que ya existían en Drive (incluido `current.json`), y
resincronizó los IDs en la base automáticamente.

## 3. Aviso de "cargando" durante backup/restore

Pedido explícito del usuario, con una aclaración importante: no bloquear
al usuario con un modal — "lo que sea más simple, algo que se use mucho y
que sea protocolar". El backup y el restore ahora también mueven fotos
(pueden ser varios MB), así que sin ningún aviso una operación que tarda
unos segundos de más podía parecer "colgada".

Se usó `message.loading()` de Ant Design — el patrón estándar para esto
(un toast arriba-centro con spinner, no bloqueante), con `duration: 0`
para que no se cierre sola: se cierra a mano (`hide()`) cuando la
operación termina, éxito o error. Nada custom, mismo mecanismo que
`notification` ya usado en el resto de esta página.

Verificado con un delay artificial en la red (interceptando
`XMLHttpRequest`, ya que el proyecto usa axios y no `fetch`) para poder
capturar el toast con calma: aparece con el texto correcto apenas se
dispara la acción, y se cierra solo al terminar.

## Cambios

- **Backend**: `Tenant.google_drive_images_file_id` (columna nueva, en
  `app/Core/models.py` + migración aparte para la tabla `public.tenants`,
  distinta de la migración por-tenant); `app/database_manager/router.py`
  (`_upload_bytes_to_drive`, `_download_bytes_from_drive`,
  `_zip_carpeta_imagenes`, `_restaurar_imagenes_zip`, `ejecutar_backup`
  extraída de `backup_now`, `list_backups` reescrito, `export_tenant_data`/
  `restore_tenant_data` con los campos que faltaban); `scheduler.py`
  simplificado para usar `ejecutar_backup` en vez de duplicar la lógica.
- **Frontend**: `DatabasePage.tsx` (botón de restaurar sin la condición de
  más, `message.loading` en backup y restore).
