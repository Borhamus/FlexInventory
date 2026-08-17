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


---


Fase 6:

---

Fase 7:

---
