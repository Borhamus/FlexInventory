## Purpose

Permite configurar por inventario qué atributo de fecha indica la reposición de stock y notificar in-app cuándo hay que reponer, mostrando el proveedor a contactar.

## ADDED Requirements

### Requirement: Configurar la fecha de reposición de un inventario

El sistema SHALL exponer un endpoint `PATCH /inventarios/{inventario_id}/reposicion` que permita configurar la reposición de un inventario con: `atributo_reposicion` (obligatorio), `dias_aviso` (entero positivo, default 7) y `atributo_proveedor` (opcional).

El sistema SHALL validar que `atributo_reposicion` exista en el schema del inventario y sea de tipo `date`, y que `atributo_proveedor`, si se envía, exista y sea de tipo `string`. Si la validación falla, SHALL responder 400 con detalle informativo. Si el inventario no existe, SHALL responder 404. Solo usuarios con permiso de actualización sobre inventarios SHALL poder cambiar esta configuración.

La configuración vigente SHALL estar incluida en el detalle del inventario (`GET /inventarios/{inventario_id}`). Si luego se elimina o renombra un atributo que estaba configurado como reposición o proveedor, el sistema SHALL limpiar esa referencia para no dejarla apuntando a un atributo inexistente.

#### Scenario: Configuración válida

- **WHEN** un usuario con permiso envía `{atributo_reposicion: "vence", dias_aviso: 7}` para un inventario cuyo schema define `{vence: date}`
- **THEN** el sistema guarda la configuración y el detalle del inventario la refleja

#### Scenario: Atributo de reposición inexistente

- **WHEN** se envía `{atributo_reposicion: "reposicion"}` pero ese atributo no está definido en el inventario
- **THEN** el sistema responde 400 indicando que el atributo no existe en el inventario

#### Scenario: Atributo de reposición de tipo incorrecto

- **WHEN** se envía `{atributo_reposicion: "nombre"}` pero el atributo es de tipo `string`
- **THEN** el sistema responde 400 indicando que el atributo debe ser de tipo date

#### Scenario: Proveedor inválido

- **WHEN** se envía `{atributo_reposicion: "vence", atributo_proveedor: "precio"}` pero el atributo proveedor es de tipo `float`
- **THEN** el sistema responde 400 indicando que el atributo proveedor debe ser de tipo string

#### Scenario: Se elimina el atributo configurado

- **WHEN** el dueño de un inventario con `atributo_reposicion: "vence"` elimina o renombra el atributo "vence" de su inventario
- **THEN** el sistema limpia `atributo_reposicion` (y `atributo_proveedor` si el atributo afectado era el proveedor) y deja la reposición sin configurar

### Requirement: Detectar items a reponer

El sistema SHALL exponer `GET /inventarios/{inventario_id}/alertas?dias=N` que devuelva los items a reponer: aquellos cuya fecha de reposición (según la configuración del inventario) esté dentro de los próximos N días o ya haya vencido. N SHALL tomar default 7 si no se envía.

Cada item del resultado SHALL incluir su identificación, la fecha de reposición, los días restantes (negativos si vencida) y el valor del atributo proveedor cuando la configuración lo declare y el item lo tenga. Los items sin el atributo de reposición definido SHALL quedar excluidos. Si el inventario no tiene configuración de reposición, el resultado SHALL ser una lista vacía. Si el inventario no existe, SHALL responder 404. La consulta SHALL requerir permiso de lectura sobre inventarios.

#### Scenario: Item dentro de la ventana de aviso

- **WHEN** un inventario tiene configurada la fecha de reposición "vence", un item vence en 5 días y se consulta con `dias=7`
- **THEN** el item aparece con 5 días restantes y, si tiene atributo proveedor, con su proveedor

#### Scenario: Item vencido

- **WHEN** un item tiene la fecha de reposición hace 2 días y se consulta con `dias=7`
- **THEN** el item aparece con -2 días restantes

#### Scenario: Item fuera de la ventana

- **WHEN** un item vence en 20 días y se consulta con `dias=7`
- **THEN** el item no aparece en el resultado

#### Scenario: Inventario sin configuración

- **WHEN** se consultan las alertas de un inventario que nunca configuró su fecha de reposición
- **THEN** el resultado es una lista vacía

#### Scenario: Item sin fecha de reposición

- **WHEN** un item del inventario no tiene el atributo de reposición configurado
- **THEN** el item no aparece en el resultado

### Requirement: Notificaciones de reposición in-app

El sistema SHALL exponer `GET /notificaciones` para listar las notificaciones del tenant y `PATCH /notificaciones/{id}` para marcarlas como leídas. La lista SHALL permitir filtrar por pendientes o leídas y devolverlas de más reciente a más antigua. Marcar una notificación inexistente SHALL responder 404.

El sistema SHALL generar notificaciones automáticamente para cada inventario configurado, por cada item a reponer según la ventana de aviso. La generación SHALL ser idempotente: no debe crear una segunda notificación duplicada para el mismo item y la misma fecha de reposición mientras la anterior siga pendiente. Las notificaciones SHALL estar aisladas por tenant (cada tenant solo ve las suyas).

#### Scenario: Listar notificaciones

- **WHEN** un usuario del tenant consulta sus notificaciones
- **THEN** recibe las notificaciones de reposición de los inventarios del tenant, ordenadas de más reciente a más antigua, indicando inventario, item, fecha y proveedor

#### Scenario: Filtrar por pendientes

- **WHEN** un usuario filtra las notificaciones por pendientes
- **THEN** solo aparecen las que aún no fueron marcadas como leídas

#### Scenario: Marcar como leída

- **WHEN** un usuario marca una notificación como leída
- **THEN** deja de aparecer en el filtro de pendientes

#### Scenario: Marcar notificación inexistente

- **WHEN** un usuario intenta marcar como leída una notificación que no existe
- **THEN** el sistema responde 404

#### Scenario: Generación idempotente

- **WHEN** el proceso diario de generación corre dos veces seguidas con el mismo item a reponer en la misma fecha
- **THEN** solo existe una notificación pendiente para ese item y fecha
