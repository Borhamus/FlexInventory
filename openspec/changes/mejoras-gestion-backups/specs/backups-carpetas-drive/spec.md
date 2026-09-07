## Purpose

Garantiza que las carpetas que FlexInventory usa en el Drive del usuario se sigan encontrando aunque el usuario las renombre o las mueva, y que el usuario entienda desde la aplicación qué carpeta usa el sistema y qué acciones sobre ella sí son destructivas.

## ADDED Requirements

### Requirement: Resolución de carpetas por identificador

El sistema SHALL localizar la carpeta raíz de FlexInventory y su subcarpeta de backups usando el identificador de Drive que tenga guardado para el tenant, y no su nombre, siempre que ese identificador siga siendo válido.

Renombrar o mover esas carpetas dentro del Drive del usuario NO SHALL impedir que el sistema las encuentre, ni SHALL provocar la creación de carpetas nuevas, ni SHALL hacer desaparecer de la lista los backups ya existentes.

#### Scenario: Carpeta raíz renombrada

- **WHEN** el usuario renombra en su Drive la carpeta raíz de FlexInventory y luego ejecuta un backup
- **THEN** el sistema usa la misma carpeta renombrada, no crea ninguna carpeta adicional, y los backups anteriores siguen apareciendo en la lista

#### Scenario: Carpeta movida de ubicación

- **WHEN** el usuario mueve la carpeta raíz de FlexInventory a otra ubicación de su Drive y luego consulta la lista de backups
- **THEN** la lista incluye los mismos backups que antes de moverla

#### Scenario: Subcarpeta de backups renombrada

- **WHEN** el usuario renombra la subcarpeta de backups y luego ejecuta un backup
- **THEN** el nuevo backup se guarda en esa misma subcarpeta, junto a los anteriores

### Requirement: Recuperación cuando el identificador deja de ser válido

Cuando el identificador guardado de una carpeta ya no sea utilizable —porque no existe, fue enviado a la papelera, o pertenece a una cuenta de Drive distinta— el sistema SHALL recuperarse automáticamente localizando la carpeta por su nombre y creándola si no existe, sin exponerle un error al usuario y sin requerir que reconecte su cuenta.

El sistema SHALL guardar el identificador resuelto para las operaciones siguientes.

#### Scenario: Tenant sin identificador guardado

- **WHEN** un tenant que nunca ejecutó un backup, o que reconectó su Drive desde cero, ejecuta un backup o consulta la lista
- **THEN** el sistema localiza o crea las carpetas por nombre, completa la operación con normalidad y guarda los identificadores resueltos

#### Scenario: Carpeta eliminada por el usuario

- **WHEN** el usuario envía la carpeta raíz a la papelera de Drive y luego ejecuta un backup
- **THEN** el sistema detecta que el identificador guardado ya no sirve, crea la carpeta nuevamente y completa el backup sin error

#### Scenario: Identificador de otra cuenta de Drive

- **WHEN** un tenant tiene guardado un identificador que no corresponde a la cuenta de Drive actualmente conectada
- **THEN** el sistema descarta ese identificador, resuelve las carpetas por nombre en la cuenta conectada y guarda los identificadores nuevos

### Requirement: Persistencia del identificador de la carpeta raíz

El sistema SHALL almacenar por tenant el identificador de Drive de la carpeta raíz de FlexInventory, y SHALL mantenerlo actualizado cada vez que resuelva esa carpeta durante un backup o un listado.

Los tenants que ya existían antes de esta capacidad SHALL seguir funcionando sin intervención manual: la ausencia del identificador SHALL tratarse como el caso de recuperación por nombre descrito arriba.

#### Scenario: Tenant preexistente

- **WHEN** un tenant creado antes de esta capacidad ejecuta su primer backup posterior
- **THEN** el sistema resuelve la carpeta por nombre, guarda su identificador, y los backups siguientes ya lo usan

### Requirement: Transparencia sobre la carpeta de almacenamiento

La aplicación SHALL informarle al usuario, en la pantalla de gestión de base de datos, qué carpeta de su Drive usa el sistema y qué acciones sobre ella afectan a sus backups.

El aviso SHALL distinguir las acciones seguras (renombrarla, moverla) de las que sí provocan pérdida de datos (eliminarla o vaciar la papelera de Drive), sin desalentar acciones que el sistema tolera.

#### Scenario: Usuario consulta la pantalla de base de datos

- **WHEN** el dueño del tenant abre la pantalla de gestión de base de datos
- **THEN** ve indicado el nombre de la carpeta que usa el sistema y una advertencia que aclara que eliminarla borra sus backups, mientras que renombrarla o moverla no afecta el funcionamiento
