Link: https://youtu.be/zzOwU41UjTM


## Parte A: Crear el proyecto.
### Como crear un proyecto de cero:

> [!Paso 0: ]
> Crea una carpeta y abrí el Visual Code en el folder y abrí una terminal.


> [!Paso 1: Crear el entorno Virtual]
> python -m venv venv


> [!Paso 2: Activarlo]
> .\venv\Scripts\activate


> [!Paso 3: Instale las dependencias]
> pip install fastapi uvicorn sqlalchemy pymysql

---
## Parte B: Crear la base de datos.

Desde la carpeta asignada para crear el proyecto (la mia es "FastApi_MySQL") vas a crear un archivo llamado "database.py"

Dentro de este archivo ponemos: 

> [!database.py]
> from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
URL_DATABASE = ''
engine = create_engine(URL_DATABASE)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

Luego crearemos otro file en la misma carpeta llamado "models.py"

> [!Models.py] 
> from sqlalchemy import Boolean, Column, Integer, String
from database import Base
