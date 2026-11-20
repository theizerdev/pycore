"""
Fachada de compatibilidad hacia el Agente Clínico Propio (MediCore AI Local v2.0).
Sin dependencia de Gemini ni APIs de terceros ($0 costo).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.services.clinical_agent import (
    PatientContext,
    clinical_agent,
    decode_data_uri,
    detect_category_from_metadata,
)


async def analyze_study_hybrid(
    file_bytes: Optional[bytes],
    mime_type: str,
    titulo: str,
    categoria: str,
    subtipo: Optional[str] = None,
    caption: str = "",
    existing_lab_values: Optional[List[Dict[str, Any]]] = None,
    existing_img_data: Optional[Dict[str, Any]] = None,
    patient_ctx: Optional[PatientContext] = None,
) -> Dict[str, Any]:
    """Delega el análisis 100% al Agente Clínico Propio MediCore AI Local."""
    return await clinical_agent.analyze_study(
        file_bytes=file_bytes,
        mime_type=mime_type,
        titulo=titulo,
        categoria=categoria,
        subtipo=subtipo,
        caption=caption,
        patient_ctx=patient_ctx,
        existing_lab_values=existing_lab_values,
        existing_img_data=existing_img_data,
    )


__all__ = [
    "PatientContext",
    "analyze_study_hybrid",
    "clinical_agent",
    "decode_data_uri",
    "detect_category_from_metadata",
]
