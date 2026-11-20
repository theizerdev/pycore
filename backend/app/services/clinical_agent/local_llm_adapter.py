"""
Capa 4 (Opcional y 100% Propia): Conector a IA Open-Source Local vía Ollama ($0 APIs externas).
- Totalmente desactivado por defecto si `LOCAL_AI_URL` está vacío.
- Permite escalar en el futuro en un servidor propio con GPU ejecutando modelos open-weight
  médicos/multimodales (ej. MedGemma, Qwen2.5-VL, Llama-3.2-Vision) sin pagar APIs de terceros.
"""
from __future__ import annotations

import base64
import json
import logging
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger("medicore_local_llm")


def is_local_llm_configured() -> bool:
    return bool((getattr(settings, "LOCAL_AI_URL", "") or "").strip())


async def enrich_with_local_ollama(
    extracted_text: str,
    file_bytes: Optional[bytes],
    mime_type: str,
    titulo: str,
    categoria: str,
    patient_summary: str = "",
) -> Optional[Dict[str, Any]]:
    """
    Si el usuario configuró `LOCAL_AI_URL` (ej. http://127.0.0.1:11434 con Ollama local),
    solicita una segunda opinión estructurada en JSON sin enviar datos a la nube.
    """
    base_url = (getattr(settings, "LOCAL_AI_URL", "") or "").strip().rstrip("/")
    model = (getattr(settings, "LOCAL_AI_MODEL", "qwen2.5vl:7b") or "qwen2.5vl:7b").strip()
    if not base_url:
        return None

    prompt = (
        "Eres MediCore AI, un asistente clínico profesional en español que apoya al médico tratante. "
        "Analiza únicamente los datos reales provistos y responde SOLO con JSON válido con las claves: "
        '{"resumen_medico": "...", "guia_paciente": "...", "hallazgos_adicionales": ["..."], "recomendaciones": "..."}. '
        "No inventes valores que no aparezcan en el estudio.\n"
        f"Título: {titulo}\nCategoría: {categoria}\nContexto paciente: {patient_summary or 'No especificado'}\n"
        f"Texto extraído del estudio:\n{(extracted_text or '')[:3500]}"
    )

    payload: Dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1},
    }

    if file_bytes and (mime_type or "").startswith("image/"):
        payload["images"] = [base64.b64encode(file_bytes).decode("ascii")]

    try:
        timeout = httpx.Timeout(connect=1.2, read=45.0, write=5.0, pool=2.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(f"{base_url}/api/generate", json=payload)
        if resp.status_code != 200:
            logger.warning(f"[MediCore Local LLM] Ollama devolvió HTTP {resp.status_code}")
            return None
        data = resp.json()
        raw_text = (data.get("response") or "").strip()
        if not raw_text:
            return None
        return json.loads(raw_text)
    except Exception as e:
        logger.debug(f"[MediCore Local LLM] Ollama no disponible ({base_url}): {e}")
        return None
