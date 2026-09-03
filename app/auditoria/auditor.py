#from __future__ import annotations
from fastapi import Request, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from app.Core.auth import get_current_user
from app.db_config import get_db, get_tenant_db_context
from app.Core.models import Tenant
from app.auditoria.models import AuditLog 
from app.tenant.models import Item, Inventario, Catalogo
from app.tenant.validators import parse_value_by_type

SIN_CAMBIOS = "Sin cambios detectados"

MAX_NOMBRES = 15


def _fmt(valor) -> str:
    if valor is None or valor == "":
        return "(vacío)"
    if isinstance(valor, bool):
        return "Sí" if valor else "No"
    return str(valor)


def _listar_nombres(nombres) -> str:
    """Lista los nombres afectados por una operación masiva, con tope."""
    limpios = [_fmt(n) for n in nombres]
    if len(limpios) <= MAX_NOMBRES:
        return ", ".join(limpios)
    visibles = ", ".join(limpios[:MAX_NOMBRES])
    return f"{visibles} …y {len(limpios) - MAX_NOMBRES} más"


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
                resumen=resumen, 
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
                try:
                    body = await request.json()
                    if body:
                        payload_original = body
                except Exception:
                    pass

        path = request.url.path
        pp = request.path_params

        def _nombre(modelo, entidad_id):
            if not entidad_id:
                return None
            with get_tenant_db_context(tenant.schema_name) as db_t:
                obj = db_t.query(modelo).filter(modelo.id == entidad_id).first()
                return getattr(obj, "nombre", None) if obj else None

        def _label(campo: str) -> str:
            return "Stock" if campo == "cantidad" else campo.replace("_", " ").title()

        if path.endswith("/imagen"):
            nombre = _nombre(Item, pp.get("item_id"))
            entidad_nombre = f"Artículo: {nombre}" if nombre else "Artículo"
            resumen = "Foto eliminada" if request.method == "DELETE" else "Foto actualizada"

        elif path.endswith("/bulk-update") and isinstance(payload_original, dict):
            ids = payload_original.get("item_ids") or []
            attrs = payload_original.get("atributos") or {}

            cambios = []
            nombres_cambiados = []
            if ids and attrs:
                with get_tenant_db_context(tenant.schema_name) as db_t:
                    items = db_t.query(Item).filter(Item.id.in_(ids)).all()
                    filas = [(it.nombre, dict(it.atributos or {})) for it in items]
                    tipos = {}
                    if items:
                        inv = db_t.query(Inventario).filter(Inventario.id == items[0].inventario_id).first()
                        tipos = dict(inv.atributos or {}) if inv else {}

                attrs_norm = {}
                for campo, nuevo in attrs.items():
                    try:
                        attrs_norm[campo] = parse_value_by_type(nuevo, tipos[campo]) if campo in tipos else nuevo
                    except ValueError:
                        attrs_norm[campo] = nuevo

                nombres_cambiados = [
                    nombre for nombre, viejos in filas
                    if any(str(viejos.get(campo)) != str(nuevo) for campo, nuevo in attrs_norm.items())
                ]

                for campo, nuevo in attrs_norm.items():
                    grupos = {}
                    for _, atributos_viejos in filas:
                        viejo = atributos_viejos.get(campo)
                        if str(viejo) != str(nuevo):
                            grupos[viejo] = grupos.get(viejo, 0) + 1

                    for viejo, cuantos in grupos.items():
                        plural = "ítems" if cuantos != 1 else "ítem"
                        cambios.append(f"{_label(campo)}: {_fmt(viejo)} ➔ {_fmt(nuevo)} ({cuantos} {plural})")

            n_cambiados = len(nombres_cambiados)
            entidad_nombre = f"Artículos: {n_cambiados} {'ítem' if n_cambiados == 1 else 'ítems'}"

            if cambios:
                cambios.append(f"Artículos: {_listar_nombres(nombres_cambiados)}")
                resumen = " | ".join(cambios)
            else:
                resumen = SIN_CAMBIOS

        elif path.endswith("/bulk-delete") and isinstance(payload_original, dict):
            ids = payload_original.get("item_ids") or []
            entidad_nombre = f"Artículos: {len(ids)} ítems"

            nombres_afectados = []
            if ids:
                with get_tenant_db_context(tenant.schema_name) as db_t:
                    nombres_afectados = [
                        it.nombre for it in db_t.query(Item).filter(Item.id.in_(ids)).all()
                    ]

            resumen = f"Eliminación masiva de {len(ids)} ítems"
            if nombres_afectados:
                resumen += f" | Artículos: {_listar_nombres(nombres_afectados)}"

        elif "/catalogos/" in path and path.endswith("/items") and request.method == "POST":
            nombre = _nombre(Catalogo, pp.get("catalogo_id"))
            entidad_nombre = f"Catálogo: {nombre}" if nombre else "Catálogo"
            n = len(payload_original.get("item_ids", [])) if isinstance(payload_original, dict) else 0
            resumen = f"{n} artículo(s) agregado(s) al catálogo" if n else "Artículos agregados al catálogo"

        elif "/catalogos/" in path and "/items/" in path and request.method == "DELETE":
            nombre = _nombre(Item, pp.get("item_id"))
            entidad_nombre = f"Artículo: {nombre}" if nombre else "Artículo"
            resumen = "Removido del catálogo"

        elif request.method == "POST" and isinstance(payload_original, dict):
            nombre_base = payload_original.get("nombre", "Desconocido")
            if "items" in path:
                entidad_nombre = f"Artículo: {nombre_base}"
            elif "catalogos" in path:
                entidad_nombre = f"Catálogo: {nombre_base}"
            elif "inventarios" in path:
                entidad_nombre = f"Inventario: {nombre_base}"
            else:
                entidad_nombre = nombre_base
            resumen = "Registro inicial creado"

        elif request.method in ["PUT", "PATCH", "DELETE"]:
            entidad_id = pp.get("item_id") or pp.get("inventario_id") or pp.get("catalogo_id")

            if entidad_id:
                with get_tenant_db_context(tenant.schema_name) as db_tenant:
                    entidad_db = None
                    prefijo = ""

                    if "items" in path:
                        entidad_db = db_tenant.query(Item).filter(Item.id == entidad_id).first()
                        prefijo = "Artículo: "
                    elif "inventarios" in path:
                        entidad_db = db_tenant.query(Inventario).filter(Inventario.id == entidad_id).first()
                        prefijo = "Inventario: "
                    elif "catalogos" in path:
                        entidad_db = db_tenant.query(Catalogo).filter(Catalogo.id == entidad_id).first()
                        prefijo = "Catálogo: "

                    if entidad_db:
                        nombre_base = getattr(entidad_db, "nombre", str(entidad_id))
                        entidad_nombre = f"{prefijo}{nombre_base}"

                        if request.method in ["PUT", "PATCH"] and isinstance(payload_original, dict):
                            cambios = []
                            for key, nuevo_valor in payload_original.items():
                                if not hasattr(entidad_db, key):
                                    continue
                                viejo_valor = getattr(entidad_db, key)

                                if key == "atributos" and isinstance(viejo_valor, dict) and isinstance(nuevo_valor, dict):
                                    for attr_key, attr_nuevo in nuevo_valor.items():
                                        attr_viejo = viejo_valor.get(attr_key)
                                        if str(attr_viejo) != str(attr_nuevo):
                                            cambios.append(f"{_label(attr_key)}: {_fmt(attr_viejo)} ➔ {_fmt(attr_nuevo)}")
                                    continue

                                if isinstance(nuevo_valor, (dict, list)) or isinstance(viejo_valor, (dict, list)):
                                    if str(viejo_valor) != str(nuevo_valor):
                                        cambios.append(f"{_label(key)}: actualizado")
                                    continue

                                if str(viejo_valor) != str(nuevo_valor):
                                    cambios.append(f"{_label(key)}: {_fmt(viejo_valor)} ➔ {_fmt(nuevo_valor)}")

                            resumen = " | ".join(cambios) if cambios else SIN_CAMBIOS

            if request.method == "DELETE":
                resumen = "Eliminado permanentemente"

        if resumen is None:
            if request.method == "POST":
                resumen = "Registro creado"
            elif request.method == "DELETE":
                resumen = "Registro eliminado"
            else:
                resumen = "Registro actualizado"

        if usuario_id and resumen != SIN_CAMBIOS:
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