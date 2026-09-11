"""
app/notificaciones/email.py
────────────────────────────
Envío de emails vía SMTP genérico (stdlib, sin dependencias nuevas ni
servicios pagos — funciona con Gmail + contraseña de aplicación, o
cualquier otro proveedor SMTP estándar, según lo que se cargue en .env).

Variables de entorno:
  SMTP_HOST      obligatoria para poder enviar (si falta, se loguea y no se
                 envía nada — nunca rompe al caller).
  SMTP_PORT      default 587
  SMTP_USER      usuario de autenticación
  SMTP_PASSWORD  contraseña (o contraseña de aplicación)
  SMTP_FROM      remitente que ve el destinatario (default: SMTP_USER)
  SMTP_USE_TLS   "true"/"false", default true (STARTTLS)
"""

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List

logger = logging.getLogger(__name__)


def enviar_email(destinatario: str, asunto: str, cuerpo_html: str, cuerpo_texto: str) -> bool:
    """
    Envía un email. Devuelve True si se envió, False si no se pudo (SMTP no
    configurado, o falló el envío) — nunca lanza, para que un email caído no
    tumbe al caller (job del scheduler, endpoint de verificación, etc.).
    """
    host = os.getenv("SMTP_HOST")
    if not host:
        logger.warning("[Email] SMTP_HOST no configurado — no se envía nada (destinatario: %s)", destinatario)
        return False

    port      = int(os.getenv("SMTP_PORT", "587"))
    user      = os.getenv("SMTP_USER")
    password  = os.getenv("SMTP_PASSWORD")
    remitente = os.getenv("SMTP_FROM", user)
    usar_tls  = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

    mensaje = MIMEMultipart("alternative")
    mensaje["Subject"] = asunto
    mensaje["From"]    = remitente
    mensaje["To"]      = destinatario
    mensaje.attach(MIMEText(cuerpo_texto, "plain"))
    mensaje.attach(MIMEText(cuerpo_html, "html"))

    try:
        with smtplib.SMTP(host, port, timeout=10) as server:
            if usar_tls:
                server.starttls()
            if user and password:
                server.login(user, password)
            server.sendmail(remitente, [destinatario], mensaje.as_string())
        return True
    except Exception as e:
        logger.error("[Email] Error enviando a %s: %s", destinatario, e)
        return False


def enviar_digest_notificaciones(destinatario: str, tenant_nombre: str, mensajes: List[str]) -> bool:
    """
    Un solo mail por destinatario con todas las notificaciones nuevas de una
    corrida del job (no un mail por alerta — un SMTP gratuito tiene límite
    diario real, y esto además evita bombardear al usuario).
    """
    items_html  = "".join(f"<li>{m}</li>" for m in mensajes)
    items_texto = "\n".join(f"- {m}" for m in mensajes)

    return enviar_email(
        destinatario=destinatario,
        asunto=f"FlexInventory — {len(mensajes)} notificación(es) nueva(s) en {tenant_nombre}",
        cuerpo_html=f"<p>Hay {len(mensajes)} notificación(es) nueva(s) en <b>{tenant_nombre}</b>:</p><ul>{items_html}</ul>",
        cuerpo_texto=f"Hay {len(mensajes)} notificación(es) nueva(s) en {tenant_nombre}:\n\n{items_texto}",
    )
