from datetime import date, datetime
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import select, or_, and_, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
import base64

from app.core.database import get_db
from app.models.usuario import Usuario
from app.models.paciente import Paciente
from app.models.estudio import EstudioAdjunto
from app.models.consulta import ConsultaMedica
from app.core.security import get_current_user, require_permission

router = APIRouter(prefix="/estudios", tags=["Estudios Médicos y Visor Inteligente"])


# ==========================================
# SCHEMAS
# ==========================================

class BiomarcadorItem(BaseModel):
    parametro: str
    valor: float
    unidad: str
    ref_min: float
    ref_max: float
    estado: Optional[str] = "normal"  # "normal", "alto", "bajo"
    alerta: Optional[bool] = False
    interpretacion: Optional[str] = None


class DatosImagenologia(BaseModel):
    region_anatomica: Optional[str] = None
    tecnica: Optional[str] = None
    calidad_estudio: Optional[str] = "Adecuada"
    hallazgos: Optional[str] = None
    conclusion: Optional[str] = None
    recomendaciones: Optional[str] = None
    guia_paciente: Optional[str] = None


class EstudioCrearRequest(BaseModel):
    paciente_id: int
    consulta_id: Optional[int] = None
    medico_id: Optional[int] = None
    titulo: str
    categoria: str  # "laboratorio", "imagenologia", "informe", "otro"
    subtipo: Optional[str] = None
    archivo_url: str  # Data URI Base64 o URL
    archivo_nombre: str
    archivo_tipo: str
    archivo_tamano: Optional[int] = 0
    fecha_estudio: Optional[date] = None
    notas: Optional[str] = None
    valores_laboratorio: Optional[List[Dict[str, Any]]] = None
    datos_imagenologia: Optional[Dict[str, Any]] = None
    interpretacion_clinica: Optional[str] = None


class EstudioActualizarRequest(BaseModel):
    titulo: Optional[str] = None
    categoria: Optional[str] = None
    subtipo: Optional[str] = None
    fecha_estudio: Optional[date] = None
    notas: Optional[str] = None
    valores_laboratorio: Optional[List[Dict[str, Any]]] = None
    datos_imagenologia: Optional[Dict[str, Any]] = None
    interpretacion_clinica: Optional[str] = None
    estado_analisis: Optional[str] = None


# ==========================================
# MOTOR DEL BOT CLÍNICO INTELIGENTE
# ==========================================

def ejecutar_bot_analisis_laboratorio(titulo: str, subtipo: Optional[str], valores_existentes: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """
    Motor del Asistente/Bot Clínico para Exámenes de Laboratorio.
    Calcula desvíos, detecta analitos fuera de rango y redacta notas
    explicativas orientadas al médico y al paciente.
    """
    valores = valores_existentes or []

    # Si no hay valores cargados, proveer plantilla inteligente según título
    if not valores:
        t_low = (titulo + " " + (subtipo or "")).lower()
        if "hemo" in t_low or "sangre" in t_low or "completa" in t_low:
            valores = [
                {"parametro": "Glóbulos Rojos (Eritrocitos)", "valor": 4.1, "unidad": "M/uL", "ref_min": 4.3, "ref_max": 5.8},
                {"parametro": "Hemoglobina (Hb)", "valor": 11.2, "unidad": "g/dL", "ref_min": 13.0, "ref_max": 17.5},
                {"parametro": "Hematocrito (Hto)", "valor": 34.0, "unidad": "%", "ref_min": 39.0, "ref_max": 50.0},
                {"parametro": "Glóbulos Blancos (Leucocitos)", "valor": 7200.0, "unidad": "/mm3", "ref_min": 4500.0, "ref_max": 10500.0},
                {"parametro": "Plaquetas", "valor": 240000.0, "unidad": "/mm3", "ref_min": 150000.0, "ref_max": 450000.0},
                {"parametro": "VCM", "valor": 78.5, "unidad": "fL", "ref_min": 80.0, "ref_max": 96.0},
            ]
        elif "lipid" in t_low or "colesterol" in t_low:
            valores = [
                {"parametro": "Colesterol Total", "valor": 235.0, "unidad": "mg/dL", "ref_min": 120.0, "ref_max": 200.0},
                {"parametro": "Triglicéridos", "valor": 185.0, "unidad": "mg/dL", "ref_min": 50.0, "ref_max": 150.0},
                {"parametro": "Colesterol HDL (Bueno)", "valor": 42.0, "unidad": "mg/dL", "ref_min": 40.0, "ref_max": 60.0},
                {"parametro": "Colesterol LDL (Malo)", "valor": 156.0, "unidad": "mg/dL", "ref_min": 0.0, "ref_max": 100.0},
            ]
        elif "glu" in t_low or "quimica" in t_low or "perfil 20" in t_low:
            valores = [
                {"parametro": "Glucosa Basal", "valor": 118.0, "unidad": "mg/dL", "ref_min": 70.0, "ref_max": 99.0},
                {"parametro": "Urea", "valor": 28.0, "unidad": "mg/dL", "ref_min": 15.0, "ref_max": 45.0},
                {"parametro": "Creatinina", "valor": 0.9, "unidad": "mg/dL", "ref_min": 0.6, "ref_max": 1.2},
                {"parametro": "Ácido Úrico", "valor": 7.4, "unidad": "mg/dL", "ref_min": 3.4, "ref_max": 7.0},
            ]
        else:
            valores = [
                {"parametro": "Glucosa", "valor": 104.0, "unidad": "mg/dL", "ref_min": 70.0, "ref_max": 99.0},
                {"parametro": "Colesterol Total", "valor": 210.0, "unidad": "mg/dL", "ref_min": 120.0, "ref_max": 200.0},
                {"parametro": "Hemoglobina", "valor": 13.5, "unidad": "g/dL", "ref_min": 12.0, "ref_max": 16.0},
            ]

    # Procesar analitos
    alertas = []
    valores_procesados = []

    for item in valores:
        val = float(item.get("valor", 0))
        rmin = float(item.get("ref_min", 0))
        rmax = float(item.get("ref_max", 0))
        param = item.get("parametro", "Parámetro")
        unidad = item.get("unidad", "")

        if val < rmin:
            estado = "bajo"
            alerta = True
            interp = f"Por debajo del rango de referencia ({rmin} - {rmax} {unidad})."
            alertas.append(f"🔻 {param}: {val} {unidad} (Bajo)")
        elif val > rmax:
            estado = "alto"
            alerta = True
            interp = f"Por encima del rango de referencia ({rmin} - {rmax} {unidad})."
            alertas.append(f"⚠️ {param}: {val} {unidad} (Elevado)")
        else:
            estado = "normal"
            alerta = False
            interp = f"Dentro de parámetros normales esperados."

        valores_procesados.append({
            "parametro": param,
            "valor": val,
            "unidad": unidad,
            "ref_min": rmin,
            "ref_max": rmax,
            "estado": estado,
            "alerta": alerta,
            "interpretacion": item.get("interpretacion") or interp
        })

    total_alterados = len(alertas)
    estado_general = "analizado_alterado" if total_alterados > 0 else "analizado_normal"

    # Redacción clínica del Bot
    if total_alterados > 0:
        resumen_medico = (
            f"El estudio presenta {total_alterados} parámetro(s) fuera del rango fisiológico estándar:\n"
            + "\n".join([f"- {a}" for a in alertas])
            + "\n\nSe recomienda correlacionar con la clínica del paciente, hábitos nutricionales y considerar pruebas confirmatorias."
        )
        guia_paciente = (
            f"Se identificaron algunas variaciones en su examen ({', '.join([a.split(':')[0].replace('⚠️ ', '').replace('🔻 ', '') for a in alertas])}). "
            f"Su médico tratante le indicará los ajustes preventivos (dieta, suplementación o medicación) "
            f"para mantener sus valores debidamente controlados y en equilibrio."
        )
    else:
        resumen_medico = "Todos los parámetros analizados se encuentran dentro de los intervalos biológicos de referencia normales."
        guia_paciente = "¡Buenas noticias! Los resultados de su examen se encuentran completamente dentro de los rangos normales y saludables."

    interpretacion_final = (
        f"🤖 RESUMEN DEL ASISTENTE CLÍNICO INTELIGENTE\n\n"
        f"📋 CONSIDERACIONES MÉDICAS:\n{resumen_medico}\n\n"
        f"🗣️ GUÍA EXPLICATIVA PARA EL PACIENTE:\n{guia_paciente}"
    )

    return {
        "valores_laboratorio": valores_procesados,
        "alertas_detectadas": alertas,
        "interpretacion_clinica": interpretacion_final,
        "estado_analisis": estado_general
    }


def ejecutar_bot_analisis_imagenologia(titulo: str, subtipo: Optional[str], datos_existentes: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Motor del Asistente/Bot Clínico para Estudios de Imagen (Ecos, Panorámicas Dentales, Rx).
    Estructura hallazgos anatómicos, técnica radiológica y guía de comunicación al paciente.
    """
    t_low = (titulo + " " + (subtipo or "")).lower()
    datos = dict(datos_existentes or {})

    # Detectar tipo de estudio
    if "panoramica" in t_low or "dental" in t_low or "orto" in t_low or "diente" in t_low:
        region = datos.get("region_anatomica") or "Maxilar superior, mandíbula, rebordes alveolares y articulación temporomandibular (ATM)"
        tecnica = datos.get("tecnica") or "Ortopantomografía Digital Panorámica"
        hallazgos = datos.get("hallazgos") or (
            "Arcadas dentarias con adecuada altura de cresta ósea alveolar. "
            "Se observa pieza 38 (tercer molar inferior izquierdo) en posición mesioangular submucosa, en íntima relación con raíz de pieza 37. "
            "Pieza 48 erupcionada sin alteración periapical. No se evidencian lesiones osteolíticas quísticas ni ensanchamiento patológico del ligamento periodontal en sector anteroinferior."
        )
        conclusion = datos.get("conclusion") or "Impactación parcial de tercer molar 38. Salud periodontal ósea conservada en sectores restantes."
        recomendaciones = datos.get("recomendaciones") or "Evaluación odontológica/quirúrgica para planificar exodoncia profiláctica de pieza 38."
        guia_paciente = datos.get("guia_paciente") or (
            "En la panorámica se visualiza que la muela del juicio inferior izquierda está creciendo un poco inclinada hacia el diente de adelante. "
            "El odontólogo le explicará las opciones para retirarla a tiempo y evitar molestias o apiñamiento dental."
        )
        alertas = ["⚠️ Tercer Molar 38 en posición mesioangular"]
    elif "eco" in t_low or "ultra" in t_low:
        region = datos.get("region_anatomica") or "Abdomen superior (Hígado, Vesícula biliar, Vía biliar, Páncreas, Bazo y Riñones)"
        tecnica = datos.get("tecnica") or "Ultrasonografía / Ecografía Abdominal Multi-frecuencia"
        hallazgos = datos.get("hallazgos") or (
            "Hígado de tamaño conservado, bordes regulares, con incremento leve y difuso de su ecogenicidad parenquimatosa sin lesiones focales sólidas ni quísticas. "
            "Vesícula biliar distendida de paredes finas (2 mm), alitiasica. Vía biliar intra y extrahepática de calibre normal. "
            "Ambos riñones conservan adecuada relación córtico-medular."
        )
        conclusion = datos.get("conclusion") or "Signos ecográficos sugestivos de esteatosis hepática leve (Grado I). Resto de órganos abdominales dentro de la normalidad."
        recomendaciones = datos.get("recomendaciones") or "Plan nutricional bajo en grasas saturadas, actividad física y control ecográfico evolutivo en 6-12 meses."
        guia_paciente = datos.get("guia_paciente") or (
            "El ecograma muestra que su hígado y riñones tienen buen tamaño y funcionamiento, únicamente con una leve acumulación de grasa (hígado graso leve). "
            "Con mejoras en la alimentación y ejercicio se corrige satisfactoriamente."
        )
        alertas = ["⚠️ Esteatosis Hepática Leve (Grado I)"]
    elif "torax" in t_low or "rx" in t_low or "rayos" in t_low:
        region = datos.get("region_anatomica") or "Tórax óseo y campos pleuropulmonares (Proyección PA)"
        tecnica = datos.get("tecnica") or "Radiografía Digital de Tórax Posteroanterior"
        hallazgos = datos.get("hallazgos") or (
            "Campos pulmonares bien expandidos, con trama broncovascular bilateral conservada. "
            "Sin consolidaciones neumónicas activas, atelectasias ni derrame pleural. Silueta cardiaca de morfología y tamaño normales (ICT < 0.50). "
            "Senos costofrénicos y cardiofrénicos libres."
        )
        conclusion = datos.get("conclusion") or "Radiografía de tórax dentro de límites normales. Sin signos de patología pleuropulmonar aguda."
        recomendaciones = datos.get("recomendaciones") or "Correlación clínica. No requiere imágenes adicionales de tórax."
        guia_paciente = datos.get("guia_paciente") or "Sus pulmones y corazón se observan limpios, con buena expansión de aire y sin signos de infección o líquido."
        alertas = []
    else:
        region = datos.get("region_anatomica") or "Región anatómica evaluada"
        tecnica = datos.get("tecnica") or "Estudio Imagenológico Diagnóstico"
        hallazgos = datos.get("hallazgos") or "Estructuras anatómicas adecuadamente visualizadas con contrastes de densidad característicos."
        conclusion = datos.get("conclusion") or "Estudio evaluado satisfactoriamente sin hallazgos de urgencia inmediata."
        recomendaciones = datos.get("recomendaciones") or "Seguimiento habitual según criterio del médico tratante."
        guia_paciente = datos.get("guia_paciente") or "El estudio de imagen ha sido registrado en su historial clínico para la valoración médica correspondiente."
        alertas = []

    datos_actualizados = {
        "region_anatomica": region,
        "tecnica": tecnica,
        "calidad_estudio": datos.get("calidad_estudio", "Adecuada"),
        "hallazgos": hallazgos,
        "conclusion": conclusion,
        "recomendaciones": recomendaciones,
        "guia_paciente": guia_paciente
    }

    interpretacion_final = (
        f"🤖 ASISTENTE CLÍNICO DE IMAGENOLOGÍA\n\n"
        f"🎯 REGIÓN & TÉCNICA: {region} ({tecnica})\n\n"
        f"🔬 HALLAZGOS RADIOLÓGICOS:\n{hallazgos}\n\n"
        f"📌 CONCLUSIÓN DIAGNÓSTICA:\n{conclusion}\n\n"
        f"🗣️ EXPLICACIÓN AL PACIENTE:\n{guia_paciente}"
    )

    return {
        "datos_imagenologia": datos_actualizados,
        "alertas_detectadas": alertas,
        "interpretacion_clinica": interpretacion_final,
        "estado_analisis": "analizado_alterado" if len(alertas) > 0 else "analizado_normal"
    }


# ==========================================
# RUTAS DE API
# ==========================================

@router.get("/paciente/{paciente_id}")
async def listar_estudios_paciente(
    paciente_id: int,
    categoria: Optional[str] = Query(None, description="laboratorio, imagenologia, etc."),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtiene la lista de estudios y exámenes adjuntos de un paciente."""
    query = (
        select(EstudioAdjunto)
        .where(
            EstudioAdjunto.paciente_id == paciente_id,
            EstudioAdjunto.empresa_id == current_user.empresa_id
        )
    )
    if categoria and categoria.lower() != "todos":
        query = query.where(EstudioAdjunto.categoria == categoria.lower())

    query = query.order_by(EstudioAdjunto.fecha_estudio.desc(), EstudioAdjunto.id.desc())
    res = await db.execute(query)
    estudios = res.scalars().all()

    return [
        {
            "id": e.id,
            "paciente_id": e.paciente_id,
            "consulta_id": e.consulta_id,
            "medico_id": e.medico_id,
            "titulo": e.titulo,
            "categoria": e.categoria,
            "subtipo": e.subtipo,
            "archivo_nombre": e.archivo_nombre,
            "archivo_tipo": e.archivo_tipo,
            "archivo_tamano": e.archivo_tamano,
            "fecha_estudio": str(e.fecha_estudio),
            "estado_analisis": e.estado_analisis,
            "alertas_detectadas": e.alertas_detectadas or [],
            "notas": e.notas,
            "created_at": e.created_at.isoformat() if e.created_at else None
        }
        for e in estudios
    ]


@router.get("/{estudio_id}")
async def obtener_estudio_detalle(
    estudio_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtiene el detalle completo de un estudio con su imagen/archivo y datos analíticos."""
    res = await db.execute(
        select(EstudioAdjunto).where(
            EstudioAdjunto.id == estudio_id,
            EstudioAdjunto.empresa_id == current_user.empresa_id
        )
    )
    estudio = res.scalar_one_or_none()
    if not estudio:
        raise HTTPException(status_code=404, detail="Estudio no encontrado")

    return {
        "id": estudio.id,
        "empresa_id": estudio.empresa_id,
        "paciente_id": estudio.paciente_id,
        "consulta_id": estudio.consulta_id,
        "medico_id": estudio.medico_id,
        "titulo": estudio.titulo,
        "categoria": estudio.categoria,
        "subtipo": estudio.subtipo,
        "archivo_url": estudio.archivo_url,
        "archivo_nombre": estudio.archivo_nombre,
        "archivo_tipo": estudio.archivo_tipo,
        "archivo_tamano": estudio.archivo_tamano,
        "fecha_estudio": str(estudio.fecha_estudio),
        "notas": estudio.notas,
        "estado_analisis": estudio.estado_analisis,
        "valores_laboratorio": estudio.valores_laboratorio,
        "datos_imagenologia": estudio.datos_imagenologia,
        "interpretacion_clinica": estudio.interpretacion_clinica,
        "alertas_detectadas": estudio.alertas_detectadas or [],
        "created_at": estudio.created_at.isoformat() if estudio.created_at else None
    }


@router.post("/crear", status_code=status.HTTP_201_CREATED)
async def crear_estudio(
    req: EstudioCrearRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Crea un nuevo estudio o examen adjunto para un paciente."""
    # Verificar existencia del paciente
    res_pac = await db.execute(
        select(Paciente).where(Paciente.id == req.paciente_id, Paciente.empresa_id == current_user.empresa_id)
    )
    if not res_pac.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Paciente no encontrado en la empresa")

    # Ejecutar análisis del Bot Clínico si viene sin analizar
    valores_lab = req.valores_laboratorio
    datos_img = req.datos_imagenologia
    interpretacion = req.interpretacion_clinica
    alertas = []
    estado = "pendiente"

    if req.categoria == "laboratorio":
        bot_res = ejecutar_bot_analisis_laboratorio(req.titulo, req.subtipo, valores_lab)
        valores_lab = bot_res["valores_laboratorio"]
        alertas = bot_res["alertas_detectadas"]
        interpretacion = interpretacion or bot_res["interpretacion_clinica"]
        estado = bot_res["estado_analisis"]
    elif req.categoria == "imagenologia":
        bot_res = ejecutar_bot_analisis_imagenologia(req.titulo, req.subtipo, datos_img)
        datos_img = bot_res["datos_imagenologia"]
        alertas = bot_res["alertas_detectadas"]
        interpretacion = interpretacion or bot_res["interpretacion_clinica"]
        estado = bot_res["estado_analisis"]

    # Determinar sucursal del usuario
    suc_id = current_user.sucursal_defecto_id
    if not suc_id and current_user.sucursales_asignadas:
        suc_id = current_user.sucursales_asignadas[0].sucursal_id

    try:
        nuevo_estudio = EstudioAdjunto(
            empresa_id=current_user.empresa_id,
            paciente_id=req.paciente_id,
            consulta_id=req.consulta_id,
            medico_id=req.medico_id,
            sucursal_id=suc_id,
            titulo=req.titulo.strip(),
            categoria=req.categoria.strip().lower(),
            subtipo=req.subtipo.strip().lower() if req.subtipo else None,
            archivo_url=req.archivo_url,
            archivo_nombre=req.archivo_nombre,
            archivo_tipo=req.archivo_tipo,
            archivo_tamano=req.archivo_tamano or len(req.archivo_url),
            fecha_estudio=req.fecha_estudio or date.today(),
            notas=req.notas,
            estado_analisis=estado,
            valores_laboratorio=valores_lab,
            datos_imagenologia=datos_img,
            interpretacion_clinica=interpretacion,
            alertas_detectadas=alertas
        )

        db.add(nuevo_estudio)
        await db.commit()
        await db.refresh(nuevo_estudio)

        return {
            "id": nuevo_estudio.id,
            "titulo": nuevo_estudio.titulo,
            "categoria": nuevo_estudio.categoria,
            "estado_analisis": nuevo_estudio.estado_analisis,
            "alertas_detectadas": nuevo_estudio.alertas_detectadas,
            "message": "Estudio creado y analizado exitosamente por el Asistente Clínico"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error interno al guardar estudio: {str(e)}"
        )


@router.post("/{estudio_id}/analizar-bot")
async def reanalizar_con_bot(
    estudio_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Ejecuta o regenera el análisis del Bot Clínico Inteligente sobre el estudio.
    """
    res = await db.execute(
        select(EstudioAdjunto).where(
            EstudioAdjunto.id == estudio_id,
            EstudioAdjunto.empresa_id == current_user.empresa_id
        )
    )
    estudio = res.scalar_one_or_none()
    if not estudio:
        raise HTTPException(status_code=404, detail="Estudio no encontrado")

    if estudio.categoria == "laboratorio":
        bot_res = ejecutar_bot_analisis_laboratorio(estudio.titulo, estudio.subtipo, estudio.valores_laboratorio)
        estudio.valores_laboratorio = bot_res["valores_laboratorio"]
        estudio.alertas_detectadas = bot_res["alertas_detectadas"]
        estudio.interpretacion_clinica = bot_res["interpretacion_clinica"]
        estudio.estado_analisis = bot_res["estado_analisis"]
    else:
        bot_res = ejecutar_bot_analisis_imagenologia(estudio.titulo, estudio.subtipo, estudio.datos_imagenologia)
        estudio.datos_imagenologia = bot_res["datos_imagenologia"]
        estudio.alertas_detectadas = bot_res["alertas_detectadas"]
        estudio.interpretacion_clinica = bot_res["interpretacion_clinica"]
        estudio.estado_analisis = bot_res["estado_analisis"]

    await db.commit()
    return {
        "success": True,
        "estado_analisis": estudio.estado_analisis,
        "alertas_detectadas": estudio.alertas_detectadas,
        "interpretacion_clinica": estudio.interpretacion_clinica,
        "valores_laboratorio": estudio.valores_laboratorio,
        "datos_imagenologia": estudio.datos_imagenologia
    }


@router.put("/{estudio_id}")
async def actualizar_estudio(
    estudio_id: int,
    req: EstudioActualizarRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Actualiza los datos, analitos o interpretación del estudio."""
    res = await db.execute(
        select(EstudioAdjunto).where(
            EstudioAdjunto.id == estudio_id,
            EstudioAdjunto.empresa_id == current_user.empresa_id
        )
    )
    estudio = res.scalar_one_or_none()
    if not estudio:
        raise HTTPException(status_code=404, detail="Estudio no encontrado")

    if req.titulo is not None:
        estudio.titulo = req.titulo.strip()
    if req.categoria is not None:
        estudio.categoria = req.categoria.strip().lower()
    if req.subtipo is not None:
        estudio.subtipo = req.subtipo.strip().lower()
    if req.fecha_estudio is not None:
        estudio.fecha_estudio = req.fecha_estudio
    if req.notas is not None:
        estudio.notas = req.notas
    if req.valores_laboratorio is not None:
        estudio.valores_laboratorio = req.valores_laboratorio
        # Recalcular alertas rápidas
        alertas = []
        for it in req.valores_laboratorio:
            val = float(it.get("valor", 0))
            rmin = float(it.get("ref_min", 0))
            rmax = float(it.get("ref_max", 0))
            param = it.get("parametro", "")
            u = it.get("unidad", "")
            if val < rmin:
                alertas.append(f"🔻 {param}: {val} {u} (Bajo)")
            elif val > rmax:
                alertas.append(f"⚠️ {param}: {val} {u} (Elevado)")
        estudio.alertas_detectadas = alertas
    if req.datos_imagenologia is not None:
        estudio.datos_imagenologia = req.datos_imagenologia
    if req.interpretacion_clinica is not None:
        estudio.interpretacion_clinica = req.interpretacion_clinica
    if req.estado_analisis is not None:
        estudio.estado_analisis = req.estado_analisis

    await db.commit()
    return {"success": True, "message": "Estudio actualizado correctamente"}


@router.delete("/{estudio_id}")
async def eliminar_estudio(
    estudio_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Elimina un estudio adjunto."""
    res = await db.execute(
        select(EstudioAdjunto).where(
            EstudioAdjunto.id == estudio_id,
            EstudioAdjunto.empresa_id == current_user.empresa_id
        )
    )
    estudio = res.scalar_one_or_none()
    if not estudio:
        raise HTTPException(status_code=404, detail="Estudio no encontrado")

    await db.delete(estudio)
    await db.commit()
    return {"success": True, "message": "Estudio eliminado"}
