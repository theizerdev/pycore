from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict, Any

from app.core.database import get_db
from app.core.security import get_current_active_user, require_permission, require_superadmin, registrar_auditoria
from app.models.landing import LandingPageConfig
from app.models.usuario import Usuario
from app.schemas.landing import LandingContentSchema

router = APIRouter(prefix="/landing", tags=["Landing Page CMS"])

DEFAULT_LANDING_DATA: Dict[str, Any] = {
    "hero": {
        "badge": "✨ Suite Médica Todo-en-Uno para Clínicas y Consultorios",
        "title": "La Plataforma Médica en la Nube que Impulsa tu",
        "title_highlight": "Práctica Clínica y Hospitalaria",
        "subtitle": "Digitaliza tus consultas médicas, agenda inteligente, turnero en pantalla, odontograma y recordatorios por WhatsApp con la plataforma SaaS más avanzada y segura.",
        "cta_primary_text": "Comenzar Prueba Gratis",
        "cta_primary_link": "/register",
        "cta_secondary_text": "Ver Demostración",
        "cta_secondary_link": "#modulos",
        "stat_1_val": "+50,000",
        "stat_1_label": "Consultas Realizadas",
        "stat_2_val": "99.9%",
        "stat_2_label": "Disponibilidad en la Nube",
        "stat_3_val": "-65%",
        "stat_3_label": "Ausentismo con WhatsApp",
        "stat_4_val": "+120",
        "stat_4_label": "Centros Médicos Activos"
    },
    "features": [
        {
            "id": "agenda",
            "title": "Agenda Inteligente & Citas",
            "description": "Calendario dinámico con vistas de mes, semana, día y lista. Control de estados, sobreturnos con justificación, bloqueos de agenda y pagos en tiempo real.",
            "icon": "CalendarDays",
            "badge": "FullCalendar",
            "category": "Asistencial",
            "enabled": True
        },
        {
            "id": "consultas",
            "title": "Historia Clínica & Consultas (EMR)",
            "description": "Examen físico estructurado con signos vitales y cálculo de IMC, codificación diagnóstica CIE-10, récipes farmacológicos e impresión de informes en PDF.",
            "icon": "Stethoscope",
            "badge": "CIE-10",
            "category": "Asistencial",
            "enabled": True
        },
        {
            "id": "odontograma",
            "title": "Odontograma Gráfico 2D",
            "description": "Mapa dental interactivo para adultos y niños. Marcado visual por cara dental de caries, endodoncias, coronas, extracciones e implantes con histórico evolutivo.",
            "icon": "Activity",
            "badge": "Exclusivo",
            "category": "Especialidades",
            "enabled": True
        },
        {
            "id": "turnero",
            "title": "Turnero Digital para Sala de Espera",
            "description": "Pantalla interactiva en tiempo real para recepciones. Anuncio sonoro con voz del turno y consultorio asignado en el instante en que el doctor llama al paciente.",
            "icon": "Tv",
            "badge": "WebSockets",
            "category": "Recepción",
            "enabled": True
        },
        {
            "id": "preconsulta",
            "title": "Preconsulta Digital & Triaje QR",
            "description": "Formulario web accesible mediante código QR o enlace para que los pacientes registren sus síntomas, antecedentes y alergias antes de entrar a consulta.",
            "icon": "QrCode",
            "badge": "Autogestión",
            "category": "Pacientes",
            "enabled": True
        },
        {
            "id": "whatsapp",
            "title": "WhatsApp Business Automático",
            "description": "Recordatorios automáticos de citas enviados un día antes mediante background workers. Soporte para variables personalizadas, Spintax y protección antibaneo.",
            "icon": "MessageSquare",
            "badge": "Automatización",
            "category": "Comunicación",
            "enabled": True
        },
        {
            "id": "chat",
            "title": "Chat Clínico & Notas de Voz",
            "description": "Mensajería instantánea interna entre médicos, recepción y enfermería. Canales por sede, chats 1 a 1 y envío y reproducción de notas de voz clínicas.",
            "icon": "Mic",
            "badge": "En Vivo",
            "category": "Comunicación",
            "enabled": True
        },
        {
            "id": "multitenant",
            "title": "Multi-Tenant & Multi-Sede",
            "description": "Aislamiento absoluto de datos por empresa o centro médico. Selector de sucursal activa en tiempo real y geolocalización con mapas interactivos.",
            "icon": "Building2",
            "badge": "Empresarial",
            "category": "Gestión",
            "enabled": True
        }
    ],
    "specialties": [
        {
            "id": "medicina-general",
            "name": "Medicina General & Familiar",
            "description": "Control integral del paciente, registro de antecedentes patológicos, signos vitales y seguimiento preventivo continuo.",
            "icon": "HeartPulse",
            "badge": "Primaria",
            "enabled": True
        },
        {
            "id": "odontologia",
            "name": "Odontología & Ortodoncia",
            "description": "Odontograma visual 2D con historial de tratamientos por pieza dental, presupuestos y control de citas periódicas.",
            "icon": "Sparkles",
            "badge": "Especializada",
            "enabled": True
        },
        {
            "id": "pediatria",
            "name": "Pediatría & Neonatología",
            "description": "Curvas de crecimiento, percentiles, esquema de vacunación y registro pediátrico adaptado.",
            "icon": "Baby",
            "badge": "Especializada",
            "enabled": True
        },
        {
            "id": "ginecologia",
            "name": "Ginecología & Obstetricia",
            "description": "Control prenatal, registro de semanas de gestación, ecografías adjuntas y plantillas obstétricas avanzadas.",
            "icon": "Users",
            "badge": "Especializada",
            "enabled": True
        },
        {
            "id": "cardiologia",
            "name": "Cardiología",
            "description": "Evaluación cardiovascular, registro electrocardiográfico, control de tensión arterial y factores de riesgo.",
            "icon": "Heart",
            "badge": "Alta Especialidad",
            "enabled": True
        },
        {
            "id": "traumatologia",
            "name": "Traumatología & Fisiatría",
            "description": "Seguimiento de lesiones osteomusculares, archivo de estudios radiológicos y planes de rehabilitación.",
            "icon": "ShieldCheck",
            "badge": "Especializada",
            "enabled": True
        }
    ],
    "benefits": [
        {
            "id": "ausentismo",
            "title": "Reducción Drástica del Ausentismo",
            "description": "Los recordatorios automáticos de WhatsApp con confirmación interactiva disminuyen hasta un 65% las inasistencias a citas médicas.",
            "icon": "TrendingDown",
            "stat": "-65%",
            "stat_label": "Tasa de Ausencias"
        },
        {
            "id": "tiempo",
            "title": "Ahorro de Tiempo en Consulta",
            "description": "Con la preconsulta digital y plantillas clínicas por especialidad, el médico ahorra hasta 15 minutos por acto médico.",
            "icon": "Clock",
            "stat": "+40%",
            "stat_label": "Eficiencia Médica"
        },
        {
            "id": "seguridad",
            "title": "Seguridad y Trazabilidad Legal",
            "description": "Auditoría inmutable de accesos, roles granulares (RBAC) y cifrado de datos clínicos bajo estándares de confidencialidad.",
            "icon": "ShieldCheck",
            "stat": "100%",
            "stat_label": "Trazabilidad Total"
        },
        {
            "id": "cero-papel",
            "title": "Operación 100% Sin Papel",
            "description": "Digitaliza récipes, constancias médicas, recetas e historias sin archivadores físicos ni riesgo de extravío.",
            "icon": "FileCheck",
            "stat": "0 Papel",
            "stat_label": "Eco & Digital"
        }
    ],
    "testimonials": [
        {
            "id": "t1",
            "author": "Dra. Mariana Valenzuela",
            "role": "Directora Médica",
            "clinic": "Centro Médico Las Mercedes",
            "avatar_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
            "rating": 5,
            "content": "MediSoft Suite transformó completamente nuestra clínica. El turnero digital eliminó el desorden en sala de espera y los recordatorios por WhatsApp nos ahorran horas de llamadas telefónicas.",
            "enabled": True
        },
        {
            "id": "t2",
            "author": "Dr. Carlos Eduardo Mendoza",
            "role": "Odontólogo Especialista",
            "clinic": "Clínica Dental Sonrisas",
            "avatar_url": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
            "rating": 5,
            "content": "El odontograma interactivo es una maravilla. Puedo registrar en segundos las patologías y los pacientes quedan fascinados viendo la evolución de sus tratamientos en pantalla.",
            "enabled": True
        },
        {
            "id": "t3",
            "author": "Dra. Sofía Rivas",
            "role": "Pediatra",
            "clinic": "Unidad Pediátrica Integral",
            "avatar_url": "https://images.unsplash.com/photo-1594824813576-857c5087a892?w=150&auto=format&fit=crop&q=80",
            "rating": 5,
            "content": "Las plantillas por especialidad y el expediente histórico con gráficas de peso y talla hacen que cada consulta sea fluida y profesional. La mejor inversión para nuestro centro médico.",
            "enabled": True
        }
    ],
    "faqs": [
        {
            "id": "faq-1",
            "question": "¿Cómo funciona el recordatorio automático por WhatsApp?",
            "answer": "MediSoft Suite se conecta a tu número de WhatsApp mediante un escaneo QR sencillo. Cada día, las tareas programadas en segundo plano envían recordatorios personalizados a los pacientes con su nombre, hora, doctor y sede, permitiéndoles confirmar su asistencia.",
            "category": "WhatsApp",
            "enabled": True
        },
        {
            "id": "faq-2",
            "question": "¿Mis datos y expedientes de pacientes están seguros?",
            "answer": "Absolutamente. Cada institución cuenta con aislamiento lógico estricto (arquitectura Multi-Tenant). Todas las comunicaciones viajan sobre HTTPS/TLS y las contraseñas se almacenan con cifrado Bcrypt de grado militar. Además, cada acción queda auditada con IP y marca de tiempo.",
            "category": "Seguridad",
            "enabled": True
        },
        {
            "id": "faq-3",
            "question": "¿Sirve tanto para un consultorio individual como para una clínica con varias sedes?",
            "answer": "Sí. MediSoft Suite es nativamente multi-sede. Puedes comenzar con un solo consultorio y expandirte a múltiples sucursales con doctores, horarios y recepciones independientes sin cambiar de plataforma.",
            "category": "General",
            "enabled": True
        },
        {
            "id": "faq-4",
            "question": "¿Qué equipamiento necesito para usar el Turnero en Pantalla?",
            "answer": "Cualquier Smart TV, monitor con Mini PC, tablet o computador conectado a internet. Basta con abrir el enlace del turnero de tu sucursal en el navegador web para que comience a cantar y mostrar los llamados en tiempo real.",
            "category": "Clínico",
            "enabled": True
        },
        {
            "id": "faq-5",
            "question": "¿Puedo emitir e imprimir recetas médicas e informes en PDF?",
            "answer": "Sí. Desde la consulta médica puedes emitir el récipe con dosificaciones, indicaciones médicas, reposos o constancias, listos para imprimir con el membrete oficial y datos de la clínica y del médico tratante.",
            "category": "Clínico",
            "enabled": True
        }
    ],
    "contact": {
        "whatsapp": "+58 412 1234567",
        "phone": "+58 212 555-0199",
        "email": "contacto@medisoft.theizerdev.com",
        "address": "Av. Principal Empresarial, Torre Médica Titanium, Piso 5",
        "schedule": "Lunes a Viernes: 8:00 AM - 6:00 PM (Sábados: 9:00 AM - 1:00 PM)",
        "social": {
            "instagram": "https://instagram.com/medisoft",
            "facebook": "https://facebook.com/medisoft",
            "linkedin": "https://linkedin.com/company/medisoft",
            "twitter": "https://x.com/medisoft"
        }
    },
    "cta_banner": {
        "badge": "🚀 Moderniza tu Centro Médico Hoy",
        "title": "¿Listo para llevar la gestión de tu clínica al siguiente nivel?",
        "subtitle": "Comienza tu prueba gratuita en minutos. Sin instalaciones complicadas, 100% en la nube y con soporte dedicado para tu equipo.",
        "button_text": "Registrar mi Centro Médico Gratis",
        "button_link": "/register"
    },
    "is_active": True
}


async def get_or_create_landing_config(db: AsyncSession) -> LandingPageConfig:
    stmt = select(LandingPageConfig).where(LandingPageConfig.clave == "default")
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()

    if not config:
        config = LandingPageConfig(
            clave="default",
            hero=DEFAULT_LANDING_DATA["hero"],
            features=DEFAULT_LANDING_DATA["features"],
            specialties=DEFAULT_LANDING_DATA["specialties"],
            benefits=DEFAULT_LANDING_DATA["benefits"],
            testimonials=DEFAULT_LANDING_DATA["testimonials"],
            faqs=DEFAULT_LANDING_DATA["faqs"],
            contact=DEFAULT_LANDING_DATA["contact"],
            cta_banner=DEFAULT_LANDING_DATA["cta_banner"],
            is_active=True
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
    
    return config


@router.get("", response_model=LandingContentSchema)
async def get_landing_content(db: AsyncSession = Depends(get_db)):
    """Obtiene el contenido público activo de la Landing Page."""
    config = await get_or_create_landing_config(db)
    return LandingContentSchema(
        hero=config.hero,
        features=config.features,
        specialties=config.specialties,
        benefits=config.benefits,
        testimonials=config.testimonials,
        faqs=config.faqs,
        contact=config.contact,
        cta_banner=config.cta_banner,
        is_active=config.is_active
    )


@router.put("", response_model=LandingContentSchema)
async def update_landing_content(
    payload: LandingContentSchema,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Actualiza cualquier sección o contenido de la Landing Page (Requiere permisos de administración)."""
    # Verificar si es superadmin o tiene permiso de configuración
    if not current_user.es_superadmin:
        permisos = [p.slug for p in current_user.rol.permisos] if current_user.rol else []
        if "empresas.editar" not in permisos and "empresas.ver" not in permisos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para modificar el contenido de la Landing Page"
            )

    config = await get_or_create_landing_config(db)

    config.hero = payload.hero.model_dump()
    config.features = [f.model_dump() for f in payload.features]
    config.specialties = [s.model_dump() for s in payload.specialties]
    config.benefits = [b.model_dump() for b in payload.benefits]
    config.testimonials = [t.model_dump() for t in payload.testimonials]
    config.faqs = [f.model_dump() for f in payload.faqs]
    config.contact = payload.contact.model_dump()
    config.cta_banner = payload.cta_banner.model_dump()
    config.is_active = payload.is_active

    await db.commit()
    await db.refresh(config)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="editar",
        modulo="landing_cms",
        request=request,
        detalles={"mensaje": "Contenido de la Landing Page actualizado exitosamente"}
    )

    return LandingContentSchema(
        hero=config.hero,
        features=config.features,
        specialties=config.specialties,
        benefits=config.benefits,
        testimonials=config.testimonials,
        faqs=config.faqs,
        contact=config.contact,
        cta_banner=config.cta_banner,
        is_active=config.is_active
    )


@router.post("/reset", response_model=LandingContentSchema)
async def reset_landing_content(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Restaura el contenido predeterminado de la Landing Page."""
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un Superadministrador puede restaurar la Landing Page por defecto"
        )

    config = await get_or_create_landing_config(db)

    config.hero = DEFAULT_LANDING_DATA["hero"]
    config.features = DEFAULT_LANDING_DATA["features"]
    config.specialties = DEFAULT_LANDING_DATA["specialties"]
    config.benefits = DEFAULT_LANDING_DATA["benefits"]
    config.testimonials = DEFAULT_LANDING_DATA["testimonials"]
    config.faqs = DEFAULT_LANDING_DATA["faqs"]
    config.contact = DEFAULT_LANDING_DATA["contact"]
    config.cta_banner = DEFAULT_LANDING_DATA["cta_banner"]
    config.is_active = True

    await db.commit()
    await db.refresh(config)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="restaurar",
        modulo="landing_cms",
        request=request,
        detalles={"mensaje": "Landing Page restaurada a valores por defecto"}
    )

    return LandingContentSchema(
        hero=config.hero,
        features=config.features,
        specialties=config.specialties,
        benefits=config.benefits,
        testimonials=config.testimonials,
        faqs=config.faqs,
        contact=config.contact,
        cta_banner=config.cta_banner,
        is_active=config.is_active
    )
