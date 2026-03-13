
una libreria que se usa es:

> [!NOTE]
> pip install "python-jose[cryptography]"
> pip install "passlib[bcrypt]"
> pip install python-multipart

cosas que ya deberian estar instaladas:
fastapi, uvicorn, SQLalchemy


> [!Run the main.py]
> uvicorn main:app --reload


yo tuve el problema de la modificacion de la nueva libreria bcrypt, lo solucione con este comando:

> [!modificar esta libreria]
> pip install "bcrypt<4.0.0"

esto hace que funcione de la manera anterior. (Evitando el error pelotudo que tiraba)