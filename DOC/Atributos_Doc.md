Fase 1:

## Objetivo

Antes de esta fase, no había forma de que un inventario le dijera al sistema "este atributo específico cumple un rol especial" (por ejemplo: cuál de mis atributos numéricos representa el volumen unitario en m³). Esta fase agrega esa capa de metadata. **No calcula nada todavía** — solo permite declarar y validar la configuración. El cálculo (volumen total, mediana, etc.) llega en fases posteriores, que van a leer esta configuración.

## Diseño: Registry Pattern

Se descartó la alternativa de agregar una columna por rol (`atributo_volumen`, `atributo_reposicion`, `atributo_proveedor`...), que era el enfoque de la propuesta OpenSpec vieja (`estadisticas-y-alertas-reposicion`). Ese enfoque obliga a tocar el modelo, el schema, el validador y la migración cada vez que se agrega un rol nuevo.

En su lugar: un único campo `Inventario.roles_atributos` (JSONB) con forma `{rol: nombre_de_atributo}`, y un **Registry** (`app/tenant/roles_atributos.py`) que centraliza qué roles existen y qué tipos acepta cada uno. La validación nunca pregunta "¿qué rol es este?" con un `if/elif` — itera el registro. Agregar un rol nuevo (por ejemplo, cuando se retome la fase de alertas de umbral) es una entrada más en `ROLES_REGISTRY`, sin tocar código que ya funciona (principio Abierto/Cerrado). Cada entrada del registro incluye un hook opcional `validar_extra` para reglas de negocio futuras más allá del chequeo de tipo, sin necesidad de rediseñar nada cuando aparezcan.

Roles definidos en esta fase (todavía sin usar, listos para que los consuman las fases 3 y 4):
- `volumen_unitario` → atributo `integer`/`float`
- `fecha_reposicion` → atributo `date`
- `proveedor` → atributo `string`

## Cambios

- **`app/tenant/models.py`**: columna nueva `Inventario.roles_atributos` (JSONB, default `{}`).
- **`app/tenant/roles_atributos.py`** (nuevo): `RolAtributo` (dataclass), `ROLES_REGISTRY`, `validate_roles_atributos()` (valida que el rol exista, que el atributo referenciado exista en el inventario y que su tipo sea el que el rol acepta — acumula todos los errores antes de fallar, mismo criterio que el resto de los validadores del proyecto) y `clean_orphan_roles()` (descarta roles cuyo atributo fue borrado, renombrado o cambió de tipo).
- **`app/tenant/schemas.py`**: `RolesAtributosUpdate` (body del PATCH) y `roles_atributos` agregado a `InventarioResponse` (así `GET /inventarios/{id}` refleja la config vigente).
- **`app/tenant/inventarios.py`**:
  - `PATCH /inventarios/{id}/roles` — configura los roles. Reemplaza el mapa completo (no hace merge parcial), mismo criterio que ya usa `atributos` en `PUT /inventarios/{id}`: se manda el estado completo que se quiere dejar.
  - `update_inventario()`: cuando cambian los atributos del inventario, llama a `clean_orphan_roles()` para que `roles_atributos` nunca quede apuntando a un atributo que ya no existe (no hay Foreign Key posible acá, porque el atributo es una clave dentro de un JSONB, no una fila con PK — esa integridad la mantiene el código).
- **`app/database_manager/migraciones.py`** (nuevo): `run_migrations()` — por cada tenant activo, `ALTER TABLE inventario ADD COLUMN IF NOT EXISTS roles_atributos JSONB DEFAULT '{}'`. Necesario porque no hay Alembic y las tablas de un tenant se crean una sola vez, al registrarse; sin esto, los tenants creados antes de esta fase se quedarían sin la columna. Idempotente (correrlo de nuevo no rompe nada).
- **`app/main.py`**: `run_migrations()` se invoca en el `lifespan`, antes de `init_scheduler()`.

## Cómo probarlo

```
PATCH /inventarios/{id}/roles
{ "roles_atributos": { "volumen_unitario": "peso_m3" } }
```

- Con un atributo `peso_m3: float` definido en el inventario → 200, la config queda guardada.
- Con un rol inexistente (`"rol_trucho": "x"`) → 400, error indicando los roles válidos.
- Con un atributo que no existe en el inventario → 400.
- Con un atributo de tipo incorrecto (ej. `volumen_unitario` apuntando a un `string`) → 400.
- Configurar el rol, después editar el inventario borrando ese atributo (`PUT /inventarios/{id}` con un `atributos` que no lo incluya) → `roles_atributos` se limpia solo, sin que el usuario tenga que hacer nada.

---

Fase 2:

## Objetivo

Motor genérico que calcula, para cada atributo definido en un inventario, la agregación que corresponde según su tipo: promedio/suma/min/max para numéricos, verdaderos/falsos para booleanos, próxima/última fecha y días restantes para fechas, cantidad con valor para strings. Todavía **no** incluye la mediana agrupada (Fase 3) ni el volumen total (Fase 4, que va a leer el `roles_atributos` de la Fase 1) — es la base sobre la que se paran esas dos.

## Diseño: Strategy Pattern

Mismo criterio que el Registry de la Fase 1 (dispatch por categoría, sin `if/elif`), pero acá cada estrategia tiene más responsabilidad: no solo "sos válido", sino **"cómo te construyo"** (qué fragmento SQL aporta a la consulta) y **"cómo te leo"** (cómo interpretar el resultado). `app/tenant/estadisticas.py` define `EstrategiaAtributo` con ambas funciones más una regex de diagnóstico, y un registro `ESTRATEGIAS` con 4 entradas (numérico, boolean, date, string). Agregar un tipo nuevo el día de mañana no toca el motor, solo agrega una entrada.

## El problema técnico: una sola query sin conocer los atributos de antemano

El schema de un inventario es dinámico (JSONB con claves arbitrarias), así que no se puede escribir la query como columnas fijas de un ORM — se arma como texto, recorriendo `inventario.atributos` en tiempo de ejecución. Ejemplo, para un inventario con `{precio: float, activo: boolean}`:

```sql
SELECT
  COUNT(*) AS total_items,
  AVG((atributos ->> :key_0)::float8) AS attr_0_avg,
  SUM((atributos ->> :key_0)::float8) AS attr_0_sum,
  MIN((atributos ->> :key_0)::float8) AS attr_0_min,
  MAX((atributos ->> :key_0)::float8) AS attr_0_max,
  COUNT(atributos ->> :key_0)         AS attr_0_count,
  COUNT(*) FILTER (WHERE (atributos ->> :key_1)::boolean = true)  AS attr_1_true,
  COUNT(*) FILTER (WHERE (atributos ->> :key_1)::boolean = false) AS attr_1_false,
  COUNT(atributos ->> :key_1)         AS attr_1_count
FROM item WHERE inventario_id = :inventario_id
```

Una sola ida a la base, sin importar cuántos atributos tenga el inventario. Detalle importante: los **alias** (`attr_0_avg`, etc.) son sintéticos y posicionales, nunca el nombre real del atributo — un nombre como `"precio de venta (USD)"` es válido para el usuario pero no es un identificador SQL válido, y los alias no se pueden parametrizar (a diferencia del *valor* `:key_0`, que sí viaja como parámetro enlazado). El nombre real del atributo se mapea de vuelta a la respuesta en Python, con el índice posicional como puente.

## Datos rotos: camino optimista con diagnóstico (Camino B)

Si un item tiene un valor que no casea al tipo declarado (dato heredado, atributo que cambió de tipo), el cast explota — y como es una sola query con todos los atributos juntos, explota la consulta entera. Se evaluaron dos caminos:

- **Cast defensivo con regex en la query grande**: nunca explota, pero el dato malo se convierte en `NULL` en silencio. Se descartó porque la spec pide explícitamente un 400 con el atributo y el valor problemático, no que el dato desaparezca sin avisar.
- **Optimista con diagnóstico (elegido)**: la query grande corre primero, sin regex, rápida — es el camino feliz el 99% de las veces. Si Postgres tira una excepción de cast, se hace `rollback()` (la transacción queda abortada tras el error, hay que limpiarla antes de seguir usando la sesión) y recién ahí se corre una segunda pasada, atributo por atributo, con una expresión regex tolerante que nunca explota, hasta encontrar el primer valor que no matchea el tipo — ahí sí se responde 400 con el atributo y el valor exactos. El costo extra (queries de diagnóstico) solo se paga en el caso raro de un dato roto, no en el uso normal.

Limitación conocida y asumida: las regex de diagnóstico son deliberadamente simples (cubren los formatos que la propia app produce al guardar, no toda la gramática de cast de Postgres). Suficiente para detectar el caso real (datos rotos/heredados), no para replicar el parser de Postgres al 100%.

## Cambios

- **`app/tenant/estadisticas.py`** (nuevo): `EstrategiaAtributo`, `ESTRATEGIAS` (Strategy Pattern), `calcular_estadisticas()` (query grande), `_diagnosticar_y_lanzar()` (segunda pasada solo si falla), endpoint `GET /inventarios/{id}/stats`.
- **`app/tenant/schemas.py`**: `AtributoStats` (todos los campos opcionales salvo `tipo`/`con_valor`, porque cada tipo llena un subconjunto distinto) y `InventarioStatsResponse`.
- **`app/main.py`**: se registra `estadisticas_router`.

## Cómo probarlo

```
GET /inventarios/{id}/stats
```

- Inventario con `{precio: float}` e items con precios 10, 20, 30 (uno sin precio) → promedio 20, suma 60, mínimo 10, máximo 30, 2 con valor.
- Atributo `boolean` con items en true/false → conteo correcto de verdaderos/falsos.
- Atributo `date` con fechas futuras → próxima/última fecha y días restantes (negativos si ya venció).
- Atributo sin ningún valor cargado → métricas en `null`, `con_valor: 0`, sin error.
- Un item con un valor no convertible al tipo declarado (ej. cargado directo en la base) → 400 con el atributo y el valor exactos, no 500.
- Inventario inexistente → 404.

---

Fase 3:

## Objetivo

La consigna pide, para atributos numéricos, la mediana calculada "agrupando en intervalos" (la fórmula clásica de estadística descriptiva para datos agrupados, no el percentil 50 exacto) y la posibilidad de pedir el promedio de un rango de esos intervalos. Esta fase agrega dos endpoints nuevos sobre un atributo puntual: histograma+mediana, y promedio de un rango de valores.

## Por qué la mediana agrupada NO es el percentil exacto

Importante dejarlo explícito porque es fácil confundirlos: la mediana agrupada es una **aproximación** que se calcula a partir de las frecuencias por intervalo, no de los valores individuales ordenados. Se verificó con un caso a mano: para `[10,12,14,16,18,20,50]`, la mediana exacta es 16 (el valor del medio) pero la agrupada da 17 (según en qué intervalo cae la mitad de las frecuencias acumuladas). Es el comportamiento correcto y esperado de la técnica que pide la consigna — no es un error de redondeo.

Fórmula usada (estándar de estadística descriptiva):

```
Me = Li + ((n/2 - Fa) / fi) * ancho_intervalo
```

- `Li`: límite inferior del intervalo mediano (el primer intervalo donde la frecuencia acumulada llega a n/2)
- `Fa`: frecuencia acumulada ANTES de ese intervalo
- `fi`: frecuencia del intervalo mediano
- `ancho_intervalo`: (máximo - mínimo) / cantidad de intervalos

## El histograma: width_bucket() de Postgres, y su gotcha

`width_bucket(valor, min, max, n)` clasifica cada valor en uno de `n` intervalos de igual ancho, en una sola consulta agregada (`GROUP BY bucket`) — mismo principio del resto del motor: nunca se traen los valores a Python para clasificarlos a mano.

**Gotcha real que hay que conocer**: el límite superior de `width_bucket` es **exclusivo**. El valor que sea exactamente el máximo del rango cae en el bucket `n+1` (fuera de rango), no en el último intervalo válido. Sin corregir esto, el ítem con el valor más alto del inventario desaparecería silenciosamente del histograma. Se resuelve envolviendo la llamada en `LEAST(width_bucket(...), n)`, que reclasifica ese desborde en el último intervalo real. Se verificó a mano que el clamp funciona antes de confiar en el resultado.

Cantidad de intervalos: por defecto se usa la **regla de Sturges** (`k = ceil(log2(n) + 1)`), un número de intervalos estándar en estadística según la cantidad de datos, en vez de un valor fijo arbitrario. El endpoint acepta `?intervalos=N` para que el usuario lo pise si quiere más o menos detalle.

## Casos borde

- **Sin valores** (`con_valor == 0`): mediana `null`, histograma vacío, sin error.
- **Todos los valores iguales** (`minimo == maximo`): `width_bucket` dividiría por `(max-min)=0` y explotaría. Se detecta antes y se devuelve un único intervalo trivial con la mediana igual a ese valor.
- **Dato no convertible al tipo**: mismo Camino B de la Fase 2 (query optimista, diagnóstico solo si falla), pero simplificado — acá ya se sabe de antemano cuál es el único atributo en juego, así que el diagnóstico no necesita iterar buscando cuál falló, alcanza con una consulta.

## Promedio de un rango de intervalos

En vez de que el segundo endpoint reciba índices de bucket (que solo tienen sentido si el cliente usó el mismo `n_intervalos` que el histograma), recibe directamente un rango de **valores** (`desde`/`hasta`). El frontend arma ese rango leyendo los límites (`desde`/`hasta`) de los buckets del histograma que el usuario seleccionó — evita tener que sincronizar `n_intervalos` entre dos requests separados.

## Cambios

- **`app/tenant/estadisticas.py`**: `_num_intervalos_sturges()`, `_resolver_atributo_numerico()`, `_ejecutar_numerico_con_diagnostico()` (Camino B simplificado, reutilizable), `calcular_histograma_mediana()`, `calcular_promedio_rango()`, y los endpoints `GET /inventarios/{id}/atributos/{atributo}/mediana` y `GET /inventarios/{id}/atributos/{atributo}/promedio-rango`.
- **`app/tenant/schemas.py`**: `HistogramaBucket`, `HistogramaMedianaResponse`, `PromedioRangoResponse`.

## Cómo probarlo

```
GET /inventarios/{id}/atributos/{atributo}/mediana?intervalos=8
GET /inventarios/{id}/atributos/{atributo}/promedio-rango?desde=10&hasta=25
```

- Atributo numérico con datos dispersos → histograma con los buckets correctos, mediana calculada con la fórmula agrupada.
- Atributo con todos los valores iguales → un único intervalo, sin división por cero.
- Atributo sin valores → mediana `null`, histograma vacío.
- Atributo de tipo `string`/`boolean`/`date` → 400 (se requiere numérico).
- Atributo inexistente → 404.
- `desde > hasta` en promedio-rango → 400.

---


Fase 4:

## Objetivo

Volumen total ocupado por el inventario (ej: en un galpón), usando el rol `volumen_unitario` configurado en la Fase 1. Fórmula: `SUM(cantidad * valor_del_atributo)` sobre todos los items — reutiliza el campo `cantidad` que ya existe en `Item`, no hace falta ningún dato nuevo por item.

El sistema no asume ninguna unidad (no hardcodea "m³"): es el usuario quien, al elegir qué atributo cumple el rol `volumen_unitario` al configurar el inventario, decide qué representa ese número. Coherente con que todo el sistema de atributos es genérico desde el diseño original.

## Por qué se integró a la query grande de `/stats` en vez de un endpoint aparte

Se evaluó hacer un endpoint dedicado `GET /inventarios/{id}/volumen`, pero se descartó: agregaría una segunda ida a la base por un solo número, cuando ya existe una consulta agregada corriendo para el resto de las estadísticas. En cambio, `_construir_query()` (Fase 2) ahora acepta un `volumen_atributo` opcional y, si el inventario lo tiene configurado, suma dos columnas más (`SUM(cantidad * valor)`, `COUNT(valor)`) a la misma query. El resultado aparece como campo `volumen_total` en la respuesta de `/stats`, ausente si el inventario no configuró el rol.

El camino de diagnóstico ante datos rotos (Camino B, Fase 2) también se extendió: si el atributo de volumen tiene un valor no convertible, participa de la misma segunda pasada que ya diagnosticaba los demás atributos.

## Verificación

Se corrió el motor completo contra el schema real de un tenant (no solo compilación): inventario con atributos `precio (float)`, `activo (boolean)`, `vence (date)`, `color (string)`, `peso_m3 (float)`, rol `volumen_unitario → peso_m3`, y 4 items (uno sin varios atributos, para probar exclusión de NULLs). Resultado verificado a mano:

- `volumen_total = 9.1` = 3×0.5 + 5×1.2 + 2×0.8 (cantidad × peso_m3 de cada item) ✓
- El item sin `peso_m3` quedó excluido de `items_con_valor` (3 de 4) sin romper el cálculo.
- Todas las demás métricas (promedio, suma, min, max, conteo booleano, fechas, mediana agrupada, promedio de rango) coincidieron con el cálculo manual.

Los datos de prueba se crearon y se borraron en la misma corrida — no queda nada de esto en la base real.

## Cambios

- **`app/tenant/estadisticas.py`**: `_construir_query()` acepta `volumen_atributo` opcional y suma sus dos columnas a la query grande; `_diagnosticar_y_lanzar()` incluye el atributo de volumen en la segunda pasada si corresponde; `calcular_estadisticas()` lee `inventario.roles_atributos["volumen_unitario"]` y arma el bloque `volumen_total` en la respuesta.
- **`app/tenant/schemas.py`**: `VolumenTotalStats`, agregado como campo opcional `volumen_total` en `InventarioStatsResponse`.

## Cómo probarlo

```
PATCH /inventarios/{id}/roles   { "roles_atributos": { "volumen_unitario": "peso_m3" } }
GET   /inventarios/{id}/stats
```

- Inventario con el rol configurado → la respuesta de `/stats` incluye `volumen_total` con el atributo, el total y cuántos items tienen valor.
- Inventario sin el rol configurado → `volumen_total` ausente/`null`, el resto de `/stats` funciona igual.
- Item sin el atributo de volumen → excluido del cálculo, no rompe nada.

---

Fase 5:

## Objetivo

Lo que pedía la consigna para `date` ("ordenar y filtrar desde x hasta, mostrar los más viejos o más nuevos") y para el atributo decimal ("ordenar y filtrar desde hasta"). Se implementó como extensión de `GET /items/` existente, no como endpoint nuevo — es el mismo listado de siempre, con parámetros opcionales.

## Diseño

- `sort_by` (nombre de atributo) + `order` (`asc`/`desc`) → ordena por ese atributo.
- `filtro_atributo` + `filtro_desde`/`filtro_hasta` → filtra por rango sobre ese atributo. Solo acepta `integer`/`float`/`date` — para `string`/`boolean` no hay semántica de "rango" pedida por la consigna, se rechaza con 400.
- Ambos requieren `inventario_id` (para poder resolver el tipo del atributo contra el schema de ESE inventario — el mismo atributo puede no existir o tener otro tipo en otro inventario).
- Mismo mecanismo de seguridad ya usado en toda la feature: el nombre del atributo viaja como parámetro enlazado (`:sort_key`, `:filtro_key`), nunca interpolado en el SQL.

Se armó con `query.filter(text(...)).params(...)` y `query.order_by(text(...)).params(...)` sobre el `Query` de SQLAlchemy ya existente, en vez de reescribir todo el endpoint en SQL crudo — se mezcla el filtro ORM normal (`inventario_id`) con la parte dinámica (JSONB), reutilizando la paginación (`skip`/`limit`) tal cual estaba.

## Decisión: no compartir el registro `ESTRATEGIAS` de `estadisticas.py`

Se armaron dos diccionarios chicos (`_TIPO_SQL_ORDEN`, `_TIPOS_FILTRABLES`) directamente en `items.py`, en vez de importar los internos de `estadisticas.py`. El motor de estadísticas ya está probado end-to-end (Fases 1-4); acoplar este endpoint a sus internos por ahorrarse 6 líneas de diccionario introduce un riesgo de romper algo ya validado a cambio de un beneficio mínimo. Duplicar una tabla `{tipo: cast_sql}` de 3 renglones es más barato que ese riesgo.

## Cómo probarlo

```
GET /items/?inventario_id=1&sort_by=precio&order=asc
GET /items/?inventario_id=1&sort_by=vence&order=desc
GET /items/?inventario_id=1&filtro_atributo=precio&filtro_desde=15&filtro_hasta=25
```

Verificado contra Postgres real (no solo compilación): 3 items con precios 10/20/30 y fechas distintas.
- Orden por `precio` ascendente → devuelve en el orden correcto (10, 20, 30).
- Orden por `vence` descendente → devuelve del más nuevo al más viejo.
- Filtro `precio` entre 15 y 25 → devuelve solo el item con precio 20.
- Intentar `filtro_atributo` sobre un atributo `string` → 400, rechazado correctamente.
- `sort_by`/`filtro_atributo` sin `inventario_id` → 400.
- Atributo inexistente en el inventario → 404.

---


Fase 6:

## Objetivo

Interfaz para que el usuario configure los roles de atributo (Fase 1) al editar un inventario: qué atributo es el volumen unitario, la fecha de reposición, el proveedor. Responde directamente a la pregunta que se planteó al arrancar todo esto: "¿cómo hace el usuario para decirle al sistema qué atributo cumple qué rol, en un sistema donde los atributos son arbitrarios?".

## Dónde se agregó (y dónde no)

Solo en `ModalEditInventory` (edición), no en `ModalAddInventory` (creación). Es a propósito: los roles configuran atributos que **ya existen**, y `PATCH /inventarios/{id}/roles` necesita un inventario ya creado (con ID). Meter esto en el modal de creación obligaría a esperar la respuesta del POST antes de poder configurar roles, complicando un flujo pensado para ser rápido ("definí los atributos y arrancá"). El flujo natural es: crear el inventario con sus atributos, usarlo un poco, y recién después decidir qué atributo cumple qué rol especial — que es cuando tiene sentido tener este control en el modal de edición.

## La parte técnica interesante: roles reactivos a atributos sin guardar

El selector de cada rol (ej. "Volumen unitario") solo debe ofrecer atributos que ya estén definidos en el formulario **y sean del tipo correcto** — pero el usuario puede estar agregando/editando esos atributos en el mismo modal, sin haber guardado todavía. Se resolvió con `Form.useWatch('atributos', form)`: el componente se re-renderiza en vivo cada vez que se agrega, quita, renombra o cambia el tipo de un atributo en el `Form.List` de arriba, y las opciones de cada rol se recalculan al vuelo filtrando por `tiposPermitidos`.

Verificado interactivamente en el navegador: al agregar un atributo nuevo `peso_m3` y elegir tipo "Decimal", el selector de "Volumen unitario" pasó de deshabilitado ("No hay atributos integer/float definidos") a habilitado con la opción `peso_m3 (float)` disponible, sin recargar ni guardar nada — la reactividad funciona como se diseñó.

## Espejo del Registry del backend

`ROLES_CONFIG` en el frontend es la misma tabla que `ROLES_REGISTRY` del backend (`app/tenant/roles_atributos.py`): mismos 3 roles, mismos tipos permitidos por rol. Agregar un rol nuevo el día de mañana significa agregar una entrada en los dos lugares — ningún componente ni endpoint necesita lógica condicional por rol. Es el mismo patrón de diseño aplicado consistentemente en las dos puntas de la stack.

## Orden de guardado: atributos primero, roles después

`handleSubmit` encadena las dos mutaciones: `updateInventory` (PUT, guarda atributos) y, recién en su `onSuccess`, `configurarRoles` (PATCH). Es necesario en ese orden porque si el usuario asigna un rol a un atributo que está agregando en el mismo submit, el backend todavía no lo conoce hasta que el PUT termina — mandar ambas peticiones en paralelo fallaría la validación del PATCH con "atributo no existe" para atributos nuevos.

## Verificación end-to-end en el navegador real

Se probó el flujo completo contra la app corriendo (no solo lectura de código): login, crear un inventario, editarlo agregando el atributo `peso_m3` (float), asignarlo como `volumen_unitario`, guardar, y confirmar en la base real que `roles_atributos` quedó `{"volumen_unitario": "peso_m3"}`. Se corrió también `calcular_estadisticas()` sobre ese inventario y el bloque `volumen_total` apareció correctamente en la respuesta — cierra el círculo completo Fase 1 (UI de configuración) → Fase 4 (motor que usa esa configuración). El inventario y los datos de prueba se borraron al terminar.

Nota de la sesión de pruebas: durante la verificación manual apareció una vez un error transitorio de red en el PUT (bloqueado por CORS, típico de que `uvicorn --reload` se reinicia en el medio de una petición); se resolvió solo al reintentar y no volvió a repetirse. No parece un problema del código — se deja anotado por si vuelve a aparecer en uso real, para no confundirlo con un bug nuevo.

## Cambios

- **`frontend/src/api/inventory.service.ts`**: `Inventario.roles_atributos`, método `configurarRoles()`.
- **`frontend/src/hooks/useInventory.ts`**: `useConfigurarRoles()`.
- **`frontend/src/schemas/inventarios.schema.ts`**: campo `roles_atributos` en el schema zod.
- **`frontend/src/components/ModalEditInventory.tsx`**: `ROLES_CONFIG`, sección "Roles Especiales" con selects reactivos, `handleSubmit` extendido para encadenar PUT→PATCH.
- **`frontend/src/pages/InventoryPage.tsx`**: pasa `currentRolesAtributos` al modal.

---

Fase 7:

## Objetivo

Cierre del plan de 7 fases: vista de estadísticas del inventario (con histograma interactivo de mediana) y orden/filtro por atributo en la tabla de items — el frontend de todo lo que se construyó en el backend en las Fases 2, 3, 4 y 5.

## Vista de estadísticas (`ModalStatsInventory` + `AtributoHistograma`)

- **`ModalStatsInventory`**: consume `GET /inventarios/{id}/stats` (Fase 2) y renderiza una tarjeta por atributo, con el subconjunto de métricas que corresponde a su tipo (mismo criterio Strategy que ya usa el backend, llevado al frontend: un `renderAtributo` que decide qué mostrar según `stats.tipo`, no un componente por atributo). Si el inventario tiene el rol `volumen_unitario` configurado (Fase 1), muestra una tarjeta destacada con el volumen total (Fase 4) — sin asumir ninguna unidad, ya que el sistema es genérico.
- **`AtributoHistograma`**: modal anidado que consume `GET /inventarios/{id}/atributos/{atributo}/mediana` (Fase 3) para atributos `float`. El histograma se dibuja con `div`s de altura proporcional a la frecuencia — **no** con `@ant-design/plots`, que figura en `package.json` pero no está instalado de verdad en `node_modules` (se comprobó antes de escribir código: usarlo hubiera roto el build). Para una docena de barras, CSS puro alcanza y sobra.
- El "promedio de un rango de intervalos" (el pedido específico de la consigna) se resuelve con dos `Select` (Desde/Hasta) poblados con los mismos buckets del histograma; al elegir un rango, se llama `GET /inventarios/{id}/atributos/{atributo}/promedio-rango` con los valores de esos buckets — nunca con índices, por la misma razón de diseño que ya se documentó en la Fase 3 (evitar depender de que dos requests usen el mismo `n_intervalos`).

## Orden y filtro en la tabla de items

`GET /items/` (Fase 5) ya soportaba `sort_by`/`order`/`filtro_atributo`/`filtro_desde`/`filtro_hasta`, pero el frontend de la página de inventario nunca llamaba a ese endpoint — la tabla se arma hoy con los items que vienen embebidos en `GET /inventarios/{id}`. Se agregó una query aparte (`useItems`, ya existía para otro uso) que **solo se activa cuando el usuario elige un orden o un filtro**; mientras tanto, la tabla sigue funcionando exactamente igual que antes (cero regresión, cero llamada de red de más).

Un detalle no trivial: `InventoryTable` siempre reordenaba sus items por `id` al final (`useMemo` interno), lo que hubiera pisado el orden pedido al backend. Se agregó un prop `preserveOrder` para que, cuando los items vienen de la query ordenada, la tabla no los reordene por su cuenta.

## Bug real de Ant Design encontrado y corregido

Al probar el popover de orden/filtro en el navegador, el `Select` de "Ordenar por" (anidado dentro de un `Popover`, no un `Modal`) no abría su dropdown. Investigando con la consola del navegador se encontró la causa: el dropdown de un `Select` se porta por defecto a `document.body`, **fuera** del árbol DOM del `Popover` que lo contiene. El detector de "click afuera" del `Popover` a veces interpreta el click en ese dropdown portado como un click "afuera", y se cierra solo. Se corrigió agregando `getPopupContainer={(trigger) => trigger.parentElement}` a los `Select`/`DatePicker` que viven dentro del popover, para que su dropdown quede anidado en el DOM del propio popover.

## Verificación en el navegador real

Se probó en la app corriendo, con un inventario de 15 items generados con datos variados en los 5 tipos:

- **Vista de estadísticas**: total de items, volumen total, y las métricas de cada tipo (promedio/suma/min/max, verdaderos/falsos, próxima/última fecha, conteos) verificadas contra los datos reales cargados.
- **Histograma de mediana**: 5 intervalos con las frecuencias correctas (suman el total de items con valor), mediana calculada verificada.
- **Promedio de un rango de intervalos**: se seleccionaron 3 intervalos, se confirmó por request de red (`GET .../promedio-rango?desde=7.83&hasta=60.696`) que el cálculo (`promedio=24.6`, `cantidad=8`) coincide exactamente con la suma de frecuencias de esos intervalos.
- **Orden/filtro de la tabla**: no se pudo confirmar visualmente en esta sesión de pruebas — un problema del entorno de navegador automatizado (un toast de notificación que quedó tapando el control, y algunas interacciones con `Select` anidados que resultaron poco confiables en este entorno) impidió cerrar la verificación interactiva completa. El código sigue el mismo patrón exacto (`Select` controlado con `value`/`onChange`) que se verificó funcionando dos veces en esta misma fase (roles del inventario, desde/hasta del histograma), y el backend que consume (`GET /items/` con `sort_by`/`filtro_atributo`) ya se probó a fondo contra Postgres real en la Fase 5. **Pendiente: confirmar con un click manual en la app real que el popover de orden/filtro funciona de punta a punta.**

## Cambios

- **`frontend/src/api/inventory.service.ts`**: tipos `AtributoStats`, `InventarioStats`, `HistogramaBucket`, `HistogramaMediana`, `PromedioRango`; métodos `getStats`, `getMediana`, `getPromedioRango`.
- **`frontend/src/hooks/useEstadisticas.ts`** (nuevo): `useInventoryStats`, `useMediana`, `usePromedioRango`.
- **`frontend/src/components/ModalStatsInventory.tsx`** (nuevo), **`frontend/src/components/AtributoHistograma.tsx`** (nuevo).
- **`frontend/src/api/item.service.ts`**: `getItems` acepta `ItemsOrdenFiltro` (sort/filtro).
- **`frontend/src/hooks/useItems.ts`**: `useItems` acepta orden/filtro y un flag `enabled` (default `true`, no rompe los usos existentes).
- **`frontend/src/components/InventoryTable.tsx`**: prop `preserveOrder`.
- **`frontend/src/pages/InventoryPage.tsx`**: botón de estadísticas, popover de orden/filtro, fuente de items condicional (embebidos vs. query ordenada), `getPopupContainer` en los Select/DatePicker del popover.

---

## Resumen general del plan (7 fases)

1. **Roles de atributo**: `Inventario.roles_atributos` (JSONB) + Registry Pattern (`roles_atributos.py`) para que el usuario marque qué atributo cumple un rol especial (volumen unitario, fecha de reposición, proveedor), sin tocar código cada vez que se agrega un rol nuevo.
2. **Motor de estadísticas por tipo**: `GET /inventarios/{id}/stats`, Strategy Pattern por tipo de atributo (string/boolean/numérico/date), una sola query SQL con alias sintéticos, y manejo de datos rotos con diagnóstico solo cuando hace falta (Camino B).
3. **Mediana agrupada e histograma**: `width_bucket` de Postgres, regla de Sturges, fórmula de mediana para datos agrupados, y el promedio de un rango de intervalos.
4. **Volumen total**: `SUM(cantidad * atributo_volumen_unitario)`, integrado a la misma query de `/stats`, usando el rol configurado en la Fase 1.
5. **Orden y filtro por atributo**: `GET /items/` extendido con `sort_by`/`order`/`filtro_atributo`/`filtro_desde`/`filtro_hasta`, mismo mecanismo de cast tipado y parámetros enlazados que el resto de la feature.
6. **Frontend — configuración de roles**: sección reactiva en `ModalEditInventory` para asignar roles a atributos ya definidos, con selects que se actualizan en vivo a medida que se editan los atributos.
7. **Frontend — vista de estadísticas y orden/filtro**: `ModalStatsInventory` + histograma interactivo, y popover de orden/filtro en la tabla de items.

Backend (Fases 1-5) verificado end-to-end contra Postgres real. Frontend (Fases 6-7) verificado en el navegador contra la app corriendo, con una excepción anotada arriba (popover de orden/filtro, pendiente de confirmación manual). Alertas de umbral/vencimiento (el agregado no obligatorio de la consigna) quedaron fuera de este plan, a definir en una entrega posterior.

---

## Post-entrega: Bloques Personalizados

Pedido posterior a las 7 fases: que el usuario pueda armar sus propias "tarjetas" de estadística en la ventana de Estadísticas, con un texto editable y cálculos propios — por ejemplo, para una colección de cartas con atributos `la_tiene (bool)` y `costo (float)`: *"Me faltan {N} cartas para completar la colección, y me falta gastar ${M} para conseguirlas"*.

### La decisión de diseño central: armador, no lenguaje de fórmulas

Se descartó explícitamente dejar que el usuario escriba una fórmula de texto libre (tipo `SUM(costo) WHERE la_tiene = false`). Dos razones:
1. **Seguridad**: evaluar una fórmula escrita a mano termina, en algún punto, ejecutando algo construido a partir de texto del usuario — la puerta de entrada clásica a inyección, y este sistema evita eso desde la Fase 1 (parámetros enlazados, nunca interpolar nombres de atributo).
2. **Público del software**: el usuario pidió explícitamente que sea simple para gente que no sabe de computación. Un cuadro de texto que espera sintaxis de fórmula es hostil para ese público.

En su lugar: un **bloque** = una plantilla de texto + una o más **métricas**, cada una armada eligiendo de listas (nunca escribiendo): qué calcular (contar / sumar / promediar / mínimo / máximo) y, opcionalmente, un filtro (atributo + operador + valor) para calcular solo sobre algunos items.

### v2: fórmulas que combinan varios atributos (pedido posterior, con caso real de verdulería)

La v1 solo dejaba agregar **un** atributo numérico por métrica (`sum(costo)`, `avg(peso)`...). El usuario trajo un caso que esa versión no podía resolver: en una verdulería, para saber cuánta plata tiene en stock necesita `cantidad × precio_por_kilo` **combinado** por cada item, no cada atributo por separado — 30kg de papa a $500 el kilo más 10kg de cebolla a $300 el kilo, no es "sumar cantidad" ni "sumar precio", es sumar el producto de ambos por línea.

Pedido explícito del usuario para resolverlo: *"Me gusta más una idea donde 'se ven los atributos' y yo puedo agarrar un atributo, ponerlo en la lista, elegir un elemento matemático como un ×, +, /, % y se arme la función así"* — es decir, mismo espíritu de armador visual que v1, pero permitiendo encadenar varios **términos** con operadores aritméticos en vez de un solo atributo.

**Cambio de modelo**: cada métrica pasó de tener un único `atributo` a tener dos listas paralelas:
- `terminos`: cada uno es `{tipo: "atributo", atributo: "precio_por_kilo"}`, `{tipo: "cantidad"}` (la cantidad nativa del item, sin necesidad de configurarla como atributo aparte) o `{tipo: "constante", valor: 1.5}` (un número fijo, para casos como aplicar un IVA o un descuento).
- `operadores`: uno menos que la cantidad de términos, cada elemento de `OPERADORES_ARITMETICOS` (`mul`/`div`/`add`/`sub`, es decir ×÷+−) combina el término en esa posición con el siguiente.

**La decisión de orden de evaluación**: una fórmula como `cantidad × precio + descuento` es ambigua si se evalúa con precedencia matemática real (¿primero la multiplicación?) versus si se evalúa en el orden en que el usuario fue agregando los pasos. Para un armador visual apuntado a gente sin conocimientos de programación, meter paréntesis reales en la UI agrega una capa de complejidad (¿cuándo se cierran? ¿anidados?) que contradice el objetivo de simplicidad. Se evaluó la alternativa con el usuario (paréntesis reales y agrupables vs. izquierda-a-derecha estricto con un tooltip aclaratorio) y se optó explícitamente por **izquierda a derecha, sin excepciones** — cada paso se aplica en el orden en que fue agregado a la lista, igual que una calculadora simple — con un ícono "?" al lado del armador que explica esto con un ejemplo, para que el usuario que sí arma fórmulas con varios pasos entienda el orden sin sorpresas.

En SQL esto se construye anidando paréntesis explícitos en el orden de la lista (`((termino_0 OP_0 termino_1) OP_1 termino_2) ...`), así el resultado en Postgres coincide exactamente con lo que el usuario ve armado en pantalla — nunca se deja que la precedencia por defecto de SQL decida.

### v3: todo a clicks — se saca el dropdown de operación (feedback directo sobre la v2)

Probada la v2, el usuario dio feedback concreto con una captura de pantalla: *"Siento que la parte visual de cómo se presenta está mal, no se entiende (...) 'Contar artículos' no sé qué hace, 'Promediar', 'mínimo de', 'máximo de'... esto sacalo directamente porque no le veo sentido"*. Y precisó cómo lo imaginaba: mostrar los atributos del inventario como algo clickeable, y armar la cuenta clickeando atributo → operador matemático → atributo, con un ejemplo concreto (`yalotengo = sí -> cantidad x precio`).

**Decisión de diseño (confirmada con el usuario antes de tocar código)**: quedaba una ambigüedad real — si la fórmula aplica a varios items que cumplen la condición, ¿se suma el resultado de todos o hay que elegir "sumar" vs. "contar"? Se le presentaron dos opciones y eligió la primera: **la operación ya no la elige el usuario, se infiere sola** — si armó una fórmula (tiene términos), se suma su resultado en todos los items que cumplen la condición; si no armó fórmula (fórmula vacía), se cuenta cuántos items cumplen. Esto además elimina de raíz la jerga confusa: promedio/mínimo/máximo se sacaron directamente (no eran necesarios para ningún caso de uso real pedido) y count/sum ni siquiera se muestran como opción — el usuario nunca ve la palabra "operación".

**Cambios concretos en la interacción**:
- **Condición**: en vez de un checkbox que revela selects, ahora se ve directo la paleta de TODOS los atributos del inventario como chips clickeables (con su tipo en criollo al lado, ej. "yalotengo (sí/no)"). Click en uno lo fija como atributo de la condición — aparece como un chip cerrable (`×`) seguido del selector de operador (filtrado por tipo, igual que antes) y el input de valor. Click en la `×` del chip vuelve a mostrar la paleta completa.
- **Fórmula**: la fórmula se arma con una máquina de estados de dos fases que se alternan — "esperando un término" muestra chips clickeables de los atributos numéricos + "Cantidad" (la cantidad nativa del item) + "Número fijo…"; "esperando un operador" muestra los 4 chips ×÷+−. Nunca se pueden clickear dos términos ni dos operadores seguidos porque la paleta que corresponde es la única visible en cada momento — así la fórmula queda siempre bien formada sin necesidad de validar combinaciones raras después. Si se deja vacía, un texto lo aclara: "vacía = contar cuántos artículos cumplen la condición".
- **Nombre del cálculo**: la descripción auto-generada del botón de inserción (ej. "Sumar costo — solo si...") se reemplazó por un campo de texto donde el usuario escribe su propio nombre corto (ej. "Cuánto vengo gastando", el ejemplo que dio el usuario) — ese texto es literalmente lo que aparece en el botón "+ [nombre]" para insertar en la plantilla. Nada se genera solo salvo la clave técnica interna (`calculo_1_xxxx`), que sigue siendo 100% invisible.

**Qué NO cambió**: la clave interna sigue sin ser vista ni escrita por el usuario; el filtro sigue siendo un único atributo + operador + valor (mismo modelo de datos); la evaluación de la fórmula sigue siendo estrictamente izquierda a derecha con el mismo tooltip "?"; la validación de tipos sigue enforced en el backend (solo atributos numéricos entran a la paleta de fórmula, cualquier tipo entra a la de condición).

**Impacto en el backend**: mínimo — el motor de cálculo (`_expr_formula`, `_construir_query_metrica`) no cambió nada, porque ya soportaba fórmulas multi-término desde la v2. Se agregó el campo `etiqueta` (el nombre que ahora escribe el usuario, antes no existía — sin él, el nombre se perdía al recargar el bloque) y se sacaron `avg`/`min`/`max` de `OPERACIONES` porque el frontend nunca más los va a mandar.

### Cómo encaja con lo que ya existía

No es una pieza aislada — reutiliza patrones ya probados en el resto del sistema:
- El cálculo (`SELECT {AGG}(expr) FROM item WHERE inventario_id = ... AND filtro`) es el mismo mecanismo de cast tipado + parámetros enlazados que ya se usa en el promedio de rango de intervalos (Fase 3) y en las alertas de vencimiento — solo que ahora el filtro lo arma el usuario en vez de estar fijo en el código.
- Se guarda como un campo JSONB nuevo en el inventario (`bloques_personalizados`, lista), mismo espíritu que `roles_atributos` — nada de tablas nuevas ni EAV.
- `PATCH /inventarios/{id}/bloques` reemplaza la lista completa (mismo criterio que roles y atributos: se manda el estado completo deseado).
- Si se borra o renombra un atributo que una métrica usaba, se descarta el **bloque entero** (no la métrica suelta) en `update_inventario` — dejar una métrica rota a mitad de una oración es peor que pedirle al usuario que la rearme. Mismo principio de integridad referencial "a mano" que ya se aplicó a roles.

### Validación (acumula todos los errores, como el resto del sistema)

`app/tenant/bloques_personalizados.py` valida: que la clave de cada métrica sea un identificador válido, que la operación exista, que el atributo (si aplica) sea numérico y exista en el inventario, que el atributo de filtro exista, que el operador de filtro tenga sentido para el tipo de ese atributo (booleano/string solo `=`/`≠`; numérico/fecha además `>`,`<`,`≥`,`≤`), que el valor de filtro convierta a ese tipo (reutiliza `parse_value_by_type` de validators.py), y que la plantilla no tenga `{llaves}` sin una métrica que las respalde.

Se probaron 5 casos de error a propósito (operador inválido para booleano, atributo inexistente, placeholder huérfano, `sum` sobre un atributo no numérico, clave inválida) — los 5 devolvieron 400 con el detalle correcto.

### Verificación end-to-end

Backend probado contra Postgres real con el ejemplo de la colección de cartas (3 cartas con `la_tiene=true`, 2 con `false`, costos 10/15/20/25/30): el bloque "Me faltan {faltantes} cartas..., y me falta gastar ${costo_faltante}..." calculó `faltantes=2`, `costo_faltante=55.0` — coincide exacto con la cuenta a mano.

Probado también en el navegador real armando el bloque a través de la UI (sin tocar la base a mano): elegir "Contar artículos", tildar el filtro, elegir `la_tiene` = `No`, agregar el segundo cálculo "Sumar costo" con el mismo filtro, insertar ambos en el texto con los botones, guardar. Resultado en la tarjeta: *"Me faltan 2 cartas para completar la colección, y me falta gastar $55 para conseguirlas."* — exacto.

### Verificación end-to-end de v2 (caso verdulería)

Backend probado contra Postgres real con un inventario de prueba (`precio_por_kilo: float`, items "papa" cantidad=30/precio_por_kilo=500 y "cebolla" cantidad=10/precio_por_kilo=300): la métrica `sum(cantidad × precio_por_kilo)` calculó `18000.0` — coincide exacto con la cuenta a mano (30×500 + 10×300).

Probado también en el navegador real armando el bloque completo a través de la UI, sin tocar la base a mano: elegir "Sumar", agregar "Cantidad" a la fórmula, cambiar el siguiente término a `precio_por_kilo`, confirmar que el chip de inserción mostró **"Sumar (Cantidad × precio_por_kilo)"**, escribir la plantilla "Tengo $ {calculo}", insertar la referencia con el botón, guardar. Confirmado en tres capas: el `PATCH /inventarios/{id}/bloques` guardó `terminos: [{tipo: cantidad}, {tipo: atributo, atributo: precio_por_kilo}], operadores: [mul]`; el `GET /inventarios/{id}/bloques` devolvió `valores: {calculo: 18000.0}`; y la tarjeta renderizada en el modal de Estadísticas mostró **"Tengo $ 18.000"**. Inventario de prueba borrado después de verificar.

### Verificación end-to-end de v3 (todo a clicks)

Probado en el navegador real, sobre un inventario real del usuario (Depósito de Verduras, item "Papa" con cantidad=50 y Precio x kilo=1000): abrir el armador, escribir el nombre del cálculo "Cuanto vengo gastando", click en el chip "Cantidad" (queda agregado, aparece "Quitar último paso", cambia automáticamente a la paleta de operadores), click en "× Multiplicar" (cambia de vuelta a la paleta de términos), click en el chip "Precio x kilo" — la tira de la fórmula mostró **"Cantidad × Precio x kilo"** construida enteramente a clicks, sin ningún select ni texto escrito. Insertado en la plantilla "Tengo $ {calculo}" y guardado: `PATCH` guardó `{"terminos": [{"tipo":"cantidad"},{"tipo":"atributo","atributo":"Precio x kilo"}], "operadores": ["mul"], "operacion": "sum", "etiqueta": "Cuanto vengo gastando"}` (operación inferida correctamente, sin que el usuario la haya elegido); `GET` devolvió `50000.0` (50 × 1000, exacto); la tarjeta mostró **"Tengo $ 50.000"**.

También se probó el flujo de condición (click en el chip "Precio x kilo" bajo "1. Condición" → aparece el chip cerrable + selector de operador "es igual a" + input de valor; click en la `×` del chip → vuelve a la paleta completa) — funciona igual que la fórmula, todo a clicks.

Un bug real encontrado en esta prueba y corregido en el momento: al elegir un operador, no había ninguna señal visual hasta agregar el próximo término (el chip "×" no aparecía todavía) — se corrigió mostrando el operador elegido como un chip pendiente apenas se clickea, antes de que exista el siguiente término. Bloque de prueba borrado del inventario real después de verificar.

### Cambios (v3)

- **Backend**: `app/tenant/bloques_personalizados.py` (validación + cálculo — motor de fórmulas sin cambios desde v2; en v3 se agregó el campo `etiqueta` obligatorio por métrica y se redujo `OPERACIONES` a `{count, sum}` ya que el frontend nunca manda `avg`/`min`/`max`), columna `Inventario.bloques_personalizados` (JSONB) en `models.py` + migración en `migraciones.py`, endpoints `PATCH` y `GET /inventarios/{id}/bloques` en `inventarios.py`, limpieza de bloques huérfanos en `update_inventario` (revisa cada término de la fórmula), schemas en `schemas.py` (`TerminoFormula`, `OperadorAritmetico`).
- **Frontend**: `ModalBloquePersonalizado.tsx` (el armador — en v3 el subcomponente `MetricaRow` se reescribió por completo: condición y fórmula se arman con chips clickeables en vez de selects/checkbox, máquina de estados que alterna paleta de términos ↔ paleta de operadores, campo de texto para el nombre de cada cálculo en vez de descripción auto-generada), tipo `MetricaPersonalizada` con el nuevo campo `etiqueta` y `operacion: 'count' | 'sum'` (ya sin avg/min/max) en `inventory.service.ts`, sección "Bloques Personalizados" en `ModalStatsInventory.tsx` (sin cambios en esta iteración), `useBloquesPersonalizados`/`useConfigurarBloques` en `useEstadisticas.ts`.
- **Bug encontrado y pendiente** (no forma parte de esta feature, preexistente): el `Popconfirm` de "¿Eliminar este bloque?" en `ModalStatsInventory.tsx` se renderiza fuera del viewport — tarea marcada aparte para arreglarlo.

### v4: probado con un caso real del usuario (mazo de Magic desde Moxfield) — dos rondas más de feedback directo

Para poner a prueba el armador con datos reales (no un inventario armado a propósito para el ejemplo), se cargó un mazo real del usuario desde Moxfield (`El Jardín De La Putrefacción`, 60 cartas / 13 nombres distintos) como inventario, con atributos `Precio` (float, consultado a la API de Scryfall) y `La tengo` (boolean) marcado a mitad — 6 cartas en `Sí`, 7 en `No`, reproduciendo el caso de uso original de "colección" con datos de verdad.

Sobre ese inventario real, el usuario probó la v3 en su propio navegador y dio dos rondas de feedback sobre la sección final del armador (la de "escribir el texto"):

**Ronda 1 — "esa parte de abajo no la va a entender un usuario común"**: la sección "Insertar en el texto" (una fila de botones) + "Texto del bloque" (un textarea aparte, mostrando literalmente `{calculo_1_mtj5zwbu}`) eran dos zonas separadas y el id crudo que aparecía en el texto rompía la sensación de simplicidad. Se presentaron 3 alternativas con distinto costo (cambiar solo el formato del id / editor con "píldoras" visuales / sacar la escritura libre por defecto) y el usuario pidió una versión concreta de la opción intermedia.

**Ronda 2 — "el nombre del cálculo tampoco, que no exista ese campo"**: mientras se implementaba la ronda 1, el usuario aclaró que ni siquiera quería un campo de texto para nombrar cada cálculo — "el usuario no debería poder meter mano en eso". Si hacía falta un id interno, tenía que armarse solo a partir de lo que el cálculo ya representa.

**Resultado (lo que quedó armado)**:
- Se sacó el campo "Nombre de este cálculo" por completo. Cada tarjeta de cálculo ahora tiene, como encabezado, una descripción que se arma sola y en vivo a partir de la condición y la fórmula que se van clickeando (`etiquetaCalculo()`) — ej. clickear `La tengo` → `es igual a` → `No` en la condición y no tocar la fórmula da como encabezado, en el momento, "Cantidad de artículos donde La tengo es igual a No". El usuario nunca escribe ni edita ese texto.
- El texto del bloque dejó de ser un textarea con `{llaves}` a la vista. Ahora es una sola caja tipo "constructor de oración": el usuario escribe texto libre en un campo, y cuando quiere insertar un cálculo en el medio, toca su botón — el cálculo aparece como una píldora de color dentro de la misma oración que se está armando, y el campo de texto sigue después de la píldora para continuar escribiendo. Nunca se ve un `{clave}` ni un id.
- El `{clave}` interno (necesario igual del lado del backend, para que la plantilla sepa dónde va cada valor) se arma con `slugify()` a partir de la misma descripción auto-generada — ej. `cantidad_de_articulos_donde_la_tengo_es_igual_a_no` — nunca es un string random, aunque el usuario tampoco lo ve nunca.
- Internamente, el texto se representa como una lista de "segmentos" (texto libre | referencia a un cálculo por su id interno de React, no por su `{clave}` final) — el `{clave}` real recién se calcula al guardar, momento en el que también se decide `operacion` (count/sum). Esto también hace que, si el usuario reordena o edita la condición/fórmula de un cálculo después de haberlo insertado en el texto, la píldora en la oración se actualice sola (referencia viva al cálculo, no una copia congelada de su nombre).
- Se sacó el campo `etiqueta` del todo — de la base (`bloques_personalizados.py`), del schema y del tipo TypeScript. No hace falta persistir un nombre: se recalcula siempre desde `terminos`/`operadores`/`filtro_*`.

**Compatibilidad hacia atrás**: un bloque guardado con la v3 (que sí tenía `etiqueta` en la base) se sigue pudiendo abrir y editar sin romperse — el campo `etiqueta` viejo queda ahí sin usarse (JSONB tolera claves extra) y el encabezado se recalcula igual con la descripción automática. Verificado en el navegador real abriendo un bloque que el propio usuario había guardado con la versión anterior.

**Verificación end-to-end de v4**: sobre el inventario real del mazo de Magic, se armó el bloque "Cuánto me falta para completar el mazo" clickeando `La tengo` → `es igual a` → `No` (sin fórmula), escribiendo "Me faltan ", insertando la píldora del cálculo, y completando "cartas para completar el mazo." — guardado quedó `plantilla: "Me faltan {cantidad_de_articulos_donde_la_tengo_es_igual_a_no} cartas para completar el mazo."`, calculado `7` (las 7 cartas marcadas `La tengo = No`), tarjeta final: *"Me faltan 7 cartas para completar el mazo."* — exacto. Un bloque previo del usuario ("Total que gaste de las cartas que ya tengo", cantidad × Precio filtrado por `La tengo = Sí`) siguió funcionando sin tocarlo, mostrando `39` (4+3+4+4+3+21 cartas, con todos los precios puestos en 1 por el propio usuario para chequear la cuenta a mano).

**Gotcha de testing (no bug real)**: un Select de Ant Design (el valor booleano del filtro) no cerraba/confirmaba la opción al clickearla vía coordenadas — mismo tipo de glitch de automatización ya documentado antes en esta sesión con dropdowns anidados; clickeando la opción por su nodo del DOM directamente funcionó bien. Confirmado que la interacción real (con mouse/touch real de un usuario) no tiene este problema.

### Cambios (v4)

- **Backend**: `app/tenant/bloques_personalizados.py` — se sacó la validación y el campo `etiqueta` (ya no existe el concepto de nombre editable por el usuario).
- **Frontend**: `ModalBloquePersonalizado.tsx` reescrito de nuevo — `etiquetaCalculo()` (descripción auto-generada, reemplaza el campo de texto), `slugify()` (arma el `{clave}` interno a partir de esa descripción), tipo `SegmentoPlantilla` + `parsePlantillaASegmentos()` (el texto del bloque como lista de segmentos texto/cálculo en vez de un string con `{llaves}` editado a mano), quitado el campo `etiqueta` de `MetricaPersonalizada` en `inventory.service.ts`.

### v5: cantidades parciales ("necesito 4, tengo 2, me faltan 2") — sin cambiar código

Pregunta del usuario probando el mazo real: ¿cómo represento que de una carta necesito 4 copias pero solo tengo 2? El modelo hasta acá (`La tengo`, booleano) es todo-o-nada — no puede expresar "2 de 4". Mismo problema en su ejemplo de una feria (```tengo 4 sets de cubiertos, vendí 2```).

**La resolución no necesitó ningún cambio de código** — es un cambio de cómo se *modelan los datos*, no del motor:
- `Cantidad` (nativo del item) pasa a representar **cuánto necesito** (ej. copias que pide el mazo, o stock inicial).
- Se agrega un atributo numérico nuevo, `Tengo` (o `Vendidos`, según el caso) — **cuánto tengo/vendí ahora**.
- La fórmula `Cantidad − Tengo` (el operador Restar ya existía desde v2) sumada sin condición da el total de **unidades** faltantes — no de cartas distintas — en todo el inventario. Con `(Cantidad − Tengo) × Precio` sumado, da directamente cuánta plata falta para completar.

**Limitación real, dicha explícitamente al usuario (no oculta)**: la condición del armador compara un atributo contra un valor fijo que tipea el usuario, no contra otro atributo — no se puede expresar hoy "Tengo es menor que Cantidad" como filtro. Si algún item tuviera `Tengo` mayor que `Cantidad` (sobran copias), esa fila restaría del total en vez de aportar cero, y el resultado quedaría mal. No es un bug: es una limitación conocida, documentada acá para no perderla de vista si en algún momento hace falta comparar dos atributos entre sí en un filtro.

**Verificado end-to-end sobre el mazo real** (`El Jardín De La Putrefacción`, id=15): se migró `La tengo` (booleano) → `Tengo` (integer) con cantidades parciales reales (ej. Llanowar Elves: necesito 4, tengo 2 — el ejemplo exacto que dio el usuario), reconstruyendo los 3 bloques: *"Ya gasté $38 en las cartas que tengo."* (`sum(Tengo × Precio)`), *"Me faltan 22 copias para completar el mazo."* (`sum(Cantidad − Tengo)`), *"Me falta gastar $22 para completar el mazo."* (`sum((Cantidad − Tengo) × Precio)`) — los tres coinciden exacto con la cuenta a mano sobre las 13 cartas migradas.

---
