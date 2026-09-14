#from __future__ import annotations
import re
from datetime import datetime

from fastapi import Request, BackgroundTasks, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.Core.auth import get_current_user
from app.db_config import get_db, get_tenant_db_context
from app.Core.models import Tenant
from app.auditoria.models import AuditLog 
from app.tenant.models import Item, Inventario, Catalogo
from app.tenant.validators import parse_value_by_type

SIN_CAMBIOS = "Sin cambios detectados"

MAX_NOMBRES = 15

# Mismo guion que usa la tabla de inventario para una celda sin valor
# (CELDA_VACIA en InventoryTable.tsx) — antes decía "(vacío)".
VACIO = "—"

# Copia de utils/formatearUnidad.ts: cómo se pega la unidad al número.
_SIMBOLOS_MONEDA = "$€£¥₡₩₱₪₫₴₦₲฿₸"
_CODIGOS_MONEDA = {
    "USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD", "AUD",
    "ARS", "BRL", "CLP", "MXN", "UYU", "PEN", "COP", "BOB", "PYG", "VES",
}


def _fmt(valor) -> str:
    if valor is None or valor == "":
        return VACIO
    if isinstance(valor, bool):
        return "Sí" if valor else "No"
    return str(valor)


def _con_unidad(texto: str, unidad: str | None) -> str:
    u = (unidad or "").strip()
    if not u:
        return texto
    if any(s in u for s in _SIMBOLOS_MONEDA):          # $100
        return f"{u}{texto}"
    if re.fullmatch(r"[A-Za-z]{2,4}", u) and u.upper() in _CODIGOS_MONEDA:  # USD 100
        return f"{u} {texto}"
    return f"{texto} {u}"                               # 100 kg


def _fmt_atributo(valor, tipo: str | None, unidad: str | None) -> str:
    """
    Formatea el valor de un atributo de item IGUAL que lo muestra la tabla
    de inventario en el frontend (InventoryTable.tsx): decimales siempre con
    dos dígitos, unidad/moneda pegada, fechas DD/MM/YYYY, booleanos Sí/No,
    vacío como "—". Así el historial dice "$0.40" donde el inventario dice
    "$0.40", y no "0.4".

    También sirve para comparar: dos valores que se formatean igual
    (30000.0 y 30000) NO son un cambio, aunque como strings crudos difieran.
    """
    if valor is None or valor == "":
        return VACIO
    t = (tipo or "").lower().strip()

    if t in ("boolean", "bool") or isinstance(valor, bool):
        verdadero = valor if isinstance(valor, bool) else str(valor).lower() == "true"
        return "Sí" if verdadero else "No"

    if t == "date":
        try:
            return datetime.strptime(str(valor)[:10], "%Y-%m-%d").strftime("%d/%m/%Y")
        except ValueError:
            return str(valor)

    if t in ("float", "number"):
        try:
            return _con_unidad(f"{float(valor):.2f}", unidad)
        except (TypeError, ValueError):
            return _con_unidad(str(valor), unidad)

    if t in ("integer", "int", "natural"):
        try:
            return _con_unidad(str(int(float(valor))), unidad)
        except (TypeError, ValueError):
            return _con_unidad(str(valor), unidad)

    return str(valor)


# Separador entre las entidades de una operación ("Artículo: X · Inventario:
# Y · Catálogo: Z"). El frontend (AuditoriaTable.partirEntidades) lo parte
# por este mismo string — cambiarlo acá es cambiarlo allá.
SEP_ENTIDADES = " · "


def _cadena(*partes: tuple[str, str | None]) -> str:
    """
    Arma entidad_afectada como cadena "Tipo: Nombre · Tipo: Nombre",
    salteando las partes sin nombre (inventario que no se pudo resolver, etc.).
    Así el historial dice de DÓNDE es el artículo y A QUÉ catálogo fue,
    no solo el nombre suelto.
    """
    # Sin tipo ("3 artículos") va el nombre solo, sin los dos puntos.
    return SEP_ENTIDADES.join(f"{tipo}: {nombre}" if tipo else nombre for tipo, nombre in partes if nombre)


def _n_articulos(n: int) -> str:
    return f"{n} {'artículo' if n == 1 else 'artículos'}"


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

        def _nombre_inventario(db_t, inventario_id) -> str | None:
            if not inventario_id:
                return None
            inv = db_t.query(Inventario).filter(Inventario.id == inventario_id).first()
            return inv.nombre if inv else None

        def _item_e_inventario(item_id) -> tuple[str | None, str | None]:
            """(nombre del artículo, nombre de su inventario) — o Nones."""
            if not item_id:
                return None, None
            with get_tenant_db_context(tenant.schema_name) as db_t:
                it = db_t.query(Item).filter(Item.id == item_id).first()
                if not it:
                    return None, None
                return it.nombre, _nombre_inventario(db_t, it.inventario_id)

        def _foto_es_parte_del_alta(item_id) -> bool:
            """
            True si esta subida de foto es el segundo paso del alta de un
            artículo: el frontend crea el item (POST /items/) y recién con el
            id sube la foto (POST /items/{id}/imagen), así que quedaban dos
            movimientos por una sola acción del usuario. Se reconoce porque
            el item todavía NO tiene foto y fue creado hace segundos. No es un
            flag que mande el cliente a propósito — cualquiera podría usarlo
            para esconder cambios de foto de artículos viejos.
            """
            if not item_id:
                return False
            with get_tenant_db_context(tenant.schema_name) as db_t:
                fila = db_t.execute(
                    text(
                        "SELECT imagen IS NULL AND creado_en > now() - interval '60 seconds' "
                        "FROM item WHERE id = :id"
                    ),
                    {"id": item_id},
                ).scalar()
                return bool(fila)

        def _label(campo: str) -> str:
            return "Stock" if campo == "cantidad" else campo.replace("_", " ").title()

        # Cuando queda en True, la request no genera registro (ver el final).
        omitir_registro = False

        if path.endswith("/imagen"):
            nombre, inv_nombre = _item_e_inventario(pp.get("item_id"))
            entidad_nombre = _cadena(("Artículo", nombre or "?"), ("Inventario", inv_nombre))
            resumen = "Foto eliminada" if request.method == "DELETE" else "Foto actualizada"
            if request.method == "POST" and _foto_es_parte_del_alta(pp.get("item_id")):
                omitir_registro = True

        elif path.endswith("/bulk-update") and isinstance(payload_original, dict):
            ids = payload_original.get("item_ids") or []
            attrs = payload_original.get("atributos") or {}

            cambios = []
            nombres_cambiados = []
            inv_nombre = None
            if ids and attrs:
                with get_tenant_db_context(tenant.schema_name) as db_t:
                    items = db_t.query(Item).filter(Item.id.in_(ids)).all()
                    filas = [(it.nombre, dict(it.atributos or {})) for it in items]
                    tipos, unidades = {}, {}
                    if items:
                        # La edición masiva es siempre dentro de un inventario.
                        inv = db_t.query(Inventario).filter(Inventario.id == items[0].inventario_id).first()
                        if inv:
                            inv_nombre = inv.nombre
                            tipos    = dict(inv.atributos or {})
                            unidades = dict(inv.unidades or {})

                attrs_norm = {}
                for campo, nuevo in attrs.items():
                    try:
                        attrs_norm[campo] = parse_value_by_type(nuevo, tipos[campo]) if campo in tipos else nuevo
                    except ValueError:
                        attrs_norm[campo] = nuevo

                # Mismo formato que la tabla del inventario, y se compara lo
                # formateado para no anotar cambios fantasma (30000.0 ➔ 30000).
                def _f(campo, valor):
                    return _fmt_atributo(valor, tipos.get(campo), unidades.get(campo))

                nombres_cambiados = [
                    nombre for nombre, viejos in filas
                    if any(_f(campo, viejos.get(campo)) != _f(campo, nuevo) for campo, nuevo in attrs_norm.items())
                ]

                # Un renglón por valor viejo distinto (si 3 ítems tenían $0.35
                # y 2 tenían $0.50, salen dos renglones). Sin la cuenta entre
                # paréntesis: el total ya va en entidad_afectada y los nombres
                # al final del resumen.
                for campo, nuevo in attrs_norm.items():
                    viejos_distintos = []
                    for _, atributos_viejos in filas:
                        viejo = _f(campo, atributos_viejos.get(campo))
                        if viejo != _f(campo, nuevo) and viejo not in viejos_distintos:
                            viejos_distintos.append(viejo)

                    for viejo in viejos_distintos:
                        cambios.append(f"{_label(campo)}: {viejo} ➔ {_f(campo, nuevo)}")

            n_cambiados = len(nombres_cambiados)
            entidad_nombre = _cadena(
                ("", _n_articulos(n_cambiados)),
                ("Inventario", inv_nombre),
            )

            if cambios:
                cambios.append(f"Artículos: {_listar_nombres(nombres_cambiados)}")
                resumen = " | ".join(cambios)
            else:
                resumen = SIN_CAMBIOS

        elif path.endswith("/bulk-delete") and isinstance(payload_original, dict):
            ids = payload_original.get("item_ids") or []

            nombres_afectados = []
            inv_nombre = None
            if ids:
                with get_tenant_db_context(tenant.schema_name) as db_t:
                    items = db_t.query(Item).filter(Item.id.in_(ids)).all()
                    nombres_afectados = [it.nombre for it in items]
                    if items:
                        inv_nombre = _nombre_inventario(db_t, items[0].inventario_id)

            entidad_nombre = _cadena(("", _n_articulos(len(ids))), ("Inventario", inv_nombre))
            resumen = f"Eliminación masiva de {_n_articulos(len(ids))}"
            if nombres_afectados:
                resumen += f" | Artículos: {_listar_nombres(nombres_afectados)}"

        elif "/catalogos/" in path and path.endswith("/items") and request.method == "POST":
            # Se nombran las dos puntas: qué artículos (y de qué inventario
            # viene cada uno) y a qué catálogo fueron.
            nombre = _nombre(Catalogo, pp.get("catalogo_id"))
            ids = payload_original.get("item_ids", []) if isinstance(payload_original, dict) else []

            etiquetas = []
            if ids:
                with get_tenant_db_context(tenant.schema_name) as db_t:
                    items = db_t.query(Item).filter(Item.id.in_(ids)).all()
                    invs = {}
                    for it in items:
                        if it.inventario_id not in invs:
                            invs[it.inventario_id] = _nombre_inventario(db_t, it.inventario_id)
                        inv_nombre = invs[it.inventario_id]
                        etiquetas.append(f"{it.nombre} ({inv_nombre})" if inv_nombre else it.nombre)

            n = len(etiquetas) or len(ids)
            entidad_nombre = _cadena(
                ("Artículo", etiquetas[0]) if n == 1 and etiquetas else ("", _n_articulos(n)),
                ("Catálogo", nombre),
            )
            if n == 1:
                resumen = "Agregado al catálogo"
            else:
                resumen = f"{n} artículos agregados al catálogo"
                if etiquetas:
                    resumen += f" | Artículos: {_listar_nombres(etiquetas)}"

        elif "/catalogos/" in path and "/items/" in path and request.method == "DELETE":
            nombre, inv_nombre = _item_e_inventario(pp.get("item_id"))
            cat_nombre = _nombre(Catalogo, pp.get("catalogo_id"))
            entidad_nombre = _cadena(
                ("Artículo", nombre or "?"), ("Inventario", inv_nombre), ("Catálogo", cat_nombre),
            )
            resumen = "Removido del catálogo"

        elif request.method == "POST" and isinstance(payload_original, dict):
            nombre_base = payload_original.get("nombre", "Desconocido")
            if "items" in path:
                with get_tenant_db_context(tenant.schema_name) as db_t:
                    inv_nombre = _nombre_inventario(db_t, payload_original.get("inventario_id"))
                entidad_nombre = _cadena(("Artículo", nombre_base), ("Inventario", inv_nombre))
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

                        # Schema y unidades del inventario del item, para
                        # formatear (y comparar) sus atributos como los ve el
                        # usuario en la tabla. Para inventarios/catálogos
                        # `atributos` es el schema en sí, no valores: ahí se
                        # sigue mostrando crudo. De paso, el nombre del
                        # inventario va a la cadena de entidades.
                        tipos, unidades = {}, {}
                        if isinstance(entidad_db, Item):
                            inv = db_tenant.query(Inventario).filter(Inventario.id == entidad_db.inventario_id).first()
                            if inv:
                                tipos    = dict(inv.atributos or {})
                                unidades = dict(inv.unidades or {})
                                entidad_nombre = _cadena(("Artículo", nombre_base), ("Inventario", inv.nombre))

                        if request.method in ["PUT", "PATCH"] and isinstance(payload_original, dict):
                            cambios = []
                            for key, nuevo_valor in payload_original.items():
                                if not hasattr(entidad_db, key):
                                    continue
                                viejo_valor = getattr(entidad_db, key)

                                if key == "atributos" and isinstance(viejo_valor, dict) and isinstance(nuevo_valor, dict):
                                    for attr_key, attr_nuevo in nuevo_valor.items():
                                        attr_viejo = viejo_valor.get(attr_key)
                                        if isinstance(entidad_db, Item):
                                            antes   = _fmt_atributo(attr_viejo, tipos.get(attr_key), unidades.get(attr_key))
                                            despues = _fmt_atributo(attr_nuevo, tipos.get(attr_key), unidades.get(attr_key))
                                        else:
                                            antes, despues = _fmt(attr_viejo), _fmt(attr_nuevo)
                                        # Se compara lo formateado: 30000.0 y
                                        # 30000 son el mismo valor, no un cambio.
                                        if antes != despues:
                                            cambios.append(f"{_label(attr_key)}: {antes} ➔ {despues}")
                                    continue

                                # Unidades del inventario ({atributo: símbolo}):
                                # un renglón por atributo cuya unidad cambió,
                                # en vez de un "Unidades: actualizado" mudo.
                                if key == "unidades" and isinstance(viejo_valor, dict) and isinstance(nuevo_valor, dict):
                                    for attr_key in sorted(set(viejo_valor) | set(nuevo_valor)):
                                        u_vieja = (viejo_valor.get(attr_key) or "").strip()
                                        u_nueva = (nuevo_valor.get(attr_key) or "").strip()
                                        if u_vieja != u_nueva:
                                            cambios.append(f"Unidad de {_label(attr_key)}: {_fmt(u_vieja)} ➔ {_fmt(u_nueva)}")
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

        if usuario_id and resumen != SIN_CAMBIOS and not omitir_registro:
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