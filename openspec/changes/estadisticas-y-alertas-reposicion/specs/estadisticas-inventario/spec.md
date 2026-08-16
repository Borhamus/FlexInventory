## Purpose

Provee estadísticas agregadas por inventario a partir del schema tipado de sus atributos, para que los datos numéricos y de fecha tengan utilidad real (promedios, totales, fechas próximas).

## ADDED Requirements

### Requirement: Consultar estadísticas de un inventario

El sistema SHALL exponer un endpoint `GET /inventarios/{inventario_id}/stats` que devuelva estadísticas calculadas sobre los atributos de los items del inventario.

El resultado SHALL incluir:
- El total de items del inventario.
- Por cada atributo de tipo `integer` o `float` definido en el inventario: promedio, suma, mínimo, máximo y cantidad de items que tienen el atributo con valor.
- Por cada atributo de tipo `date` definido en el inventario: próxima fecha (la menor), última fecha (la mayor), cantidad de items que tienen el atributo con valor y días restantes hasta la próxima fecha (negativos si ya venció).

Si el inventario no existe, el endpoint SHALL responder 404. Si el usuario no tiene permiso de lectura sobre inventarios, el endpoint SHALL responder 403. Los atributos de tipo `string` o `boolean` solo aportan la cantidad de items que los tienen con valor; no generan agregaciones numéricas ni de fecha.

#### Scenario: Inventario con atributo numérico con datos

- **WHEN** un usuario consulta las estadísticas de un inventario cuyo schema define `{precio: float}` y cuyos items tienen precios 10, 20 y 30 (uno sin precio)
- **THEN** el resultado incluye promedio 20, suma 60, mínimo 10, máximo 30 y 2 items con valor

#### Scenario: Inventario con atributo de fecha

- **WHEN** un usuario consulta las estadísticas de un inventario cuyo schema define `{vence: date}` y cuyos items tienen fechas 2026-08-10 y 2026-09-01, siendo hoy 2026-08-05
- **THEN** el resultado incluye próxima fecha 2026-08-10, última fecha 2026-09-01 y 5 días restantes hasta la próxima

#### Scenario: Atributo sin valores

- **WHEN** un atributo numérico o de fecha no está presente en ningún item del inventario
- **THEN** el resultado incluye el atributo con valores nulos para sus métricas y 0 items con valor, sin errores

#### Scenario: Inventario inexistente

- **WHEN** un usuario consulta las estadísticas de un inventario que no existe
- **THEN** el sistema responde 404 con un mensaje indicando que el inventario no fue encontrado

#### Scenario: Dato almacenado no convertible al tipo declarado

- **WHEN** un item almacena un valor para un atributo que no puede convertirse al tipo declarado en el inventario (por ejemplo datos heredados o atributos extra)
- **THEN** el sistema responde 400 indicando el atributo y el valor problemático, sin retornar estadísticas parciales

### Requirement: Estadísticas respetando el schema tipado del inventario

Las estadísticas de cada atributo SHALL calcularse según el tipo que el inventario declara para ese atributo, convirtiendo los valores almacenados en el JSONB del item a ese tipo. Los items que no tienen el atributo SHALL quedar excluidos de sus agregaciones numéricas y de fecha.

#### Scenario: Promedio sobre los items que tienen el valor

- **WHEN** un inventario con schema `{peso: float}` tiene items con pesos 5, 10 y un tercer item sin peso
- **THEN** el promedio se calcula como 7.5 (solo sobre los dos items con valor) y el total de items con valor es 2

### Requirement: Cálculo eficiente sobre grandes volúmenes

El sistema SHALL calcular las estadísticas de un inventario ejecutando las agregaciones en la base de datos, sin cargar los items a la aplicación para procesarlos uno por uno. Un inventario con cientos de items SHALL retornar sus estadísticas en una única operación de base de datos.

#### Scenario: Inventario con muchos items

- **WHEN** un usuario consulta las estadísticas de un inventario con cientos de items
- **THEN** la respuesta llega sin cargar en memoria los items completos y sin una consulta por item
