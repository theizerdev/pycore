from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from app.models.pais import Pais
from app.models.empresa import Empresa
from app.models.sucursal import Sucursal
from app.models.permiso import Permiso
from app.models.rol import Rol
from app.models.usuario import Usuario, UsuarioSucursal
from app.models.especialidad import Especialidad
from app.models.plantilla_especialidad import EspecialidadPlantilla
from app.core.security import get_password_hash
from app.services.clinical_templates_seed import (
    CATALOGO_ESPECIALIDADES_OFICIALES,
    get_template_for_specialty
)

PERMISOS_SISTEMA = [
    # ── Sector: Organización ──
    # Empresas
    {"sector": "organizacion", "modulo": "empresas", "accion": "ver", "slug": "empresas.ver", "descripcion": "Ver lista y detalles de empresas"},
    {"sector": "organizacion", "modulo": "empresas", "accion": "crear", "slug": "empresas.crear", "descripcion": "Crear nuevas empresas"},
    {"sector": "organizacion", "modulo": "empresas", "accion": "editar", "slug": "empresas.editar", "descripcion": "Modificar datos de empresas"},
    {"sector": "organizacion", "modulo": "empresas", "accion": "eliminar", "slug": "empresas.eliminar", "descripcion": "Eliminar empresas"},
    
    # Sucursales
    {"sector": "organizacion", "modulo": "sucursales", "accion": "ver", "slug": "sucursales.ver", "descripcion": "Ver sucursales y sedes de la empresa"},
    {"sector": "organizacion", "modulo": "sucursales", "accion": "crear", "slug": "sucursales.crear", "descripcion": "Crear nuevas sedes o sucursales"},
    {"sector": "organizacion", "modulo": "sucursales", "accion": "editar", "slug": "sucursales.editar", "descripcion": "Editar información de sucursales"},
    {"sector": "organizacion", "modulo": "sucursales", "accion": "eliminar", "slug": "sucursales.eliminar", "descripcion": "Eliminar sucursales"},

    # ── Sector: Seguridad ──
    # Usuarios
    {"sector": "seguridad", "modulo": "usuarios", "accion": "ver", "slug": "usuarios.ver", "descripcion": "Ver directorio de usuarios"},
    {"sector": "seguridad", "modulo": "usuarios", "accion": "crear", "slug": "usuarios.crear", "descripcion": "Registrar nuevos usuarios"},
    {"sector": "seguridad", "modulo": "usuarios", "accion": "editar", "slug": "usuarios.editar", "descripcion": "Editar usuarios y asignaciones"},
    {"sector": "seguridad", "modulo": "usuarios", "accion": "eliminar", "slug": "usuarios.eliminar", "descripcion": "Eliminar o suspender usuarios"},

    # Roles y Permisos
    {"sector": "seguridad", "modulo": "roles", "accion": "ver", "slug": "roles.ver", "descripcion": "Ver lista de roles y permisos"},
    {"sector": "seguridad", "modulo": "roles", "accion": "crear", "slug": "roles.crear", "descripcion": "Crear nuevos roles"},
    {"sector": "seguridad", "modulo": "roles", "accion": "editar", "slug": "roles.editar", "descripcion": "Modificar roles y su matriz de permisos"},
    {"sector": "seguridad", "modulo": "roles", "accion": "eliminar", "slug": "roles.eliminar", "descripcion": "Eliminar roles no del sistema"},
    {"sector": "seguridad", "modulo": "permisos", "accion": "ver", "slug": "permisos.ver", "descripcion": "Listar catálogo de permisos"},

    # ── Sector: Configuración ──
    # Países y Localización
    {"sector": "configuracion", "modulo": "paises", "accion": "ver", "slug": "paises.ver", "descripcion": "Ver catálogo de países configurados"},
    {"sector": "configuracion", "modulo": "paises", "accion": "crear", "slug": "paises.crear", "descripcion": "Registrar nuevos países"},
    {"sector": "configuracion", "modulo": "paises", "accion": "editar", "slug": "paises.editar", "descripcion": "Modificar configuración de países"},
    {"sector": "configuracion", "modulo": "paises", "accion": "eliminar", "slug": "paises.eliminar", "descripcion": "Eliminar países del catálogo"},

    # ── Sector: Monitoreo ──
    # Bitácora de Auditoría
    {"sector": "monitoreo", "modulo": "auditoria", "accion": "ver", "slug": "auditoria.ver", "descripcion": "Consultar registro de auditoría del sistema"},

    # Sesiones Activas
    {"sector": "monitoreo", "modulo": "sesiones", "accion": "ver", "slug": "sesiones.ver", "descripcion": "Ver sesiones activas en tiempo real"},
    {"sector": "monitoreo", "modulo": "sesiones", "accion": "revocar", "slug": "sesiones.revocar", "descripcion": "Cerrar remotamente sesiones de usuarios"},

    # Alertas y Accesos
    {"sector": "monitoreo", "modulo": "seguridad_accesos", "accion": "ver", "slug": "seguridad_accesos.ver", "descripcion": "Ver intentos de acceso y eventos de seguridad"},
    {"sector": "monitoreo", "modulo": "seguridad_accesos", "accion": "bloquear", "slug": "seguridad_accesos.bloquear", "descripcion": "Bloquear y desbloquear direcciones IP"},

    # Salud del Sistema
    {"sector": "monitoreo", "modulo": "salud_sistema", "accion": "ver", "slug": "salud_sistema.ver", "descripcion": "Ver métricas de salud y estado del sistema"},
    {"sector": "monitoreo", "modulo": "salud_sistema", "accion": "diagnostico", "slug": "salud_sistema.diagnostico", "descripcion": "Ejecutar pruebas de ping y diagnóstico"},

    # ── Sector: Integraciones ──
    # Catálogo General
    {"sector": "integraciones", "modulo": "integraciones", "accion": "ver", "slug": "integraciones.ver", "descripcion": "Ver catálogo general de integraciones y servicios"},
    {"sector": "integraciones", "modulo": "integraciones", "accion": "editar", "slug": "integraciones.editar", "descripcion": "Configurar y actualizar parámetros de integraciones"},

    # WhatsApp Business & Marketing
    {"sector": "integraciones", "modulo": "whatsapp", "accion": "ver", "slug": "whatsapp.ver", "descripcion": "Acceder al centro de control de WhatsApp Business"},
    {"sector": "integraciones", "modulo": "whatsapp", "accion": "conectar", "slug": "whatsapp.conectar", "descripcion": "Vincular y desvincular sesiones de WhatsApp QR"},
    {"sector": "integraciones", "modulo": "whatsapp", "accion": "enviar", "slug": "whatsapp.enviar", "descripcion": "Despachar mensajes individuales y pruebas"},
    {"sector": "integraciones", "modulo": "whatsapp", "accion": "difusion", "slug": "whatsapp.difusion", "descripcion": "Realizar difusiones masivas (Broadcast)"},
    {"sector": "integraciones", "modulo": "whatsapp", "accion": "plantillas", "slug": "whatsapp.plantillas", "descripcion": "Administrar plantillas y Spintax de WhatsApp"},
    {"sector": "integraciones", "modulo": "whatsapp", "accion": "antiban", "slug": "whatsapp.antiban", "descripcion": "Configurar límites y políticas Anti-Baneo"},

    # Mapas y Geolocalización
    {"sector": "integraciones", "modulo": "mapas", "accion": "ver", "slug": "mapas.ver", "descripcion": "Ver configuración de proveedores de mapas"},
    {"sector": "integraciones", "modulo": "mapas", "accion": "editar", "slug": "mapas.editar", "descripcion": "Configurar credenciales de Mapbox y Google Maps"},

    # Pasarelas de Pago
    {"sector": "integraciones", "modulo": "pagos", "accion": "ver", "slug": "pagos.ver", "descripcion": "Ver estado de pasarelas de pago"},
    {"sector": "integraciones", "modulo": "pagos", "accion": "editar", "slug": "pagos.editar", "descripcion": "Configurar credenciales de Stripe, PayPal y Mercado Pago"},

    # Tasas de Cambio & Divisas (BCV & Binance USDT)
    {"sector": "integraciones", "modulo": "tasas", "accion": "ver", "slug": "tasas.ver", "descripcion": "Ver monitor y panel de tasas de cambio del día"},
    {"sector": "integraciones", "modulo": "tasas", "accion": "sincronizar", "slug": "tasas.sincronizar", "descripcion": "Sincronizar en tiempo real tasas con BCV y Binance"},
    {"sector": "integraciones", "modulo": "tasas", "accion": "editar", "slug": "tasas.editar", "descripcion": "Ajustar manualmente valores de tasas de cambio"},

    # ── Sector: Clínica / Gestión Médica ──
    # Especialidades Médicas
    {"sector": "clinica", "modulo": "especialidades", "accion": "ver", "slug": "especialidades.ver", "descripcion": "Ver catálogo de especialidades médicas"},
    {"sector": "clinica", "modulo": "especialidades", "accion": "crear", "slug": "especialidades.crear", "descripcion": "Crear nuevas especialidades médicas"},
    {"sector": "clinica", "modulo": "especialidades", "accion": "editar", "slug": "especialidades.editar", "descripcion": "Editar especialidades médicas"},
    {"sector": "clinica", "modulo": "especialidades", "accion": "eliminar", "slug": "especialidades.eliminar", "descripcion": "Eliminar o inactivar especialidades médicas"},

    # Servicios Médicos por Especialidad
    {"sector": "clinica", "modulo": "servicios", "accion": "ver", "slug": "servicios.ver", "descripcion": "Ver catálogo de servicios médicos y tarifas"},
    {"sector": "clinica", "modulo": "servicios", "accion": "crear", "slug": "servicios.crear", "descripcion": "Crear nuevos servicios médicos y procedimientos"},
    {"sector": "clinica", "modulo": "servicios", "accion": "editar", "slug": "servicios.editar", "descripcion": "Editar tarifas, duración y datos de servicios"},
    {"sector": "clinica", "modulo": "servicios", "accion": "eliminar", "slug": "servicios.eliminar", "descripcion": "Eliminar o inactivar servicios médicos"},
    
    # Médicos y Especialistas
    {"sector": "clinica", "modulo": "medicos", "accion": "ver", "slug": "medicos.ver", "descripcion": "Ver directorio de médicos y especialistas"},
    {"sector": "clinica", "modulo": "medicos", "accion": "crear", "slug": "medicos.crear", "descripcion": "Registrar nuevos médicos y credenciales"},
    {"sector": "clinica", "modulo": "medicos", "accion": "editar", "slug": "medicos.editar", "descripcion": "Editar fichas de médicos y subespecialidades"},
    {"sector": "clinica", "modulo": "medicos", "accion": "eliminar", "slug": "medicos.eliminar", "descripcion": "Eliminar o inactivar médicos"},

    # Pacientes
    {"sector": "clinica", "modulo": "pacientes", "accion": "ver", "slug": "pacientes.ver", "descripcion": "Ver directorio de pacientes y expedientes"},
    {"sector": "clinica", "modulo": "pacientes", "accion": "crear", "slug": "pacientes.crear", "descripcion": "Registrar nuevos pacientes"},
    {"sector": "clinica", "modulo": "pacientes", "accion": "editar", "slug": "pacientes.editar", "descripcion": "Editar datos y antecedentes de pacientes"},
    {"sector": "clinica", "modulo": "pacientes", "accion": "eliminar", "slug": "pacientes.eliminar", "descripcion": "Eliminar o archivar pacientes"},
    {"sector": "clinica", "modulo": "pacientes", "accion": "historial", "slug": "pacientes.historial", "descripcion": "Ver historial clínico completo"},

    # Citas Médicas
    {"sector": "clinica", "modulo": "citas", "accion": "ver", "slug": "citas.ver", "descripcion": "Ver agenda y listado de citas médicas"},
    {"sector": "clinica", "modulo": "citas", "accion": "crear", "slug": "citas.crear", "descripcion": "Agendar nuevas citas médicas"},
    {"sector": "clinica", "modulo": "citas", "accion": "editar", "slug": "citas.editar", "descripcion": "Modificar o reprogramar citas médicas"},
    {"sector": "clinica", "modulo": "citas", "accion": "cancelar", "slug": "citas.cancelar", "descripcion": "Cancelar citas médicas"},
    {"sector": "clinica", "modulo": "citas", "accion": "cambiar_estado", "slug": "citas.cambiar_estado", "descripcion": "Cambiar estado de citas a sala de espera u otros"},
    {"sector": "clinica", "modulo": "citas", "accion": "eliminar", "slug": "citas.eliminar", "descripcion": "Eliminar registros de citas"},
    {"sector": "clinica", "modulo": "citas", "accion": "atender", "slug": "citas.atender", "descripcion": "Atender o pasar citas a consulta"},

    # Consultas Médicas y Vistas por Estado
    {"sector": "clinica", "modulo": "consultas", "accion": "ver", "slug": "consultas.ver", "descripcion": "Ver listado general de consultas médicas"},
    {"sector": "clinica", "modulo": "consultas", "accion": "sala_espera", "slug": "consultas.sala_espera", "descripcion": "Acceso a la sala de espera de pacientes en clínica"},
    {"sector": "clinica", "modulo": "consultas", "accion": "en_consulta", "slug": "consultas.en_consulta", "descripcion": "Acceso al módulo de pacientes en consulta activa"},
    {"sector": "clinica", "modulo": "consultas", "accion": "atendidas", "slug": "consultas.atendidas", "descripcion": "Acceso al registro histórico de consultas atendidas"},
    {"sector": "clinica", "modulo": "consultas", "accion": "atender", "slug": "consultas.atender", "descripcion": "Llamar a consultorio y atender consultas"},
    {"sector": "clinica", "modulo": "consultas", "accion": "crear", "slug": "consultas.crear", "descripcion": "Crear o iniciar consultas médicas"},
    {"sector": "clinica", "modulo": "consultas", "accion": "editar", "slug": "consultas.editar", "descripcion": "Editar evolución, diagnósticos y datos de consulta"},
    {"sector": "clinica", "modulo": "consultas", "accion": "eliminar", "slug": "consultas.eliminar", "descripcion": "Anular o eliminar consultas médicas"},
    {"sector": "clinica", "modulo": "consultas", "accion": "recetar", "slug": "consultas.recetar", "descripcion": "Emitir y recetar prescripciones médicas"},
]

PAISES_INICIALES = [
    {
        "nombre": "México",
        "codigo_iso2": "MX",
        "codigo_iso3": "MEX",
        "codigo_telefonico": "+52",
        "moneda_principal": "MXN",
        "idioma_principal": "es",
        "continente": "América del Norte",
        "zona_horaria": "America/Mexico_City",
        "formato_fecha": "dd/mm/yyyy",
        "formato_moneda": "$1.234,56",
        "impuesto_predeterminado": 16.00,
        "separador_miles": ",",
        "separador_decimales": ".",
        "decimales_moneda": 2,
        "activo": True,
        "latitud": 19.4326,
        "longitud": -99.1332,
    },
    {
        "nombre": "Venezuela",
        "codigo_iso2": "VE",
        "codigo_iso3": "VEN",
        "codigo_telefonico": "+58",
        "moneda_principal": "VES",
        "idioma_principal": "es",
        "continente": "América del Sur",
        "zona_horaria": "America/Caracas",
        "formato_fecha": "dd/mm/yyyy",
        "formato_moneda": "1.234,56 Bs.",
        "impuesto_predeterminado": 16.00,
        "separador_miles": ".",
        "separador_decimales": ",",
        "decimales_moneda": 2,
        "activo": True,
        "latitud": 10.4806,
        "longitud": -66.9036,
    },
    {
        "nombre": "Colombia",
        "codigo_iso2": "CO",
        "codigo_iso3": "COL",
        "codigo_telefonico": "+57",
        "moneda_principal": "COP",
        "idioma_principal": "es",
        "continente": "América del Sur",
        "zona_horaria": "America/Bogota",
        "formato_fecha": "dd/mm/yyyy",
        "formato_moneda": "$ 1.234,56",
        "impuesto_predeterminado": 19.00,
        "separador_miles": ".",
        "separador_decimales": ",",
        "decimales_moneda": 2,
        "activo": True,
        "latitud": 4.7110,
        "longitud": -74.0721,
    },
    {
        "nombre": "Estados Unidos",
        "codigo_iso2": "US",
        "codigo_iso3": "USA",
        "codigo_telefonico": "+1",
        "moneda_principal": "USD",
        "idioma_principal": "en",
        "continente": "América del Norte",
        "zona_horaria": "America/New_York",
        "formato_fecha": "mm/dd/yyyy",
        "formato_moneda": "$1,234.56",
        "impuesto_predeterminado": 7.50,
        "separador_miles": ",",
        "separador_decimales": ".",
        "decimales_moneda": 2,
        "activo": True,
        "latitud": 37.0902,
        "longitud": -95.7129,
    },
    {
        "nombre": "España",
        "codigo_iso2": "ES",
        "codigo_iso3": "ESP",
        "codigo_telefonico": "+34",
        "moneda_principal": "EUR",
        "idioma_principal": "es",
        "continente": "Europa",
        "zona_horaria": "Europe/Madrid",
        "formato_fecha": "dd/mm/yyyy",
        "formato_moneda": "1.234,56 €",
        "impuesto_predeterminado": 21.00,
        "separador_miles": ".",
        "separador_decimales": ",",
        "decimales_moneda": 2,
        "activo": True,
        "latitud": 40.4637,
        "longitud": -3.7492,
    },
    {
        "nombre": "Argentina",
        "codigo_iso2": "AR",
        "codigo_iso3": "ARG",
        "codigo_telefonico": "+54",
        "moneda_principal": "ARS",
        "idioma_principal": "es",
        "continente": "América del Sur",
        "zona_horaria": "America/Argentina/Buenos_Aires",
        "formato_fecha": "dd/mm/yyyy",
        "formato_moneda": "$ 1.234,56",
        "impuesto_predeterminado": 21.00,
        "separador_miles": ".",
        "separador_decimales": ",",
        "decimales_moneda": 2,
        "activo": True,
        "latitud": -34.6037,
        "longitud": -58.3816,
    },
    {
        "nombre": "Chile",
        "codigo_iso2": "CL",
        "codigo_iso3": "CHL",
        "codigo_telefonico": "+56",
        "moneda_principal": "CLP",
        "idioma_principal": "es",
        "continente": "América del Sur",
        "zona_horaria": "America/Santiago",
        "formato_fecha": "dd/mm/yyyy",
        "formato_moneda": "$ 1.234",
        "impuesto_predeterminado": 19.00,
        "separador_miles": ".",
        "separador_decimales": ",",
        "decimales_moneda": 0,
        "activo": True,
        "latitud": -33.4489,
        "longitud": -70.6693,
    },
    {
        "nombre": "Perú",
        "codigo_iso2": "PE",
        "codigo_iso3": "PER",
        "codigo_telefonico": "+51",
        "moneda_principal": "PEN",
        "idioma_principal": "es",
        "continente": "América del Sur",
        "zona_horaria": "America/Lima",
        "formato_fecha": "dd/mm/yyyy",
        "formato_moneda": "S/ 1,234.56",
        "impuesto_predeterminado": 18.00,
        "separador_miles": ",",
        "separador_decimales": ".",
        "decimales_moneda": 2,
        "activo": True,
        "latitud": -12.0464,
        "longitud": -77.0428,
    },
    {
        "nombre": "Panamá",
        "codigo_iso2": "PA",
        "codigo_iso3": "PAN",
        "codigo_telefonico": "+507",
        "moneda_principal": "USD",
        "idioma_principal": "es",
        "continente": "América Central",
        "zona_horaria": "America/Panama",
        "formato_fecha": "dd/mm/yyyy",
        "formato_moneda": "$ 1,234.56",
        "impuesto_predeterminado": 7.00,
        "separador_miles": ",",
        "separador_decimales": ".",
        "decimales_moneda": 2,
        "activo": True,
        "latitud": 8.9824,
        "longitud": -79.5199,
    },
    {
        "nombre": "Costa Rica",
        "codigo_iso2": "CR",
        "codigo_iso3": "CRI",
        "codigo_telefonico": "+506",
        "moneda_principal": "CRC",
        "idioma_principal": "es",
        "continente": "América Central",
        "zona_horaria": "America/Costa_Rica",
        "formato_fecha": "dd/mm/yyyy",
        "formato_moneda": "₡ 1.234,56",
        "impuesto_predeterminado": 13.00,
        "separador_miles": ".",
        "separador_decimales": ",",
        "decimales_moneda": 2,
        "activo": True,
        "latitud": 9.9281,
        "longitud": -84.0907,
    },
    {
        "nombre": "República Dominicana",
        "codigo_iso2": "DO",
        "codigo_iso3": "DOM",
        "codigo_telefonico": "+1809",
        "moneda_principal": "DOP",
        "idioma_principal": "es",
        "continente": "El Caribe",
        "zona_horaria": "America/Santo_Domingo",
        "formato_fecha": "dd/mm/yyyy",
        "formato_moneda": "RD$ 1,234.56",
        "impuesto_predeterminado": 18.00,
        "separador_miles": ",",
        "separador_decimales": ".",
        "decimales_moneda": 2,
        "activo": True,
        "latitud": 18.7357,
        "longitud": -70.1627,
    },
    {
        "nombre": "Brasil",
        "codigo_iso2": "BR",
        "codigo_iso3": "BRA",
        "codigo_telefonico": "+55",
        "moneda_principal": "BRL",
        "idioma_principal": "pt",
        "continente": "América del Sur",
        "zona_horaria": "America/Sao_Paulo",
        "formato_fecha": "dd/mm/yyyy",
        "formato_moneda": "R$ 1.234,56",
        "impuesto_predeterminado": 17.00,
        "separador_miles": ".",
        "separador_decimales": ",",
        "decimales_moneda": 2,
        "activo": True,
        "latitud": -14.2350,
        "longitud": -51.9253,
    }
]

async def seed_initial_data(db: AsyncSession):
    # 0. Crear o actualizar Países
    paises_map = {}
    for p_data in PAISES_INICIALES:
        stmt = select(Pais).where(Pais.codigo_iso2 == p_data["codigo_iso2"])
        res = await db.execute(stmt)
        pais = res.scalar_one_or_none()
        if not pais:
            pais = Pais(**p_data)
            db.add(pais)
            await db.flush()
        else:
            for k, v in p_data.items():
                setattr(pais, k, v)
            await db.flush()
        paises_map[p_data["codigo_iso2"]] = pais

    # 1. Crear o actualizar Permisos
    permisos_map = {}
    for p_data in PERMISOS_SISTEMA:
        stmt = select(Permiso).where(Permiso.slug == p_data["slug"])
        res = await db.execute(stmt)
        permiso = res.scalar_one_or_none()
        if not permiso:
            permiso = Permiso(**p_data)
            db.add(permiso)
            await db.flush()
        else:
            # Actualizar sector y descripción si han cambiado
            permiso.sector = p_data.get("sector", "seguridad")
            permiso.descripcion = p_data.get("descripcion", permiso.descripcion)
            await db.flush()
        permisos_map[p_data["slug"]] = permiso

    # 2. Crear Roles Base
    roles_config = [
        {
            "nombre": "Superadministrador",
            "slug": "superadmin",
            "descripcion": "Acceso total a todos los sectores y módulos del sistema",
            "es_sistema": True,
            "permisos": list(permisos_map.values())
        },
        {
            "nombre": "Administrador de Clínica",
            "slug": "admin-clinica",
            "descripcion": "Administración de usuarios, sucursales, pacientes, citas y reportes de la clínica",
            "es_sistema": False,
            "permisos": [p for p in permisos_map.values() if not p.slug.startswith("empresas")]
        },
        {
            "nombre": "Médico Especialista",
            "slug": "medico",
            "descripcion": "Gestión de agenda, historia clínica, consultas, recetas, teleconsulta y turnero",
            "es_sistema": False,
            "permisos": [
                permisos_map[slug] for slug in [
                    "pacientes.ver", "pacientes.crear", "pacientes.editar", "pacientes.historial",
                    "citas.ver", "citas.atender", "citas.cambiar_estado",
                    "consultas.ver", "consultas.sala_espera", "consultas.en_consulta", "consultas.atendidas",
                    "consultas.atender", "consultas.crear", "consultas.editar", "consultas.recetar",
                    "turnero.ver", "turnero.llamar",
                    "teleconsulta.iniciar"
                ] if slug in permisos_map
            ]
        },
        {
            "nombre": "Recepcionista",
            "slug": "recepcion",
            "descripcion": "Gestión de pacientes en sala, agendamiento de citas y turnero",
            "es_sistema": False,
            "permisos": [
                permisos_map[slug] for slug in [
                    "pacientes.ver", "pacientes.crear", "pacientes.editar",
                    "citas.ver", "citas.crear", "citas.editar", "citas.cancelar", "citas.cambiar_estado",
                    "consultas.ver", "consultas.sala_espera", "consultas.atendidas",
                    "turnero.ver"
                ] if slug in permisos_map
            ]
        },
        {
            "nombre": "Enfermería / Triaje",
            "slug": "enfermeria",
            "descripcion": "Toma de signos vitales, preconsulta y seguimiento de pacientes",
            "es_sistema": False,
            "permisos": [
                permisos_map[slug] for slug in [
                    "pacientes.ver", "pacientes.historial",
                    "citas.ver", "citas.atender", "citas.cambiar_estado",
                    "consultas.ver", "consultas.sala_espera", "consultas.en_consulta", "consultas.atendidas",
                    "turnero.ver"
                ] if slug in permisos_map
            ]
        }
    ]

    roles_map = {}
    for r_data in roles_config:
        stmt = select(Rol).where(Rol.slug == r_data["slug"])
        res = await db.execute(stmt)
        rol = res.scalar_one_or_none()
        if not rol:
            rol = Rol(
                nombre=r_data["nombre"],
                slug=r_data["slug"],
                descripcion=r_data["descripcion"],
                es_sistema=r_data["es_sistema"],
                activo=True
            )
            rol.permisos = r_data["permisos"]
            db.add(rol)
            await db.flush()
        else:
            # Sincronizar nuevos permisos en roles configurados
            current_perm_ids = {p.id for p in rol.permisos}
            for p in r_data["permisos"]:
                if p.id not in current_perm_ids:
                    rol.permisos.append(p)
        roles_map[r_data["slug"]] = rol

    # 3. Crear Empresa Inicial
    stmt_emp = select(Empresa).where(
        or_(
            Empresa.identificacion_fiscal == "J-40982314-0",
            Empresa.nombre.in_(["PyCore Corporation C.A.", "Centro Médico MedFlow C.A."])
        )
    )
    res_emp = await db.execute(stmt_emp)
    empresa = res_emp.scalars().first()
    default_pais = paises_map.get("VE")
    default_pais_id = default_pais.id if default_pais else None

    if not empresa:
        empresa = Empresa(
            nombre="PyCore Corporation C.A.",
            identificacion_fiscal="J-40982314-0",
            email="contacto@pycore.com",
            telefono="+58 212 555-0199",
            direccion="Av. Principal de las Mercedes, Torre Empresarial Titanium, Piso 5",
            pais_id=default_pais_id,
            pais_telefono_id=default_pais_id,
            activo=True
        )
        db.add(empresa)
        await db.flush()
    else:
        if empresa.nombre == "Centro Médico MedFlow C.A.":
            empresa.nombre = "PyCore Corporation C.A."
            empresa.email = "contacto@pycore.com"
        if not empresa.pais_id:
            empresa.pais_id = default_pais_id
            empresa.pais_telefono_id = default_pais_id
            await db.flush()

    # 4. Crear Sucursales Iniciales
    stmt_suc1 = select(Sucursal).where(Sucursal.codigo == "SC-01")
    res_suc1 = await db.execute(stmt_suc1)
    sucursal1 = res_suc1.scalar_one_or_none()
    if not sucursal1:
        sucursal1 = Sucursal(
            empresa_id=empresa.id,
            pais_telefono_id=default_pais_id,
            nombre="Sede Central - Torre Principal",
            codigo="SC-01",
            telefono="+58 212 555-0101",
            direccion="Av. Principal de las Mercedes, Piso 5, Caracas",
            ciudad="Caracas",
            activo=True
        )
        db.add(sucursal1)
        await db.flush()
    else:
        if not sucursal1.pais_telefono_id:
            sucursal1.pais_telefono_id = default_pais_id
            await db.flush()

    # 5. Crear Usuarios Demostrativos
    for email_adm in ["admin@pycore.com", "admin@plataforma.com", "admin@medflow.com"]:
        stmt_u = select(Usuario).where(Usuario.email == email_adm)
        res_u = await db.execute(stmt_u)
        user = res_u.scalar_one_or_none()
        if not user:
            user = Usuario(
                nombre="Administrador",
                apellido="Principal" if "plataforma" in email_adm else "Sistema",
                email=email_adm,
                password_hash=get_password_hash("Admin1234*"),
                es_superadmin=True,
                rol_id=roles_map["superadmin"].id,
                empresa_id=empresa.id,
                sucursal_defecto_id=sucursal1.id,
                pais_telefono_id=default_pais_id,
                activo=True
            )
            db.add(user)
            await db.flush()
        else:
            if not user.pais_telefono_id:
                user.pais_telefono_id = default_pais_id
                await db.flush()

        stmt_asig = select(UsuarioSucursal).where(
            UsuarioSucursal.usuario_id == user.id,
            UsuarioSucursal.sucursal_id == sucursal1.id
        )
        res_asig = await db.execute(stmt_asig)
        if not res_asig.first():
            asig = UsuarioSucursal(usuario_id=user.id, sucursal_id=sucursal1.id)
            db.add(asig)

    # 6. Sembrar Catálogo Oficial de Especialidades Médicas y Plantillas Clínicas
    for esp_def in CATALOGO_ESPECIALIDADES_OFICIALES:
        stmt_esp = select(Especialidad).where(
            Especialidad.empresa_id == empresa.id,
            func.lower(Especialidad.nombre) == esp_def["nombre"].lower()
        )
        res_esp = await db.execute(stmt_esp)
        esp = res_esp.scalar_one_or_none()

        if not esp:
            esp = Especialidad(
                empresa_id=empresa.id,
                sucursal_id=None,
                nombre=esp_def["nombre"],
                codigo=esp_def["codigo"],
                descripcion=esp_def["descripcion"],
                color=esp_def["color"],
                icono=esp_def["icono"],
                activo=True
            )
            db.add(esp)
            await db.flush()
        else:
            if not esp.codigo:
                esp.codigo = esp_def["codigo"]
            if not esp.descripcion:
                esp.descripcion = esp_def["descripcion"]
            if esp_def.get("color"):
                esp.color = esp_def["color"]
            if esp_def.get("icono"):
                esp.icono = esp_def["icono"]

        # Asegurar plantilla clínica para cada especialidad
        stmt_p = select(EspecialidadPlantilla).where(
            EspecialidadPlantilla.especialidad_id == esp.id,
            EspecialidadPlantilla.empresa_id == empresa.id
        )
        res_p = await db.execute(stmt_p)
        plantilla = res_p.scalar_one_or_none()

        sugerencia = get_template_for_specialty(esp.nombre)
        if not plantilla:
            plantilla = EspecialidadPlantilla(
                empresa_id=empresa.id,
                especialidad_id=esp.id,
                esquema_preconsulta=sugerencia.get("esquema_preconsulta", []),
                esquema_consulta=sugerencia.get("esquema_consulta", []),
                widgets_activos=sugerencia.get("widgets_activos", []),
                version=1,
                activo=True
            )
            db.add(plantilla)

    await db.commit()
