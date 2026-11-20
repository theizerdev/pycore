"""
Generador de Documentos Clínicos Oficiales en PDF (ReportLab)
=============================================================
Produce documentos médicos de alta fidelidad estética e institucional:
1. Informe Médico / Epicrisis Clínica
2. Receta Médica y Prescripción Farmacológica
3. Orden de Estudios y Exámenes Paraclínicos
4. Certificado de Reposo Médico
5. Constancia de Asistencia Médica (con o sin acompañante)

Cumple con estándares médico-legales: membrete institucional, datos del
paciente y médico tratante, cédula/licencia colegiada, folio, diagnóstico CIE-10
y bloque formal de firma y sello.
"""

import io
import os
import logging
from datetime import datetime, date
from typing import Optional, Dict, Any, List, Tuple

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

logger = logging.getLogger(__name__)

# Paleta de colores clínicos institucionales
PRIMARY_COLOR = colors.HexColor("#0f766e")       # Teal oscuro / quirúrgico
PRIMARY_LIGHT = colors.HexColor("#f0fdfa")       # Fondo sutil teal
SECONDARY_COLOR = colors.HexColor("#0284c7")     # Sky blue
TEXT_DARK = colors.HexColor("#1e293b")           # Slate 800
TEXT_MUTED = colors.HexColor("#64748b")          # Slate 500
BORDER_COLOR = colors.HexColor("#cbd5e1")        # Slate 300
BG_LIGHT = colors.HexColor("#f8fafc")            # Slate 50
ACCENT_AMBER = colors.HexColor("#b45309")        # Amber 700


def _build_pdf_styles():
    """Genera la hoja de estilos tipográficos para documentos médicos."""
    styles = getSampleStyleSheet()

    # Modificar o añadir estilos limpios
    styles.add(ParagraphStyle(
        name="ClinicaHeaderTitle",
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=PRIMARY_COLOR,
        textTransform="uppercase",
    ))
    styles.add(ParagraphStyle(
        name="ClinicaHeaderSubtitle",
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=TEXT_MUTED,
    ))
    styles.add(ParagraphStyle(
        name="DocTitleBadge",
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=colors.white,
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name="DocMetaText",
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=TEXT_DARK,
        alignment=TA_RIGHT,
    ))
    styles.add(ParagraphStyle(
        name="SectionHeader",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=PRIMARY_COLOR,
        textTransform="uppercase",
        spaceBefore=4,
        spaceAfter=2,
    ))
    styles.add(ParagraphStyle(
        name="PatientLabel",
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=TEXT_MUTED,
        textTransform="uppercase",
    ))
    styles.add(ParagraphStyle(
        name="PatientValue",
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=TEXT_DARK,
    ))
    styles.add(ParagraphStyle(
        name="BodyTextCustom",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK,
        alignment=TA_LEFT,
    ))
    styles.add(ParagraphStyle(
        name="BodyTextJustified",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12.5,
        textColor=TEXT_DARK,
        alignment=TA_JUSTIFY,
    ))
    styles.add(ParagraphStyle(
        name="TableHead",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=TA_LEFT,
    ))
    styles.add(ParagraphStyle(
        name="TableCell",
        fontName="Helvetica",
        fontSize=7.8,
        leading=10.5,
        textColor=TEXT_DARK,
    ))
    styles.add(ParagraphStyle(
        name="TableCellBold",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10.5,
        textColor=TEXT_DARK,
    ))
    styles.add(ParagraphStyle(
        name="DoctorSigName",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=TEXT_DARK,
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name="DoctorSigMeta",
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=TEXT_MUTED,
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name="SecurityNotice",
        fontName="Helvetica-Oblique",
        fontSize=6.5,
        leading=8.5,
        textColor=TEXT_MUTED,
        alignment=TA_CENTER,
    ))
    return styles


def _get_paciente_nombre(paciente: Any) -> str:
    if not paciente:
        return "Paciente No Identificado"
    nom = getattr(paciente, "nombres", "") or ""
    ape = getattr(paciente, "apellidos", "") or ""
    full = f"{nom} {ape}".strip()
    return full or "Paciente No Identificado"


def _get_paciente_documento(paciente: Any) -> str:
    if not paciente:
        return "S/N"
    tipo = getattr(paciente, "tipo_documento", "CI/DNI") or "CI/DNI"
    num = (
        getattr(paciente, "documento_identidad", "")
        or getattr(paciente, "numero_documento", "")
        or "S/N"
    )
    return f"{tipo} {num}".strip()


def _get_paciente_edad(paciente: Any) -> str:
    if not paciente:
        return "N/E"
    edad_txt = getattr(paciente, "edad_texto", None)
    if edad_txt and str(edad_txt).strip():
        return str(edad_txt).strip()
    edad = getattr(paciente, "edad", None)
    if edad:
        return f"{edad} años"
    fn = getattr(paciente, "fecha_nacimiento", None)
    if fn:
        try:
            if isinstance(fn, str):
                fn = datetime.strptime(fn.split("T")[0], "%Y-%m-%d").date()
            elif isinstance(fn, datetime):
                fn = fn.date()
            today = datetime.now().date()
            years = today.year - fn.year - ((today.month, today.day) < (fn.month, fn.day))
            if years > 0:
                return f"{years} años"
            months = (today.year - fn.year) * 12 + today.month - fn.month
            if months > 0:
                return f"{months} meses"
            return "Neonato"
        except Exception:
            pass
    return "N/E"


def _format_date(dt: Any) -> str:
    if not dt:
        return datetime.now().strftime("%d/%m/%Y")
    if isinstance(dt, (datetime, date)):
        return dt.strftime("%d/%m/%Y")
    try:
        raw = str(dt).split("T")[0]
        parts = raw.split("-")
        if len(parts) == 3:
            return f"{parts[2]}/{parts[1]}/{parts[0]}"
    except Exception:
        pass
    return str(dt)


def _build_header_flowable(
    empresa: Any,
    sucursal: Any,
    titulo_doc: str,
    folio: str,
    fecha_str: str,
    styles: Dict[str, ParagraphStyle],
) -> List[Any]:
    """Crea la cabecera institucional y caja de título/folio."""
    emp_nombre = getattr(empresa, "nombre", "MEDISOFT CLÍNICA") or "MEDISOFT CLÍNICA"
    emp_doc = getattr(empresa, "identificacion_fiscal", "") or getattr(empresa, "documento", "") or ""
    emp_tel = getattr(empresa, "telefono", "") or getattr(empresa, "whatsapp_phone", "") or ""
    emp_dir = getattr(empresa, "direccion", "") or ""
    suc_nombre = getattr(sucursal, "nombre", "Sede Principal") or "Sede Principal"

    left_content = [
        Paragraph(f"<b>{emp_nombre}</b>", styles["ClinicaHeaderTitle"]),
        Paragraph("Centro de Especialidades Médicas & Salud Integral", styles["ClinicaHeaderSubtitle"]),
        Paragraph(
            f"<b>Sede:</b> {suc_nombre}" + (f" • <b>RIF/Doc:</b> {emp_doc}" if emp_doc else "") + (f" • <b>Tel:</b> {emp_tel}" if emp_tel else ""),
            styles["ClinicaHeaderSubtitle"],
        ),
    ]

    title_badge_table = Table(
        [[Paragraph(f"<b>{titulo_doc}</b>", styles["DocTitleBadge"])]],
        colWidths=[200],
    )
    title_badge_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PRIMARY_COLOR),
        ("CORNERPAD", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))

    right_content = [
        title_badge_table,
        Spacer(1, 3),
        Paragraph(f"<b>Folio:</b> <font color='{PRIMARY_COLOR.hexval()}'>{folio}</font>", styles["DocMetaText"]),
        Paragraph(f"<b>Fecha:</b> {fecha_str}", styles["DocMetaText"]),
    ]

    header_table = Table([[left_content, right_content]], colWidths=[330, 210])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    return [
        header_table,
        Spacer(1, 4),
        HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceBefore=2, spaceAfter=4),
    ]


def _build_patient_doctor_card(
    paciente: Any,
    medico: Any,
    especialidad: Any,
    styles: Dict[str, ParagraphStyle],
) -> Table:
    """Crea la tarjeta resumen con datos de paciente y médico tratante."""
    pac_nom = _get_paciente_nombre(paciente)
    pac_doc = _get_paciente_documento(paciente)
    pac_edad = _get_paciente_edad(paciente)
    pac_sexo = getattr(paciente, "genero", "N/E") or "N/E"
    pac_tel = getattr(paciente, "telefono", "") or ""

    med_nom = (
        f"Dr(a). {getattr(medico, 'nombres', '')} {getattr(medico, 'apellidos', '')}".strip()
        if medico
        else "Dr(a). Médico Especialista"
    )
    med_esp = getattr(especialidad, "nombre", "Medicina General") or "Medicina General"
    med_col = getattr(medico, "numero_colegiado", "C.M. REGISTRADO") or "C.M. REGISTRADO"

    cell_paciente = [
        Paragraph("DATOS DEL PACIENTE", styles["PatientLabel"]),
        Paragraph(f"<b>{pac_nom}</b>", styles["PatientValue"]),
        Paragraph(
            f"<b>Doc:</b> {pac_doc} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Edad:</b> {pac_edad} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Género:</b> {pac_sexo}" +
            (f" &nbsp;&nbsp;|&nbsp;&nbsp; <b>Tel:</b> {pac_tel}" if pac_tel else ""),
            styles["PatientValue"],
        ),
    ]

    cell_medico = [
        Paragraph("MÉDICO TRATANTE / ESPECIALISTA", styles["PatientLabel"]),
        Paragraph(f"<b>{med_nom}</b>", styles["PatientValue"]),
        Paragraph(
            f"<b>Especialidad:</b> {med_esp} &nbsp;&nbsp;|&nbsp;&nbsp; <b>C.M. / Lic:</b> {med_col}",
            styles["PatientValue"],
        ),
    ]

    card_table = Table([[cell_paciente, cell_medico]], colWidths=[310, 230])
    card_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.8, BORDER_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return card_table


def _build_footer_flowable(
    medico: Any,
    especialidad: Any,
    styles: Dict[str, ParagraphStyle],
) -> List[Any]:
    """Crea la firma formal del especialista y sello de seguridad."""
    med_nom = (
        f"Dr(a). {getattr(medico, 'nombres', '')} {getattr(medico, 'apellidos', '')}".strip()
        if medico
        else "Dr(a). Médico Especialista"
    )
    med_esp = getattr(especialidad, "nombre", "Medicina General") or "Medicina General"
    med_col = getattr(medico, "numero_colegiado", "C.M. REGISTRADO") or "C.M. REGISTRADO"

    sig_col = [
        Spacer(1, 15),
        Paragraph("___________________________________________", styles["DoctorSigName"]),
        Paragraph(f"<b>{med_nom}</b>", styles["DoctorSigName"]),
        Paragraph(f"{med_esp} • C.M. / M.P.P.S: {med_col}", styles["DoctorSigMeta"]),
        Paragraph("Firma y Sello del Médico Tratante", styles["DoctorSigMeta"]),
    ]

    now_str = datetime.now().strftime("%d/%m/%Y %I:%M %p")
    sec_col = [
        Spacer(1, 20),
        Paragraph("🔒 <b>DOCUMENTO CLÍNICO OFICIAL EMITIDO ELECTRÓNICAMENTE</b>", styles["SecurityNotice"]),
        Paragraph(f"Autenticado en plataforma MediSoft Suite • Fecha emisión: {now_str}", styles["SecurityNotice"]),
        Paragraph("La adulteración o reproducción no autorizada de este documento constituye falta legal.", styles["SecurityNotice"]),
    ]

    foot_table = Table([[sec_col, sig_col]], colWidths=[270, 270])
    foot_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))

    return [
        Spacer(1, 6),
        HRFlowable(width="100%", thickness=0.8, color=BORDER_COLOR, spaceBefore=4, spaceAfter=4),
        foot_table,
    ]


# ─────────────────────────────────────────────────────────────────────────────
# 1. RECETA MÉDICA / PRESCRIPCIÓN FARMACOLÓGICA
# ─────────────────────────────────────────────────────────────────────────────
def generate_receta_pdf(
    consulta: Any,
    empresa: Any = None,
    sucursal: Any = None,
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=28,
    )
    styles = _build_pdf_styles()
    folio = getattr(consulta, "codigo", None) or f"CON-{consulta.id}"
    fecha_str = _format_date(getattr(consulta, "fecha_consulta", None) or getattr(consulta, "fecha", None))

    elements = []
    elements.extend(_build_header_flowable(
        empresa or getattr(consulta, "empresa", None),
        sucursal or getattr(consulta, "sucursal", None),
        "RECETA MÉDICA Y PRESCRIPCIÓN",
        folio,
        fecha_str,
        styles,
    ))
    elements.append(_build_patient_doctor_card(
        getattr(consulta, "paciente", None),
        getattr(consulta, "medico", None),
        getattr(consulta, "especialidad", None),
        styles,
    ))
    elements.append(Spacer(1, 8))

    # Diagnóstico de Referencia
    diag = getattr(consulta, "diagnostico_principal", None)
    if diag:
        diag_table = Table(
            [[
                Paragraph("<b>DIAGNÓSTICO PRESUNTIVO / DEFINITIVO:</b>", styles["PatientLabel"]),
                Paragraph(f"<b>{diag}</b>", styles["TableCellBold"]),
            ]],
            colWidths=[180, 360],
        )
        diag_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PRIMARY_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, PRIMARY_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(diag_table)
        elements.append(Spacer(1, 8))

    elements.append(Paragraph("<b>Rp. / MEDICAMENTOS PRESCRITOS</b>", styles["SectionHeader"]))

    meds = getattr(consulta, "receta_medica", None) or []
    if meds:
        table_data = [[
            Paragraph("<b>#</b>", styles["TableHead"]),
            Paragraph("<b>Fármaco & Presentación</b>", styles["TableHead"]),
            Paragraph("<b>Dosis / Vía</b>", styles["TableHead"]),
            Paragraph("<b>Frecuencia & Duración</b>", styles["TableHead"]),
            Paragraph("<b>Indicaciones Especiales</b>", styles["TableHead"]),
        ]]
        for idx, m in enumerate(meds, 1):
            nom = m.get("medicamento") or m.get("nombre") or "Fármaco"
            pres = f" ({m.get('presentacion')})" if m.get("presentacion") else ""
            dosis = m.get("dosis") or "-"
            duracion = m.get("duracion") or m.get("frecuencia") or "-"
            indic = m.get("indicaciones") or "Según prescripción médica"
            table_data.append([
                Paragraph(str(idx), styles["TableCell"]),
                Paragraph(f"<b>{nom}</b>{pres}", styles["TableCell"]),
                Paragraph(dosis, styles["TableCell"]),
                Paragraph(duracion, styles["TableCell"]),
                Paragraph(indic, styles["TableCell"]),
            ])

        med_table = Table(table_data, colWidths=[24, 160, 100, 110, 146])
        med_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_COLOR),
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ]))
        elements.append(med_table)
    else:
        elements.append(Paragraph("<i>No se prescribieron medicamentos farmacológicos en esta consulta.</i>", styles["BodyTextCustom"]))

    elements.append(Spacer(1, 8))

    # Indicaciones Generales & Plan de Tratamiento
    plan = getattr(consulta, "plan_tratamiento", None) or getattr(consulta, "indicaciones_generales", None)
    if plan and plan.strip():
        elements.append(Paragraph("<b>INDICACIONES GENERALES Y CUIDADOS AL PACIENTE</b>", styles["SectionHeader"]))
        plan_table = Table(
            [[Paragraph(plan.replace("\n", "<br/>"), styles["BodyTextCustom"])]],
            colWidths=[540],
        )
        plan_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ]))
        elements.append(plan_table)

    elements.extend(_build_footer_flowable(
        getattr(consulta, "medico", None),
        getattr(consulta, "especialidad", None),
        styles,
    ))

    doc.build(elements)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# 2. ORDEN DE ESTUDIOS Y EXÁMENES COMPLEMENTARIOS
# ─────────────────────────────────────────────────────────────────────────────
def generate_estudios_pdf(
    consulta: Any,
    empresa: Any = None,
    sucursal: Any = None,
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=28,
    )
    styles = _build_pdf_styles()
    folio = getattr(consulta, "codigo", None) or f"CON-{consulta.id}"
    fecha_str = _format_date(getattr(consulta, "fecha_consulta", None) or getattr(consulta, "fecha", None))

    elements = []
    elements.extend(_build_header_flowable(
        empresa or getattr(consulta, "empresa", None),
        sucursal or getattr(consulta, "sucursal", None),
        "ORDEN DE ESTUDIOS MÉDICOS",
        folio,
        fecha_str,
        styles,
    ))
    elements.append(_build_patient_doctor_card(
        getattr(consulta, "paciente", None),
        getattr(consulta, "medico", None),
        getattr(consulta, "especialidad", None),
        styles,
    ))
    elements.append(Spacer(1, 8))

    diag = getattr(consulta, "diagnostico_principal", None)
    if diag:
        diag_table = Table(
            [[
                Paragraph("<b>IMPRESIÓN DIAGNÓSTICA / MOTIVO DE ESTUDIO:</b>", styles["PatientLabel"]),
                Paragraph(f"<b>{diag}</b>", styles["TableCellBold"]),
            ]],
            colWidths=[200, 340],
        )
        diag_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PRIMARY_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, PRIMARY_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(diag_table)
        elements.append(Spacer(1, 8))

    elements.append(Paragraph("<b>ESTUDIOS PARACLÍNICOS E IMÁGENES SOLICITADAS</b>", styles["SectionHeader"]))

    estudios = getattr(consulta, "estudios_solicitados", None) or []
    if estudios:
        table_data = [[
            Paragraph("<b>#</b>", styles["TableHead"]),
            Paragraph("<b>Examen o Estudio Solicitado</b>", styles["TableHead"]),
            Paragraph("<b>Tipo / Área</b>", styles["TableHead"]),
            Paragraph("<b>Indicaciones Clínicas / Preparación</b>", styles["TableHead"]),
        ]]
        for idx, est in enumerate(estudios, 1):
            nom = est.get("estudio") or est.get("nombre") or "Examen Paraclínico"
            tipo_est = est.get("tipo") or est.get("categoria") or "Laboratorio / Imagen"
            indic = est.get("indicaciones") or "En ayunas o según protocolo del laboratorio"
            table_data.append([
                Paragraph(str(idx), styles["TableCell"]),
                Paragraph(f"<b>{nom}</b>", styles["TableCellBold"]),
                Paragraph(str(tipo_est).capitalize(), styles["TableCell"]),
                Paragraph(indic, styles["TableCell"]),
            ])

        est_table = Table(table_data, colWidths=[24, 210, 110, 196])
        est_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), SECONDARY_COLOR),
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ]))
        elements.append(est_table)
    else:
        elements.append(Paragraph("<i>No se registraron estudios complementarios en esta atención.</i>", styles["BodyTextCustom"]))

    elements.append(Spacer(1, 10))
    nota_table = Table(
        [[Paragraph(
            "<b>Nota para el Laboratorio o Centro de Imagenología:</b><br/>"
            "Favor consignar resultados con valores de referencia ajustados a edad y sexo del paciente. "
            "El paciente debe presentar este documento o versión digital debidamente autenticada.",
            styles["TableCell"],
        )]],
        colWidths=[540],
    )
    nota_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ]))
    elements.append(nota_table)

    elements.extend(_build_footer_flowable(
        getattr(consulta, "medico", None),
        getattr(consulta, "especialidad", None),
        styles,
    ))

    doc.build(elements)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# 3. INFORME MÉDICO / EPICRISIS CLÍNICA
# ─────────────────────────────────────────────────────────────────────────────
def generate_informe_pdf(
    consulta: Any,
    empresa: Any = None,
    sucursal: Any = None,
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=28,
    )
    styles = _build_pdf_styles()
    folio = getattr(consulta, "codigo", None) or f"CON-{consulta.id}"
    fecha_str = _format_date(getattr(consulta, "fecha_consulta", None) or getattr(consulta, "fecha", None))

    elements = []
    elements.extend(_build_header_flowable(
        empresa or getattr(consulta, "empresa", None),
        sucursal or getattr(consulta, "sucursal", None),
        "INFORME MÉDICO CLÍNICO",
        folio,
        fecha_str,
        styles,
    ))
    elements.append(_build_patient_doctor_card(
        getattr(consulta, "paciente", None),
        getattr(consulta, "medico", None),
        getattr(consulta, "especialidad", None),
        styles,
    ))
    elements.append(Spacer(1, 6))

    # 1. Motivo de Consulta y Anamnesis
    elements.append(Paragraph("<b>1. MOTIVO DE CONSULTA Y ANAMNESIS</b>", styles["SectionHeader"]))
    motivo = getattr(consulta, "motivo_consulta", "") or "Evaluación facultativa de rutina"
    enf = getattr(consulta, "enfermedad_actual", "") or ""
    anamnesis_text = f"<b>Motivo:</b> {motivo}"
    if enf:
        anamnesis_text += f"<br/><b>Enfermedad Actual / Semiología:</b><br/>{enf.replace(chr(10), '<br/>')}"

    anam_table = Table([[Paragraph(anamnesis_text, styles["BodyTextCustom"])]], colWidths=[540])
    anam_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(anam_table)
    elements.append(Spacer(1, 6))

    # 2. Signos Vitales
    sv = getattr(consulta, "signos_vitales", {}) or {}
    if not sv and hasattr(consulta, "datos_plantilla"):
        sv = getattr(consulta, "datos_plantilla", {}) or {}

    pa = (
        f"{sv.get('presion_sistolica') or sv.get('ta_sistolica', '')}/{sv.get('presion_diastolica') or sv.get('ta_diastolica', '')}"
        if (sv.get('presion_sistolica') or sv.get('ta_sistolica'))
        else "-"
    )
    fc = f"{sv.get('frecuencia_cardiaca', '-')} lpm" if sv.get('frecuencia_cardiaca') else "-"
    fr = f"{sv.get('frecuencia_respiratoria', '-')} rpm" if sv.get('frecuencia_respiratoria') else "-"
    temp = f"{sv.get('temperatura', '-')} °C" if sv.get('temperatura') else "-"
    spo2 = f"{sv.get('saturacion_oxigeno') or sv.get('saturacion_o2', '-')}%" if (sv.get('saturacion_oxigeno') or sv.get('saturacion_o2')) else "-"
    peso = f"{sv.get('peso', '-')} kg" if sv.get('peso') else "-"
    talla = f"{sv.get('talla', '-')} cm" if sv.get('talla') else "-"
    imc = f"{sv.get('imc', '-')}" if sv.get('imc') else "-"

    if any(x != "-" for x in [pa, fc, fr, temp, spo2, peso, talla, imc]):
        elements.append(Paragraph("<b>2. SIGNOS VITALES Y CONSTANTES BIOLÓGICAS</b>", styles["SectionHeader"]))
        sv_data = [
            [
                Paragraph("<b>P. Arterial:</b> " + pa, styles["TableCell"]),
                Paragraph("<b>F. Cardíaca:</b> " + fc, styles["TableCell"]),
                Paragraph("<b>F. Resp:</b> " + fr, styles["TableCell"]),
                Paragraph("<b>Temp:</b> " + temp, styles["TableCell"]),
            ],
            [
                Paragraph("<b>SpO2:</b> " + spo2, styles["TableCell"]),
                Paragraph("<b>Peso:</b> " + peso, styles["TableCell"]),
                Paragraph("<b>Talla:</b> " + talla, styles["TableCell"]),
                Paragraph("<b>IMC:</b> " + imc, styles["TableCell"]),
            ],
        ]
        sv_table = Table(sv_data, colWidths=[135, 135, 135, 135])
        sv_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(sv_table)
        elements.append(Spacer(1, 6))

    # 3. Diagnóstico CIE-10
    elements.append(Paragraph("<b>3. CONCLUSIÓN DIAGNÓSTICA (CIE-10)</b>", styles["SectionHeader"]))
    diag_prin = getattr(consulta, "diagnostico_principal", "") or "Evaluación clínica en curso"
    diag_sec = getattr(consulta, "diagnosticos_secundarios", []) or []
    diag_body = f"<b>Diagnóstico Principal:</b> {diag_prin}"
    if diag_sec:
        diag_sec_txt = ", ".join(
            d.get("nombre") if isinstance(d, dict) else str(d) for d in diag_sec
        )
        diag_body += f"<br/><b>Diagnósticos Secundarios:</b> {diag_sec_txt}"

    diag_box = Table([[Paragraph(diag_body, styles["BodyTextCustom"])]], colWidths=[540])
    diag_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PRIMARY_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.8, PRIMARY_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(diag_box)
    elements.append(Spacer(1, 6))

    # 4. Plan de Tratamiento y Conducta
    elements.append(Paragraph("<b>4. PLAN TERAPÉUTICO Y CONDUCTA MÉDICA</b>", styles["SectionHeader"]))
    plan = getattr(consulta, "plan_tratamiento", "") or "Seguimiento y control médico ambulatorio."
    obs = getattr(consulta, "observaciones_adicionales", "") or ""
    ref = getattr(consulta, "referido_para", "") or ""
    plan_body = plan.replace("\n", "<br/>")
    if obs:
        plan_body += f"<br/><br/><b>Observaciones:</b> {obs}"
    if ref:
        plan_body += f"<br/><b>Referido a:</b> {ref}"

    plan_table = Table([[Paragraph(plan_body, styles["BodyTextCustom"])]], colWidths=[540])
    plan_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(plan_table)

    elements.extend(_build_footer_flowable(
        getattr(consulta, "medico", None),
        getattr(consulta, "especialidad", None),
        styles,
    ))

    doc.build(elements)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# 4. CERTIFICADO DE REPOSO MÉDICO
# ─────────────────────────────────────────────────────────────────────────────
def generate_reposo_pdf(
    consulta: Any,
    empresa: Any = None,
    sucursal: Any = None,
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=28,
    )
    styles = _build_pdf_styles()
    folio = getattr(consulta, "codigo", None) or f"CON-{consulta.id}"
    fecha_str = _format_date(getattr(consulta, "fecha_consulta", None) or getattr(consulta, "fecha", None))

    elements = []
    elements.extend(_build_header_flowable(
        empresa or getattr(consulta, "empresa", None),
        sucursal or getattr(consulta, "sucursal", None),
        "CERTIFICADO DE REPOSO MÉDICO",
        folio,
        fecha_str,
        styles,
    ))
    elements.append(_build_patient_doctor_card(
        getattr(consulta, "paciente", None),
        getattr(consulta, "medico", None),
        getattr(consulta, "especialidad", None),
        styles,
    ))
    elements.append(Spacer(1, 14))

    pac_nom = _get_paciente_nombre(getattr(consulta, "paciente", None))
    pac_doc = _get_paciente_documento(getattr(consulta, "paciente", None))
    med = getattr(consulta, "medico", None)
    med_nom = f"Dr(a). {getattr(med, 'nombres', '')} {getattr(med, 'apellidos', '')}".strip() if med else "El suscrito médico"
    med_col = getattr(med, "numero_colegiado", "C.M. REGISTRADO") or "C.M. REGISTRADO"
    diag = getattr(consulta, "diagnostico_principal", "Afección clínica") or "Afección clínica"

    reposo_info = getattr(consulta, "reposo_medico", {}) or {}
    dias = reposo_info.get("dias_reposo") or 1
    f_inicio = _format_date(reposo_info.get("fecha_inicio") or fecha_str)
    f_fin = _format_date(reposo_info.get("fecha_fin") or fecha_str)
    tipo_rep = reposo_info.get("tipo_reposo", "Relativo").capitalize()
    obs_rep = reposo_info.get("observaciones") or "Cumplir tratamiento médico prescrito y guardar reposo."

    cert_text = (
        f"Por medio de la presente certificación facultativa, quien suscribe <b>{med_nom}</b>, "
        f"titular del registro profesional <b>{med_col}</b>, hace constar que el(la) paciente "
        f"<b>{pac_nom}</b>, titular del documento de identidad <b>{pac_doc}</b>, fue evaluado(a) "
        f"clínicamente en fecha <b>{fecha_str}</b> y debido a su condición de salud amerita "
        f"<b>REPOSO MÉDICO ({tipo_rep.upper()})</b> durante un período de <b>{dias} día(s) continuo(s)</b>, "
        f"comprendido desde el día <b>{f_inicio}</b> hasta el día <b>{f_fin}</b> inclusive.<br/><br/>"
        f"<b>Diagnóstico Clínico (CIE-10):</b><br/>"
        f"• {diag}<br/><br/>"
        f"<b>Recomendaciones e Instrucciones:</b><br/>"
        f"{obs_rep}<br/><br/>"
        f"Certificado médico legal expedido a solicitud de la parte interesada para los fines pertinentes "
        f"laborales o académicos correspondientes."
    )

    cert_table = Table([[Paragraph(cert_text, styles["BodyTextJustified"])]], colWidths=[540])
    cert_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.8, BORDER_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    elements.append(cert_table)

    elements.extend(_build_footer_flowable(
        getattr(consulta, "medico", None),
        getattr(consulta, "especialidad", None),
        styles,
    ))

    doc.build(elements)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# 5. CONSTANCIA DE ASISTENCIA MÉDICA
# ─────────────────────────────────────────────────────────────────────────────
def generate_constancia_pdf(
    consulta: Any,
    acompanante: Optional[Dict[str, Any]] = None,
    empresa: Any = None,
    sucursal: Any = None,
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=28,
    )
    styles = _build_pdf_styles()
    folio = getattr(consulta, "codigo", None) or f"CON-{consulta.id}"
    fecha_str = _format_date(getattr(consulta, "fecha_consulta", None) or getattr(consulta, "fecha", None))

    elements = []
    elements.extend(_build_header_flowable(
        empresa or getattr(consulta, "empresa", None),
        sucursal or getattr(consulta, "sucursal", None),
        "CONSTANCIA DE ASISTENCIA MÉDICA",
        folio,
        fecha_str,
        styles,
    ))
    elements.append(_build_patient_doctor_card(
        getattr(consulta, "paciente", None),
        getattr(consulta, "medico", None),
        getattr(consulta, "especialidad", None),
        styles,
    ))
    elements.append(Spacer(1, 14))

    pac_nom = _get_paciente_nombre(getattr(consulta, "paciente", None))
    pac_doc = _get_paciente_documento(getattr(consulta, "paciente", None))
    med = getattr(consulta, "medico", None)
    med_nom = f"Dr(a). {getattr(med, 'nombres', '')} {getattr(med, 'apellidos', '')}".strip() if med else "El suscrito médico"
    med_esp = getattr(getattr(consulta, "especialidad", None), "nombre", "Medicina General")
    hora_str = datetime.now().strftime("%I:%M %p")

    # Acompañante
    acomp_str = ""
    if acompanante and (acompanante.get("nombres") or acompanante.get("apellidos")):
        acomp_nom = f"{acompanante.get('nombres', '')} {acompanante.get('apellidos', '')}".strip()
        acomp_doc = acompanante.get("documento") or "S/N"
        acomp_par = acompanante.get("otroParentesco") or acompanante.get("parentesco") or "Acompañante"
        acomp_str = (
            f"<br/><br/>Asimismo, se certifica que acudió en compañía del ciudadano(a) "
            f"<b>{acomp_nom}</b>, titular del documento de identidad <b>{acomp_doc}</b>, "
            f"en calidad de <b>{acomp_par}</b>."
        )

    cert_text = (
        f"Quien suscribe, <b>{med_nom}</b>, especialista en <b>{med_esp}</b>, certifica por medio de "
        f"la presente que el(la) ciudadano(a) <b>{pac_nom}</b>, titular del documento de identidad "
        f"<b>{pac_doc}</b>, asistió a consulta médica en nuestras instalaciones el día <b>{fecha_str}</b> "
        f"a las <b>{hora_str}</b>.{acomp_str}<br/><br/>"
        f"Constancia que se expide a petición de la parte interesada a los efectos laborales, académicos "
        f"o administrativos a los que hubiere lugar."
    )

    cert_table = Table([[Paragraph(cert_text, styles["BodyTextJustified"])]], colWidths=[540])
    cert_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.8, BORDER_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
    ]))
    elements.append(cert_table)

    elements.extend(_build_footer_flowable(
        getattr(consulta, "medico", None),
        getattr(consulta, "especialidad", None),
        styles,
    ))

    doc.build(elements)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# DISPATCHER GENERAL & GENERADOR BATCH
# ─────────────────────────────────────────────────────────────────────────────
def generate_clinical_document_pdf(
    tipo_documento: str,
    consulta: Any,
    empresa: Any = None,
    sucursal: Any = None,
    acompanante: Optional[Dict[str, Any]] = None,
) -> bytes:
    """Genera el PDF del tipo de documento solicitado."""
    tipo = (tipo_documento or "informe").lower().strip()
    if tipo == "receta":
        return generate_receta_pdf(consulta, empresa, sucursal)
    elif tipo == "estudios":
        return generate_estudios_pdf(consulta, empresa, sucursal)
    elif tipo == "reposo":
        return generate_reposo_pdf(consulta, empresa, sucursal)
    elif tipo == "constancia":
        return generate_constancia_pdf(consulta, acompanante, empresa, sucursal)
    else:
        return generate_informe_pdf(consulta, empresa, sucursal)


def get_available_documents_for_consulta(
    consulta: Any,
    acompanante: Optional[Dict[str, Any]] = None,
) -> List[Tuple[str, str, str]]:
    """
    Determina qué documentos están disponibles para una consulta.
    Retorna lista de tuplas: (tipo_documento, titulo_humano, filename)
    """
    folio = getattr(consulta, "codigo", None) or f"CON-{consulta.id}"
    docs = []

    # 1. Informe siempre está disponible
    docs.append(("informe", "Informe Médico Clínico", f"Informe_Medico_{folio}.pdf"))

    # 2. Receta médica si tiene fármacos prescritos
    meds = getattr(consulta, "receta_medica", None) or []
    if meds and len(meds) > 0:
        docs.append(("receta", "Receta Médica / Rx", f"Receta_Medica_{folio}.pdf"))

    # 3. Orden de estudios si tiene exámenes solicitados
    est = getattr(consulta, "estudios_solicitados", None) or []
    if est and len(est) > 0:
        docs.append(("estudios", "Orden de Estudios y Exámenes", f"Orden_Estudios_{folio}.pdf"))

    # 4. Reposo médico si requiere reposo o tiene días configurados
    rep = getattr(consulta, "reposo_medico", {}) or {}
    if rep and (rep.get("requiere_reposo") or rep.get("dias_reposo")):
        docs.append(("reposo", "Certificado de Reposo Médico", f"Reposo_Medico_{folio}.pdf"))

    # 5. Constancia de asistencia médica
    docs.append(("constancia", "Constancia de Asistencia", f"Constancia_Asistencia_{folio}.pdf"))

    return docs
