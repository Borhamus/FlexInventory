## Purpose

Garantiza que las carpetas y archivos que FlexInventory usa en el Drive del usuario se sigan encontrando aunque el usuario los renombre o los mueva, que la restauración de fotos no dependa de un identificador que puede estar vacío, y que el usuario entienda desde la aplicación qué carpeta usa el sistema y qué acciones sobre ella sí son destructivas.

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

### Requirement: Resolución del archivo de imágenes en la restauración

Al restaurar un backup, el sistema SHALL localizar el archivo `images.zip` por su nombre dentro de la carpeta raíz resuelta, y NO SHALL depender únicamente del identificador cacheado del archivo de imágenes para decidir si restaura las fotos.

El identificador cacheado PUEDE usarse como atajo cuando siga siendo válido, pero su ausencia NO SHALL provocar que una restauración termine sin fotos y sin error mientras exista un `images.zip` en el Drive del tenant.

Cuando el tenant no tenga ningún `images.zip` en su Drive, la restauración SHALL completarse igual, informando que no se restauraron fotos, sin tratarlo como un error.

#### Scenario: Identificador de imágenes en blanco pero el archivo existe

- **WHEN** un tenant restaura un backup teniendo su identificador cacheado de `images.zip` sin valor, pero con un `images.zip` presente en su carpeta de Drive
- **THEN** el sistema encuentra el archivo por nombre, restaura las fotos en el disco del tenant e informa que las fotos se restauraron

#### Scenario: Sin archivo de imágenes en Drive

- **WHEN** un tenant que nunca subió fotos restaura un backup
- **THEN** la restauración de los datos se completa con normalidad y el sistema informa que no había fotos para restaurar, sin error

#### Scenario: Identificador de imágenes de otra cuenta de Drive

- **WHEN** un tenant tiene cacheado un identificador de `images.zip` que no corresponde a la cuenta de Drive conectada actualmente
- **THEN** el sistema descarta ese identificador, busca `images.zip` por nombre en la cuenta conectada y restaura las fotos si el archivo existe

### Requirement: Unicidad de los archivos de estado (current.json e images.zip)

`current.json` e `images.zip` son archivos únicos que se sobrescriben en el lugar, no histórico. El sistema SHALL mantener una sola copia de cada uno en la carpeta raíz: antes de subir, SHALL resolver el archivo por nombre dentro de la carpeta y actualizar el que exista, y solo SHALL crear uno nuevo cuando no exista ninguno.

Perder el identificador cacheado del archivo (primer backup, o un disconnect seguido de reconexión) NO SHALL provocar la creación de una copia adicional.

Esto NO aplica a los backups históricos (`backup_FECHA.json`), que por definición crean un archivo nuevo por corrida.

#### Scenario: Backup con el identificador de current.json perdido

- **WHEN** se ejecuta un backup con el identificador cacheado de `current.json` en NULL pero con un `current.json` ya presente en la carpeta raíz
- **THEN** el sistema actualiza el `current.json` existente y no crea una segunda copia

#### Scenario: Reconexión a la misma cuenta no duplica images.zip

- **WHEN** el usuario desconecta y reconecta la misma cuenta de Drive (con lo que los identificadores cacheados quedaron en NULL) y luego ejecuta un backup
- **THEN** el sistema actualiza el `images.zip` existente en lugar de crear uno nuevo

### Requirement: Limpieza de identificadores al desconectar Drive

Cuando el usuario desconecte su cuenta de Google Drive, el sistema SHALL descartar todos los identificadores de Drive que tenga cacheados para el tenant —la carpeta raíz, la carpeta de backups, el archivo `current.json` y el archivo `images.zip`— de modo que reconectar una cuenta de Drive distinta no reutilice identificadores de la cuenta anterior.

#### Scenario: Reconexión con otra cuenta de Google

- **WHEN** el usuario desconecta su Drive y luego conecta una cuenta de Google distinta y ejecuta un backup
- **THEN** el sistema no intenta actualizar archivos por identificadores de la cuenta anterior, sino que resuelve o crea las carpetas y archivos en la cuenta nueva, y el backup se completa sin error

### Requirement: Transparencia sobre la carpeta de almacenamiento

La aplicación SHALL informarle al usuario, en la pantalla de gestión de base de datos, qué carpeta de su Drive usa el sistema y qué acciones sobre ella afectan a sus backups.

El aviso SHALL distinguir las acciones seguras (renombrarla, moverla) de las que sí provocan pérdida de datos (eliminarla o vaciar la papelera de Drive), sin desalentar acciones que el sistema tolera.

#### Scenario: Usuario consulta la pantalla de base de datos

- **WHEN** el dueño del tenant abre la pantalla de gestión de base de datos
- **THEN** ve indicado el nombre de la carpeta que usa el sistema y una advertencia que aclara que eliminarla borra sus backups, mientras que renombrarla o moverla no afecta el funcionamiento
