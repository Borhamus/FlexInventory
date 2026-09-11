from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.auditoria.auditor import Auditor
from app.tenant import schemas, models
from app.tenant.dependencies import get_tenant_db, require_permission
from app.tenant.validators import TYPE_DEFAULTS, validate_inventario_atributos, parse_value_by_type, validate_unidades
from app.tenant.roles_atributos import validate_roles_atributos, clean_orphan_roles
from app.tenant.alertas import calcular_alertas
from app.tenant.bloques_personalizados import validar_bloques_personalizados, calcular_bloques, limpiar_bloques_huerfanos
from app.tenant.notificaciones_config import validar_notificaciones_config, limpiar_notificaciones_huerfanas, limpiar_notificaciones_item_huerfanas

router = APIRouter(prefix="/inventarios", tags=["Inventarios"])


def _perm(resource: str, action: str):
    return Depends(require_permission(resource, action))


# ─── Migración de valores al editar atributos (renombrar y/o cambiar tipo) ──
# Cuando el usuario edita un atributo (le cambia el nombre, el tipo, o
# ambos), decidimos si el valor que ya tienen los items se puede llevar al
# estado nuevo o si hay que descartarlo:
#   - Mismo tipo (haya cambiado el nombre o no): se copia tal cual, no hay
#     nada que convertir.
#   - Entero <-> real, o numérico -> texto: se convierte valor por valor
#     (ej. 5 -> "5", 5.0 -> 5). Un texto libre siempre es representable.
#   - Numérico -> natural: se convierte valor por valor conservando los >= 0
#     y descartando los negativos (parse_value_by_type tira ValueError y el
#     valor se descarta solo para ese item); los decimales se truncan. El
#     frontend avisa que "algunos valores pueden perderse" antes de guardar.
#   - Cualquier otra combinación (texto -> otra cosa, o cualquiera <-> fecha):
#     no hay forma confiable de adivinar el valor, así que se descarta en vez
#     de dejarlo mal tipado bajo el nombre/tipo nuevo. El frontend avisa de
#     esto ANTES de guardar (ver ModalEditInventory) para que no sea una
#     sorpresa.
_TIPOS_NUMERICOS = {"integer", "int", "natural", "float", "number"}


def _normalizar_tipo(tipo: str) -> str:
    if tipo in ("int",):
        return "integer"
    if tipo in ("number",):
        return "float"
    if tipo in ("str",):
        return "string"
    if tipo in ("bool",):
        return "boolean"
    return tipo


def _conversion_es_segura(tipo_viejo: str, tipo_nuevo: str) -> bool:
    tv, tn = _normalizar_tipo(tipo_viejo), _normalizar_tipo(tipo_nuevo)
    if tv == tn:
        return True
    if tv in _TIPOS_NUMERICOS and tn in _TIPOS_NUMERICOS:
        return True
    if tv in _TIPOS_NUMERICOS and tn == "string":
        return True
    return False


def _migrar_valor_en_dict(
    atrs: Dict[str, Any],
    clave_vieja: str,
    clave_nueva: str,
    tipo_viejo: str,
    tipo_nuevo: str,
) -> None:
    """
    Mueve (y si hace falta convierte) el valor de `clave_vieja` a
    `clave_nueva` DENTRO de un dict en memoria — no toca la base. Deliberadamente
    puro (sin `db`): todos los cambios sobre `item.atributos` de un mismo
    inventario se resuelven en una sola pasada por item más abajo, asignando
    el dict resultante una sola vez por fila. Mezclar acá un UPDATE crudo
    (SQL) con objetos ORM cargados en memoria para OTRO atributo de la misma
    fila es un bug real que ya nos mordió: el commit final vuelve a escribir
    el dict viejo que el ORM tenía en memoria y resucita lo que el UPDATE
    crudo acababa de borrar.
    """
    if clave_vieja not in atrs:
        return
    valor = atrs.pop(clave_vieja)
    if _conversion_es_segura(tipo_viejo, tipo_nuevo):
        try:
            atrs[clave_nueva] = parse_value_by_type(valor, _normalizar_tipo(tipo_nuevo))
        except (ValueError, TypeError):
            pass  # este valor puntual no convirtió: se descarta solo el de este item
    # si no hay conversión confiable, el valor queda descartado (ya se hizo
    # el pop de arriba) — el frontend avisa de esto antes de guardar.


# ─── DEPENDENCIAS DE AUDITORÍA: INVENTARIOS ─────────────────────────────
POST        = [Depends(Auditor(accion="Crear Inventario", auditar_payload=True))]
PUT         = [Depends(Auditor(accion="Editar Inventario", auditar_payload=True))]
DELETE      = [Depends(Auditor(accion="Eliminar Inventario", auditar_payload=True))]
PATCH_NOTIFICACIONES = [Depends(Auditor(accion="Configurar Notificaciones", auditar_payload=True))]
# ────────────────────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.InventarioResponse, status_code=201, dependencies=POST)
def create_inventario(
    inventario: schemas.InventarioCreate,
    _: dict = _perm("inventarios", "create"),
    db: Session = Depends(get_tenant_db),
):
    """
    Crea un nuevo inventario para el tenant. Un inventario agrupa items del mismo tipo
    y define los atributos que esos items deben tener (ej: color, talle, peso).

    Requiere permiso `inventarios:create` (o ser tenant owner).

    **Ejemplo de request:**
    ```json
    {
      "nombre": "Ropa deportiva",
      "atributos": { "color": "string", "talle": "string" }
    }
    ```
    """
    if db.query(models.Inventario).filter(models.Inventario.nombre == inventario.nombre).first():
        raise HTTPException(400, detail="El inventario ya existe")
    inv_data = inventario.model_dump()
    # Validar formato {nombre: tipo} y tipos permitidos (string/int/float/bool/date)
    if inv_data.get("atributos"):
        inv_data["atributos"] = validate_inventario_atributos(inv_data["atributos"])
    inv_data["unidades"] = validate_unidades(inv_data.get("unidades"), inv_data.get("atributos"))
    new_inv = models.Inventario(**inv_data)
    db.add(new_inv)
    db.flush()
    return new_inv


@router.get("/all", response_model=List[schemas.InventarioResponse])
def get_inventarios(
    _: dict = _perm("inventarios", "read"),
    db: Session = Depends(get_tenant_db),
):
    """
    Lista todos los inventarios del tenant.

    Requiere permiso `inventarios:read` (o ser tenant owner).
    """
    return db.query(models.Inventario).all()


@router.get("/alertas", response_model=List[schemas.AlertaVencimiento])
def get_alertas_vencimiento(
    dias: int = Query(7, ge=0, description="Ventana de aviso en días"),
    _: dict = _perm("inventarios", "read"),
    db: Session = Depends(get_tenant_db),
):
    """
    Items próximos a vencer o ya vencidos, en todos los inventarios del
    tenant que tengan configurado el rol `fecha_reposicion` (ver
    `PATCH /inventarios/{id}/roles`). Pensado para el dashboard: una sola
    llamada trae las alertas de todos los inventarios juntas, ordenadas de
    más urgente a menos (los vencidos, con días negativos, primero).

    Requiere permiso `inventarios:read` (o ser tenant owner).

    **Ejemplo:** `GET /inventarios/alertas?dias=7`
    """
    return calcular_alertas(db, dias)


@router.get("/{inventario_id}", response_model=schemas.InventarioWithItems)
def get_inventario(
    inventario_id: int,
    _: dict = _perm("inventarios", "read"),
    db: Session = Depends(get_tenant_db),
):
    """
    Devuelve el detalle de un inventario específico.

    Requiere permiso `inventarios:read` (o ser tenant owner).

    **Ejemplo:** `GET /inventarios/1`
    """
    inv = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not inv:
        raise HTTPException(404, detail="Inventario no encontrado")
    return inv


@router.put("/{inventario_id}", response_model=schemas.InventarioResponse, dependencies=PUT)
def update_inventario(
    inventario_id: int,
    inventario: schemas.InventarioUpdate,
    _: dict = _perm("inventarios", "update"),
    db: Session = Depends(get_tenant_db),
):
    """
    Actualiza el nombre, descripción o atributos de un inventario. Solo se modifican
    los campos que se envíen.

    Requiere permiso `inventarios:update` (o ser tenant owner).

    **Ejemplo de request:**
    ```json
    { "descripcion": "Nueva descripción" }
    ```
    """
    inv = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not inv:
        raise HTTPException(404, detail="Inventario no encontrado")
    update_data = inventario.model_dump(exclude_unset=True)
    provided_defaults = update_data.pop("defaults", None) or {}
    renombres_solicitados = update_data.pop("renombres_atributos", None) or {}

    # Pre-chequeo de nombre duplicado (columna UNIQUE → evita 500 por IntegrityError)
    if "nombre" in update_data and db.query(models.Inventario).filter(
        models.Inventario.nombre == update_data["nombre"],
        models.Inventario.id != inventario_id,
    ).first():
        raise HTTPException(400, detail=f"Ya existe un inventario llamado '{update_data['nombre']}'")

    if "atributos" in update_data:
        # Validar formato {nombre: tipo} y tipos permitidos
        if update_data["atributos"]:
            update_data["atributos"] = validate_inventario_atributos(update_data["atributos"])
        old_keys = set(inv.atributos.keys()) if inv.atributos else set()
        new_keys = set(update_data["atributos"].keys())

        # Renombres: pares (nombre_viejo -> nombre_nuevo) que el frontend arma
        # cuando el usuario edita el nombre de un atributo YA existente en vez
        # de borrarlo y agregar uno nuevo. Sin esto, corregir un typo en el
        # nombre se trataba como "borrar el viejo + crear el nuevo vacío",
        # perdiendo el valor de ese atributo en todos los items del inventario.
        # Solo se aceptan pares consistentes con lo que efectivamente cambió
        # (viejo existía, nuevo es parte del set final) — cualquier otro valor
        # mandado por el cliente se ignora en vez de confiar ciegamente en él.
        renombres = {
            viejo: nuevo
            for viejo, nuevo in renombres_solicitados.items()
            if viejo != nuevo and viejo in old_keys and nuevo in new_keys
        }
        removed = old_keys - new_keys - set(renombres.keys())
        added = new_keys - old_keys - set(renombres.values())
        # Atributos que no se borraron ni se renombraron, pero sí cambiaron
        # de tipo (ej. "Precio" pasó de texto a número): misma lógica de
        # conversión que un renombre, solo que la clave del JSONB no cambia.
        reescritos = {
            nombre for nombre in (old_keys & new_keys)
            if _normalizar_tipo(inv.atributos[nombre]) != _normalizar_tipo(update_data["atributos"][nombre])
        }

        # Todo lo anterior se aplica en una SOLA pasada por item, tocando el
        # dict de atributos en memoria y asignándolo una única vez por fila.
        # A propósito no se mezcla esto con UPDATEs crudos por separado (ver
        # el comentario en _migrar_valor_en_dict): terminaba resucitando
        # valores que ya se habían borrado.
        if removed or added or renombres or reescritos:
            defaults_nuevos = {
                k: provided_defaults.get(k, TYPE_DEFAULTS.get(update_data["atributos"][k], ""))
                for k in added
            }
            items = db.query(models.Item).filter(models.Item.inventario_id == inventario_id).all()
            for it in items:
                atrs = dict(it.atributos or {})
                for viejo in removed:
                    atrs.pop(viejo, None)
                for viejo, nuevo in renombres.items():
                    _migrar_valor_en_dict(atrs, viejo, nuevo, inv.atributos[viejo], update_data["atributos"][nuevo])
                for nombre in reescritos:
                    _migrar_valor_en_dict(atrs, nombre, nombre, inv.atributos[nombre], update_data["atributos"][nombre])
                for nuevo in added:
                    if nuevo not in atrs:
                        atrs[nuevo] = defaults_nuevos[nuevo]
                it.atributos = atrs
        # Si se borró o renombró un atributo que estaba configurado como rol
        # especial (ej. volumen_unitario), esa referencia queda colgando —
        # se limpia sola para que roles_atributos nunca apunte a algo inexistente.
        # Si en cambio el atributo se renombró (no se borró), el rol se
        # re-apunta al nombre nuevo en vez de perderse.
        if inv.roles_atributos:
            roles_actuales = {
                rol: renombres.get(atributo, atributo)
                for rol, atributo in inv.roles_atributos.items()
            }
            update_data["roles_atributos"] = clean_orphan_roles(roles_actuales, update_data["atributos"])
        # Mismo criterio para los bloques personalizados: si una métrica
        # quedó apuntando a un atributo borrado/renombrado, se descarta el
        # bloque entero (ver limpiar_bloques_huerfanos).
        if inv.bloques_personalizados:
            update_data["bloques_personalizados"] = limpiar_bloques_huerfanos(inv.bloques_personalizados, update_data["atributos"])
        # Unidades: reemplazo completo si el cliente las mandó; si no, se parte
        # de las actuales. En ambos casos se remapea el nombre de los atributos
        # renombrados y se descartan las de atributos borrados o que dejaron de
        # ser numéricos (validate_unidades filtra por tipo).
        unidades_base = update_data.get("unidades", inv.unidades or {}) or {}
        unidades_remapeadas = {renombres.get(k, k): v for k, v in unidades_base.items()}
        update_data["unidades"] = validate_unidades(unidades_remapeadas, update_data["atributos"])
        # Mismo criterio para la configuración de notificaciones (la parte
        # "atributos" — "cantidad" nunca queda huérfana, no depende del
        # esquema de atributos).
        if inv.notificaciones_config:
            update_data["notificaciones_config"] = limpiar_notificaciones_huerfanas(inv.notificaciones_config, update_data["atributos"])
        # Y los overrides puntuales de CADA ítem: un override es independiente
        # de si el inventario tiene o no un default para esa señal (ver
        # validar_notificaciones_item), así que se limpia acá contra el
        # esquema nuevo — no en el PATCH de notificaciones del inventario.
        for it in db.query(models.Item).filter(models.Item.inventario_id == inventario_id).all():
            if not it.notificaciones_config:
                continue
            nuevo_override = limpiar_notificaciones_item_huerfanas(it.notificaciones_config, update_data["atributos"])
            if nuevo_override != it.notificaciones_config:
                it.notificaciones_config = nuevo_override
    elif "unidades" in update_data:
        update_data["unidades"] = validate_unidades(update_data["unidades"], inv.atributos or {})
    for field, value in update_data.items():
        setattr(inv, field, value)
    db.commit()
    db.refresh(inv)
    return inv


@router.patch("/{inventario_id}/roles", response_model=schemas.InventarioResponse)
def configurar_roles_atributos(
    inventario_id: int,
    payload: schemas.RolesAtributosUpdate,
    _: dict = _perm("inventarios", "update"),
    db: Session = Depends(get_tenant_db),
):
    """
    Configura qué atributo del inventario cumple cada rol especial (ej:
    volumen_unitario, fecha_reposicion, proveedor). Reemplaza por completo
    el mapa de roles vigente — para quitar un rol, mandalo sin esa clave.

    Requiere permiso `inventarios:update` (o ser tenant owner).

    **Ejemplo de request** (inventario con atributos `{peso_m3: float}`):
    ```json
    { "roles_atributos": { "volumen_unitario": "peso_m3" } }
    ```
    """
    inv = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not inv:
        raise HTTPException(404, detail="Inventario no encontrado")

    inv.roles_atributos = validate_roles_atributos(payload.roles_atributos, inv.atributos or {})
    db.commit()
    db.refresh(inv)
    return inv


@router.patch("/{inventario_id}/bloques", response_model=schemas.InventarioResponse)
def configurar_bloques_personalizados(
    inventario_id: int,
    payload: schemas.BloquesPersonalizadosUpdate,
    _: dict = _perm("inventarios", "update"),
    db: Session = Depends(get_tenant_db),
):
    """
    Configura los bloques de estadística personalizados del inventario.
    Reemplaza por completo la lista vigente (mismo criterio que roles y
    atributos: se manda el estado completo que se quiere dejar).

    Requiere permiso `inventarios:update` (o ser tenant owner).
    """
    inv = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not inv:
        raise HTTPException(404, detail="Inventario no encontrado")

    bloques_dict = [b.model_dump() for b in payload.bloques_personalizados]
    inv.bloques_personalizados = validar_bloques_personalizados(bloques_dict, inv.atributos or {})
    db.commit()
    db.refresh(inv)
    return inv


@router.get("/{inventario_id}/bloques", response_model=List[schemas.BloqueCalculado])
def get_bloques_personalizados(
    inventario_id: int,
    _: dict = _perm("inventarios", "read"),
    db: Session = Depends(get_tenant_db),
):
    """
    Devuelve los bloques personalizados del inventario con sus métricas ya
    calculadas, listas para interpolar en la plantilla de cada uno.

    Requiere permiso `inventarios:read` (o ser tenant owner).
    """
    inv = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not inv:
        raise HTTPException(404, detail="Inventario no encontrado")
    return calcular_bloques(db, inv)


@router.patch("/{inventario_id}/notificaciones", response_model=schemas.InventarioResponse, dependencies=PATCH_NOTIFICACIONES)
def configurar_notificaciones(
    inventario_id: int,
    payload: schemas.NotificacionesConfigUpdate,
    _: dict = _perm("inventarios", "update"),
    db: Session = Depends(get_tenant_db),
):
    """
    Configura las reglas de notificación del inventario: qué atributos de
    fecha avisan (con recordatorio a N días antes) o vencen, qué atributos
    numéricos (o la Cantidad nativa del ítem) tienen un mínimo/máximo.
    Reemplaza por completo la configuración vigente (mismo criterio que
    roles y bloques: se manda el estado completo que se quiere dejar).

    Requiere permiso `inventarios:update` (o ser tenant owner).

    **Ejemplo de request** (inventario con atributos `{Vencimiento: date, Peso: float}`):
    ```json
    {
      "notificaciones_config": {
        "atributos": {
          "Vencimiento": {"tipo": "fecha", "recordatorio_dias": 7},
          "Peso": {"tipo": "numero", "minimo": 1, "maximo": 10}
        },
        "cantidad": {"minimo": 10}
      }
    }
    ```
    """
    inv = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not inv:
        raise HTTPException(404, detail="Inventario no encontrado")

    # Nota: los overrides puntuales por ítem son independientes de esta
    # config (ver validar_notificaciones_item) — no hay nada que limpiar acá
    # cuando cambia; la limpieza de overrides huérfanos vive en
    # update_inventario, disparada por cambios en el ESQUEMA de atributos.
    inv.notificaciones_config = validar_notificaciones_config(payload.notificaciones_config, inv.atributos or {})

    db.commit()
    db.refresh(inv)
    return inv


@router.delete("/{inventario_id}", status_code=204, dependencies=DELETE)
def delete_inventario(
    inventario_id: int,
    _: dict = _perm("inventarios", "delete"),
    db: Session = Depends(get_tenant_db),
):
    """
    Elimina un inventario permanentemente. También elimina todos los items asociados.

    Requiere permiso `inventarios:delete` (o ser tenant owner).

    **Ejemplo:** `DELETE /inventarios/1`
    """
    inv = db.query(models.Inventario).filter(models.Inventario.id == inventario_id).first()
    if not inv:
        raise HTTPException(404, detail="Inventario no encontrado")
    db.delete(inv)
    db.commit()
