"""
Script Seeder para la creación de Médicos Especialistas y sus Usuarios de Acceso
para cada una de las especialidades médicas del sistema Medisoft.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, func, or_
from app.core.database import AsyncSessionLocal, ensure_tables_exist
from app.core.security import get_password_hash
from app.models.empresa import Empresa
from app.models.sucursal import Sucursal
from app.models.pais import Pais
from app.models.rol import Rol
from app.models.usuario import Usuario, UsuarioSucursal
from app.models.especialidad import Especialidad
from app.models.medico import Medico

PASSWORD_POR_DEFECTO = "Doctor2026*"

HORARIO_SEMANAL_DEFAULT = [
    {"dia": 1, "nombre": "Lunes", "activo": True, "inicio": "08:00", "fin": "16:00"},
    {"dia": 2, "nombre": "Martes", "activo": True, "inicio": "08:00", "fin": "16:00"},
    {"dia": 3, "nombre": "Miércoles", "activo": True, "inicio": "08:00", "fin": "16:00"},
    {"dia": 4, "nombre": "Jueves", "activo": True, "inicio": "08:00", "fin": "16:00"},
    {"dia": 5, "nombre": "Viernes", "activo": True, "inicio": "08:00", "fin": "16:00"},
    {"dia": 6, "nombre": "Sábado", "activo": False, "inicio": "08:00", "fin": "13:00"},
    {"dia": 0, "nombre": "Domingo", "activo": False, "inicio": "08:00", "fin": "12:00"},
]

# Directorio de los 16 Médicos Especialistas
DIRECTORIO_MEDICOS = [
    {
        "codigo_esp": "MED-GEN",
        "nombres": "Carlos Alberto",
        "apellidos": "Mendoza Rivas",
        "documento_identidad": "V-14829301",
        "email": "dr.carlos.mendoza@medisoft.com",
        "telefono": "+58 412-5550101",
        "licencia_medica": "MPPS-54210 / CM-12840",
        "color": "#0d9488",
        "biografia": "Médico Cirujano con más de 12 años de experiencia en medicina preventiva, control de pacientes crónicos y atención primaria integral.",
        "subespecialidades": [
            {"id": "sub_gen_1", "nombre": "Atención Primaria y Salud Integral", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 10, "certificado_folio": "CERT-MEDGEN-2016"},
            {"id": "sub_gen_2", "nombre": "Manejo de Enfermedades Crónicas No Transmisibles", "nivel_experiencia": "Especialista Senior (8+ años)", "anos_servicio": 8, "certificado_folio": "CERT-CRON-2018"}
        ]
    },
    {
        "codigo_esp": "GIN-OBS",
        "nombres": "Elena María",
        "apellidos": "Paredes Salazar",
        "documento_identidad": "V-16920412",
        "email": "dra.elena.paredes@medisoft.com",
        "telefono": "+58 414-5550102",
        "licencia_medica": "MPPS-61405 / CM-15920",
        "color": "#e11d48",
        "biografia": "Gineco-Obstetra egresada con honores, especialista en ecografía fetal de alta resolución, control prenatal y salud integral femenina.",
        "subespecialidades": [
            {"id": "sub_gin_1", "nombre": "Ultrasonido y Medicina Materno-Fetal", "nivel_experiencia": "Especialista Senior (8+ años)", "anos_servicio": 9, "certificado_folio": "CERT-USG-2017"},
            {"id": "sub_gin_2", "nombre": "Colposcopia y Patología del Tracto Genital", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 6, "certificado_folio": "CERT-COLP-2020"}
        ]
    },
    {
        "codigo_esp": "ORL-01",
        "nombres": "Marcos Antonio",
        "apellidos": "Rangel Peña",
        "documento_identidad": "V-15382910",
        "email": "dr.marcos.rangel@medisoft.com",
        "telefono": "+58 416-5550103",
        "licencia_medica": "MPPS-58920 / CM-14205",
        "color": "#f59e0b",
        "biografia": "Otorrinolaringólogo enfocado en rinología quirúrgica, cirugía endoscópica de senos paranasales y trastornos del sueño y fonación.",
        "subespecialidades": [
            {"id": "sub_orl_1", "nombre": "Cirugía Endoscópica Nasosinusal", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 7, "certificado_folio": "CERT-CENS-2019"},
            {"id": "sub_orl_2", "nombre": "Audiología y Otología Quirúrgica", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 5, "certificado_folio": "CERT-OTO-2021"}
        ]
    },
    {
        "codigo_esp": "MED-OCU",
        "nombres": "Patricia Elena",
        "apellidos": "Silva Benítez",
        "documento_identidad": "V-17482938",
        "email": "dra.patricia.silva@medisoft.com",
        "telefono": "+58 424-5550104",
        "licencia_medica": "MPPS-67890 / CM-18450",
        "color": "#4b5563",
        "biografia": "Especialista en Medicina Ocupacional y Medio Ambiente Laboral, experta en ergonomía, exámenes pre y post-empleo e higiene industrial.",
        "subespecialidades": [
            {"id": "sub_ocu_1", "nombre": "Ergonomía y Evaluación de Puestos de Trabajo", "nivel_experiencia": "Especialista Senior (8+ años)", "anos_servicio": 11, "certificado_folio": "CERT-ERGO-2015"},
            {"id": "sub_ocu_2", "nombre": "Toxicología Laboral y Salud Preventiva", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 6, "certificado_folio": "CERT-TOX-2020"}
        ]
    },
    {
        "codigo_esp": "CIR-MAN",
        "nombres": "Fernando José",
        "apellidos": "Briceño Castro",
        "documento_identidad": "V-13829410",
        "email": "dr.fernando.briceno@medisoft.com",
        "telefono": "+58 412-5550105",
        "licencia_medica": "MPPS-50123 / CM-11490",
        "color": "#6366f1",
        "biografia": "Cirujano ortopédico y reconstructivo de mano y miembro superior, con formación en microcirugía de nervios periféricos y lesiones traumáticas.",
        "subespecialidades": [
            {"id": "sub_man_1", "nombre": "Microcirugía Reconstructiva de Nervio Periférico", "nivel_experiencia": "Especialista Senior (8+ años)", "anos_servicio": 12, "certificado_folio": "CERT-MIC-2014"},
            {"id": "sub_man_2", "nombre": "Artroscopia de Muñeca y Pequeñas Articulaciones", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 7, "certificado_folio": "CERT-ARTMAN-2019"}
        ]
    },
    {
        "codigo_esp": "GASTRO-01",
        "nombres": "Laura Sofía",
        "apellidos": "Morales Quintero",
        "documento_identidad": "V-18293041",
        "email": "dra.laura.morales@medisoft.com",
        "telefono": "+58 414-5550106",
        "licencia_medica": "MPPS-70234 / CM-19830",
        "color": "#ea580c",
        "biografia": "Gastroenteróloga y Endoscopista terapéutica, especializada en diagnóstico de patologías gastroduodenales, enfermedad inflamatoria intestinal y colonoscopia preventiva.",
        "subespecialidades": [
            {"id": "sub_gas_1", "nombre": "Endoscopia Digestiva Alta y Colonoscopia", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 6, "certificado_folio": "CERT-ENDO-2020"},
            {"id": "sub_gas_2", "nombre": "Enfermedad Inflamatoria Intestinal y Hepatología", "nivel_experiencia": "Especialista Junior (1-3 años)", "anos_servicio": 3, "certificado_folio": "CERT-EII-2023"}
        ]
    },
    {
        "codigo_esp": "CIR-PED",
        "nombres": "Andrés Eduardo",
        "apellidos": "Villalobos Gil",
        "documento_identidad": "V-15940283",
        "email": "dr.andres.villalobos@medisoft.com",
        "telefono": "+58 416-5550107",
        "licencia_medica": "MPPS-59840 / CM-14902",
        "color": "#06b6d4",
        "biografia": "Cirujano Pediátrico dedicado a la cirugía neonatal, corrección de malformaciones congénitas y abordajes laparoscópicos de mínima invasión en infantes.",
        "subespecialidades": [
            {"id": "sub_cped_1", "nombre": "Cirugía Neonatal de Alta Complejidad", "nivel_experiencia": "Especialista Senior (8+ años)", "anos_servicio": 10, "certificado_folio": "CERT-NEO-2016"},
            {"id": "sub_cped_2", "nombre": "Laparoscopia Pediátrica Mínimamente Invasiva", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 6, "certificado_folio": "CERT-LAPP-2020"}
        ]
    },
    {
        "codigo_esp": "MED-INT",
        "nombres": "Gabriela Isabel",
        "apellidos": "Fuentes Romero",
        "documento_identidad": "V-16829103",
        "email": "dra.gabriela.fuentes@medisoft.com",
        "telefono": "+58 424-5550108",
        "licencia_medica": "MPPS-64190 / CM-16830",
        "color": "#2563eb",
        "biografia": "Médico Internista con sólida trayectoria hospitalaria, experta en diagnóstico de casos complejos, patología metabólica, hipertensión y medicina perioperatoria.",
        "subespecialidades": [
            {"id": "sub_int_1", "nombre": "Riesgo Cardiovascular y Medicina Perioperatoria", "nivel_experiencia": "Especialista Senior (8+ años)", "anos_servicio": 9, "certificado_folio": "CERT-RCV-2017"},
            {"id": "sub_int_2", "nombre": "Cuidados Críticos y Soporte Metabólico", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 5, "certificado_folio": "CERT-CCM-2021"}
        ]
    },
    {
        "codigo_esp": "CIR-GEN",
        "nombres": "Ricardo Javier",
        "apellidos": "Gómez Montilla",
        "documento_identidad": "V-14293810",
        "email": "dr.ricardo.gomez@medisoft.com",
        "telefono": "+58 412-5550109",
        "licencia_medica": "MPPS-52840 / CM-12900",
        "color": "#dc2626",
        "biografia": "Cirujano General especializado en cirugía laparoscópica de vesícula, hernias complejas de pared abdominal y urgencias quirúrgicas abdominales.",
        "subespecialidades": [
            {"id": "sub_cgen_1", "nombre": "Cirugía Laparoscópica Gastrointestinal", "nivel_experiencia": "Especialista Senior (8+ años)", "anos_servicio": 11, "certificado_folio": "CERT-LAP-2015"},
            {"id": "sub_cgen_2", "nombre": "Reconstrucción Compleja de Pared Abdominal", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 7, "certificado_folio": "CERT-HERN-2019"}
        ]
    },
    {
        "codigo_esp": "ENDOCR-01",
        "nombres": "Valentina Paz",
        "apellidos": "Ortiz Blanco",
        "documento_identidad": "V-17829104",
        "email": "dra.valentina.ortiz@medisoft.com",
        "telefono": "+58 414-5550110",
        "licencia_medica": "MPPS-68930 / CM-18920",
        "color": "#d97706",
        "biografia": "Endocrinóloga clínica orientada al control integral de diabetes mellitus tipo 1 y 2, trastornos tiroideos, síndrome metabólico y patología hipofisaria.",
        "subespecialidades": [
            {"id": "sub_end_1", "nombre": "Diabetes Mellitus y Tecnologías de Monitoreo Continuo", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 7, "certificado_folio": "CERT-DIAB-2019"},
            {"id": "sub_end_2", "nombre": "Patología Nodular Tiroidea y Ecografía de Cuello", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 5, "certificado_folio": "CERT-TIR-2021"}
        ]
    },
    {
        "codigo_esp": "TRAUMA-01",
        "nombres": "Javier Alejandro",
        "apellidos": "Domínguez Vera",
        "documento_identidad": "V-15820491",
        "email": "dr.javier.dominguez@medisoft.com",
        "telefono": "+58 416-5550111",
        "licencia_medica": "MPPS-59480 / CM-14810",
        "color": "#7c3aed",
        "biografia": "Traumatólogo y Ortopedista enfocado en cirugía articular, artroscopia diagnóstica y terapéutica de rodilla y hombro, y medicina deportiva.",
        "subespecialidades": [
            {"id": "sub_tra_1", "nombre": "Artroscopia y Reconstrucción Ligamentaria de Rodilla", "nivel_experiencia": "Especialista Senior (8+ años)", "anos_servicio": 9, "certificado_folio": "CERT-ARTRO-2017"},
            {"id": "sub_tra_2", "nombre": "Traumatología Deportiva y Reemplazos Articulares", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 6, "certificado_folio": "CERT-DEPO-2020"}
        ]
    },
    {
        "codigo_esp": "NEFRO-01",
        "nombres": "Mariana Carolina",
        "apellidos": "Cordero Vielma",
        "documento_identidad": "V-16492019",
        "email": "dra.mariana.cordero@medisoft.com",
        "telefono": "+58 424-5550112",
        "licencia_medica": "MPPS-62940 / CM-16120",
        "color": "#0891b2",
        "biografia": "Nefróloga clínica dedicada a la prevención y manejo de la enfermedad renal crónica, hipertensión arterial secundaria y terapias de diálisis.",
        "subespecialidades": [
            {"id": "sub_nef_1", "nombre": "Hemodiálisis y Diálisis Peritoneal", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 8, "certificado_folio": "CERT-DIAL-2018"},
            {"id": "sub_nef_2", "nombre": "Hipertensión Renovascular y Glomerulopatías", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 5, "certificado_folio": "CERT-GLOM-2021"}
        ]
    },
    {
        "codigo_esp": "PED-01",
        "nombres": "Sofía Victoria",
        "apellidos": "Valenzuela Medina",
        "documento_identidad": "V-18920194",
        "email": "dra.sofia.valenzuela@medisoft.com",
        "telefono": "+58 412-5550113",
        "licencia_medica": "MPPS-72940 / CM-20840",
        "color": "#ec4899",
        "biografia": "Pediatra Puericultora dedicada al cuidado integral del recién nacido, lactante y adolescente, inmunizaciones, crecimiento y nutrición infantil.",
        "subespecialidades": [
            {"id": "sub_ped_1", "nombre": "Puericultura y Crecimiento y Desarrollo", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 6, "certificado_folio": "CERT-PUER-2020"},
            {"id": "sub_ped_2", "nombre": "Inmunizaciones y Vacunología Pediátrica", "nivel_experiencia": "Especialista Junior (1-3 años)", "anos_servicio": 3, "certificado_folio": "CERT-VAC-2023"}
        ]
    },
    {
        "codigo_esp": "URO-01",
        "nombres": "Manuel Vicente",
        "apellidos": "Delgado Herrera",
        "documento_identidad": "V-13920148",
        "email": "dr.manuel.delgado@medisoft.com",
        "telefono": "+58 414-5550114",
        "licencia_medica": "MPPS-50920 / CM-11840",
        "color": "#10b981",
        "biografia": "Urólogo con amplia experiencia en endourología láser para litiasis renal, cirugía prostática mínimamente invasiva y urología oncológica.",
        "subespecialidades": [
            {"id": "sub_uro_1", "nombre": "Endourología Láser y Litotricia Flexible", "nivel_experiencia": "Especialista Senior (8+ años)", "anos_servicio": 11, "certificado_folio": "CERT-ENDO-2015"},
            {"id": "sub_uro_2", "nombre": "Urología Oncológica (Próstata, Riñón y Vejiga)", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 7, "certificado_folio": "CERT-UONC-2019"}
        ]
    },
    {
        "codigo_esp": "ODONT-01",
        "nombres": "Camila Andrea",
        "apellidos": "Restrepo Barrios",
        "documento_identidad": "V-17920481",
        "email": "dra.camila.restrepo@medisoft.com",
        "telefono": "+58 416-5550115",
        "licencia_medica": "COV-18492 / MS-8920",
        "color": "#0284c7",
        "biografia": "Odontóloga especialista en rehabilitación oral y estética dental, diseño de sonrisa, prótesis fija y endodoncia mecanizada con odontograma digital.",
        "subespecialidades": [
            {"id": "sub_odo_1", "nombre": "Rehabilitación Oral y Estética Dental", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 7, "certificado_folio": "CERT-ESTET-2019"},
            {"id": "sub_odo_2", "nombre": "Endodoncia Mecanizada y Microscopía Dental", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 5, "certificado_folio": "CERT-ENDO-2021"}
        ]
    },
    {
        "codigo_esp": "OFTAL-01",
        "nombres": "Alejandro Ramón",
        "apellidos": "Guzmán Albarrán",
        "documento_identidad": "V-15204918",
        "email": "dr.alejandro.guzman@medisoft.com",
        "telefono": "+58 424-5550116",
        "licencia_medica": "MPPS-58490 / CMO-14920",
        "color": "#3b82f6",
        "biografia": "Médico Oftalmólogo especialista en cirugía refractiva láser, facoemulsificación de catarata, gabinete de refracción óptica y superficie ocular.",
        "subespecialidades": [
            {"id": "sub_oft_1", "nombre": "Córnea, Cirugía Refractiva y Superficie Ocular", "nivel_experiencia": "Especialista Senior (8+ años)", "anos_servicio": 10, "certificado_folio": "CERT-REFR-2016"},
            {"id": "sub_oft_2", "nombre": "Cirugía de Catarata con Lentes Intraoculares Premium", "nivel_experiencia": "Especialista Titular (4-8 años)", "anos_servicio": 7, "certificado_folio": "CERT-FACO-2019"}
        ]
    },
]

async def seed_medicos_all():
    print("================================================================================")
    print("           SIEMBRA DE MÉDICOS ESPECIALISTAS Y USUARIOS DE ACCESO                ")
    print("================================================================================")
    await ensure_tables_exist()

    async with AsyncSessionLocal() as db:
        # 1. Obtener Empresa Destino
        res_emp = await db.execute(select(Empresa).limit(1))
        empresa = res_emp.scalar_one_or_none()
        if not empresa:
            print("ERROR: No existe ninguna empresa registrada. Ejecute primero el seeder principal.")
            return

        print(f"Empresa destino: ID {empresa.id} | {empresa.nombre}")

        # 2. Obtener Sucursal por defecto
        res_suc = await db.execute(select(Sucursal).where(Sucursal.empresa_id == empresa.id).limit(1))
        sucursal = res_suc.scalar_one_or_none()
        if not sucursal:
            # Buscar cualquier sucursal
            res_suc_any = await db.execute(select(Sucursal).limit(1))
            sucursal = res_suc_any.scalar_one_or_none()

        sucursal_id = sucursal.id if sucursal else None
        print(f"Sucursal asignada: ID {sucursal_id} | {sucursal.nombre if sucursal else 'Sin sucursal'}")

        # 3. Obtener País por defecto
        res_pais = await db.execute(select(Pais).where(Pais.codigo_iso2 == "VE").limit(1))
        pais = res_pais.scalar_one_or_none()
        if not pais:
            res_pais_any = await db.execute(select(Pais).limit(1))
            pais = res_pais_any.scalar_one_or_none()
        pais_id = pais.id if pais else None

        # 4. Obtener Rol de Médico
        res_rol = await db.execute(select(Rol).where(Rol.slug == "medico").limit(1))
        rol_medico = res_rol.scalar_one_or_none()
        if not rol_medico:
            # Fallback a cualquier rol
            res_rol_fb = await db.execute(select(Rol).where(Rol.slug != "superadmin").limit(1))
            rol_medico = res_rol_fb.scalar_one_or_none()

        if not rol_medico:
            print("ERROR: No se encontró el rol de médico en la base de datos.")
            return

        print(f"Rol asignado a los usuarios médicos: ID {rol_medico.id} ({rol_medico.nombre})")
        print("--------------------------------------------------------------------------------")

        # 5. Obtener todas las especialidades activas de la empresa
        res_esps = await db.execute(select(Especialidad).where(Especialidad.empresa_id == empresa.id))
        especialidades = res_esps.scalars().all()
        esps_por_codigo = {e.codigo: e for e in especialidades if e.codigo}
        esps_por_nombre = {e.nombre.lower().strip(): e for e in especialidades}

        total_creados = 0
        total_actualizados = 0
        password_hash_default = get_password_hash(PASSWORD_POR_DEFECTO)

        resumen_creados = []

        for m_def in DIRECTORIO_MEDICOS:
            # Buscar la especialidad correspondiente
            esp = esps_por_codigo.get(m_def["codigo_esp"])
            if not esp:
                # Intentar por nombre similar
                for k, v in esps_por_nombre.items():
                    if m_def["codigo_esp"].lower() in k or k in m_def["codigo_esp"].lower():
                        esp = v
                        break

            if not esp:
                print(f"[!] ADVERTENCIA: Especialidad {m_def['codigo_esp']} no encontrada en BD. Se omite {m_def['nombres']} {m_def['apellidos']}.")
                continue

            email_limpio = m_def["email"].lower().strip()

            # 5.1 Buscar o crear Usuario de Acceso
            stmt_u = select(Usuario).where(func.lower(Usuario.email) == email_limpio)
            res_u = await db.execute(stmt_u)
            usuario = res_u.scalar_one_or_none()

            if not usuario:
                usuario = Usuario(
                    empresa_id=empresa.id,
                    sucursal_defecto_id=sucursal_id,
                    rol_id=rol_medico.id,
                    pais_telefono_id=pais_id,
                    nombre=m_def["nombres"].strip(),
                    apellido=m_def["apellidos"].strip(),
                    email=email_limpio,
                    password_hash=password_hash_default,
                    telefono=m_def["telefono"],
                    activo=True,
                    es_superadmin=False,
                    whatsapp_verified=True,
                    whatsapp_otp_code=None,
                    whatsapp_otp_expires_at=None
                )
                db.add(usuario)
                await db.flush()

                # Asignar sucursal en usuario_sucursales
                if sucursal_id:
                    asig = UsuarioSucursal(usuario_id=usuario.id, sucursal_id=sucursal_id)
                    db.add(asig)
                    await db.flush()
            else:
                # Asegurar que tenga rol de médico, contraseña vigente y verificación de WhatsApp/OTP activa
                usuario.rol_id = rol_medico.id
                usuario.password_hash = password_hash_default
                usuario.activo = True
                usuario.whatsapp_verified = True
                usuario.whatsapp_otp_code = None
                usuario.whatsapp_otp_expires_at = None
                await db.flush()

            # 5.2 Buscar o crear Médico
            stmt_m = select(Medico).where(
                or_(
                    func.lower(Medico.email) == email_limpio,
                    Medico.documento_identidad == m_def["documento_identidad"],
                    Medico.usuario_id == usuario.id
                )
            )
            res_m = await db.execute(stmt_m)
            medico = res_m.scalar_one_or_none()

            sucursales_list = [sucursal_id] if sucursal_id else []

            if not medico:
                medico = Medico(
                    empresa_id=empresa.id,
                    usuario_id=usuario.id,
                    especialidad_id=esp.id,
                    pais_telefono_id=pais_id,
                    sucursal_defecto_id=sucursal_id,
                    nombres=m_def["nombres"],
                    apellidos=m_def["apellidos"],
                    tipo_documento="V",
                    documento_identidad=m_def["documento_identidad"],
                    email=email_limpio,
                    telefono=m_def["telefono"],
                    licencia_medica=m_def["licencia_medica"],
                    color=m_def["color"],
                    biografia=m_def["biografia"],
                    subespecialidades=m_def["subespecialidades"],
                    sucursales_ids=sucursales_list,
                    horario_atencion=HORARIO_SEMANAL_DEFAULT,
                    activo=True
                )
                db.add(medico)
                await db.flush()
                total_creados += 1
                estado = "NUEVO"
            else:
                medico.usuario_id = usuario.id
                medico.especialidad_id = esp.id
                medico.nombres = m_def["nombres"]
                medico.apellidos = m_def["apellidos"]
                medico.licencia_medica = m_def["licencia_medica"]
                medico.color = m_def["color"]
                medico.biografia = m_def["biografia"]
                medico.subespecialidades = m_def["subespecialidades"]
                medico.sucursales_ids = sucursales_list
                medico.horario_atencion = HORARIO_SEMANAL_DEFAULT
                medico.activo = True
                await db.flush()
                total_actualizados += 1
                estado = "ACTUALIZADO"

            print(f"[{estado}] Dr(a). {m_def['nombres']} {m_def['apellidos']} -> {esp.nombre} ({m_def['codigo_esp']})")
            print(f"         Email: {email_limpio} | Clave: {PASSWORD_POR_DEFECTO} | Usuario ID: {usuario.id}")

            resumen_creados.append({
                "especialidad": esp.nombre,
                "codigo": esp.codigo,
                "doctor": f"{'Dr.' if 'Carlos' in m_def['nombres'] or 'Marcos' in m_def['nombres'] or 'Fernando' in m_def['nombres'] or 'Andrés' in m_def['nombres'] or 'Ricardo' in m_def['nombres'] or 'Javier' in m_def['nombres'] or 'Manuel' in m_def['nombres'] or 'Alejandro' in m_def['nombres'] else 'Dra.'} {m_def['nombres']} {m_def['apellidos']}",
                "email": email_limpio,
                "password": PASSWORD_POR_DEFECTO,
                "cedula": m_def["documento_identidad"],
                "licencia": m_def["licencia_medica"]
            })

        await db.commit()
        print("--------------------------------------------------------------------------------")
        print(f"PROCESO FINALIZADO CON ÉXITO: {total_creados} creados, {total_actualizados} actualizados.")
        print(f"Total Médicos Operativos: {total_creados + total_actualizados}")
        print("================================================================================")
        return resumen_creados

if __name__ == "__main__":
    asyncio.run(seed_medicos_all())
