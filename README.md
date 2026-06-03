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