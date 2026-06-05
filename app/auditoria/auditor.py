from fastapi import Request, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from app.Core.auth import get_current_user
from app.db_config import get_db, get_tenant_db_context
from app.Core.models import Tenant
from app.auditoria.models import AuditLog 

class Auditor:
    def __init__(self, accion: str, auditar_payload: bool = False):
        """
        :param accion: Nombre legible para humanos (ej: "Actualizar Stock")
        :param auditar_payload: Si es True, intentará guardar el JSON que mandó el frontend
        """
        self.accion = accion
        self.auditar_payload = auditar_payload

    def _guardar_en_db(self, schema_name: str, usuario_id: int, usuario:str, endpoint: str, metodo: str, payload: dict | None):
        """Método privado que se ejecuta de fondo usando el context manager del tenant"""
        with get_tenant_db_context(schema_name) as tdb:
            nuevo_log = AuditLog(
                usuario_id=usuario_id,
                usuario=usuario,
                endpoint=endpoint,
                metodo=metodo,
                accion=self.accion,
                payload_cambios=payload
            )
            tdb.add(nuevo_log)
            tdb.commit()

    async def __call__(
        self,
        request: Request,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user),
        db_public: Session = Depends(get_db)
    ):
        """Convierte la clase en una dependencia de FastAPI"""
        
        # 1. Obtener información vital del usuario
        usuario_id = current_user.get("id")
        nombre_usuario = current_user.get("username")
        tenant_id = current_user.get("tenant_id")

        # 2. Buscar el schema_name del tenant en la base de datos pública
        tenant = db_public.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            return # Seguridad extra: si no hay tenant, ignoramos silenciosamente el log

        # 3. Leer el payload (body) si se solicitó y es una petición de escritura
        payload = None
        if self.auditar_payload and request.method in ["POST", "PUT", "PATCH"]:
            try:
                payload = await request.json()
                if payload:
                    payload.pop("password", None)
                    payload.pop("contraseña", None)
                    payload.pop("token", None)
            except Exception:
                pass
        elif request.method == "DELETE":
            payload = dict(request.path_params)
            if request.query_params:
                payload.update(dict(request.query_params))

        # 4. Mandar a BackgroundTasks usando la versión moderna de Python
        background_tasks.add_task(
            self._guardar_en_db,
            schema_name=tenant.schema_name,
            usuario_id=usuario_id,
            usuario=nombre_usuario,
            endpoint=request.url.path,
            metodo=request.method,
            payload=payload
        )