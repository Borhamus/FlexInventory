> [!Paso 1: Crear el entorno Virtual]
> python -m venv venv


> [!Paso 2: Activarlo]
> .\venv\Scripts\activate



> [!Para instalar los "requirements.txt"]
> pip install -r requirements.txt  



> [!Archivo .env] Crea un archivo ".env"
> Debe contener las credenciales privadas, pedir a algun miembro del equipo.



> [!Paso 3: ] Inicia el proyecto
> uvicorn app.main:app --reload

> [!Paso 4: ] Inicia el frontend
> cd frontend
> npm run dev


> [!Dato: ] Como restaurar el docker.
> docker compose down -v
> docker compose up -d
> recorda que necesitas el docker desktop abierto para correr. si estas en win.