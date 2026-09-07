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
- Que el usuario entienda desde la UI qué carpeta usa el sistema y qué es seguro hacer con ella.

**Non-Goals:**

- No se implementa el borrado de backups (issue #32 punto 3) ni la rotación automática. Ver `proposal.md` → Non-Goals.
- No se reunifican carpetas duplicadas por un renombre anterior.
- No se cambia el formato ni el contenido del backup: sigue siendo el mismo JSON.
- No se etiquetan los backups automáticos.

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

## Risks

- **Un ID cacheado que apunta a una carpeta ajena.** Si un tenant restaura una copia de la base de datos de otro entorno, podría heredar IDs de un Drive distinto. El scope `drive.file` hace que la verificación falle (la app no ve archivos que no creó en esa cuenta) y el fallback por nombre resuelve el caso. No requiere trabajo extra, pero conviene verificarlo al probar.
- **Etiquetas que colisionan.** Dos backups con la misma etiqueta en el mismo minuto producirían el mismo nombre. Drive permite nombres duplicados y cada archivo conserva su `file_id` propio, así que la restauración sigue siendo inequívoca; solo se ve raro en la lista. No se agrega deduplicación.
- **La llamada extra de verificación puede fallar por red.** Si `GET /files/{id}` devuelve un error transitorio (5xx), el fallback crearía o buscaría por nombre innecesariamente. El resultado sigue siendo correcto (encuentra la carpeta por nombre); solo se pierde el beneficio esa vez.
