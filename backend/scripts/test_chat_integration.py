import asyncio
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.models.chat import ChatCanal, ChatParticipante, ChatMensaje
from app.services.chat_service import ChatService
from app.services.background_scheduler import cleanup_old_chat_messages
from app.schemas.chat import ChatMensajeCreate

async def run_tests():
    print("[TEST CHAT] Iniciando verificacion integral de Chat Clinico...")
    async with AsyncSessionLocal() as db:
        # 1. Obtener usuarios y sucursal de prueba
        res_users = await db.execute(select(Usuario).limit(2))
        users = res_users.scalars().all()
        if len(users) < 2:
            print("[WARN] Se necesitan al menos 2 usuarios en la BD para probar chat directo.")
            return

        user_a, user_b = users[0], users[1]
        empresa_id = user_a.empresa_id or 1
        sucursal_id = user_a.sucursal_defecto_id or 1

        print(f"-> Usuarios de prueba: {user_a.nombre} (ID: {user_a.id}) y {user_b.nombre} (ID: {user_b.id})")
        print(f"-> Empresa: {empresa_id}, Sucursal: {sucursal_id}")

        # 2. Canal general de la sucursal
        canal_general = await ChatService.ensure_general_branch_channel(
            db, empresa_id, sucursal_id, user_a
        )
        print(f"[OK] Canal general asegurado: ID {canal_general.id}, Nombre: '{canal_general.nombre}'")

        # 3. Canal directo 1-a-1
        canal_directo = await ChatService.get_or_create_direct_channel(
            db, empresa_id, sucursal_id, user_a.id, user_b.id
        )
        print(f"[OK] Canal directo asegurado: ID {canal_directo.id}, Nombre: '{canal_directo.nombre}'")

        # 4. Enviar mensaje de texto
        payload_texto = ChatMensajeCreate(
            contenido="Hola, paciente en sala de espera listo para triaje",
            tipo="texto"
        )
        msg_resp, part_ids = await ChatService.save_message(
            db, canal_general.id, empresa_id, sucursal_id, user_a, payload_texto
        )
        print(f"[OK] Mensaje de texto guardado: ID {msg_resp.id}, Remitente: {msg_resp.remitente_nombre}, Participantes WS: {part_ids}")

        # 5. Enviar mensaje de audio (nota de voz simulada)
        payload_audio = ChatMensajeCreate(
            tipo="audio",
            archivo_url="/uploads/chat/audio_test.webm",
            archivo_nombre="nota_voz_1.webm",
            archivo_tamano=250000,
            archivo_tipo="audio/webm",
            duracion_audio=14.5
        )
        msg_audio, _ = await ChatService.save_message(
            db, canal_directo.id, empresa_id, sucursal_id, user_a, payload_audio
        )
        print(f"[OK] Nota de voz guardada: ID {msg_audio.id}, Duracion: {msg_audio.duracion_audio}s")

        # 6. Consultar canales y no leidos
        canales_user_b = await ChatService.get_user_channels(db, empresa_id, sucursal_id, user_b)
        print(f"[OK] Canales para {user_b.nombre}: {len(canales_user_b)} encontrados.")
        for c in canales_user_b:
            print(f"     - [{c.tipo}] '{c.nombre}' (No leidos: {c.no_leidos})")

        # 7. Marcar como leido
        await ChatService.mark_channel_as_read(db, canal_directo.id, user_b.id)
        unread_sum = await ChatService.get_unread_summary(db, empresa_id, sucursal_id, user_b.id)
        print(f"[OK] Resumen no leidos tras marcar lectura para {user_b.nombre}: {unread_sum.total_no_leidos}")

        # 8. Directorio de personal clínico por sede
        personal = await ChatService.get_branch_staff(db, empresa_id, sucursal_id, user_a.id)
        print(f"[OK] Directorio de personal en sede {sucursal_id}: {len(personal)} colegas.")
        for p in personal:
            print(f"     * {p.nombre} {p.apellido} -> Rol: [{p.rol_slug}] {p.rol} (Canal Directo: {p.canal_directo_id})")

        # 9. Probar tarea del scheduler de purga (retencion 30 dias)
        cleanup_res = await cleanup_old_chat_messages(days_retention=30)
        print(f"[OK] Scheduler cleanup ejecutado: {cleanup_res}")

    print("\n[SUCCESS] Todas las pruebas de Chat Clinico finalizaron con exito.")

if __name__ == "__main__":
    asyncio.run(run_tests())
