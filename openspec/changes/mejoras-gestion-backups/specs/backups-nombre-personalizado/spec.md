## Purpose

Permite que el usuario le ponga una etiqueta reconocible a un backup manual, para poder distinguirlo después en la lista de restauración sin depender de recordar la fecha exacta.

## ADDED Requirements

### Requirement: Etiqueta opcional en el backup manual

El sistema SHALL aceptar una etiqueta opcional al ejecutar un backup manual, y SHALL incorporarla al nombre del archivo histórico que crea en Drive.

El nombre resultante SHALL conservar el prefijo `backup_` y el timestamp UTC del backup antes de la etiqueta, de forma que el orden alfabético de los nombres siga coincidiendo con el orden cronológico y dos backups nunca compartan nombre por el solo hecho de no llevar etiqueta.

Si no se envía etiqueta, el nombre SHALL ser exactamente el mismo que produce el sistema hoy (`backup_{timestamp}.json`).

La etiqueta SHALL afectar únicamente al archivo histórico. El archivo `current.json` y el archivo `images.zip` SHALL conservar sus nombres fijos.

#### Scenario: Backup manual con etiqueta

- **WHEN** el dueño del tenant ejecuta un backup manual con la etiqueta `antes de importar`
- **THEN** el sistema crea en la carpeta `backups` un archivo llamado `backup_{timestamp}_antes_de_importar.json` y devuelve ese nombre en la respuesta

#### Scenario: Backup manual sin etiqueta

- **WHEN** el dueño del tenant ejecuta un backup manual sin enviar etiqueta, o enviándola vacía
- **THEN** el sistema crea el archivo con el nombre por defecto `backup_{timestamp}.json`

#### Scenario: Compatibilidad con clientes que no envían cuerpo

- **WHEN** un cliente llama al endpoint de backup manual sin cuerpo de petición
- **THEN** el backup se ejecuta normalmente con el nombre por defecto, sin error de validación

#### Scenario: Backups automáticos

- **WHEN** el scheduler ejecuta un backup automático de un tenant
- **THEN** el archivo se crea con el nombre por defecto, sin etiqueta

### Requirement: Sanitización de la etiqueta

El sistema SHALL sanitizar la etiqueta antes de usarla como parte de un nombre de archivo, conservando únicamente letras, dígitos, espacios, guiones y guiones bajos, y descartando cualquier otro carácter.

Los espacios SHALL normalizarse a guiones bajos y la etiqueta SHALL truncarse a un largo máximo acotado. Si tras la sanitización no queda ningún carácter útil, el sistema SHALL tratar el backup como si no llevara etiqueta.

La etiqueta SHALL usarse exclusivamente como nombre de archivo y NO SHALL incorporarse a ninguna consulta de búsqueda contra la API de Drive.

#### Scenario: Etiqueta con caracteres no permitidos

- **WHEN** un usuario envía la etiqueta `prod/2026 "final"`
- **THEN** el sistema descarta los caracteres no permitidos y genera un nombre válido, sin barras ni comillas

#### Scenario: Etiqueta que queda vacía tras sanitizar

- **WHEN** un usuario envía una etiqueta compuesta solo por caracteres no permitidos, por ejemplo `///`
- **THEN** el backup se crea con el nombre por defecto, sin sufijo y sin error

#### Scenario: Etiqueta excesivamente larga

- **WHEN** un usuario envía una etiqueta de varios cientos de caracteres
- **THEN** el sistema la trunca al largo máximo permitido y crea el archivo correctamente

### Requirement: Restauración independiente del nombre

La restauración de un backup SHALL seguir identificando el archivo por su identificador en Drive, de manera que una etiqueta personalizada no altere qué backups pueden restaurarse ni cómo se los selecciona.

#### Scenario: Restaurar un backup etiquetado

- **WHEN** el dueño del tenant restaura un backup cuyo nombre incluye una etiqueta personalizada
- **THEN** la restauración se completa igual que con un backup de nombre por defecto
