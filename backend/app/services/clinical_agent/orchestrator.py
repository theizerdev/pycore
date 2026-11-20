"""
Orquestador Principal del Agente Clínico Propio: **MediCore AI Local v2.0**.
100% Python · 100% Propio · $0 APIs externas (sin Gemini, sin OpenAI).

Diseñado como servicio modular reutilizable para toda la suite MediSoft:
- Paso 4 de Consulta (análisis automático de PDFs, fotos de celular, informes y recepción WhatsApp)
- Futuros módulos: copiloto diagnóstico (Paso 6), triaje de preconsulta, tendencias históricas,
  alertas de seguridad farmacológica y resúmenes clínicos.
"""
from __future__ import annotations

import asyncio
import base64
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

from app.services.clinical_agent.biomarkers_kb import BIOMARKERS_KB
from app.services.clinical_agent.clinical_reasoner import (
    PatientContext,
    analyze_imaging_or_report,
    compute_derived_metrics,
    detect_clinical_syndromes,
    evaluate_existing_lab_values,
    extract_lab_biomarkers,
)
from app.services.clinical_agent.document_vision import (
    DocumentExtractionResult,
    extract_document_content,
    is_ocr_available,
    is_pdfplumber_available,
)
from app.services.clinical_agent.local_llm_adapter import (
    enrich_with_local_ollama,
    is_local_llm_configured,
)
from app.services.clinical_agent.radiology_vision import (
    analyze_medical_image_pixels,
    is_radiology_vision_ready,
)

logger = logging.getLogger("medicore_clinical_agent")

AGENT_NAME = "MediCore AI Local"
AGENT_VERSION = "2.0"


def decode_data_uri(archivo_url: str) -> Tuple[Optional[bytes], Optional[str]]:
    if not archivo_url:
        return None, None
    if archivo_url.startswith("data:"):
        try:
            header, b64_part = archivo_url.split(",", 1)
            mime = header.split(";")[0].replace("data:", "").strip()
            return base64.b64decode(b64_part), mime
        except Exception:
            return None, None
    return None, None


def detect_category_from_metadata(
    filename: str = "",
    mime_type: str = "",
    caption: str = "",
    extracted_text: str = "",
) -> str:
    combined = f"{filename} {caption} {(extracted_text or '')[:800]}".lower()
    lab_keywords = (
        "laboratorio", "hematolog", "hemograma", "biometr", "sangre", "glucosa", "glicemia",
        "colesterol", "triglic", "perfil 20", "perfil lip", "perfil hep", "perfil renal",
        "uroan", "examen de orina", "orina", "heces", "copro", "urocultivo", "quimica",
        "química", "tiroid", "tsh", "creatinina", "urea", "hba1c", "ferritina", "plaquetas",
        "leucocitos", "hemoglobina", "vcm", "bioanalista",
    )
    img_keywords = (
        "eco", "ecograf", "ultrason", "rx", "rayos", "radiograf", "tomograf", "tac",
        "resonancia", "rmn", "panoramica", "panorámica", "mamograf", "doppler",
        "electrocardiograma", "ekg", "ecg", "endoscop", "colonoscop", "placa", "bi-rads", "ti-rads",
    )
    lab_hits = sum(1 for k in lab_keywords if k in combined)
    img_hits = sum(1 for k in img_keywords if k in combined)

    if lab_hits > img_hits and lab_hits > 0:
        return "laboratorio"
    if img_hits > lab_hits and img_hits > 0:
        return "imagenologia"
    if (mime_type or "").startswith("image/"):
        return "imagenologia"
    return "laboratorio" if "pdf" in (mime_type or "").lower() else "informe"


class MediCoreClinicalAgent:
    """
    Agente Clínico Propio de MediSoft Suite.
    Centraliza visión documental local (OCR/PDF), bioquímica clínica, calculadoras médicas,
    correlación sindrómica con CIE-10 y NLP de informes médicos.
    """

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "agent_name": AGENT_NAME,
            "version": AGENT_VERSION,
            "zero_external_api_cost": True,
            "ocr_local_ready": is_ocr_available(),
            "pdf_tables_ready": is_pdfplumber_available(),
            "radiology_vision_onnx_ready": is_radiology_vision_ready(),
            "local_ollama_configured": is_local_llm_configured(),
            "biomarkers_catalog_size": len(BIOMARKERS_KB),
            "derived_calculators": [
                "TFG CKD-EPI 2021",
                "LDL Friedewald",
                "Colesterol No-HDL",
                "Índice Aterogénico (Castelli I)",
                "Relación TG/HDL",
                "HOMA-IR",
                "Índice De Ritis (AST/ALT)",
                "Índice de Mentzer",
                "Calcio Corregido por Albúmina",
                "Índice Neutrófilos/Linfocitos (NLR)",
            ],
        }

    async def analyze_study(
        self,
        file_bytes: Optional[bytes],
        mime_type: str,
        titulo: str,
        categoria: str,
        subtipo: Optional[str] = None,
        caption: str = "",
        patient_ctx: Optional[PatientContext] = None,
        existing_lab_values: Optional[List[Dict[str, Any]]] = None,
        existing_img_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Analiza un estudio clínico (PDF digital, PDF escaneado o fotografía de celular)
        de forma 100% local en Python sin depender de Gemini ni APIs de pago.
        """
        t0 = time.perf_counter()
        ctx = patient_ctx or PatientContext()
        cat_inicial = (categoria or "laboratorio").strip().lower()

        # 1. Capa 1: Visión & Extracción Documental Local (en hilo separado para no bloquear FastAPI)
        extraction = DocumentExtractionResult()
        if file_bytes:
            extraction = await asyncio.to_thread(extract_document_content, file_bytes, mime_type)

        extracted_text = extraction.text or ""
        table_rows = extraction.table_rows or []

        # 2. Intentar extracción bioquímica real sobre el texto/tablas leídos
        lab_values: List[Dict[str, Any]] = []
        qualitative: List[Dict[str, Any]] = []

        if extracted_text or table_rows:
            lab_values, qualitative = extract_lab_biomarkers(extracted_text, table_rows, ctx)

        # Si el médico ya tenía valores editados manualmente y no se leyeron más del archivo, conservar/re-evaluar
        if not lab_values and existing_lab_values:
            lab_values = evaluate_existing_lab_values(existing_lab_values, ctx)

        # 3. Clasificación inteligente automática:
        # Si llegó una foto de una hoja de laboratorio (que inicialmente pudo clasificarse como "imagenologia")
        # y el OCR real encontró >= 2 biomarcadores o hallazgos de uroanálisis, corregir categoría a "laboratorio"
        total_lab_hits = len(lab_values) + len(qualitative)
        cat_final = cat_inicial
        if total_lab_hits >= 2 and cat_inicial in ("imagenologia", "informe", "otro"):
            cat_final = "laboratorio"
        elif total_lab_hits == 0 and extracted_text:
            detected_cat = detect_category_from_metadata(
                filename=titulo,
                mime_type=mime_type,
                caption=caption,
                extracted_text=extracted_text,
            )
            if cat_inicial == "otro" or (cat_inicial == "laboratorio" and detected_cat == "imagenologia"):
                cat_final = detected_cat

        # 4. Rama LABORATORIO (con biomarcadores reales extraídos)
        if cat_final == "laboratorio" and (lab_values or qualitative):
            derived = compute_derived_metrics(lab_values, ctx)
            syndromes, cie10_list = detect_clinical_syndromes(lab_values, qualitative, derived, ctx)
            alertas, critical_alerts, resumen_med, guia_pac, interpretacion, estado = self._format_lab_output(
                lab_values, qualitative, derived, syndromes, ctx
            )

            # Enriquecimiento opcional si el usuario tiene servidor propio con Ollama local
            engine_used = f"medicore-{extraction.method}" if extraction.method != "none" else "medicore-clinical-engine"
            ollama_extra = await self._try_local_ollama(extracted_text, file_bytes, mime_type, titulo, cat_final, ctx)
            if ollama_extra:
                engine_used = f"{engine_used}+ollama"
                if ollama_extra.get("guia_paciente"):
                    guia_pac = str(ollama_extra["guia_paciente"]).strip()
                if ollama_extra.get("resumen_medico"):
                    interpretacion += f"\n\n🤖 SEGUNDA OPINIÓN LOCAL (OLLAMA):\n{ollama_extra['resumen_medico']}"

            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            analisis_agente = self._build_agent_payload(
                engine_used=engine_used,
                extraction=extraction,
                patient_ctx=ctx,
                critical_alerts=critical_alerts,
                calculos_derivados=derived,
                sindromes_detectados=syndromes,
                cie10_sugeridos=cie10_list,
                hallazgos_cualitativos=qualitative,
                resumen_medico=resumen_med,
                guia_paciente=guia_pac,
                requiere_revision_visual=False,
                elapsed_ms=elapsed_ms,
            )

            # Título sugerido inteligente si vino genérico de WhatsApp
            titulo_sugerido = self._suggest_lab_title(titulo, lab_values, qualitative)

            return {
                "categoria": "laboratorio",
                "titulo_sugerido": titulo_sugerido,
                "valores_laboratorio": lab_values,
                "datos_imagenologia": existing_img_data,
                "alertas_detectadas": alertas,
                "interpretacion_clinica": interpretacion,
                "estado_analisis": estado,
                "analisis_agente": analisis_agente,
                "engine_used": engine_used,
            }

        # 5. Rama IMAGENOLOGÍA / INFORME MÉDICO (o placa visual analizada por MediCore AI Vision ONNX)
        img_result = analyze_imaging_or_report(
            text=extracted_text,
            titulo=titulo,
            subtipo=subtipo,
            caption=caption,
            is_visual_only=extraction.is_visual_only,
            image_quality=extraction.image_quality,
        )

        vision_radiologica: Optional[Dict[str, Any]] = None
        titulo_img_sugerido = titulo
        is_image_file = bool(file_bytes) and (mime_type or "").lower().startswith("image/")

        # Si es una imagen médica visual sin informe escrito (Rx de Tórax, Rx osteoarticular, Panorámica, Eco, Foto),
        # ejecutar el motor neuronal local MediCore AI Vision (ConvNeXt-Tiny 33 regiones + DenseNet-121 NIH14 + OpenCV)
        if is_image_file and img_result.get("requiere_revision_visual"):
            vision_res = await asyncio.to_thread(
                analyze_medical_image_pixels,
                file_bytes,
                titulo,
                extracted_text,
                extraction.image_quality,
            )
            if vision_res:
                vision_radiologica = vision_res.get("vision_radiologica")
                img_result["datos_imagenologia"] = vision_res["datos_imagenologia"]
                img_result["alertas_detectadas"] = vision_res["alertas_detectadas"]
                img_result["sindromes_detectados"] = vision_res["sindromes_detectados"]
                img_result["cie10_sugeridos"] = vision_res["cie10_sugeridos"]
                img_result["estado_analisis"] = vision_res["estado_analisis"]
                img_result["requiere_revision_visual"] = vision_res["requiere_revision_visual"]
                img_result["resumen_medico"] = vision_res["datos_imagenologia"]["hallazgos"]
                img_result["guia_paciente"] = vision_res["datos_imagenologia"]["guia_paciente"]
                if vision_res.get("titulo_sugerido"):
                    low_t = (titulo or "").lower()
                    if any(tag in low_t for tag in ("imagen estudio", "whatsapp", "img-", "estudio de imagen")):
                        titulo_img_sugerido = vision_res["titulo_sugerido"]

        datos_img_final = dict(img_result["datos_imagenologia"])

        if vision_radiologica:
            engine_used = "medicore-vision-onnx"
        else:
            engine_used = f"medicore-{extraction.method}" if extraction.method != "none" else "medicore-clinical-nlp"
        guia_pac = img_result["guia_paciente"]
        resumen_med = img_result["resumen_medico"]

        ollama_extra = await self._try_local_ollama(extracted_text, file_bytes, mime_type, titulo_img_sugerido, cat_final, ctx)
        if ollama_extra:
            engine_used = f"{engine_used}+ollama"
            if ollama_extra.get("resumen_medico"):
                resumen_med = str(ollama_extra["resumen_medico"]).strip()
            if ollama_extra.get("guia_paciente"):
                guia_pac = str(ollama_extra["guia_paciente"]).strip()
                datos_img_final["guia_paciente"] = guia_pac
            if ollama_extra.get("recomendaciones"):
                datos_img_final["recomendaciones"] = str(ollama_extra["recomendaciones"]).strip()

        interpretacion = (
            f"🧠 {AGENT_NAME} v{AGENT_VERSION} — ANÁLISIS DE ESTUDIO\n\n"
            f"🎯 MODALIDAD & REGIÓN: {datos_img_final.get('tecnica')} · {datos_img_final.get('region_anatomica')}\n\n"
            f"📋 HALLAZGOS:\n{resumen_med}\n\n"
            f"📌 CONCLUSIÓN:\n{datos_img_final.get('conclusion')}\n\n"
            f"🗣️ GUÍA PARA EL PACIENTE:\n{guia_pac}"
        )

        # Si era categoría laboratorio pero no se detectaron analitos (ej. foto borrosa o formato no estándar)
        if cat_final == "laboratorio" and not lab_values:
            if extracted_text:
                interpretacion = (
                    f"🧠 {AGENT_NAME} v{AGENT_VERSION} — LECTURA DE DOCUMENTO\n\n"
                    f"Se extrajo texto real del documento ({len(extracted_text)} caracteres, método: {extraction.method}), "
                    f"pero no se identificaron analitos numéricos estándar con formato reconocido.\n\n"
                    f"Puede inspeccionar el texto extraído en la pestaña 'Auditoría OCR / Texto' y verificar el documento original."
                )
            else:
                interpretacion = (
                    f"🧠 {AGENT_NAME} v{AGENT_VERSION}\n\n"
                    f"Archivo adjuntado correctamente. No se detectó texto legible suficiente para extraer valores "
                    f"automáticamente (calidad de imagen: {(extraction.image_quality or {}).get('calidad_label', 'N/A')}). "
                    f"Revise el documento original en el visor sin datos inventados."
                )

        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        analisis_agente = self._build_agent_payload(
            engine_used=engine_used,
            extraction=extraction,
            patient_ctx=ctx,
            critical_alerts=[a for a in img_result["alertas_detectadas"] if "🚨" in a],
            calculos_derivados=[],
            sindromes_detectados=img_result["sindromes_detectados"],
            cie10_sugeridos=img_result["cie10_sugeridos"],
            hallazgos_clave=img_result["hallazgos_clave"],
            medidas_detectadas=img_result["medidas_detectadas"],
            escalas_detectadas=img_result["escalas_detectadas"],
            vision_radiologica=vision_radiologica,
            resumen_medico=resumen_med,
            guia_paciente=guia_pac,
            requiere_revision_visual=bool(img_result.get("requiere_revision_visual")),
            elapsed_ms=elapsed_ms,
        )

        return {
            "categoria": cat_final,
            "titulo_sugerido": titulo_img_sugerido,
            "valores_laboratorio": lab_values or None,
            "datos_imagenologia": datos_img_final if cat_final != "laboratorio" else None,
            "alertas_detectadas": img_result["alertas_detectadas"],
            "interpretacion_clinica": interpretacion,
            "estado_analisis": "pendiente" if (cat_final == "laboratorio" and not lab_values) else img_result["estado_analisis"],
            "analisis_agente": analisis_agente,
            "engine_used": engine_used,
        }

    def analyze_clinical_text(
        self,
        text: str,
        patient_ctx: Optional[PatientContext] = None,
    ) -> Dict[str, Any]:
        """
        Método reutilizable del Agente para otras funcionalidades futuras de MediSoft
        (ej. notas de evolución, preconsulta, triaje o pegado rápido de resultados en texto).
        """
        ctx = patient_ctx or PatientContext()
        lab_values, qualitative = extract_lab_biomarkers(text, [], ctx)
        derived = compute_derived_metrics(lab_values, ctx) if lab_values else []
        syndromes, cie10 = detect_clinical_syndromes(lab_values, qualitative, derived, ctx)
        img_nlp = analyze_imaging_or_report(text, "Texto Clínico", None, "", is_visual_only=False)
        return {
            "agent": f"{AGENT_NAME} v{AGENT_VERSION}",
            "valores_laboratorio": lab_values,
            "hallazgos_cualitativos": qualitative,
            "calculos_derivados": derived,
            "sindromes_detectados": syndromes + img_nlp["sindromes_detectados"],
            "cie10_sugeridos": cie10 + [c for c in img_nlp["cie10_sugeridos"] if c["codigo"] not in {x["codigo"] for x in cie10}],
            "escalas_detectadas": img_nlp["escalas_detectadas"],
            "medidas_detectadas": img_nlp["medidas_detectadas"],
        }

    def _format_lab_output(
        self,
        lab_values: List[Dict[str, Any]],
        qualitative: List[Dict[str, Any]],
        derived: List[Dict[str, Any]],
        syndromes: List[Dict[str, Any]],
        patient_ctx: PatientContext,
    ) -> Tuple[List[str], List[str], str, str, str, str]:
        alertas: List[str] = []
        critical_alerts: List[str] = []

        for v in lab_values:
            if v.get("critico"):
                msg = f"🚨 CRÍTICO {v['parametro']}: {v['valor']} {v['unidad']} ({'Alto' if v['estado'] == 'alto' else 'Bajo'})"
                critical_alerts.append(msg)
                alertas.append(msg)
            elif v.get("alerta"):
                icon = "⚠️" if v["estado"] == "alto" else "🔻"
                tag = "Elevado" if v["estado"] == "alto" else "Bajo"
                alertas.append(f"{icon} {v['parametro']}: {v['valor']} {v['unidad']} ({tag})")

        for q in qualitative:
            if q.get("alerta"):
                alertas.append(f"⚠️ {q['parametro']}: {q['resultado']}")

        for d in derived:
            if d.get("estado") in ("alerta", "critico"):
                icon = "🚨" if d["estado"] == "critico" else "📐"
                alertas.append(f"{icon} {d['nombre']}: {d['valor']} {d['unidad']}")

        ctx_bits = []
        if patient_ctx.genero:
            g = patient_ctx.genero.upper()
            ctx_bits.append("Femenino" if g.startswith("F") else "Masculino" if g.startswith("M") else patient_ctx.genero)
        if patient_ctx.edad is not None:
            ctx_bits.append(f"{patient_ctx.edad} años")
        ctx_str = f" (rangos ajustados a {', '.join(ctx_bits)})" if ctx_bits else ""

        lines_med = [
            f"Se procesaron {len(lab_values)} biomarcadores cuantitativos"
            + (f" y {len(qualitative)} parámetro(s) cualitativos" if qualitative else "")
            + f"{ctx_str}."
        ]

        if critical_alerts:
            lines_med.append("\n🚨 ALERTAS CRÍTICAS DE PRIORIDAD INMEDIATA:\n" + "\n".join(f"• {a}" for a in critical_alerts))

        if syndromes:
            lines_med.append(
                "\n🧩 CORRELACIÓN SINDRÓMICA & CIE-10 SUGERIDOS:\n"
                + "\n".join(
                    f"• [{s['codigo_cie10']}] {s['nombre']} ({s['severidad'].upper()}): {s['conducta_sugerida']}"
                    for s in syndromes[:6]
                )
            )
        elif alertas:
            lines_med.append("\n⚠️ PARÁMETROS FUERA DE RANGO:\n" + "\n".join(f"• {a}" for a in alertas[:10]))
        else:
            lines_med.append("\n✅ Todos los biomarcadores evaluados se encuentran dentro de los intervalos biológicos de referencia.")

        if derived:
            lines_med.append(
                "\n📐 CÁLCULOS CLÍNICOS DERIVADOS:\n"
                + "\n".join(f"• {d['nombre']}: {d['valor']} {d['unidad']} — {d['interpretacion']}" for d in derived[:6])
            )

        resumen_med = "\n".join(lines_med)

        if critical_alerts:
            guia_pac = (
                "Sus exámenes muestran resultados importantes que requieren valoración prioritaria inmediata. "
                "Su médico tratante revisará cada valor con usted ahora mismo para establecer la conducta más segura."
            )
        elif alertas:
            altered_names = [v["parametro"].split("(")[0].strip() for v in lab_values if v.get("alerta")][:4]
            if not altered_names and qualitative:
                altered_names = [q["parametro"] for q in qualitative if q.get("alerta")][:3]
            lista_str = ", ".join(altered_names) if altered_names else "algunos parámetros"
            guia_pac = (
                f"En sus exámenes identificamos variaciones en {lista_str}. "
                f"Su médico le explicará en detalle qué significan estos valores y le indicará los ajustes "
                f"nutricionales, de seguimiento o de tratamiento necesarios para llevarlos a rangos óptimos."
            )
        else:
            guia_pac = (
                "¡Buenas noticias! Los parámetros analizados en su estudio de laboratorio se encuentran "
                "dentro de los rangos saludables de referencia. Continuaremos con sus controles preventivos habituales."
            )

        interpretacion = (
            f"🧠 {AGENT_NAME} v{AGENT_VERSION} — SÍNTESIS CLÍNICA\n\n"
            f"{resumen_med}\n\n"
            f"🗣️ GUÍA DE COMUNICACIÓN AL PACIENTE:\n{guia_pac}"
        )
        estado = "analizado_alterado" if (alertas or critical_alerts) else "analizado_normal"
        return alertas, critical_alerts, resumen_med, guia_pac, interpretacion, estado

    def _suggest_lab_title(
        self,
        original_title: str,
        lab_values: List[Dict[str, Any]],
        qualitative: List[Dict[str, Any]],
    ) -> str:
        low = (original_title or "").strip().lower()
        import re as _re
        generic = (
            ("whatsapp" in low)
            or ("imagen estudio" in low)
            or ("estudio médico recibido" in low)
            or ("resultado de laboratorio" in low)
            or ("estudio de imagenología" in low)
            or bool(_re.match(r"^(img|wa|doc|photo|image|scan|document)[-_\s]?\d+", low))
        )
        if not generic and len(original_title.strip()) >= 5:
            return original_title
        panels: List[str] = []
        for v in lab_values:
            p = v.get("panel")
            if p and p not in panels:
                panels.append(p)
        if qualitative and "Uroanálisis" not in panels:
            if any(q["key"].startswith("orina_") for q in qualitative):
                panels.append("Uroanálisis")
        if panels:
            return f"Laboratorio: {' + '.join(panels[:3])}"
        return original_title

    async def _try_local_ollama(
        self,
        extracted_text: str,
        file_bytes: Optional[bytes],
        mime_type: str,
        titulo: str,
        categoria: str,
        ctx: PatientContext,
    ) -> Optional[Dict[str, Any]]:
        if not is_local_llm_configured():
            return None
        pac_desc = f"Género: {ctx.genero or 'N/E'}, Edad: {ctx.edad if ctx.edad is not None else 'N/E'}"
        return await enrich_with_local_ollama(
            extracted_text=extracted_text,
            file_bytes=file_bytes,
            mime_type=mime_type,
            titulo=titulo,
            categoria=categoria,
            patient_summary=pac_desc,
        )

    def _build_agent_payload(
        self,
        engine_used: str,
        extraction: DocumentExtractionResult,
        patient_ctx: PatientContext,
        critical_alerts: List[str],
        calculos_derivados: List[Dict[str, Any]],
        sindromes_detectados: List[Dict[str, Any]],
        cie10_sugeridos: List[Dict[str, Any]],
        resumen_medico: str,
        guia_paciente: str,
        requiere_revision_visual: bool,
        elapsed_ms: int,
        hallazgos_cualitativos: Optional[List[Dict[str, Any]]] = None,
        hallazgos_clave: Optional[List[str]] = None,
        medidas_detectadas: Optional[List[str]] = None,
        escalas_detectadas: Optional[List[str]] = None,
        vision_radiologica: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return {
            "agent_name": AGENT_NAME,
            "agent_version": AGENT_VERSION,
            "engine_used": engine_used,
            "extraction_method": extraction.method,
            "ocr_confidence": extraction.ocr_confidence,
            "pages_processed": extraction.pages_processed,
            "image_quality": extraction.image_quality or None,
            "extracted_text_preview": (extraction.text or "")[:4000],
            "patient_context_applied": {
                "edad": patient_ctx.edad,
                "genero": patient_ctx.genero,
                "rangos_personalizados": bool(patient_ctx.genero or patient_ctx.edad is not None),
            },
            "critical_alerts": critical_alerts,
            "calculos_derivados": calculos_derivados,
            "sindromes_detectados": sindromes_detectados,
            "cie10_sugeridos": cie10_sugeridos,
            "hallazgos_cualitativos": hallazgos_cualitativos or [],
            "hallazgos_clave": hallazgos_clave or [],
            "medidas_detectadas": medidas_detectadas or [],
            "escalas_detectadas": escalas_detectadas or [],
            "vision_radiologica": vision_radiologica,
            "resumen_medico": resumen_medico,
            "guia_paciente": guia_paciente,
            "requiere_revision_visual": requiere_revision_visual,
            "processing_ms": elapsed_ms,
        }


clinical_agent = MediCoreClinicalAgent()
