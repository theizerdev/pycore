"""
Paquete del Agente Clínico Propio **MediCore AI Local** ($0 APIs externas).
Exporta la instancia singleton `clinical_agent` y tipos reutilizables para toda la plataforma.
"""
from app.services.clinical_agent.clinical_reasoner import PatientContext
from app.services.clinical_agent.orchestrator import (
    AGENT_NAME,
    AGENT_VERSION,
    MediCoreClinicalAgent,
    clinical_agent,
    decode_data_uri,
    detect_category_from_metadata,
)

__all__ = [
    "AGENT_NAME",
    "AGENT_VERSION",
    "MediCoreClinicalAgent",
    "PatientContext",
    "clinical_agent",
    "decode_data_uri",
    "detect_category_from_metadata",
]
