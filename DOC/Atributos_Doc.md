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
