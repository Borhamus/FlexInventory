## Context

El módulo de backups sube tres archivos al Drive del tenant (`router.py:538-587`):

```
FlexInventory Storage/
├── current.json              ← siempre el más reciente, se sobrescribe por file_id
├── images.zip                ← fotos de items, se sobrescribe por file_id, SIN histórico
└── backups/
    └── backup_{ts}.json      ← histórico, uno nuevo por corrida
```

El tenant ya cachea tres IDs de Drive en `public.tenants` (`app/Core/models.py`): `google_drive_file_id` (current.json), `google_drive_images_file_id` (images.zip) y `google_drive_folder_id` (la carpeta `backups`).

Restricciones del entorno que condicionan el diseño:

- **Los archivos se resuelven por ID, pero las carpetas por nombre.** Esa asimetría es la causa del bug: `current.json` e `images.zip` sobreviven a un renombre (se re-suben por `file_id`, lo que además les restaura el nombre), pero las carpetas no.
- **`google_drive_folder_id` se guarda pero nunca se usa para resolver.** Tanto `ejecutar_backup` (`router.py:556-557`) como `list_backups` (`router.py:626-627`) llaman a `_get_or_create_folder` incondicionalmente. El campo se escribe y se lee para el frontend, pero no participa de la resolución.
- **No hay Alembic.** Las columnas nuevas necesitan un `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` en `migraciones.py`. La tabla `tenants` vive en `public`, y ese bloque ya existe en `run_migrations()`.
- **El scope OAuth es `drive.file`**: la app solo ve y toca archivos que ella misma creó. Eso acota el radio de cualquier error, pero no protege a `images.zip` de la propia app.
- **`_get_or_create_folder` interpola el nombre en la query de Drive sin escapar** (`router.py:88`: `name='{name}'`). Hoy solo recibe las constantes `"FlexInventory Storage"` y `"backups"`, así que no es explotable, pero condiciona por dónde puede circular un texto escrito por el usuario.

## Goals / Non-Goals

**Goals:**

- Que renombrar o mover las carpetas de FlexInventory en Drive sea inofensivo.
- Que el sistema se recupere solo si el ID cacheado deja de ser válido (carpeta borrada, Drive reconectado, tenant migrado), sin intervención del usuario.
- Que el usuario pueda ponerle un nombre reconocible a un backup manual, sin perder el orden cronológico ni la unicidad.
- Que el restore de fotos no dependa de un ID cacheado que puede estar en NULL, y que no falle en silencio dejando items con imágenes rotas (issue #30).
- Que desconectar Drive deje al tenant en un estado limpio, sin IDs de la cuenta anterior que rompan una reconexión con otra cuenta (issue #30).
- Que el usuario entienda desde la UI qué carpeta usa el sistema y qué es seguro hacer con ella.

**Non-Goals:**

- No se implementa el borrado de backups (issue #32 punto 3) ni la rotación automática. Ver `proposal.md` → Non-Goals.
- No se reunifican carpetas duplicadas por un renombre anterior.
- No se cambia el formato ni el contenido del backup: sigue siendo el mismo JSON.
- No se etiquetan los backups automáticos.
- No se limpian las fotos en disco al resetear (issue #30, `reset_database`): los archivos de `uploads/{tenant_schema}/` se dejan a propósito, porque son datos que el usuario subió y pudo haber descargado. Ver `proposal.md` → Non-Goals.
- No se versiona `images.zip`: sigue sin histórico, se pisa en cada backup (`router.py:547-550`).

## Decisions

### 1. Resolver carpetas por ID cacheado, con fallback por nombre

Nueva función `_resolver_carpeta(access_token, id_cacheado, nombre, parent_id=None) -> str`:

1. Si hay `id_cacheado`, verificarlo con `GET /files/{id}?fields=id,trashed`. Si responde 200 y no está en la papelera, usarlo.
2. Si no hay ID, o el ID ya no sirve, caer a `_get_or_create_folder` (búsqueda por nombre, y creación si no existe).
3. Devolver el ID resuelto para que el llamador lo persista.

Un renombre no cambia el ID de un archivo en Drive, así que el paso 1 sobrevive al caso que hoy rompe. Mover la carpeta tampoco cambia el ID, así que también queda cubierto.

**Alternativa descartada:** usar el ID cacheado sin verificarlo y capturar el 404 recién cuando falla la subida. Ahorra una llamada a Drive en el camino feliz, pero obliga a envolver en manejo de errores cada punto que usa el ID (dos subidas de archivo y dos listados), y a distinguir un 404 de carpeta de un 404 de archivo. Una llamada `GET` extra sobre las cinco o seis que ya hace un backup no justifica esa complejidad.

**Alternativa descartada:** guardar la ruta completa y recorrerla. Drive no tiene rutas, tiene grafos de padres; reconstruirla sería más frágil que el ID.

### 2. Cachear también el ID de la carpeta raíz

`google_drive_folder_id` (carpeta `backups`) ya existe; falta el equivalente de la raíz. Columna nueva `google_drive_root_folder_id VARCHAR(255) NULL` en `Tenant`, con el mismo tratamiento que las demás: se escribe al final de cada backup y de cada listado, cuando el Drive ya está resuelto.

La raíz es la que más importa: `backups` se busca **dentro** de la raíz (`parent_id`), así que si la raíz se resuelve mal, `backups` se resuelve mal en cascada aunque su propio ID esté bien.

**Alternativa descartada:** una tabla `drive_config` por tenant. Sobre-ingeniería para una cuarta columna que vive con las otras tres.

### 3. La etiqueta se sanitiza con lista blanca, no con lista negra

`_sanitizar_etiqueta(texto) -> str | None`:

- Se queda solo con `[A-Za-z0-9 _-]`, descartando todo lo demás (incluidas comillas, barras, saltos de línea y unicode).
- Colapsa espacios en guiones bajos y recorta a 40 caracteres.
- Si no queda nada, devuelve `None` y el backup usa el nombre por defecto.

Lista blanca y no lista negra: la issue sugiere "quitar `/`, comillas, etc.", pero enumerar lo prohibido siempre deja algo afuera. Acá el conjunto seguro es chico y conocido, así que conviene definirlo por lo que entra.

El nombre final es `backup_{ts}_{etiqueta}.json`, con el timestamp **siempre adelante**: mantiene la unicidad, el orden alfabético sigue coincidiendo con el cronológico, y el prefijo `backup_` sigue identificando el archivo.

**La etiqueta nunca llega a una query de Drive.** Solo se usa como nombre en el `metadata` de la subida, que viaja como JSON, no interpolado en un `q=`. La sanitización es defensa en profundidad, no la única barrera.

### 4. La etiqueta es un parámetro con default, no una firma nueva

`ejecutar_backup(tenant, db, etiqueta: str | None = None)`. El scheduler (`scheduler.py`) la llama sin el tercer argumento y sigue produciendo exactamente el nombre de hoy, sin tocar ese archivo. Es la misma razón por la que `ejecutar_backup` existe: una sola implementación compartida entre el job y el endpoint manual.

`POST /backup/now` pasa a aceptar un cuerpo opcional (`BackupRequest` con `etiqueta: Optional[str]`), siguiendo el patrón de `BackupConfig` que el módulo ya usa. Llamarlo sin cuerpo tiene que seguir funcionando: el frontend actual lo hace así y no debería romperse durante el despliegue.

### 5. El aviso de la UI describe el mecanismo, no prohíbe

La pantalla ya menciona la carpeta (`DatabasePage.tsx:248`). Con el fix de la decisión 1, renombrar y mover pasan a ser seguros, así que el aviso **no** debe decir "no la renombres": sería mentira y envejecería mal. Lo que sí sigue siendo destructivo es **eliminar** la carpeta o vaciar la papelera de Drive, porque ahí desaparecen los archivos de verdad. El texto tiene que decir eso.

### 6. El restore resuelve `images.zip` por nombre, simétrico a las carpetas

`restore_from_drive_by_id` (`router.py:704`) hoy gatea la restauración de fotos con `if tenant.google_drive_images_file_id:`. Esa columna solo la escribe `ejecutar_backup` y queda en NULL antes del primer backup o tras un `disconnect`, así que un restore con fotos presentes en Drive puede terminar sin fotos y sin error.

El fix es el mismo patrón de la decisión 1: resolver la carpeta raíz con `_resolver_carpeta`, buscar `images.zip` por nombre dentro de ella (`name='images.zip' and '{root_id}' in parents and trashed=false`, mismo criterio que `list_backups` usa para `current.json`), y usar `google_drive_images_file_id` solo como atajo cuando siga siendo válido. Si no aparece ningún `images.zip`, el restore se completa igual e informa que no había fotos —eso no es un error—.

Reutiliza la infraestructura que esta propuesta ya construye para las carpetas (`_resolver_carpeta` + raíz cacheada); hacerlo aparte obligaría a reconstruir la resolución de la raíz solo para el restore.

**La etiqueta del punto de nombre personalizado no afecta esto**: `images.zip` conserva su nombre fijo, así que la búsqueda por nombre es estable.

### 7. `disconnect_drive` limpia todos los IDs cacheados

Hoy `disconnect_drive` (`router.py:776-783`) nulifica `google_refresh_token`, `google_drive_file_id` y `google_drive_folder_id`, pero **no** `google_drive_images_file_id`. Si el usuario reconecta con otra cuenta de Google, el próximo backup hace PATCH sobre un `file_id` de imágenes de la cuenta anterior y devuelve 502 (issue #30).

Se agrega a esa función el `= None` de `google_drive_images_file_id` y de la columna raíz nueva `google_drive_root_folder_id`. Con las cinco columnas en NULL, la reconexión resuelve todo por nombre en la cuenta nueva (decisiones 1, 6 y 8) y crea lo que falte. Es una línea por columna, en el único lugar que ya existe para esto.

### 8. `current.json` e `images.zip` se resuelven por nombre antes de subir (unicidad)

`_upload_to_drive` / `_upload_bytes_to_drive` hacen `PATCH` (actualizar en el lugar) solo si reciben un `file_id`; con `file_id` en NULL hacen `POST` y **crean** el archivo. Como `current.json` e `images.zip` son archivos únicos —no histórico—, cada backup que corría con el id perdido dejaba un duplicado. Se observó en producción: 4 `current.json` y 2 `images.zip` en la misma carpeta. `list_backups` los lista por nombre y toma `files[0]` **sin** `orderBy`, así que "Actual (current.json)" podía incluso apuntar a una copia vieja.

Nuevo `_resolver_archivo(access_token, id_cacheado, name, folder_id) -> str | None`, simétrico a `_resolver_carpeta` pero para archivos: verifica el id cacheado, cae a búsqueda por nombre dentro de la carpeta, y devuelve `None` si no existe (para que el llamador cree con `POST`). `ejecutar_backup` lo usa para ambos archivos antes de subir, y `restore_from_drive_by_id` lo reutiliza en lugar de su lookup inline.

Esto además **cancela la tensión de la decisión 7**: nulificar `google_drive_images_file_id` en el disconnect ya no puede duplicar el `images.zip` al reconectar la misma cuenta, porque la subida lo encuentra por nombre y lo actualiza en vez de crear otro. El id cacheado pasa a ser un atajo, no una dependencia.

**Limpieza de los duplicados ya existentes**: el fix evita duplicados nuevos pero no borra los que ya están. Se hace una limpieza única sobre el Drive del tenant afectado —conservar la copia viva (el id cacheado, recién reescrito) y mandar el resto a la papelera de Drive (recuperable, no borrado permanente)—. No se automatiza una rutina de deduplicación: con el fix, el caso no se vuelve a producir.

## Risks

- **Un ID cacheado que apunta a una carpeta ajena.** Si un tenant restaura una copia de la base de datos de otro entorno, podría heredar IDs de un Drive distinto. El scope `drive.file` hace que la verificación falle (la app no ve archivos que no creó en esa cuenta) y el fallback por nombre resuelve el caso. No requiere trabajo extra, pero conviene verificarlo al probar.
- **Etiquetas que colisionan.** Dos backups con la misma etiqueta en el mismo minuto producirían el mismo nombre. Drive permite nombres duplicados y cada archivo conserva su `file_id` propio, así que la restauración sigue siendo inequívoca; solo se ve raro en la lista. No se agrega deduplicación.
- **La llamada extra de verificación puede fallar por red.** Si `GET /files/{id}` devuelve un error transitorio (5xx), el fallback crearía o buscaría por nombre innecesariamente. El resultado sigue siendo correcto (encuentra la carpeta por nombre); solo se pierde el beneficio esa vez.
- **`images.zip` sin histórico al restaurar un backup viejo.** Con el restore resuelto por nombre, restaurar un `backup_FECHA.json` antiguo trae siempre el `images.zip` más reciente (el único que hay), no el que correspondía a esa fecha; peor aún, los uuid que cambiaron o se borraron después ya no están, así que esos items quedan con la imagen rota. No es una regresión de esta propuesta —ya pasaba con el ID cacheado—, pero ahora que el restore de fotos es confiable el desfase se va a notar más. Darle consistencia punto a punto (almacén de fotos acumulativo) es un change aparte: **issue #30**. Como red de seguridad interina, esta propuesta puede nulificar `Item.imagen` de los items cuyo uuid no aparezca en el `images.zip` y avisar cuántas fotos no se restauraron, para que el restore no deje imágenes rotas silenciosas — ver la decisión de scope pendiente.
