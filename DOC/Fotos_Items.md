# Fotos de items

Pedido del usuario: poder asociarle una foto a cada artículo, y verlas en la
vista de Catálogo — el caso de uso que lo disparó fue justamente el mazo de
Magic cargado en la sesión anterior ("me gusta la idea de que en catálogo se
puedan ver las cartas").

## La decisión de diseño central: dónde vive el archivo

Se analizaron cuatro opciones antes de tocar código (bytea en Postgres,
base64 en el JSONB de `atributos`, disco local, object storage tipo S3) —
ver la conversación para el detalle de cada tradeoff. Se descartó reusar la
integración con Google Drive que ya tiene el proyecto para backups
(`app/database_manager/router.py`): es una conexión OAuth **opcional, por
tenant**, y una feature core como "ver fotos en catálogo" no debería
depender de que el dueño del tenant haya conectado su Drive — además de que
pegarle a la API de Drive en cada foto de una grilla sería lento comparado
con servir un archivo local.

**Elegido: disco local del servidor**, con la ruta pública guardada en una
columna nueva (`Item.imagen`). Mismo criterio de simplicidad que el resto
del proyecto — se migra a un object storage el día que haga falta correr en
más de un servidor a la vez, no antes.

### Cómo se sirven, dado que este proyecto no usa cookies de sesión

El login guarda el access token **en memoria** (no en localStorage ni en
una cookie — ver `axios.config.ts`), así que un `<img src="...">` no puede
mandar el header `Authorization`. Dos opciones evaluadas con el usuario:
que el frontend arme la imagen a mano con `fetch` + blob URL (más código,
más "correcto" en términos de auth), o servir el archivo con una URL
**difícil de adivinar** (nombre random) y sin pedir login para verla.

Se eligió la segunda: cada foto se guarda con un nombre `uuid4` (nunca el
nombre original del archivo subido), servida directo por FastAPI vía
`StaticFiles` montado en `/uploads`. La URL nunca se expone salvo a través
de la API autenticada (`ItemResponse.imagen`), así que en la práctica solo
alguien con acceso legítimo al item llega a conocerla.

### Por qué una carpeta por tenant

`uploads/{tenant_schema}/items/{uuid}.ext` — no todo en una carpeta plana.
La razón es a futuro: cuando se implemente que el backup a Drive también
cubra las fotos (charlado con el usuario, todavía no implementado — ver
"Pendiente" más abajo), comprimir "todas las fotos de este tenant" tiene
que ser trivial (un solo directorio), sin tener que consultar la base para
saber qué archivo es de quién.

## Validación del archivo subido

`app/tenant/imagenes.py`:
- Lista blanca de `Content-Type`: solo `image/jpeg`, `image/png`,
  `image/webp`. Nada de "cualquier imagen que reconozca el navegador".
- Tamaño máximo 5 MB.
- El `Content-Type` que manda el navegador se puede falsear — además se
  intenta abrir el archivo de verdad con Pillow (`Image.open(...).verify()`)
  antes de guardarlo. Si no es una imagen real, 400.
- Si el item ya tenía una foto, la vieja se borra del disco al subir la
  nueva — nunca quedan archivos huérfanos acumulándose.

## Cambios

- **Backend**: columna `Item.imagen` (String, nullable) en `models.py` +
  migración en `migraciones.py`; `app/tenant/imagenes.py` (nuevo — guardar/
  borrar/validar); `POST` y `DELETE /items/{id}/imagen` en `items.py`;
  `ItemResponse.imagen` en `schemas.py`; `StaticFiles` montado en `/uploads`
  en `main.py`; `Pillow` agregado a `requirements.txt` (ya estaba instalado
  como dependencia transitiva, pero nunca declarado — ahora es una
  dependencia real del proyecto, no un accidente).
- **Frontend**: `urlImagen()` en `axios.config.ts` (arma la URL completa a
  partir de la ruta que devuelve el backend); `subirImagenItem`/
  `eliminarImagenItem` en `inventory.service.ts` + hooks
  `useUploadItemImage`/`useDeleteItemImage` en `useInventory.ts`; UI de
  subida/cambio/borrado en `ModalEditItemInventory.tsx`; columna "Foto"
  (miniatura) en `InventoryTable.tsx`; imagen de portada por tarjeta +
  imagen grande en el panel de detalle en `CatalogosPage.tsx`.

## Bug real encontrado y arreglado en la verificación

El modal de edición de item recibe `item` como prop — una foto congelada
del momento en que se abrió. Al subir o borrar la imagen, la mutación
invalida la query y la **tabla de atrás** se actualiza sola, pero el modal
seguía mostrando la foto vieja (o el botón "Quitar" seguía apareciendo)
hasta cerrarlo y volver a abrirlo, aunque el backend ya estaba al día.
Arreglado con un estado local (`imagenActual`) que se sincroniza con la
respuesta de cada mutación, no con el prop congelado.

## Verificación end-to-end

Probado contra Postgres real y en el navegador real, sobre el inventario
real del mazo de Magic (id=15): subida de una imagen de prueba a un item
vía API (el navegador automatizado de esta sesión no tiene selector de
archivos) → aparece la miniatura correcta en la tabla de Inventario →
aparece en el modal de edición con los botones "Cambiar foto"/"Quitar" →
"Quitar" borra el archivo del disco (confirmado con `DELETE .../imagen` →
200 y el archivo ya no está) y el modal se actualiza en vivo sin cerrarse →
vinculado el item a un catálogo existente ("aaaa"), la tarjeta muestra la
foto como portada (`cover`) igual que las tarjetas sin foto muestran un
placeholder consistente → el panel de detalle lateral muestra la imagen
grande arriba de la ficha técnica. Limpieza posterior: imagen de prueba
borrada, item desvinculado del catálogo de prueba (sin borrar el item real
— ver el hallazgo de abajo).

## Hallazgo aparte — arreglado

En `CatalogosPage.tsx`, el único botón de "borrar" en el panel de detalle
(`Dar de baja en Inventario` / `Eliminar del Catálogo`) SIEMPRE ejecutaba
`DELETE /items/{id}` — borraba el artículo completo, incluso cuando el
usuario solo quería sacarlo de ESE catálogo. Se resolvió por separado
(spawn_task, corrido en otra sesión en paralelo): ahora hay dos botones
distintos cuando el item viene de un inventario ("Quitar del catálogo" vía
`DELETE /catalogos/{id}/items/{item_id}`, y "Eliminar del inventario" vía
`DELETE /items/{id}`), cada uno con su Popconfirm explicando la diferencia.

## Checkbox: fotos opcionales por inventario

Pedido del usuario después de usar la feature: *"si no quiere [fotos],
obligarlo a que haya un campo de foto es medio al pedo — no siempre van a
querer que haya imágenes"*. Se agregó `Inventario.fotos_habilitadas`
(boolean), con un checkbox al crear el inventario (mismo patrón visual que
el checkbox de "tiene fecha de vencimiento" ya existente) — y editable
después desde "Editar Inventario".

**Default por dirección**: los inventarios ya existentes al migrar arrancan
en `true` (no se les esconde de golpe una foto que ya hayan cargado — el
mazo de Magic y el Depósito de Verduras ya tenían fotos de prueba subidas
en esta sesión). Los inventarios **nuevos** arrancan en `false` (opt-in) —
el checkbox nace destildado.

**Reforzado también en el backend, no solo ocultando el botón**: `POST
/items/{id}/imagen` ahora rechaza con 400 si el inventario del item tiene
`fotos_habilitadas=false`, aunque alguien le pegue directo a la API sin
pasar por el frontend.

**Qué se ocultó y qué no**: la sección de subir/cambiar/quitar foto en el
modal de edición de item, y la columna "Foto" de la tabla de Inventario.
Catálogo NO necesitó ningún cambio — ya degradaba bien mostrando el
placeholder cuando `item.imagen` es null, así que un inventario sin fotos
simplemente nunca tiene `imagen` seteada y se ve igual que cualquier otro
item sin foto.

**Verificado end-to-end**: creado un inventario de prueba ("Sin Fotos
Test") sin tildar el checkbox → confirmado que la tabla de items no tiene
columna "Foto" → agregado un item → confirmado que el modal "Editar
Artículo" no tiene ninguna sección de foto (va directo de "Nombre" a
"Cantidad", sin Avatar ni botones de subir/quitar). Inventario de prueba
borrado después.

## Pendiente (próxima etapa, explícitamente pospuesta por el usuario)

Extender el job de backup a Drive (`app/database_manager/router.py`) para
que además del JSON de datos, comprima y suba la carpeta de imágenes del
tenant — y que restaurar un backup también restaure el disco. Hoy, si se
restaura un backup, la columna `Item.imagen` vuelve a tener una URL pero el
archivo físico no está garantizado que exista.
