from fastapi import Request, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from app.Core.auth import get_current_user
from app.db_config import get_db, get_tenant_db_context
from app.Core.models import Tenant
from app.auditoria.models import AuditLog 
from app.tenant.models import Item, Inventario, Catalogo 

class Auditor:
    def __init__(self, accion: str, auditar_payload: bool = False):
        """
        :param accion: Nombre legible para humanos (ej: "Actualizar Stock")
        :param auditar_payload: Si es True, intentará guardar el JSON que mandó el frontend
        """
        self.accion = accion
        self.auditar_payload = auditar_payload

    def _guardar_en_db(self, schema_name: str, usuario_id: int, usuario: str, 
                       endpoint: str, metodo: str, payload: dict | None, 
                       entidad_afectada: str, resumen: str | None):
        """Método privado que se ejecuta de fondo usando el context manager del tenant"""
        with get_tenant_db_context(schema_name) as tdb:
            nuevo_log = AuditLog(
                usuario_id=usuario_id,
                usuario=usuario,
                endpoint=endpoint,
                metodo=metodo,
                accion=self.accion,
                payload_cambios=payload,
                entidad_afectada=entidad_afectada, 
                resumen=resumen 
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
        
        usuario_id = current_user.get("id")
        nombre_usuario = current_user.get("username", "Desconocido")
        tenant_id = current_user.get("tenant_id")

        tenant = db_public.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            return 

        entidad_nombre = "Desconocido"
        resumen = None 
        payload_original = None

        if self.auditar_payload and request.method in ["POST", "PUT", "PATCH"]:
            try:
                payload_original = await request.json()
            except Exception:
                pass
        elif request.method == "DELETE":
            payload_original = dict(request.path_params)
            if self.auditar_payload:
                # Soporta DELETEs con body (ej: bulk-delete); si no hay body, quedan los path params
                try:
                    body = await request.json()
                    if body:
                        payload_original = body
                except Exception:
                    pass

        if request.method == "POST" and isinstance(payload_original, dict):
            nombre_base = payload_original.get("nombre", "Desconocido")
            
            if "items" in request.url.path:
                entidad_nombre = f"Artículo: {nombre_base}"
            elif "catalogos" in request.url.path:
                entidad_nombre = f"Catálogo: {nombre_base}"
            elif "inventarios" in request.url.path:
                entidad_nombre = f"Inventario: {nombre_base}"
            else:
                entidad_nombre = nombre_base
                
            resumen = "Registro inicial creado"

        elif request.method in ["PUT", "PATCH", "DELETE"]:
            path_params = request.path_params
            entidad_id = path_params.get("item_id") or path_params.get("inventario_id") or path_params.get("catalogo_id")
            
            if entidad_id:
                with get_tenant_db_context(tenant.schema_name) as db_tenant:
                    entidad_db = None
                    prefijo = ""
                    
                    if "items" in request.url.path:
                        entidad_db = db_tenant.query(Item).filter(Item.id == entidad_id).first()
                        prefijo = "Artículo: "
                    elif "inventarios" in request.url.path:
                        entidad_db = db_tenant.query(Inventario).filter(Inventario.id == entidad_id).first()
                        prefijo = "Inventario: "
                    elif "catalogos" in request.url.path:
                        entidad_db = db_tenant.query(Catalogo).filter(Catalogo.id == entidad_id).first()
                        prefijo = "Catálogo: "
                    
                    if entidad_db:
                        nombre_base = getattr(entidad_db, "nombre", str(entidad_id))
                        entidad_nombre = f"{prefijo}{nombre_base}" 
                        
                        if request.method in ["PUT", "PATCH"] and isinstance(payload_original, dict):
                            cambios = []
                            for key, nuevo_valor in payload_original.items():
                                if hasattr(entidad_db, key):
                                    viejo_valor = getattr(entidad_db, key)
                                    
                                    if key == "atributos" and isinstance(viejo_valor, dict) and isinstance(nuevo_valor, dict):
                                        for attr_key, attr_nuevo in nuevo_valor.items():
                                            attr_viejo = viejo_valor.get(attr_key)
                                            if str(attr_viejo) != str(attr_nuevo):
                                                cambios.append(f"{attr_key.title()}: {attr_viejo} ➔ {attr_nuevo}")
                                        continue 

                                    if str(viejo_valor) != str(nuevo_valor):
                                        nombre_campo = "Stock" if key == "cantidad" else key.replace("_", " ").title()
                                        cambios.append(f"{nombre_campo}: {viejo_valor} ➔ {nuevo_valor}")
                            
                            resumen = " | ".join(cambios) if cambios else "Sin cambios detectados"

            if request.method == "DELETE":
                if isinstance(payload_original, dict) and "item_ids" in payload_original:
                    cantidad = len(payload_original["item_ids"])
                    entidad_nombre = f"Artículos: {cantidad} ítems"
                    resumen = f"Eliminación masiva de {cantidad} ítems"
                else:
                    resumen = "Eliminado permanentemente"

        if usuario_id:
            background_tasks.add_task(
                self._guardar_en_db,
                schema_name=tenant.schema_name,
                usuario_id=usuario_id,
                usuario=nombre_usuario,
                endpoint=request.url.path,
                metodo=request.method,
                payload=payload_original,
                entidad_afectada=entidad_nombre,
                resumen=resumen
            )