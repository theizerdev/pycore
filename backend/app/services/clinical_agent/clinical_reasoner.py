"""
Capas 2B y 3 del Agente Clínico Propio (MediCore AI Local):
- Parser de Biomarcadores sobre tablas PDF, texto layout y líneas reconstruidas de RapidOCR.
- Extracción cualitativa de Uroanálisis / Serología / Coproanálisis.
- Calculadoras Clínicas Derivadas (TFG CKD-EPI 2021, LDL Friedewald, Castelli I, No-HDL,
  TG/HDL, HOMA-IR, Índice De Ritis, Índice de Mentzer, Calcio Corregido, Urea/Creatinina, NLR).
- Motor de Razonamiento Sindrómico Multi-Analito con sugerencias CIE-10 y severidad.
- NLP Clínico con detección de negaciones para Informes de Imagenología y Especialidades
  (Ecografías, Rx, TAC, RMN, Panorámicas, EKG, Endoscopías, Anatomía Patológica).
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from app.services.clinical_agent.biomarkers_kb import (
    BIOMARKERS_BY_KEY,
    BIOMARKERS_KB,
    BiomarkerSpec,
    resolve_reference_range,
)


@dataclass
class PatientContext:
    edad: Optional[int] = None
    genero: Optional[str] = None  # "M" | "F" | "O"
    antecedentes: Optional[str] = None
    medicacion: Optional[str] = None
    alergias: Optional[List[str]] = None
    motivo_consulta: Optional[str] = None


# ==============================================================================
# UTILIDADES DE PARSEO NUMÉRICO Y RANGOS IMPRESOS
# ==============================================================================
SKIP_LINE_REGEX = re.compile(
    r"^\s*(?:paciente|nombre|apellidos|c[eé]dula|dni|documento|fecha|edad|tel[eé]fono|"
    r"direcci[oó]n|m[eé]dico|doctor|orden|historia|rif|n[uú]mero|p[aá]gina|laboratorio|"
    r"bioanalista|sede|sucursal|correo|email|hora|impreso)\b",
    re.IGNORECASE,
)

RANGE_REGEX = re.compile(
    r"(\d+(?:[.,]\d+)?)\s*(?:-|–|—|\ba\b|\bhasta\b)\s*(\d+(?:[.,]\d+)?)",
    re.IGNORECASE,
)


def _normalize_number(raw: str, spec: BiomarkerSpec, context_line: str = "") -> Optional[float]:
    if not raw:
        return None
    s = raw.strip().replace(" ", "")
    if not s:
        return None

    # Detectar separador de miles estilo latino (ej. 7.200 o 245.000 o 7,200 o 245,000)
    if re.match(r"^\d{1,3}[.,]\d{3}$", s):
        if spec.key in ("leucocitos", "plaquetas") or spec.plausible[1] >= 10000:
            s = s.replace(".", "").replace(",", "")
        else:
            s = s.replace(",", ".")
    elif re.match(r"^\d{1,3}[.,]\d{3}[.,]\d{1,2}$", s):
        # ej. 7.200,5 -> 7200.5
        s = s.replace(".", "").replace(",", ".") if s.rfind(",") > s.rfind(".") else s.replace(",", "")
    else:
        s = s.replace(",", ".")

    try:
        val = float(s)
    except ValueError:
        return None

    low_ctx = (context_line or "").lower()

    # Normalización inteligente de unidades
    if spec.scale_mode == "k_to_mm3":
        if spec.key == "leucocitos" and 0.5 <= val <= 80.0:
            val = round(val * 1000.0, 1)
        elif spec.key == "plaquetas" and 5.0 <= val <= 1500.0:
            val = round(val * 1000.0, 1)
    elif spec.scale_mode == "gluc_mmol" and ("mmol" in low_ctx) and 1.5 <= val <= 35.0:
        val = round(val * 18.0182, 1)
    elif spec.scale_mode == "chol_mmol" and ("mmol" in low_ctx) and 0.5 <= val <= 18.0:
        val = round(val * 38.67, 1)
    elif spec.scale_mode == "tg_mmol" and ("mmol" in low_ctx) and 0.3 <= val <= 20.0:
        val = round(val * 88.57, 1)
    elif spec.scale_mode == "creat_umol" and ("umol" in low_ctx or "µmol" in low_ctx) and val >= 20.0:
        val = round(val / 88.4, 2)

    pmin, pmax = spec.plausible
    if val < pmin or val > pmax:
        return None
    return round(val, 3) if val < 10 else round(val, 2)


def _extract_printed_range(fragment: str, spec: BiomarkerSpec) -> Optional[Tuple[float, float]]:
    """Extrae un rango impreso del propio laboratorio (ej. '12.0 - 16.0') si es plausible."""
    if not fragment:
        return None
    m = RANGE_REGEX.search(fragment)
    if not m:
        return None
    rmin = _normalize_number(m.group(1), spec, fragment)
    rmax = _normalize_number(m.group(2), spec, fragment)
    if rmin is None or rmax is None or rmin >= rmax:
        return None
    # Verificar coherencia básica contra el rango fisiológico conocido (evitar fechas/edades)
    dmin, dmax = spec.ref_default
    if rmax > max(dmax * 4.0, 20.0) or rmin < 0:
        return None
    return rmin, rmax


def _evaluate_single_biomarker(
    spec: BiomarkerSpec,
    valor: float,
    patient_ctx: PatientContext,
    printed_range: Optional[Tuple[float, float]] = None,
) -> Dict[str, Any]:
    if printed_range is not None:
        rmin, rmax = printed_range
        rango_origen = "laboratorio"
    else:
        rmin, rmax, is_custom = resolve_reference_range(spec, patient_ctx.genero, patient_ctx.edad)
        rango_origen = "paciente_edad_sexo" if is_custom else "estandar"

    critico = False
    if spec.critical_low is not None and valor <= spec.critical_low:
        estado = "bajo"
        alerta = True
        critico = True
        interp = f"VALOR CRÍTICO BAJO (≤{spec.critical_low} {spec.unidad}). {spec.low_hint}"
    elif spec.critical_high is not None and valor >= spec.critical_high:
        estado = "alto"
        alerta = True
        critico = True
        interp = f"VALOR CRÍTICO ELEVADO (≥{spec.critical_high} {spec.unidad}). {spec.high_hint}"
    elif valor < rmin:
        estado = "bajo"
        alerta = True
        interp = f"Por debajo del rango ({rmin} - {rmax} {spec.unidad}). {spec.low_hint}"
    elif valor > rmax:
        estado = "alto"
        alerta = True
        interp = f"Por encima del rango ({rmin} - {rmax} {spec.unidad}). {spec.high_hint}"
    else:
        estado = "normal"
        alerta = False
        interp = "Dentro del intervalo biológico de referencia."

    return {
        "key": spec.key,
        "parametro": spec.nombre,
        "panel": spec.panel,
        "valor": valor,
        "unidad": spec.unidad,
        "ref_min": rmin,
        "ref_max": rmax,
        "rango_origen": rango_origen,
        "estado": estado,
        "alerta": alerta,
        "critico": critico,
        "interpretacion": interp,
    }


# ==============================================================================
# EXTRACCIÓN DE BIOMARCADORES DESDE TABLAS Y TEXTO
# ==============================================================================
def extract_lab_biomarkers(
    text: str,
    table_rows: Optional[List[List[str]]] = None,
    patient_ctx: Optional[PatientContext] = None,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Extrae biomarcadores cuantitativos (105+ analitos) y hallazgos cualitativos
    (uroanálisis, serología, etc.) combinando filas tabulares y texto OCR/PDF.
    """
    ctx = patient_ctx or PatientContext()
    found: Dict[str, Dict[str, Any]] = {}

    # 1. Pasada prioritaria: filas tabulares (pdfplumber o RapidOCR reconstruido)
    for row in table_rows or []:
        if not row:
            continue
        joined = "  ".join(c for c in row if c)
        if not joined or SKIP_LINE_REGEX.match(joined):
            continue

        label_cell = row[0]
        rest_cells = row[1:]
        default_rest_text = "  ".join(rest_cells)

        for spec in BIOMARKERS_KB:
            if spec.key in found:
                continue
            m_label = re.search(spec.pattern, label_cell, re.IGNORECASE)
            used_col0 = True
            row_rest_text = default_rest_text
            if not m_label:
                # También intentar en la columna 1 si la columna 0 era un código o guion
                if len(label_cell) <= 5 and len(row) >= 2:
                    m_label = re.search(spec.pattern, row[1], re.IGNORECASE)
                    if m_label:
                        used_col0 = False
                        row_rest_text = "  ".join(row[2:])
                if not m_label:
                    continue

            # Buscar primer valor numérico plausible después del nombre del parámetro
            tail_in_label = (label_cell if used_col0 else row[1])[m_label.end():]
            search_space = (tail_in_label + " " + row_rest_text).strip()
            # Evitar capturar el número de la propia abreviatura (ej. T4, B12, CA-125)
            num_matches = list(re.finditer(r"(?<![A-Za-z0-9/])([<>]?\s*\d+(?:[.,]\d+)?(?:\.\d{3})?)(?!\s*(?:h\b|hr|años|dias|meses))", search_space))
            parsed_val = None
            val_end_pos = 0
            for nm in num_matches[:4]:
                # Nunca confundir ningún extremo de un rango de referencia ('0.4 - 4.5') con el resultado del paciente
                before_num = search_space[:nm.start()]
                after_num = search_space[nm.end():]
                if re.match(r"^\s*(?:-|–|—|\ba\b|\bhasta\b)\s*\d", after_num, re.IGNORECASE):
                    continue
                if re.search(r"\d\s*(?:-|–|—|\ba\b|\bhasta\b)\s*$", before_num, re.IGNORECASE):
                    continue
                raw_token = nm.group(1).lstrip("<>").strip()
                candidate = _normalize_number(raw_token, spec, joined)
                if candidate is not None:
                    parsed_val = candidate
                    val_end_pos = nm.end()
                    break

            if parsed_val is not None:
                printed_range = _extract_printed_range(search_space[val_end_pos:], spec)
                found[spec.key] = _evaluate_single_biomarker(spec, parsed_val, ctx, printed_range)

    # 2. Pasada complementaria línea por línea sobre el texto completo
    for raw_line in (text or "").splitlines():
        line = " ".join(raw_line.split()).strip()
        if len(line) < 4 or SKIP_LINE_REGEX.match(line):
            continue

        for spec in BIOMARKERS_KB:
            if spec.key in found:
                continue
            m_name = re.search(spec.pattern, line, re.IGNORECASE)
            if not m_name:
                continue
            after = line[m_name.end():]
            # Evitar capturas donde inmediatamente viene otra palabra larga sin número cercano
            m_val = re.search(
                r"^[\s:=\-\.\(\)\[\]%a-zA-Z/µ]{0,22}?([<>]?\s*\d{1,3}(?:[.,]\d{3})|\d+(?:[.,]\d+)?)",
                after,
            )
            if not m_val:
                continue
            # Nunca tomar el inicio de un rango impreso ('0.4 - 4.5') como resultado
            if re.match(r"^\s*(?:-|–|—|\ba\b|\bhasta\b)\s*\d", after[m_val.end():], re.IGNORECASE):
                continue
            raw_token = m_val.group(1).lstrip("<>").strip()
            val = _normalize_number(raw_token, spec, line)
            if val is None:
                continue
            printed_range = _extract_printed_range(after[m_val.end():], spec)
            found[spec.key] = _evaluate_single_biomarker(spec, val, ctx, printed_range)

    # 3. Hallazgos cualitativos (Uroanálisis, Coproanálisis, Pruebas Rápidas / Serología)
    qualitative = _extract_qualitative_findings(text or "")
    return list(found.values()), qualitative


def _extract_qualitative_findings(text: str) -> List[Dict[str, Any]]:
    """Extrae hallazgos cualitativos frecuentes en exámenes de orina, heces y serología."""
    if not text:
        return []
    findings: List[Dict[str, Any]] = []
    seen = set()

    pos_pat = r"(?:positivo|positiva|reactivo|reactiva|presente|presentes|abundantes|moderadas|moderados|numerosos|numerosas|\+{1,4}|trazas|escasas)"
    neg_pat = r"(?:negativo|negativa|no\s+reactivo|ausente|ausentes|normal|no\s+se\s+observa)"

    qual_specs = [
        ("orina_nitritos", "Nitritos en Orina", r"\bnitritos\b", True),
        ("orina_esterasa", "Esterasa Leucocitaria", r"esterasa\s+leucocitaria", True),
        ("orina_bacterias", "Bacterias en Orina", r"\bbacterias\b", True),
        ("orina_proteinas", "Proteínas en Orina", r"prote[ií]nas(?:\s+en\s+orina)?", True),
        ("orina_glucosa", "Glucosuria (Glucosa en Orina)", r"glucosa(?:\s+en\s+orina|\s+urinaria)", True),
        ("orina_cetonas", "Cuerpos Cetónicos en Orina", r"(?:cuerpos\s+)?cet[oó]n(?:icos|as)", True),
        ("orina_sangre", "Sangre / Hemoglobina en Orina", r"(?:sangre|hemoglobina|hemat[ií]es)\s+(?:en\s+orina|oculta)", True),
        ("serologia_hpylori", "Helicobacter pylori", r"h(?:elicobacter)?\.?\s*pylori", True),
        ("serologia_vdrl", "VDRL / Sífilis", r"\bvdrl\b", True),
        ("serologia_vih", "VIH (HIV)", r"\b(?:vih|hiv)\b", True),
        ("serologia_hbsag", "Antígeno Superficie Hepatitis B (HBsAg)", r"\bhbsag\b|hepatitis\s*b", True),
        ("heces_sangre_oculta", "Sangre Oculta en Heces", r"sangre\s+oculta(?:\s+en\s+heces)?", True),
    ]

    for raw_line in text.splitlines():
        line = " ".join(raw_line.split()).strip()
        if not line:
            continue
        for key, label, pat, alert_on_pos in qual_specs:
            if key in seen:
                continue
            m = re.search(pat, line, re.IGNORECASE)
            if not m:
                continue
            after = line[m.end():m.end() + 45]
            if re.search(neg_pat, after, re.IGNORECASE):
                seen.add(key)
                findings.append({"key": key, "parametro": label, "resultado": "Negativo / Normal", "alerta": False})
            elif re.search(pos_pat, after, re.IGNORECASE):
                m_val = re.search(pos_pat, after, re.IGNORECASE)
                seen.add(key)
                val_str = m_val.group(0).capitalize() if m_val else "Positivo"
                # Ignorar "escasas" bacterias como alerta mayor
                is_alert = alert_on_pos and ("escas" not in val_str.lower())
                findings.append({"key": key, "parametro": label, "resultado": val_str, "alerta": is_alert})

    # Detectar leucocitos por campo en uroanálisis (ej. "Leucocitos: 15-20 x campo" o ">25 por campo")
    m_leuco_campo = re.search(
        r"leucocitos\s*[:=\-]?\s*(?:>|mas\s+de\s+)?(\d+)(?:\s*[-a]\s*(\d+))?\s*(?:x|por|/)\s*c(?:ampo)?",
        text,
        re.IGNORECASE,
    )
    if m_leuco_campo:
        hi = int(m_leuco_campo.group(2) or m_leuco_campo.group(1))
        findings.append({
            "key": "orina_leucocitos_campo",
            "parametro": "Leucocitos en Orina (Sedimento)",
            "resultado": f"{m_leuco_campo.group(1)}" + (f"-{m_leuco_campo.group(2)}" if m_leuco_campo.group(2) else "") + " x campo",
            "alerta": hi >= 6,
        })

    return findings


def evaluate_existing_lab_values(
    valores_existentes: List[Dict[str, Any]],
    patient_ctx: Optional[PatientContext] = None,
) -> List[Dict[str, Any]]:
    """Re-evalúa una lista de valores de laboratorio editados o ya cargados usando el catálogo y contexto real."""
    ctx = patient_ctx or PatientContext()
    processed: List[Dict[str, Any]] = []

    for item in valores_existentes or []:
        param_name = str(item.get("parametro") or "Parámetro").strip()
        try:
            val = float(item.get("valor", 0))
        except Exception:
            continue

        # Intentar emparejar con el catálogo para enriquecer clave, panel y umbrales críticos
        matched_spec: Optional[BiomarkerSpec] = None
        if item.get("key") and item["key"] in BIOMARKERS_BY_KEY:
            matched_spec = BIOMARKERS_BY_KEY[item["key"]]
        else:
            for sp in BIOMARKERS_KB:
                if re.search(sp.pattern, param_name, re.IGNORECASE):
                    matched_spec = sp
                    break

        if matched_spec:
            rmin_raw = item.get("ref_min")
            rmax_raw = item.get("ref_max")
            printed_range = None
            if rmin_raw is not None and rmax_raw is not None:
                try:
                    if float(rmax_raw) > float(rmin_raw):
                        printed_range = (float(rmin_raw), float(rmax_raw))
                except Exception:
                    pass
            ev = _evaluate_single_biomarker(matched_spec, val, ctx, printed_range)
            ev["parametro"] = param_name or ev["parametro"]
            processed.append(ev)
        else:
            rmin = float(item.get("ref_min", 0))
            rmax = float(item.get("ref_max", 0))
            unidad = str(item.get("unidad") or "")
            if rmax > rmin and val < rmin:
                estado, alerta, interp = "bajo", True, f"Por debajo del rango ({rmin} - {rmax} {unidad})."
            elif rmax > rmin and val > rmax:
                estado, alerta, interp = "alto", True, f"Por encima del rango ({rmin} - {rmax} {unidad})."
            else:
                estado, alerta, interp = "normal", False, "Dentro de parámetros esperados."
            processed.append({
                "key": item.get("key") or re.sub(r"[^a-z0-9]+", "_", param_name.lower()).strip("_"),
                "parametro": param_name,
                "panel": item.get("panel") or "Laboratorio",
                "valor": val,
                "unidad": unidad,
                "ref_min": rmin,
                "ref_max": rmax,
                "estado": estado,
                "alerta": alerta,
                "critico": False,
                "interpretacion": item.get("interpretacion") or interp,
            })
    return processed


# ==============================================================================
# CALCULADORAS CLÍNICAS DERIVADAS (100% EVIDENCIA MÉDICA)
# ==============================================================================
def compute_derived_metrics(
    lab_values: List[Dict[str, Any]],
    patient_ctx: Optional[PatientContext] = None,
) -> List[Dict[str, Any]]:
    """Calcula índices y fórmulas clínicas validadas a partir de los analitos extraídos."""
    ctx = patient_ctx or PatientContext()
    by_key: Dict[str, float] = {
        v["key"]: float(v["valor"]) for v in lab_values if v.get("key") and isinstance(v.get("valor"), (int, float))
    }
    derived: List[Dict[str, Any]] = []

    # 1. TFG / eGFR por ecuación CKD-EPI 2021 (libre de raza)
    if "creatinina" in by_key and by_key["creatinina"] > 0 and ctx.edad is not None and ctx.edad >= 18:
        scr = by_key["creatinina"]
        is_female = (ctx.genero or "").strip().upper() in ("F", "FEMENINO", "MUJER", "FEMALE")
        kappa = 0.7 if is_female else 0.9
        alpha = -0.241 if is_female else -0.302
        sex_factor = 1.012 if is_female else 1.0
        egfr = 142.0 * (min(scr / kappa, 1.0) ** alpha) * (max(scr / kappa, 1.0) ** -1.200) * (0.9938 ** ctx.edad) * sex_factor
        egfr = round(egfr, 1)

        if egfr >= 90:
            estadio, estado = "Estadio G1 (Normal o alta)", "normal"
        elif egfr >= 60:
            estadio, estado = "Estadio G2 (Descenso leve)", "informativo"
        elif egfr >= 45:
            estadio, estado = "Estadio G3a (Descenso leve a moderado)", "alerta"
        elif egfr >= 30:
            estadio, estado = "Estadio G3b (Descenso moderado a grave)", "alerta"
        elif egfr >= 15:
            estadio, estado = "Estadio G4 (Descenso grave - Valorar Nefrología)", "critico"
        else:
            estadio, estado = "Estadio G5 (Fallo renal severo)", "critico"

        derived.append({
            "key": "egfr_ckdepi_2021",
            "nombre": "TFG Estimada (CKD-EPI 2021)",
            "valor": egfr,
            "unidad": "mL/min/1.73m²",
            "estado": estado,
            "interpretacion": estadio,
            "formula": f"Creatinina {scr} mg/dL · {ctx.edad} años · {'F' if is_female else 'M'}",
        })

    # 2. LDL calculado (Fórmula de Friedewald) si faltó en el documento
    if (
        "ldl" not in by_key
        and "colesterol_total" in by_key
        and "hdl" in by_key
        and "trigliceridos" in by_key
        and by_key["trigliceridos"] < 400
    ):
        ldl_calc = round(by_key["colesterol_total"] - by_key["hdl"] - (by_key["trigliceridos"] / 5.0), 1)
        if ldl_calc > 0:
            derived.append({
                "key": "ldl_friedewald",
                "nombre": "Colesterol LDL Estimado (Friedewald)",
                "valor": ldl_calc,
                "unidad": "mg/dL",
                "estado": "alerta" if ldl_calc > 100 else "normal",
                "interpretacion": "Elevado (meta general <100 mg/dL)" if ldl_calc > 100 else "En rango deseable",
                "formula": "CT - HDL - (TG / 5)",
            })

    # 3. Colesterol No-HDL y Castelli I (Índice Aterogénico)
    if "colesterol_total" in by_key and "hdl" in by_key and by_key["hdl"] > 0:
        non_hdl = round(by_key["colesterol_total"] - by_key["hdl"], 1)
        castelli = round(by_key["colesterol_total"] / by_key["hdl"], 2)
        derived.append({
            "key": "colesterol_no_hdl",
            "nombre": "Colesterol No-HDL",
            "valor": non_hdl,
            "unidad": "mg/dL",
            "estado": "alerta" if non_hdl >= 130 else "normal",
            "interpretacion": "Carga aterogénica elevada (meta <130 mg/dL)" if non_hdl >= 130 else "Óptimo (<130 mg/dL)",
            "formula": "Colesterol Total - HDL",
        })
        is_female = (ctx.genero or "").strip().upper() in ("F", "FEMENINO", "MUJER", "FEMALE")
        limit = 4.4 if is_female else 5.0
        derived.append({
            "key": "indice_castelli",
            "nombre": "Índice Aterogénico (Castelli I)",
            "valor": castelli,
            "unidad": "ratio",
            "estado": "alerta" if castelli > limit else "normal",
            "interpretacion": f"Riesgo cardiovascular aumentado (>{limit})" if castelli > limit else f"Riesgo bajo-moderado (≤{limit})",
            "formula": "Colesterol Total / HDL",
        })

    # 4. Relación Triglicéridos / HDL (Marcador de resistencia a la insulina)
    if "trigliceridos" in by_key and "hdl" in by_key and by_key["hdl"] > 0:
        tg_hdl = round(by_key["trigliceridos"] / by_key["hdl"], 2)
        derived.append({
            "key": "tg_hdl_ratio",
            "nombre": "Relación Triglicéridos / HDL",
            "valor": tg_hdl,
            "unidad": "ratio",
            "estado": "alerta" if tg_hdl >= 3.0 else "normal",
            "interpretacion": "Sugiere resistencia insulínica / LDL pequeñas densas (≥3.0)" if tg_hdl >= 3.0 else "Perfil metabólico favorable (<3.0)",
            "formula": "TG / HDL",
        })

    # 5. HOMA-IR (Glucosa + Insulina basal)
    if "glucosa" in by_key and "insulina" in by_key:
        homa = round((by_key["glucosa"] * by_key["insulina"]) / 405.0, 2)
        derived.append({
            "key": "homa_ir",
            "nombre": "Índice HOMA-IR",
            "valor": homa,
            "unidad": "índice",
            "estado": "alerta" if homa >= 2.5 else "normal",
            "interpretacion": "Compatible con resistencia a la insulina (≥2.5)" if homa >= 2.5 else "Sensibilidad insulínica conservada (<2.5)",
            "formula": "(Glucosa × Insulina) / 405",
        })

    # 6. Relación AST / ALT (Índice de De Ritis)
    if "ast" in by_key and "alt" in by_key and by_key["alt"] > 0:
        if by_key["ast"] > 35 or by_key["alt"] > 35:
            deritis = round(by_key["ast"] / by_key["alt"], 2)
            if deritis >= 2.0:
                interp = "Relación ≥2.0 (sugiere etiología alcohólica o cirrosis avanzada)."
                st = "alerta"
            elif deritis < 1.0:
                interp = "Relación <1.0 (típica de esteatosis hepática / NAFLD o hepatitis viral)."
                st = "informativo"
            else:
                interp = "Relación intermedia (1.0 - 1.9); correlacionar con clínica e imagen hepática."
                st = "informativo"
            derived.append({
                "key": "de_ritis",
                "nombre": "Índice de De Ritis (AST/ALT)",
                "valor": deritis,
                "unidad": "ratio",
                "estado": st,
                "interpretacion": interp,
                "formula": "AST / ALT",
            })

    # 7. Índice de Mentzer (si hay microcitosis VCM < 80 + Eritrocitos)
    if "vcm" in by_key and "eritrocitos" in by_key and by_key["eritrocitos"] > 0 and by_key["vcm"] < 80:
        mentzer = round(by_key["vcm"] / by_key["eritrocitos"], 1)
        derived.append({
            "key": "mentzer",
            "nombre": "Índice de Mentzer (VCM / RBC)",
            "valor": mentzer,
            "unidad": "índice",
            "estado": "informativo",
            "interpretacion": (
                "Índice >13: favorece Anemia Ferropénica sobre rasgo talasémico."
                if mentzer > 13
                else "Índice ≤13: sugiere considerar rasgo talasémico (solicitar electroforesis de Hb)."
            ),
            "formula": "VCM / Eritrocitos",
        })

    # 8. Calcio corregido por Albúmina
    if "calcio" in by_key and "albumina" in by_key and by_key["albumina"] < 4.0:
        ca_corr = round(by_key["calcio"] + 0.8 * (4.0 - by_key["albumina"]), 2)
        derived.append({
            "key": "calcio_corregido",
            "nombre": "Calcio Corregido por Albúmina",
            "valor": ca_corr,
            "unidad": "mg/dL",
            "estado": "alerta" if (ca_corr < 8.5 or ca_corr > 10.5) else "normal",
            "interpretacion": "Calcio fisiológico real ajustado por hipoalbuminemia.",
            "formula": "Ca + 0.8 × (4.0 - Albúmina)",
        })

    # 9. Relación Neutrófilos / Linfocitos (NLR)
    if "neutrofilos" in by_key and "linfocitos" in by_key and by_key["linfocitos"] > 0:
        nlr = round(by_key["neutrofilos"] / by_key["linfocitos"], 2)
        if nlr >= 3.5:
            derived.append({
                "key": "nlr",
                "nombre": "Índice Neutrófilos / Linfocitos (NLR)",
                "valor": nlr,
                "unidad": "ratio",
                "estado": "alerta" if nlr >= 5.0 else "informativo",
                "interpretacion": "Estrés inflamatorio / respuesta infecciosa bacteriana elevada (≥3.5).",
                "formula": "Neutrófilos % / Linfocitos %",
            })

    return derived


# ==============================================================================
# MOTOR DE RAZONAMIENTO SINDRÓMICO & SUGERENCIAS CIE-10 (MULTI-ANALITO)
# ==============================================================================
def detect_clinical_syndromes(
    lab_values: List[Dict[str, Any]],
    qualitative: List[Dict[str, Any]],
    derived: List[Dict[str, Any]],
    patient_ctx: Optional[PatientContext] = None,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Correlaciona múltiples biomarcadores simultáneamente para identificar síndromes clínicos
    y proponer códigos CIE-10 orientativos al médico tratante.
    """
    by_key = {v["key"]: v for v in lab_values if v.get("key")}
    qual_by_key = {q["key"]: q for q in qualitative if q.get("key")}
    der_by_key = {d["key"]: d for d in derived if d.get("key")}

    syndromes: List[Dict[str, Any]] = []

    def add_syndrome(
        cie10: str,
        nombre: str,
        severidad: str,
        evidencia: List[str],
        conducta: str,
        confianza: float = 0.85,
    ):
        syndromes.append({
            "codigo_cie10": cie10,
            "nombre": nombre,
            "severidad": severidad,  # critico | alto | moderado | leve | informativo
            "evidencia": evidencia,
            "conducta_sugerida": conducta,
            "confianza": round(confianza, 2),
        })

    # 1. ANEMIA Y CLASIFICACIÓN MORFOLÓGICA
    hb = by_key.get("hemoglobina")
    vcm = by_key.get("vcm")
    ferr = by_key.get("ferritina")
    b12 = by_key.get("vitamina_b12")
    fol = by_key.get("acido_folico")

    if hb and hb["estado"] == "bajo":
        hb_val = float(hb["valor"])
        ev = [f"Hemoglobina {hb_val} g/dL"]
        if by_key.get("hematocrito") and by_key["hematocrito"]["estado"] == "bajo":
            ev.append(f"Hematocrito {by_key['hematocrito']['valor']}%")
        sev = "critico" if hb_val < 7.0 else ("alto" if hb_val < 10.0 else "moderado")

        if vcm and float(vcm["valor"]) < 80:
            ev.append(f"VCM {vcm['valor']} fL (microcítica)")
            if ferr and float(ferr["valor"]) < 30:
                ev.append(f"Ferritina {ferr['valor']} ng/mL")
            add_syndrome(
                "D50.9",
                "Anemia Microcítica / Sospecha Ferropénica",
                sev,
                ev,
                "Evaluar perfil férrico completo (ferritina, saturación de transferrina), investigar pérdidas crónicas (GI/ginecológicas) y valorar ferroterapia.",
                0.91 if ferr else 0.84,
            )
        elif vcm and float(vcm["valor"]) > 96:
            ev.append(f"VCM {vcm['valor']} fL (macrocítica)")
            if b12 and b12["estado"] == "bajo":
                ev.append(f"Vitamina B12 {b12['valor']} pg/mL")
                add_syndrome(
                    "D51.9",
                    "Anemia Macrocítica por Déficit de Vitamina B12",
                    sev,
                    ev,
                    "Suplementación con cianocobalamina/hidroxocobalamina, descartar gastritis atrófica o malabsorción.",
                    0.92,
                )
            elif fol and fol["estado"] == "bajo":
                ev.append(f"Ácido Fólico {fol['valor']} ng/mL")
                add_syndrome("D52.9", "Anemia Macrocítica por Déficit de Folatos", sev, ev, "Reposición de ácido fólico y evaluación nutricional.", 0.9)
            else:
                add_syndrome("D53.9", "Anemia Macrocítica en Estudio", sev, ev, "Solicitar niveles de Vitamina B12, folato, reticulocitos y perfil hepático/tiroideo.", 0.8)
        else:
            add_syndrome(
                "D64.9",
                "Anemia Normocítica / No Especificada",
                sev,
                ev,
                "Solicitar reticulocitos, perfil férrico, función renal y marcadores inflamatorios para clasificar etiología.",
                0.82,
            )
    elif ferr and ferr["estado"] == "bajo":
        add_syndrome(
            "E61.1",
            "Ferropenia (Déficit de Depósitos de Hierro sin Anemia)",
            "leve",
            [f"Ferritina {ferr['valor']} ng/mL"],
            "Corregir reservas de hierro de forma temprana para prevenir anemia clínica.",
            0.88,
        )

    # 2. ALTERACIONES LEUCOCITARIAS / PLAQUETARIAS / PANCITOPENIA
    wbc = by_key.get("leucocitos")
    plt = by_key.get("plaquetas")
    neu = by_key.get("neutrofilos")
    linf = by_key.get("linfocitos")

    if hb and hb["estado"] == "bajo" and wbc and wbc["estado"] == "bajo" and plt and plt["estado"] == "bajo":
        add_syndrome(
            "D61.81",
            "Pancitopenia (Compromiso de las 3 Series Hematológicas)",
            "critico",
            [f"Hb {hb['valor']} g/dL", f"Leucocitos {wbc['valor']} /mm3", f"Plaquetas {plt['valor']} /mm3"],
            "Evaluación prioritaria por Hematología, frotis de sangre periférica y descartar causa medular, viral o farmacológica.",
            0.94,
        )
    else:
        if wbc and wbc["estado"] == "alto":
            ev = [f"Leucocitos {wbc['valor']} /mm3"]
            if neu and neu["estado"] == "alto":
                ev.append(f"Neutrófilos {neu['valor']}%")
                add_syndrome(
                    "D72.8",
                    "Leucocitosis con Neutrofilia (Patrón Infeccioso Bacteriano / Inflamatorio)",
                    "moderado" if float(wbc["valor"]) < 20000 else "alto",
                    ev,
                    "Buscar foco infeccioso activo, correlacionar con fiebre, PCR/procalcitonina y criterios para terapia dirigida.",
                    0.86,
                )
            elif linf and linf["estado"] == "alto":
                ev.append(f"Linfocitos {linf['valor']}%")
                add_syndrome(
                    "D72.8",
                    "Leucocitosis con Linfocitosis (Patrón Viral / Reactivo)",
                    "moderado",
                    ev,
                    "Correlacionar con cuadro viral respiratorio/sistémico; considerar frotis si persiste.",
                    0.8,
                )
            else:
                add_syndrome(
                    "D72.8",
                    "Leucocitosis",
                    "moderado",
                    ev,
                    "Correlacionar con clínica infecciosa, estrés fisiológico o uso de corticoides.",
                    0.78,
                )

        if plt and plt["estado"] == "bajo":
            sev = "critico" if float(plt["valor"]) < 50000 else ("alto" if float(plt["valor"]) < 100000 else "moderado")
            add_syndrome(
                "D69.6",
                "Trombocitopenia",
                sev,
                [f"Plaquetas {plt['valor']} /mm3"],
                "Descartar síndromes febriles virales (ej. dengue), pseudotrombocitopenia por EDTA y signos de alarma hemorrágica.",
                0.89,
            )

    # 3. METABOLISMO GLUCÉMICO (DIABETES / PREDIABETES / HIPOGLUCEMIA / RESISTENCIA INSULINA)
    glu = by_key.get("glucosa")
    a1c = by_key.get("hba1c")
    if glu and float(glu["valor"]) < 70:
        sev = "critico" if float(glu["valor"]) < 54 else "alto"
        add_syndrome(
            "E16.2",
            "Hipoglucemia",
            sev,
            [f"Glucosa {glu['valor']} mg/dL"],
            "Evaluar síntomas autonómicos/neuroglucopénicos inmediatos y revisar dosis de insulina o hipoglucemiantes.",
            0.93,
        )
    elif (glu and float(glu["valor"]) >= 126) or (a1c and float(a1c["valor"]) >= 6.5):
        ev = []
        if glu:
            ev.append(f"Glucosa basal {glu['valor']} mg/dL")
        if a1c:
            ev.append(f"HbA1c {a1c['valor']}%")
        sev = "critico" if (glu and float(glu["valor"]) >= 300) else "alto"
        add_syndrome(
            "E11.9",
            "Criterio Bioquímico Compatible con Diabetes Mellitus / Descontrol Glucémico",
            sev,
            ev,
            "Confirmar con segunda determinación si no hay diagnóstico previo; ajustar plan nutricional, control metabólico y tamizaje renal/oftalmológico.",
            0.93 if (glu and a1c) else 0.87,
        )
    elif (glu and 100 <= float(glu["valor"]) <= 125) or (a1c and 5.7 <= float(a1c["valor"]) <= 6.4):
        ev = []
        if glu and float(glu["valor"]) >= 100:
            ev.append(f"Glucosa basal {glu['valor']} mg/dL")
        if a1c and float(a1c["valor"]) >= 5.7:
            ev.append(f"HbA1c {a1c['valor']}%")
        add_syndrome(
            "R73.03",
            "Prediabetes / Glucemia Basal Alterada",
            "moderado",
            ev,
            "Intervención intensiva de estilo de vida (alimentación baja en carga glucémica, ejercicio), control de peso y reevaluación en 3-6 meses.",
            0.86,
        )

    if der_by_key.get("homa_ir") and float(der_by_key["homa_ir"]["valor"]) >= 2.5:
        add_syndrome(
            "E88.81",
            "Resistencia a la Insulina / Riesgo de Síndrome Metabólico",
            "moderado",
            [f"HOMA-IR {der_by_key['homa_ir']['valor']}"],
            "Evaluar perímetro abdominal, presión arterial y perfil lipídico; intervención metabólica nutricional.",
            0.88,
        )

    # 4. DISLIPIDEMIA
    ct = by_key.get("colesterol_total")
    tg = by_key.get("trigliceridos")
    ldl = by_key.get("ldl")
    hdl = by_key.get("hdl")
    high_chol = (ct and ct["estado"] == "alto") or (ldl and ldl["estado"] == "alto")
    high_tg = tg and tg["estado"] == "alto"

    if high_chol and high_tg:
        ev = [f"{x['parametro']}: {x['valor']} {x['unidad']}" for x in [ct, ldl, tg] if x and x["estado"] == "alto"]
        add_syndrome(
            "E78.2",
            "Dislipidemia Mixta (Hiperlipidemia Combinada)",
            "alto" if (tg and float(tg["valor"]) >= 500) else "moderado",
            ev,
            "Calcular riesgo cardiovascular a 10 años, indicar dieta cardioprotectora y valorar terapia hipolipemiante (estatinas/fibratos según perfil).",
            0.91,
        )
    elif high_chol:
        ev = [f"{x['parametro']}: {x['valor']} {x['unidad']}" for x in [ct, ldl] if x and x["estado"] == "alto"]
        add_syndrome(
            "E78.0",
            "Hipercolesterolemia",
            "moderado",
            ev,
            "Optimizar dieta baja en grasas saturadas, ejercicio aeróbico y estratificar necesidad de estatina según LDL y comorbilidades.",
            0.89,
        )
    elif high_tg:
        sev = "alto" if float(tg["valor"]) >= 500 else "moderado"
        add_syndrome(
            "E78.1",
            "Hipertrigliceridemia" + (" Severa (Riesgo de Pancreatitis)" if float(tg["valor"]) >= 500 else ""),
            sev,
            [f"Triglicéridos {tg['valor']} mg/dL"],
            "Restringir azúcares simples y alcohol; descartar diabetes/hipotiroidismo secundario y valorar omega-3 o fibratos si ≥500 mg/dL.",
            0.9,
        )
    elif hdl and hdl["estado"] == "bajo":
        add_syndrome(
            "E78.6",
            "Hipoalfalipoproteinemia (HDL Bajo)",
            "leve",
            [f"HDL {hdl['valor']} mg/dL"],
            "Fomentar actividad física regular, grasas saludables (omega-3/aceite de oliva) y cesación tabáquica.",
            0.8,
        )

    # 5. FUNCIÓN RENAL & HIPERURICEMIA
    creat = by_key.get("creatinina")
    urea = by_key.get("urea")
    egfr_obj = der_by_key.get("egfr_ckdepi_2021")
    urico = by_key.get("acido_urico")

    if (creat and creat["estado"] == "alto") or (egfr_obj and float(egfr_obj["valor"]) < 60):
        ev = []
        if creat:
            ev.append(f"Creatinina {creat['valor']} mg/dL")
        if urea and urea["estado"] == "alto":
            ev.append(f"Urea {urea['valor']} mg/dL")
        if egfr_obj:
            ev.append(f"TFG CKD-EPI {egfr_obj['valor']} mL/min/1.73m²")
        sev = "critico" if (creat and float(creat["valor"]) >= 4.0) or (egfr_obj and float(egfr_obj["valor"]) < 30) else "alto"
        cie = "N18.4" if (egfr_obj and float(egfr_obj["valor"]) < 30) else ("N18.3" if (egfr_obj and float(egfr_obj["valor"]) < 60) else "N18.9")
        add_syndrome(
            cie,
            "Alteración de Función Renal / Descenso de Filtrado Glomerular",
            sev,
            ev,
            "Diferenciar lesión renal aguda vs enfermedad renal crónica (comparar creatinina previa), evitar nefrotóxicos (AINEs) y ajustar dosis farmacológicas.",
            0.9,
        )

    if urico and urico["estado"] == "alto":
        add_syndrome(
            "E79.0",
            "Hiperuricemia",
            "leve" if float(urico["valor"]) < 9.0 else "moderado",
            [f"Ácido Úrico {urico['valor']} mg/dL"],
            "Investigar síntomas articulares (gota) o litiasis renal; reducir purinas/fructosa/alcohol y mejorar hidratación.",
            0.87,
        )

    # 6. PERFIL HEPÁTICO (HEPATOCELULAR vs COLESTÁSICO)
    ast = by_key.get("ast")
    alt = by_key.get("alt")
    fa = by_key.get("fosfatasa_alcalina")
    ggt = by_key.get("ggt")
    bt = by_key.get("bilirrubina_total")
    bd = by_key.get("bilirrubina_directa")

    hepato = (ast and ast["estado"] == "alto") or (alt and alt["estado"] == "alto")
    colest = (fa and fa["estado"] == "alto") or (ggt and ggt["estado"] == "alto") or (bd and bd["estado"] == "alto")

    if hepato:
        ev = [f"{x['parametro']}: {x['valor']} {x['unidad']}" for x in [ast, alt, ggt] if x and x["estado"] == "alto"]
        sev = "alto" if ((ast and float(ast["valor"]) > 200) or (alt and float(alt["valor"]) > 200)) else "moderado"
        add_syndrome(
            "R74.01",
            "Elevación de Transaminasas (Patrón Hepatocelular)",
            sev,
            ev,
            "Evaluar esteatosis hepática (ecografía abdominal), consumo de alcohol, fármacos hepatotóxicos y serología viral según contexto.",
            0.88,
        )
    if colest and not hepato:
        ev = [f"{x['parametro']}: {x['valor']} {x['unidad']}" for x in [fa, ggt, bt, bd] if x and x["estado"] == "alto"]
        add_syndrome(
            "K83.1",
            "Patrón Colestásico / Alteración Hepatobiliar",
            "moderado",
            ev,
            "Correlacionar con ictericia o dolor en hipocondrio derecho; considerar ecografía hepatobiliar para descartar obstrucción o litiasis.",
            0.84,
        )

    # 7. PERFIL TIROIDEO
    tsh = by_key.get("tsh")
    t4l = by_key.get("t4_libre")
    anti_tpo = by_key.get("anti_tpo")

    if tsh and tsh["estado"] == "alto":
        ev = [f"TSH {tsh['valor']} uUI/mL"]
        if t4l and t4l["estado"] == "bajo":
            ev.append(f"T4 Libre {t4l['valor']} ng/dL")
            add_syndrome(
                "E03.9",
                "Hipotiroidismo Primario Manifiesto",
                "alto",
                ev,
                "Iniciar o titular terapia sustitutiva con levotiroxina y reevaluar TSH/T4L en 6-8 semanas.",
                0.94,
            )
        else:
            if t4l:
                ev.append(f"T4 Libre {t4l['valor']} ng/dL (normal)")
            add_syndrome(
                "E02",
                "Hipotiroidismo Subclínico / TSH Elevada",
                "moderado",
                ev,
                "Confirmar TSH + T4 Libre y anticuerpos Anti-TPO; valorar tratamiento si TSH ≥10 uUI/mL, síntomas o embarazo.",
                0.86,
            )
    elif tsh and tsh["estado"] == "bajo":
        ev = [f"TSH {tsh['valor']} uUI/mL"]
        if t4l and t4l["estado"] == "alto":
            ev.append(f"T4 Libre {t4l['valor']} ng/dL")
        add_syndrome(
            "E05.9",
            "Hipertiroidismo / Tirotoxicosis Bioquímica",
            "alto",
            ev,
            "Evaluar síntomas adrenérgicos (taquicardia, temblor, pérdida de peso), anticuerpos TRAb y ecografía tiroidea.",
            0.9,
        )

    if anti_tpo and anti_tpo["estado"] == "alto":
        add_syndrome(
            "E06.3",
            "Autoinmunidad Tiroidea (Compatible con Tiroiditis de Hashimoto)",
            "moderado",
            [f"Anti-TPO {anti_tpo['valor']} UI/mL"],
            "Seguimiento periódico de función tiroidea (TSH/T4L) y ecografía tiroidea.",
            0.9,
        )

    # 8. ELECTROLITOS CRÍTICOS / RELEVANTES
    k = by_key.get("potasio")
    na = by_key.get("sodio")
    if k and k["estado"] == "alto":
        add_syndrome(
            "E87.5",
            "Hiperkalemia",
            "critico" if float(k["valor"]) >= 6.0 else "alto",
            [f"Potasio {k['valor']} mEq/L"],
            "Prioridad: realizar electrocardiograma (EKG), descartar pseudohiperkalemia por hemólisis y revisar función renal / IECA / ARA-II.",
            0.93,
        )
    elif k and k["estado"] == "bajo":
        add_syndrome(
            "E87.6",
            "Hipokalemia",
            "critico" if float(k["valor"]) <= 2.8 else "alto",
            [f"Potasio {k['valor']} mEq/L"],
            "Evaluar pérdidas gastrointestinales o diuréticos; valorar reposición oral/IV de potasio y magnesio.",
            0.92,
        )
    if na and na["estado"] == "bajo":
        add_syndrome(
            "E87.1",
            "Hiponatremia",
            "critico" if float(na["valor"]) <= 125 else "moderado",
            [f"Sodio {na['valor']} mEq/L"],
            "Evaluar estado de volemia, síntomas neurológicos y corregir de forma controlada según cronicidad.",
            0.89,
        )
    elif na and na["estado"] == "alto":
        add_syndrome(
            "E87.0",
            "Hipernatremia",
            "critico" if float(na["valor"]) >= 155 else "moderado",
            [f"Sodio {na['valor']} mEq/L"],
            "Evaluar déficit de agua libre e hidratación progresiva.",
            0.89,
        )

    # 9. INFLAMACIÓN / VITAMINAS / CARDÍACO / PSA / UROANÁLISIS
    pcr = by_key.get("pcr")
    vsg = by_key.get("vsg")
    if (pcr and pcr["estado"] == "alto") or (vsg and vsg["estado"] == "alto"):
        ev = [f"{x['parametro']}: {x['valor']} {x['unidad']}" for x in [pcr, vsg] if x and x["estado"] == "alto"]
        add_syndrome(
            "R70.0",
            "Respuesta Inflamatoria Sistémica / Reactantes de Fase Aguda Elevados",
            "moderado",
            ev,
            "Correlacionar con cuadro infeccioso, reumatológico o tisular activo.",
            0.83,
        )

    vitd = by_key.get("vitamina_d")
    if vitd and vitd["estado"] == "bajo":
        add_syndrome(
            "E55.9",
            "Deficiencia / Insuficiencia de Vitamina D",
            "leve",
            [f"Vitamina D (25-OH) {vitd['valor']} ng/mL"],
            "Indicar suplementación con colecalciferol según déficit y control en 3 meses.",
            0.92,
        )

    trop = by_key.get("troponina")
    if trop and trop["estado"] == "alto":
        add_syndrome(
            "I21.9",
            "Elevación de Troponina Cardíaca (Descartar Síndrome Coronario Agudo)",
            "critico",
            [f"Troponina {trop['valor']} {trop['unidad']}"],
            "URGENTE: Electrocardiograma inmediato de 12 derivaciones, curva enzimática y valoración cardiológica/urgencias.",
            0.95,
        )

    psa = by_key.get("psa_total")
    if psa and psa["estado"] == "alto":
        add_syndrome(
            "R97.20",
            "Elevación de Antígeno Prostático Específico (PSA)",
            "moderado",
            [f"PSA Total {psa['valor']} ng/mL"],
            "Correlacionar con relación PSA Libre/Total, síntomas urinarios, descartar prostatitis y derivar a Urología.",
            0.88,
        )

    # Uroanálisis -> ITU
    uti_markers = [
        qual_by_key.get("orina_nitritos"),
        qual_by_key.get("orina_esterasa"),
        qual_by_key.get("orina_bacterias"),
        qual_by_key.get("orina_leucocitos_campo"),
    ]
    uti_positives = [m for m in uti_markers if m and m.get("alerta")]
    if len(uti_positives) >= 2 or (qual_by_key.get("orina_nitritos") and qual_by_key["orina_nitritos"].get("alerta")):
        add_syndrome(
            "N39.0",
            "Hallazgos Urinarios Sugestivos de Infección del Tracto Urinario (ITU)",
            "moderado",
            [f"{m['parametro']}: {m['resultado']}" for m in uti_positives],
            "Correlacionar con disuria/polaquiuria/fiebre; considerar urocultivo con antibiograma y terapia antibiótica dirigida.",
            0.9,
        )

    # Ordenar síndromes por severidad clínica
    sev_order = {"critico": 0, "alto": 1, "moderado": 2, "leve": 3, "informativo": 4}
    syndromes.sort(key=lambda s: sev_order.get(s["severidad"], 5))

    # Construir lista deduplicada de CIE-10 sugeridos
    cie10_list: List[Dict[str, Any]] = []
    seen_codes = set()
    for s in syndromes:
        code = s["codigo_cie10"]
        if code not in seen_codes:
            seen_codes.add(code)
            cie10_list.append({
                "codigo": code,
                "descripcion": s["nombre"],
                "severidad": s["severidad"],
                "fuente": "Correlación bioquímica MediCore AI",
            })

    return syndromes, cie10_list


# ==============================================================================
# NLP CLÍNICO PARA INFORMES DE IMAGENOLOGÍA Y ESPECIALIDADES
# ==============================================================================
NEGATION_CUES = re.compile(
    r"(?:\bno\s+(?:se\s+)?(?:observa|observan|evidencia|evidencian|aprecia|aprecian|identifica|identifican|"
    r"visualiza|visualizan|detecta|detectan|hay|existe|existen|muestra|muestran|presenta)\b|"
    r"\bsin\s+(?:evidencia\s+de|signos\s+de|datos\s+de|hallazgos\s+de|presencia\s+de|lesiones\s+de|alteraciones)?\b|"
    r"\bausencia\s+de\b|\bdescartad[oa]\b|\bnegativ[oa]\s+para\b|\blibre\s+de\b|\baliti[aá]sic[oa]\b)",
    re.IGNORECASE,
)

# (regex_patologia, nombre_clinico, codigo_cie10, severidad, explicacion_paciente)
IMAGING_PATHOLOGIES: List[Tuple[str, str, str, str, str]] = [
    (r"esteatosis\s+hep[aá]tica|h[ií]gado\s+graso|infiltraci[oó]n\s+grasa\s+hep[aá]tica", "Esteatosis Hepática (Hígado Graso)", "K76.0", "moderado", "acumulación de grasa en el hígado, generalmente manejable con ajustes de alimentación y actividad física"),
    (r"colelitiasis|litiasis\s+vesicular|c[aá]lculos?\s+(?:en\s+)?ves[ií]cula|lito\s+vesicular", "Colelitiasis (Cálculos en Vesícula Biliar)", "K80.2", "moderado", "presencia de piedritas (cálculos) en la vesícula biliar"),
    (r"colecistitis", "Signos de Colecistitis", "K81.9", "alto", "inflamación de la vesícula biliar que requiere evaluación médica pronta"),
    (r"nefrolitiasis|litiasis\s+renal|urolitiasis|c[aá]lculo\s+renal|microlitiasis\s+renal", "Litiasis Renal (Cálculo en Riñón)", "N20.0", "moderado", "presencia de cálculo o arenilla renal"),
    (r"hidronefrosis|pielocaliectasia|dilataci[oó]n\s+pielocalicial", "Hidronefrosis / Dilatación Pielocalicial", "N13.3", "alto", "dilatación de las vías urinarias renales que requiere seguimiento urológico"),
    (r"quiste\s+renal", "Quiste Renal", "N28.1", "leve", "pequeña bolsita de líquido en el riñón (habitualmente benigna según características)"),
    (r"hepatomegalia", "Hepatomegalia (Aumento de Tamaño Hepático)", "R16.0", "moderado", "aumento moderado del tamaño del hígado"),
    (r"esplenomegalia", "Esplenomegalia", "R16.1", "moderado", "aumento de tamaño del bazo"),
    (r"quiste\s+(?:de\s+|en\s+)?ovario|quiste\s+ov[aá]rico", "Quiste Ovárico", "N83.2", "moderado", "formación quística en el ovario que será controlada por su médico/ginecólogo"),
    (r"ovario(?:s)?\s+poliqu[ií]stico(?:s)?|morfolog[ií]a\s+poliqu[ií]stica", "Ovarios de Morfología Poliquística", "E28.2", "moderado", "múltiples folículos pequeños en los ovarios, a correlacionar con perfil hormonal"),
    (r"mioma(?:s|tosis)?\s+uterin[oa]|leiomioma|fibroma\s+uterino", "Miomatosis Uterina", "D25.9", "moderado", "nódulos musculares benignos en el útero (miomas)"),
    (r"n[oó]dulo(?:s)?\s+tiroideo(?:s)?|bocio\s+(?:multinodular|nodular)", "Nódulo Tiroideo / Bocio Nodular", "E04.1", "moderado", "pequeño nódulo en la glándula tiroides para control ecográfico y hormonal"),
    (r"tiroiditis", "Signos Sugestivos de Tiroiditis", "E06.9", "moderado", "cambios inflamatorios en la glándula tiroides"),
    (r"n[oó]dulo\s+mamario|fibroadenoma|quiste\s+mamario", "Hallazgo Nodular / Quístico Mamario", "N63", "moderado", "formación en tejido mamario que se clasifica según escala BI-RADS"),
    (r"hiperplasia\s+prost[aá]tica|crecimiento\s+prost[aá]tico|pr[oó]stata\s+aumentada", "Hiperplasia / Crecimiento Prostático", "N40.0", "moderado", "aumento de volumen de la próstata frecuente con la edad"),
    (r"consolidaci[oó]n\s+(?:pulmonar|neum[oó]nica|basal|lobar)|infiltrado\s+alveolar|neumon[ií]a", "Consolidación / Infiltrado Pulmonar (Descartar Neumonía)", "J18.9", "alto", "zona de inflamación o infección en el pulmón que requiere tratamiento dirigido"),
    (r"derrame\s+pleural", "Derrame Pleural", "J90", "alto", "acumulación de líquido en el espacio que rodea al pulmón"),
    (r"neumot[oó]rax", "Neumotórax (ALERTA PRIORITARIA)", "J93.9", "critico", "presencia de aire fuera del pulmón que requiere evaluación médica inmediata"),
    (r"cardiomegalia|aumento\s+de\s+(?:la\s+)?silueta\s+card[ií]aca", "Cardiomegalia", "I51.7", "alto", "aumento del tamaño de la silueta cardíaca a evaluar con cardiología"),
    (r"atelectasia", "Atelectasia Pulmonar", "J98.1", "moderado", "pequeña zona pulmonar con menor entrada de aire"),
    (r"n[oó]dulo\s+pulmonar", "Nódulo Pulmonar en Estudio", "R91.1", "alto", "imagen nodular pulmonar que amerita seguimiento tomográfico"),
    (r"fractura|trazo\s+de\s+fractura|soluci[oó]n\s+de\s+continuidad\s+[oó]sea", "Trazo de Fractura Ósea", "T14.2", "alto", "lesión/fractura ósea identificada en la imagen"),
    (r"hernia\s+(?:discal|de\s+disco)|protrusi[oó]n\s+discal|abombamiento\s+discal", "Discopatía / Protrusión o Hernia Discal", "M51.2", "moderado", "desplazamiento o desgaste de un disco de la columna vertebral"),
    (r"escoliosis", "Escoliosis", "M41.9", "leve", "desviación lateral de la curvatura de la columna"),
    (r"artrosis|osteoartritis|cambios\s+degenerativos\s+articulares|osteofitos", "Cambios Degenerativos / Artrosis", "M19.9", "leve", "signos de desgaste articular"),
    (r"derrame\s+articular|sinovitis|bursitis|tendinitis|tendinosis|desgarro", "Lesión Musculoesquelética / Inflamación Articular-Tendinosa", "M77.9", "moderado", "inflamación o lesión en tendón o articulación"),
    (r"sinusitis|engrosamiento\s+mucoso\s+sinusal|ocupaci[oó]n\s+del\s+seno", "Sinusitis / Engrosamiento Mucoso Sinusal", "J32.9", "moderado", "inflamación o congestión en los senos paranasales"),
    (r"tercer\s+molar.*(?:impactad|retenid|incluid|mesioangular)|molar\s+(?:18|28|38|48).*(?:impact|retenid|inclu)", "Tercer Molar Impactado / Retenido", "K01.1", "moderado", "muela del juicio retenida o inclinada para valoración odontológica"),
    (r"lesi[oó]n\s+periapical|quiste\s+periapical|granuloma\s+apical|caries\s+profunda", "Lesión Periapical / Patología Dental", "K04.5", "moderado", "lesión en la raíz o estructura dental que amerita tratamiento odontológico"),
    (r"gastritis|esofagitis|hernia\s+hiatal|[uú]lcera\s+(?:g[aá]strica|duodenal)", "Patología Gastroesofágica (Gastritis / Esofagitis / Hernia)", "K29.7", "moderado", "inflamación en la mucosa del esófago o estómago"),
    (r"p[oó]lipo(?:s)?\s+(?:col[oó]nico|g[aá]strico|endometrial|vesicular)", "Pólipo Identificado", "K63.5", "moderado", "pequeño crecimiento de tejido mucoso para seguimiento o biopsia"),
    (r"varicocele", "Varicocele", "I86.1", "leve", "dilatación de venas en el cordón espermático"),
    (r"insuficiencia\s+venosa|reflujo\s+venoso|trombosis\s+venosa", "Alteración Vascular Venosa", "I87.2", "alto", "alteración del flujo venoso que requiere evaluación vascular"),
    (r"estenosis\s+(?:carot[ií]dea|arterial)|placa\s+ateromatosa|ateromatosis", "Ateromatosis / Estenosis Arterial", "I70.9", "alto", "depósito de placa en pared arterial a correlacionar con riesgo cardiovascular"),
    (r"arritmia|fibrilaci[oó]n\s+auricular|bloqueo\s+(?:de\s+rama|av)|taquicardia|bradicardia|isquemia\s+mioc[aá]rdica", "Hallazgo Electrocardiográfico Relevante", "I49.9", "alto", "alteración del ritmo o conducción eléctrica del corazón"),
]


def _detect_modality_and_region(combined: str) -> Tuple[str, str]:
    low = combined.lower()
    if any(k in low for k in ("panorámica", "panoramica", "ortopantomograf", "periapical", "dental", "odont", "molar")):
        return "Ortopantomografía / Radiografía Dental", "Maxilar superior, mandíbula y arcadas dentarias"
    if any(k in low for k in ("mamograf", "mama", "mamari", "bi-rads", "birads")):
        return "Mamografía / Ecografía Mamaria", "Glándulas mamarias bilaterales y regiones axilares"
    if any(k in low for k in ("tiroid", "ti-rads", "tirads")):
        return "Ecografía Tiroidea", "Glándula tiroides y cadenas ganglionares cervicales"
    if any(k in low for k in ("obst", "fetal", "embarazo", "gestacional", "placenta", "lcf")):
        return "Ecografía Obstétrica", "Útero grávido y evaluación fetal"
    if any(k in low for k in ("pélvic", "pelvic", "transvaginal", "ovario", "útero", "utero", "endometrio")):
        return "Ecografía Pélvica / Ginecológica", "Útero, endometrio y anexos ováricos"
    if any(k in low for k in ("prost", "próstata", "prostata", "vesicoprost")):
        return "Ecografía Prostática / Vésico-Prostática", "Vejiga urinaria y glándula prostática"
    if any(k in low for k in ("renal", "riñon", "riñón", "vías urinarias", "vias urinarias")):
        return "Ecografía Renal y de Vías Urinarias", "Riñones bilaterales, uréteres y vejiga"
    if any(k in low for k in ("abdom", "hígado", "higado", "hepát", "vesícula", "vesicula", "páncreas", "bazo")):
        return "Ecografía Abdominal", "Abdomen superior (hígado, vesícula, páncreas, bazo y riñones)"
    if any(k in low for k in ("doppler", "carotid", "venos", "arterial")):
        return "Ecografía Doppler Vascular", "Sistema vascular evaluado"
    if any(k in low for k in ("tórax", "torax", "pulmón", "pulmon", "pleur", "cardiotor")):
        return "Radiografía / Estudio de Tórax", "Campos pleuropulmonares, mediastino y silueta cardíaca"
    if any(k in low for k in ("columna", "lumbar", "cervical", "dorsal", "discal", "vértebra")):
        return "Imagenología de Columna Vertebral", "Columna vertebral y discos intervertebrales"
    if any(k in low for k in ("tomograf", "tac ", " tc ", "scanner")):
        return "Tomografía Axial Computarizada (TAC)", "Región anatómica según protocolo tomográfico"
    if any(k in low for k in ("resonancia", "rmn", "mri")):
        return "Resonancia Magnética Nuclear (RMN)", "Región anatómica evaluada por RMN"
    if any(k in low for k in ("electrocardiograma", "ekg", "ecg", "ritmo sinusal")):
        return "Electrocardiograma (EKG)", "Actividad eléctrica cardíaca"
    if any(k in low for k in ("endoscop", "gastroscop", "colonoscop")):
        return "Estudio Endoscópico Digestivo", "Tracto gastrointestinal evaluado"
    if any(k in low for k in ("eco", "ultrason", "sonograf")):
        return "Ultrasonografía / Ecografía", "Región anatómica evaluada"
    if any(k in low for k in ("rx", "rayos x", "radiograf", "placa")):
        return "Radiografía Digital", "Estructura anatómica evaluada"
    return "Estudio / Informe Médico Complementario", "Región anatómica evaluada"


def _extract_section(text: str, headers: List[str]) -> str:
    if not text:
        return ""
    joined = "|".join(headers)
    stop_headers = (
        r"(?:t[eé]cnica|hallazgos|descripci[oó]n|conclusi[oó]n|impresi[oó]n\s+diagn[oó]stica|"
        r"diagn[oó]stico|opini[oó]n|recomendaciones|sugerencias|observaciones|comentario|firma|dr\.|dra\.)"
    )
    pat = re.compile(
        rf"(?:^|\n)\s*(?:{joined})\s*[:\-]?\s*(.+?)(?=(?:\n\s*{stop_headers}\s*[:\-])|\Z)",
        re.IGNORECASE | re.DOTALL,
    )
    m = pat.search(text)
    if not m:
        return ""
    return " ".join(m.group(1).split()).strip()[:1200]


def analyze_imaging_or_report(
    text: str,
    titulo: str,
    subtipo: Optional[str],
    caption: str,
    is_visual_only: bool,
    image_quality: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Analiza informes escritos de imagenología/especialidades con NLP consciente de negaciones,
    o realiza evaluación técnica honesta sin inventar patologías cuando es una placa visual pura.
    """
    combined_meta = f"{titulo} {subtipo or ''} {caption or ''} {(text or '')[:1200]}"
    tecnica, region = _detect_modality_and_region(combined_meta)
    quality_label = (image_quality or {}).get("calidad_label") or "Adecuada"

    # Caso A: Placa médica visual sin informe textual impreso (Rx / Eco / Panorámica / RMN)
    if is_visual_only or len((text or "").strip()) < 55:
        resumen = (
            f"Imagen médica capturada correctamente ({tecnica} · Calidad visual: {quality_label}). "
            f"El archivo corresponde a una placa diagnóstica visual sin informe radiológico escrito embebido. "
            f"Por seguridad clínica, MediCore AI no fabrica hallazgos automáticos sin texto verificable: "
            f"utilice el visor con Zoom, Rotación y Modo Negativo Rx para su lectura directa."
        )
        guia_pac = (
            "Su estudio de imagen ya está cargado en alta resolución dentro de su historia clínica "
            "para que el médico tratante realice la evaluación visual directa durante la consulta."
        )
        return {
            "datos_imagenologia": {
                "region_anatomica": region,
                "tecnica": tecnica,
                "calidad_estudio": quality_label,
                "hallazgos": (
                    f"Imagen diagnóstica disponible en visor ({quality_label}). "
                    "Sin texto de informe impreso para extracción automática; pendiente lectura médica directa."
                ),
                "conclusion": "Pendiente de interpretación visual directa por el médico tratante.",
                "recomendaciones": "Revisar imagen en el visor (Zoom / Contraste / Negativo Rx) y documentar hallazgos.",
                "guia_paciente": guia_pac,
            },
            "alertas_detectadas": [],
            "sindromes_detectados": [],
            "cie10_sugeridos": [],
            "hallazgos_clave": [],
            "medidas_detectadas": [],
            "escalas_detectadas": [],
            "resumen_medico": resumen,
            "guia_paciente": guia_pac,
            "estado_analisis": "pendiente",
            "requiere_revision_visual": True,
        }

    # Caso B: Informe escrito (PDF digital, PDF escaneado o foto de informe leído por RapidOCR)
    clean_text = text.strip()
    sec_hallazgos = _extract_section(clean_text, [r"hallazgos", r"descripci[oó]n", r"informe", r"resultados"])
    sec_conclusion = _extract_section(clean_text, [r"conclusi[oó]n(?:es)?", r"impresi[oó]n\s+diagn[oó]stica", r"opini[oó]n", r"diagn[oó]stico"])
    sec_recs = _extract_section(clean_text, [r"recomendaciones", r"sugerencias", r"conducta"])

    # Extraer escalas estandarizadas (BI-RADS, TI-RADS, PI-RADS, Bosniak, Esteatosis Grado, FEVI, ICT)
    escalas: List[str] = []
    score_patterns = [
        r"\b(BI[\-\s]?RADS\s*[0-6][ABCabc]?)\b",
        r"\b(TI[\-\s]?RADS\s*[1-5])\b",
        r"\b(PI[\-\s]?RADS\s*[1-5])\b",
        r"\b(Bosniak\s*(?:I{1,3}F?|IV|[1-4]))\b",
        r"(esteatosis\s+hep[aá]tica\s+grado\s*(?:I{1,3}|[1-3]|leve|moderada|severa))",
        r"\b(FEVI\s*[:=]?\s*\d{2,3}\s*%)\b",
        r"\b(ICT\s*[:=<>\s]*0[.,]\d{2})\b",
    ]
    for sp in score_patterns:
        for m in re.finditer(sp, clean_text, re.IGNORECASE):
            val = " ".join(m.group(1).split())
            if val not in escalas:
                escalas.append(val)

    # Extraer medidas relevantes (ej. "12 x 8 mm", "3.4 cm", "pared de 4 mm")
    medidas: List[str] = []
    for m in re.finditer(
        r"\b(\d+(?:[.,]\d+)?(?:\s*[x×]\s*\d+(?:[.,]\d+)?){0,2}\s*(?:mm|cm|mL|cc|mmHg))\b",
        clean_text,
        re.IGNORECASE,
    ):
        med = " ".join(m.group(1).split())
        if med not in medidas and len(medidas) < 12:
            medidas.append(med)

    # Detección de patologías consciente de NEGACIONES (analizando oración por oración)
    sentences = re.split(r"(?<=[\.\;\n])\s+", clean_text)
    hallazgos_clave: List[str] = []
    alertas: List[str] = []
    sindromes: List[Dict[str, Any]] = []
    cie10_list: List[Dict[str, Any]] = []
    patient_explanations: List[str] = []
    seen_cie = set()

    for sentence in sentences:
        sent_clean = sentence.strip()
        if len(sent_clean) < 5:
            continue
        for pat, nombre_clin, cie10, sev, pac_exp in IMAGING_PATHOLOGIES:
            m = re.search(pat, sent_clean, re.IGNORECASE)
            if not m:
                continue
            # Verificar ventana previa (hasta 55 caracteres antes del hallazgo) por negación explícita
            prefix = sent_clean[max(0, m.start() - 55):m.start()]
            if NEGATION_CUES.search(prefix):
                continue
            if cie10 in seen_cie:
                continue
            seen_cie.add(cie10)
            hallazgos_clave.append(nombre_clin)
            icon = "🚨" if sev == "critico" else "⚠️"
            alertas.append(f"{icon} {nombre_clin} ({cie10})")
            patient_explanations.append(pac_exp)
            sindromes.append({
                "codigo_cie10": cie10,
                "nombre": nombre_clin,
                "severidad": sev,
                "evidencia": [sent_clean[:180]],
                "conducta_sugerida": "Correlacionar hallazgo de imagen con exploración física y antecedentes del paciente.",
                "confianza": 0.85,
            })
            cie10_list.append({
                "codigo": cie10,
                "descripcion": nombre_clin,
                "severidad": sev,
                "fuente": "NLP Clínico de Informe MediCore AI",
            })

    # Alertas por escalas BI-RADS / TI-RADS ≥ 4
    for esc in escalas:
        m_high = re.search(r"(BI|TI|PI)[\-\s]?RADS\s*([456])", esc, re.IGNORECASE)
        if m_high:
            alertas.insert(0, f"🚨 Clasificación prioritaria detectada: {esc}")

    hallazgos_texto = sec_hallazgos or clean_text[:900]
    conclusion_texto = sec_conclusion or (
        "; ".join(hallazgos_clave) if hallazgos_clave else "Informe leído sin hallazgos patológicos positivos destacados en NLP."
    )
    recs_texto = sec_recs or (
        "Correlacionar los hallazgos extraídos del informe con la clínica actual y definir conducta."
        if hallazgos_clave
        else "Correlación clínica habitual según motivo de consulta."
    )

    if hallazgos_clave:
        resumen_med = (
            f"Informe de {tecnica} procesado localmente. Se identificaron {len(hallazgos_clave)} hallazgo(s) "
            f"clínico(s) relevante(s): {', '.join(hallazgos_clave)}."
            + (f" Escalas detectadas: {', '.join(escalas)}." if escalas else "")
            + (f" Medidas clave: {', '.join(medidas[:5])}." if medidas else "")
        )
        guia_pac = (
            f"El informe de su estudio ({tecnica}) señala principalmente: {', '.join(patient_explanations[:3])}. "
            f"Su médico revisará estos detalles junto con sus síntomas para indicarle el seguimiento o tratamiento más adecuado."
        )
        estado = "analizado_alterado"
    else:
        resumen_med = (
            f"Informe de {tecnica} procesado localmente sin alertas patológicas positivas destacadas. "
            f"Conclusión extraída: {conclusion_texto[:240]}"
        )
        guia_pac = (
            f"El informe de su estudio ({tecnica}) fue revisado y no destaca alteraciones urgentes. "
            f"Su médico le confirmará la interpretación definitiva durante la consulta."
        )
        estado = "analizado_normal"

    return {
        "datos_imagenologia": {
            "region_anatomica": region,
            "tecnica": tecnica,
            "calidad_estudio": quality_label,
            "hallazgos": hallazgos_texto,
            "conclusion": conclusion_texto,
            "recomendaciones": recs_texto,
            "guia_paciente": guia_pac,
        },
        "alertas_detectadas": alertas,
        "sindromes_detectados": sindromes,
        "cie10_sugeridos": cie10_list,
        "hallazgos_clave": hallazgos_clave,
        "medidas_detectadas": medidas,
        "escalas_detectadas": escalas,
        "resumen_medico": resumen_med,
        "guia_paciente": guia_pac,
        "estado_analisis": estado,
        "requiere_revision_visual": False,
    }
