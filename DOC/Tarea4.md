Sesión de revisión — Borhamus — 13/09/2026

Chequeo de control completo de lo que subieron los compañeros, antes de confiar en el branch. Instalé el proyecto de cero en otra carpeta para probarlo como lo haría cualquiera clonándolo por primera vez.

## Setup desde cero
- venv, requirements, docker (postgres) y frontend, siguiendo el README.
- Encontré que mi `.env` de frontend tenía `VITE_API_URL=http://127.0.0.1:8000` en vez de `http://localhost:8000` (como dice `.env.example`). Con eso mal, la sesión no persiste al recargar: el navegador trata `localhost` y `127.0.0.1` como sitios distintos, y la cookie httpOnly del refresh token (SameSite=Lax) no viaja entre uno y otro. No es un bug de código, es config local mal copiada — lo corregí en mi entorno y listo. Si a alguien más del equipo le pasa lo mismo (sesión que se cae al recargar la página), es por esto.
- Faltaba el paso de `npm install` en el README antes de `npm run dev` la primera vez — lo agregaste vos en el archivo y quedó incluido en el commit de hoy.

## Bugs encontrados y arreglados
1. **`InventoryDashboard.tsx`** — quedó un `console.log("Contenido del token decodificado:", user)` de debug, disparado en cada visita a Inventarios. Saqué el `console.log` y el `useEffect`/import que quedaban sin uso.
2. **`AuditoriaPage.tsx`** — mismo patrón: dos `console.log` de debug ("Datos recibidos" / "Total reportado por backend") en cada carga del historial. Sacados.
3. **Logging del backend silencioso** — ningún lado del proyecto llama a `logging.basicConfig()`, así que el logger raíz de Python queda en `WARNING` sin handlers por default. Resultado: los 14 `logger.info/warning/error` repartidos en `scheduler.py`, `router.py`, `imagenes.py` y `migraciones.py` nunca se veían en consola — incluidas las confirmaciones de que el backup automático corrió bien. Se ve el log de uvicorn porque uvicorn configura sus propios loggers aparte, no por wharam de logging general del proyecto. Arreglado con una línea en `app/main.py` (`logging.basicConfig(level=logging.INFO)`), con comentario explicando el porqué.

## Verificado y funcionando bien (sin cambios)
- Historial de auditoría: devuelve `[]`/`total: 0` correctamente en un tenant sin acciones todavía — no es bug, es el caso base bien resuelto.
- El `Auditor` está bien enganchado como dependencia en los endpoints POST/PUT/DELETE de inventarios, catálogos e ítems.
- Resolución de carpeta de Google Drive por ID cacheado (no por nombre): renombrar o mover "FlexInventory Storage" en Drive no rompe la detección — confirmado en código. Mandar la carpeta a la papelera sí hace que la app cree una nueva vacía en el próximo backup (los datos viejos no se pierden de Drive hasta vaciar la papelera, pero la app deja de verlos).
- Backup automático (scheduler con APScheduler): la configuración se guarda bien y el job se registra correctamente — se pudo confirmar recién después de arreglar el logging silencioso de arriba.

## Caso de uso para la presentación (flexibilidad del sistema)
Armamos un caso de uso real usando FlexInventory para gestionar mazos de Magic: The Gathering, mostrando que cada Inventario define su propio esquema de atributos sin tocar código:

- **Inventario "Tempestad Ignea"** (mono-red burn, 60/60 cartas): atributos `Precio Unitario` (float), `Necesarias` (integer), `Foil` (boolean). Precios de mercado reales buscados por edición exacta. Bloques personalizados armados con el motor de fórmulas real de "Personalizar": *Cuánto sale el deck total*, *Cuánto vengo invirtiendo*, *Cuánto te falta invertir* (plata y cartas).
- **Inventario "Poison Control"** (ONE poison, 31/60 cartas — cargado con cantidades parciales a propósito para testear el caso de inversión intermedia): mismos atributos MENOS `Foil` (este mazo no tiene cartas foil) — a propósito, para mostrar que el esquema es por inventario y no un molde fijo.
- Los 3 bloques personalizados calculan bien en ambos casos (validado con las 12 y 17 cartas respectivamente, con fotos reales cargadas).
- De paso, esto sirvió como test funcional real: creación de atributos `boolean`, tipado correcto de ítems, subida de fotos, y fórmulas con resta encadenada en Personalizar — todo anduvo bien.

## Pendiente para mañana
- Seguir cargando mazos a medida que tenga las fotos listas (mismo patrón: buscar precios reales, crear inventario con solo los atributos que ese mazo necesita, cargar ítems + foto, armar los 3 bloques de Personalizar).
- Seguir el chequeo de control en el resto de las pantallas que todavía no revisamos.
