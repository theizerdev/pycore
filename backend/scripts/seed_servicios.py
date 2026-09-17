"""
Script Seeder para la creación del Catálogo Maestro de Tipos de Servicio Clínico
para cada una de las 16 especialidades médicas en Medisoft.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, func, or_
from app.core.database import AsyncSessionLocal, ensure_tables_exist
from app.models.empresa import Empresa
from app.models.sucursal import Sucursal
from app.models.especialidad import Especialidad
from app.models.servicio import Servicio

# Catálogo exhaustivo de servicios clínicos por código de especialidad
CATALOGO_SERVICIOS_POR_ESPECIALIDAD = {
    # 1. Medicina General
    "MED-GEN": [
        {
            "codigo": "SRV-GEN-01",
            "nombre": "Consulta Médica General (Primera Vez)",
            "descripcion": "Evaluación médica integral para diagnóstico, chequeo clínico y plan terapéutico inicial.",
            "categoria": "Consulta",
            "precio_base": 30.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Traer informes y estudios previos si dispone.",
            "color": "#0d9488",
        },
        {
            "codigo": "SRV-GEN-02",
            "nombre": "Consulta de Control / Seguimiento",
            "descripcion": "Revisión de evolución clínica, respuesta al tratamiento y lectura de exámenes de laboratorio.",
            "categoria": "Consulta",
            "precio_base": 20.00,
            "duracion_estimada_minutos": 20,
            "preparacion_requerida": "Traer resultados de los exámenes solicitados en la consulta previa.",
            "color": "#0d9488",
        },
        {
            "codigo": "SRV-GEN-03",
            "nombre": "Chequeo Preventivo Integral (Check-Up)",
            "descripcion": "Evaluación preventiva exhaustiva de salud, cribado cardiovascular y metabólico.",
            "categoria": "Estudio",
            "precio_base": 45.00,
            "duracion_estimada_minutos": 45,
            "preparacion_requerida": "Acudir en ayunas de 8 a 10 horas si incluye toma de muestras.",
            "color": "#0d9488",
        },
        {
            "codigo": "SRV-GEN-04",
            "nombre": "Certificado Médico de Salud Integral",
            "descripcion": "Examen clínico para expedición de certificado de salud vial, escolar o laboral.",
            "categoria": "Consulta",
            "precio_base": 25.00,
            "duracion_estimada_minutos": 25,
            "preparacion_requerida": "Traer tipo de sangre comprobado y documento de identidad.",
            "color": "#0d9488",
        },
    ],

    # 2. Ginecología y Obstetricia
    "GIN-OBS": [
        {
            "codigo": "SRV-GIN-01",
            "nombre": "Consulta Ginecológica Integral + Citología (Papanicolaou)",
            "descripcion": "Examen ginecológico completo, palpación mamaria y toma de muestra para citología cervical.",
            "categoria": "Consulta",
            "precio_base": 50.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Evitar relaciones sexuales, duchas o tratamientos vaginales 48 horas antes. No estar menstruando.",
            "color": "#e11d48",
        },
        {
            "codigo": "SRV-GIN-02",
            "nombre": "Control Prenatal y Monitoreo Fetal",
            "descripcion": "Seguimiento periódico del embarazo, medición de altura uterina, auscultación de FCF y analítica.",
            "categoria": "Consulta",
            "precio_base": 45.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Traer cartilla prenatal y ecografías previas.",
            "color": "#e11d48",
        },
        {
            "codigo": "SRV-GIN-03",
            "nombre": "Ecosonograma Ginecológico / Pélvico Transvaginal",
            "descripcion": "Evaluación ecográfica de alta resolución de útero, endometrio y anexos ováricos.",
            "categoria": "Estudio",
            "precio_base": 40.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Vejiga vacía para ultrasonido transvaginal.",
            "color": "#e11d48",
        },
        {
            "codigo": "SRV-GIN-04",
            "nombre": "Ecosonograma Obstétrico Morfológico / Doppler",
            "descripcion": "Estudio ultrasonográfico anatómico detallado y evaluación de flujometría fetal.",
            "categoria": "Estudio",
            "precio_base": 65.00,
            "duracion_estimada_minutos": 45,
            "preparacion_requerida": "Hidratación adecuada previa al estudio.",
            "color": "#e11d48",
        },
        {
            "codigo": "SRV-GIN-05",
            "nombre": "Colposcopia y Biopsia de Cérvix",
            "descripcion": "Examen con colposcopio óptico y tinción con ácido acético/Lugol ante citología alterada.",
            "categoria": "Procedimiento",
            "precio_base": 60.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "No estar en período menstrual. Abstinencia sexual 48 horas.",
            "color": "#e11d48",
        },
    ],

    # 3. Otorrinolaringología
    "ORL-01": [
        {
            "codigo": "SRV-ORL-01",
            "nombre": "Consulta Otorrinolaringológica Especializada",
            "descripcion": "Evaluación clínica de oído, fosas nasales, senos paranasales, faringe y laringe.",
            "categoria": "Consulta",
            "precio_base": 45.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "No aplicarse gotas óticas ni nasales el día de la cita.",
            "color": "#f59e0b",
        },
        {
            "codigo": "SRV-ORL-02",
            "nombre": "Nasofibrolaringoscopia Diagnóstica Flexible",
            "descripcion": "Exploración endoscópica de vías aerodigestivas superiores con fibra óptica de alta definición.",
            "categoria": "Procedimiento",
            "precio_base": 60.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Ayuno de al menos 2 horas previas a la exploración.",
            "color": "#f59e0b",
        },
        {
            "codigo": "SRV-ORL-03",
            "nombre": "Lavado de Oído / Extracción de Cerumen",
            "descripcion": "Limpieza y desimpactación ótica mediante lavado con agua tibia o microaspiración instrumental.",
            "categoria": "Procedimiento",
            "precio_base": 25.00,
            "duracion_estimada_minutos": 20,
            "preparacion_requerida": "Haber aplicado gotas cerumenolíticas los días previos si fue indicado.",
            "color": "#f59e0b",
        },
        {
            "codigo": "SRV-ORL-04",
            "nombre": "Audiometría Tonal y Logoaudiometría",
            "descripcion": "Estudio audiológico en cabina insonorizada para valorar umbrales auditivos y discriminación vocal.",
            "categoria": "Estudio",
            "precio_base": 40.00,
            "duracion_estimada_minutos": 40,
            "preparacion_requerida": "Oídos limpios sin tapones de cera obstructivos.",
            "color": "#f59e0b",
        },
    ],

    # 4. Medicina Ocupacional
    "MED-OCU": [
        {
            "codigo": "SRV-OCU-01",
            "nombre": "Evaluación Médica Pre-Empleo / Ingreso Laboral",
            "descripcion": "Examen de aptitud física y psicofisiológica para nuevo ingreso conforme a normativas de seguridad laboral.",
            "categoria": "Consulta",
            "precio_base": 35.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Traer perfil de analítica pre-empleo si fue solicitado.",
            "color": "#4b5563",
        },
        {
            "codigo": "SRV-OCU-02",
            "nombre": "Examen Médico Periódico / Ocupacional Anual",
            "descripcion": "Monitoreo anual de vigilancia de la salud de trabajadores expuestos a factores de riesgo laboral.",
            "categoria": "Consulta",
            "precio_base": 35.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Ropa cómoda.",
            "color": "#4b5563",
        },
        {
            "codigo": "SRV-OCU-03",
            "nombre": "Espirometría Clínica Ocupacional",
            "descripcion": "Prueba de función pulmonar para trabajadores expuestos a polvos, gases, humos o vapores.",
            "categoria": "Estudio",
            "precio_base": 30.00,
            "duracion_estimada_minutos": 25,
            "preparacion_requerida": "No fumar 4 horas antes. No haber tomado broncodilatadores recientemente.",
            "color": "#4b5563",
        },
    ],

    # 5. Cirugía de la Mano
    "CIR-MAN": [
        {
            "codigo": "SRV-MAN-01",
            "nombre": "Consulta Especializada de Cirugía de Mano y Miembro Superior",
            "descripcion": "Valoración de lesiones traumáticas, atrapamientos nerviosos, tendinopatías y deformidades.",
            "categoria": "Consulta",
            "precio_base": 50.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Traer radiografías, resonancias o electromiografías de la extremidad.",
            "color": "#6366f1",
        },
        {
            "codigo": "SRV-MAN-02",
            "nombre": "Infiltración Terapéutica Articular / Túnel Carpiano",
            "descripcion": "Infiltración ecoguiada o anatómica con corticoide/anestésico en túnel carpiano o dedos en gatillo.",
            "categoria": "Procedimiento",
            "precio_base": 45.00,
            "duracion_estimada_minutos": 20,
            "preparacion_requerida": "Zona limpia sin cremas ni lociones.",
            "color": "#6366f1",
        },
        {
            "codigo": "SRV-MAN-03",
            "nombre": "Inmovilización con Férula y Curación Compleja de Mano",
            "descripcion": "Colocación de férula específica para mano/muñeca y curación de heridas traumáticas o postquirúrgicas.",
            "categoria": "Procedimiento",
            "precio_base": 35.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "No manipular vendajes previos antes de la consulta.",
            "color": "#6366f1",
        },
    ],

    # 6. Gastroenterología
    "GASTRO-01": [
        {
            "codigo": "SRV-GAS-01",
            "nombre": "Consulta Gastroenterológica de Primera Vez",
            "descripcion": "Evaluación clínica de patologías esofágicas, gástricas, biliares, pancreáticas e intestinales.",
            "categoria": "Consulta",
            "precio_base": 50.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Llevar historial de medicamentos y estudios de imagen/laboratorio.",
            "color": "#ea580c",
        },
        {
            "codigo": "SRV-GAS-02",
            "nombre": "Endoscopia Digestiva Superior (Gastroscopia)",
            "descripcion": "Exploración endoscópica bajo sedación de esófago, estómago y duodeno con toma de biopsias.",
            "categoria": "Procedimiento",
            "precio_base": 120.00,
            "duracion_estimada_minutos": 45,
            "preparacion_requerida": "Ayuno estricto de 8 horas. Venir con acompañante adulto.",
            "color": "#ea580c",
        },
        {
            "codigo": "SRV-GAS-03",
            "nombre": "Colonoscopia Diagnóstica y Terapéutica",
            "descripcion": "Inspección endoscópica completa del colon y recto con opción a resección de pólipos (polipectomía).",
            "categoria": "Procedimiento",
            "precio_base": 160.00,
            "duracion_estimada_minutos": 60,
            "preparacion_requerida": "Preparación intestinal con solución evacuante el día previo. Ayuno total el día del estudio.",
            "color": "#ea580c",
        },
        {
            "codigo": "SRV-GAS-04",
            "nombre": "Test de Aliento para Helicobacter Pylori",
            "descripcion": "Prueba no invasiva de urea en aliento para detección de infección por H. Pylori.",
            "categoria": "Estudio",
            "precio_base": 35.00,
            "duracion_estimada_minutos": 25,
            "preparacion_requerida": "Ayuno de 6 horas. No haber tomado antibióticos ni omeprazol en las últimas 2 semanas.",
            "color": "#ea580c",
        },
    ],

    # 7. Cirugía Pediátrica
    "CIR-PED": [
        {
            "codigo": "SRV-CPED-01",
            "nombre": "Consulta de Valoración Quirúrgica Pediátrica",
            "descripcion": "Diagnóstico de hernias inguinales/umbilicales, fimosis, testículo no descendido y masas abdominales.",
            "categoria": "Consulta",
            "precio_base": 50.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Acompañado por padre, madre o tutor legal con carnet de vacunas.",
            "color": "#06b6d4",
        },
        {
            "codigo": "SRV-CPED-02",
            "nombre": "Control Postoperatorio Pediátrico y Retiro de Puntos",
            "descripcion": "Revisión de herida quirúrgica, retiro de suturas y alta postquirúrgica en niños.",
            "categoria": "Procedimiento",
            "precio_base": 30.00,
            "duracion_estimada_minutos": 20,
            "preparacion_requerida": "Zona de herida protegida y limpia.",
            "color": "#06b6d4",
        },
    ],

    # 8. Medicina Interna
    "MED-INT": [
        {
            "codigo": "SRV-INT-01",
            "nombre": "Consulta Médica Internista Especializada",
            "descripcion": "Atención integral del adulto con enfermedades multisistémicas, hipertensión, diabetes y dislipidemias.",
            "categoria": "Consulta",
            "precio_base": 50.00,
            "duracion_estimada_minutos": 35,
            "preparacion_requerida": "Traer receta y dosis de todos los fármacos de consumo habitual.",
            "color": "#2563eb",
        },
        {
            "codigo": "SRV-INT-02",
            "nombre": "Evaluación y Riesgo Cardiovascular Preoperatorio",
            "descripcion": "Estratificación de riesgo quirúrgico (Goldman / Lee) con electrocardiograma y recomendación anestésica.",
            "categoria": "Consulta",
            "precio_base": 45.00,
            "duracion_estimada_minutos": 35,
            "preparacion_requerida": "Traer analítica sanguínea reciente (tiempos de coagulación, hematología, química).",
            "color": "#2563eb",
        },
        {
            "codigo": "SRV-INT-03",
            "nombre": "Electrocardiograma de 12 Derivaciones (EKG)",
            "descripcion": "Trazado electrocardiográfico basal con informe interpretado por médico internista.",
            "categoria": "Estudio",
            "precio_base": 25.00,
            "duracion_estimada_minutos": 20,
            "preparacion_requerida": "Pecho descubierto, sin lociones ni cadenas metálicas.",
            "color": "#2563eb",
        },
    ],

    # 9. Cirugía General
    "CIR-GEN": [
        {
            "codigo": "SRV-CGEN-01",
            "nombre": "Consulta de Cirugía General y Valoración Quirúrgica",
            "descripcion": "Evaluación diagnóstica para cirugía de vesícula, hernias, apéndice y patología de partes blandas.",
            "categoria": "Consulta",
            "precio_base": 50.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Traer ecografías abdominales y estudios radiológicos previos.",
            "color": "#dc2626",
        },
        {
            "codigo": "SRV-CGEN-02",
            "nombre": "Cirugía Menor Ambulatoria (Lipomas / Quistes / Nevus)",
            "descripcion": "Procedimiento quirúrgico con anestesia local para resección de lesiones cutáneas y subcutáneas.",
            "categoria": "Cirugía",
            "precio_base": 75.00,
            "duracion_estimada_minutos": 45,
            "preparacion_requerida": "Firma de consentimiento informado. Zona de intervención limpia.",
            "color": "#dc2626",
        },
        {
            "codigo": "SRV-CGEN-03",
            "nombre": "Curación Compleja y Manejo de Heridas Quirúrgicas",
            "descripcion": "Debridamiento, curación avanzada y recambio de apósitos en heridas infectadas o dehiscentes.",
            "categoria": "Procedimiento",
            "precio_base": 35.00,
            "duracion_estimada_minutos": 25,
            "preparacion_requerida": "No tocar las gasas antes de la evaluación médica.",
            "color": "#dc2626",
        },
    ],

    # 10. Endocrinología
    "ENDOCR-01": [
        {
            "codigo": "SRV-END-01",
            "nombre": "Consulta Endocrinológica Integral (Tiroides y Diabetes)",
            "descripcion": "Diagnóstico y control de diabetes, hipo/hipertiroidismo, nódulos tiroideos y síndrome metabólico.",
            "categoria": "Consulta",
            "precio_base": 50.00,
            "duracion_estimada_minutos": 35,
            "preparacion_requerida": "Traer perfil tiroideo (TSH, T4L) y glicemia/HbA1c recientes.",
            "color": "#d97706",
        },
        {
            "codigo": "SRV-END-02",
            "nombre": "Ecografía de Tiroides y Cuello de Alta Resolución",
            "descripcion": "Estudio ultrasonográfico de parénquima tiroideo y clasificación TI-RADS de nódulos.",
            "categoria": "Estudio",
            "precio_base": 45.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Cuello descubierto sin collares.",
            "color": "#d97706",
        },
        {
            "codigo": "SRV-END-03",
            "nombre": "Control y Ajuste de Tratamiento Metabólico / Insulina",
            "descripcion": "Revisión de glucometrías continuas, titulación de insulina y plan de estilo de vida.",
            "categoria": "Consulta",
            "precio_base": 40.00,
            "duracion_estimada_minutos": 25,
            "preparacion_requerida": "Llevar cuaderno o reporte digital de glucometrías capilares.",
            "color": "#d97706",
        },
    ],

    # 11. Traumatología y Ortopedia
    "TRAUMA-01": [
        {
            "codigo": "SRV-TRA-01",
            "nombre": "Consulta Traumatológica y Ortopédica Especializada",
            "descripcion": "Evaluación osteoarticular, dolor de columna, rodilla, cadera, hombro y lesiones deportivas.",
            "categoria": "Consulta",
            "precio_base": 50.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Traer radiografías, resonancias magnéticas o tomografías previas.",
            "color": "#7c3aed",
        },
        {
            "codigo": "SRV-TRA-02",
            "nombre": "Infiltración Articular Terapéutica (Rodilla / Hombro)",
            "descripcion": "Infiltración intraarticular con corticoides de depósito o viscosuplementación con ácido hialurónico.",
            "categoria": "Procedimiento",
            "precio_base": 60.00,
            "duracion_estimada_minutos": 25,
            "preparacion_requerida": "Reposo relativo posterior al procedimiento.",
            "color": "#7c3aed",
        },
        {
            "codigo": "SRV-TRA-03",
            "nombre": "Inmovilización con Yeso o Férula / Reducción Cerrada",
            "descripcion": "Inmovilización ortopédica para esguinces, fisuras y fracturas no desplazadas.",
            "categoria": "Procedimiento",
            "precio_base": 40.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Ropa holgada que facilite el acceso a la extremidad afectada.",
            "color": "#7c3aed",
        },
    ],

    # 12. Nefrología
    "NEFRO-01": [
        {
            "codigo": "SRV-NEF-01",
            "nombre": "Consulta Nefrológica Especializada",
            "descripcion": "Diagnóstico y estadificación de enfermedad renal crónica, proteinuria, glomerulopatías y litiasis.",
            "categoria": "Consulta",
            "precio_base": 50.00,
            "duracion_estimada_minutos": 35,
            "preparacion_requerida": "Traer valores recientes de creatinina, urea, electrolitos y examen de orina.",
            "color": "#0891b2",
        },
        {
            "codigo": "SRV-NEF-02",
            "nombre": "Ecosonograma Renal y de Vías Urinarias",
            "descripcion": "Evaluación morfológica de parénquima renal, descartar hidronefrosis, quistes y cálculos.",
            "categoria": "Estudio",
            "precio_base": 45.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Ingerir 1 litro de agua 1 hora antes del estudio y mantener vejiga llena.",
            "color": "#0891b2",
        },
        {
            "codigo": "SRV-NEF-03",
            "nombre": "Control de Terapia Dialítica y Acceso Vascular",
            "descripcion": "Revisión clínica integral de pacientes en hemodiálisis o diálisis peritoneal.",
            "categoria": "Consulta",
            "precio_base": 45.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Traer cuaderno de control de pesos interdialíticos y presión arterial.",
            "color": "#0891b2",
        },
    ],

    # 13. Pediatría
    "PED-01": [
        {
            "codigo": "SRV-PED-01",
            "nombre": "Consulta Pediátrica Integral y Puericultura",
            "descripcion": "Atención médica preventiva y curativa del recién nacido, lactante, preescolar y adolescente.",
            "categoria": "Consulta",
            "precio_base": 40.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Traer cartilla de vacunación y registro de peso y talla previos.",
            "color": "#ec4899",
        },
        {
            "codigo": "SRV-PED-02",
            "nombre": "Control de Crecimiento y Desarrollo del Niño Sano",
            "descripcion": "Evaluación de percentiles de peso/talla, desarrollo psicomotor, alimentación complementaria y pautas de crianza.",
            "categoria": "Consulta",
            "precio_base": 35.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Ropa cómoda de fácil retiro para examen físico.",
            "color": "#ec4899",
        },
        {
            "codigo": "SRV-PED-03",
            "nombre": "Consulta Pediátrica de Urgencia / Cuadro Agudo",
            "descripcion": "Atención rápida de fiebre, procesos respiratorios agudos, gastroenteritis y alergias pediátricas.",
            "categoria": "Consulta",
            "precio_base": 45.00,
            "duracion_estimada_minutos": 25,
            "preparacion_requerida": "Acompañamiento obligatorio por tutor legal.",
            "color": "#ec4899",
        },
    ],

    # 14. Urología
    "URO-01": [
        {
            "codigo": "SRV-URO-01",
            "nombre": "Consulta Urológica Especializada y Despistaje Prostático",
            "descripcion": "Evaluación urológica, tacto rectal prostático, patologías testiculares, litiasis e incontinencia.",
            "categoria": "Consulta",
            "precio_base": 50.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Traer resultado de Antígeno Prostático Específico (PSA) si acude a control de próstata.",
            "color": "#10b981",
        },
        {
            "codigo": "SRV-URO-02",
            "nombre": "Uroflujometría Diagnóstica Computarizada",
            "descripcion": "Medición del caudal y volumen miccional para evaluar obstrucción por hiperplasia prostática.",
            "categoria": "Estudio",
            "precio_base": 40.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Acudir con deseos normales de orinar (vejiga moderadamente llena).",
            "color": "#10b981",
        },
        {
            "codigo": "SRV-URO-03",
            "nombre": "Ecosonograma Prostático y Vesical Pre y Post-Miccional",
            "descripcion": "Estudio ecográfico para medir tamaño de próstata y residuo urinario post-micción.",
            "categoria": "Estudio",
            "precio_base": 45.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Tomar 1 litro de agua 1 hora antes de la ecografía.",
            "color": "#10b981",
        },
        {
            "codigo": "SRV-URO-04",
            "nombre": "Cistoscopia Flexible Diagnóstica",
            "descripcion": "Exploración endoscópica de uretra y vejiga ante hematuria o sospecha de tumores vesicales.",
            "categoria": "Procedimiento",
            "precio_base": 90.00,
            "duracion_estimada_minutos": 40,
            "preparacion_requerida": "Urocultivo negativo reciente obligatorio.",
            "color": "#10b981",
        },
    ],

    # 15. Odontología
    "ODONT-01": [
        {
            "codigo": "SRV-ODO-01",
            "nombre": "Consulta Odontológica Diagnóstica y Odontograma Digital",
            "descripcion": "Examen clínico bucodental completo, diagnóstico con cámara intraoral y odontograma digital.",
            "categoria": "Consulta",
            "precio_base": 25.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Higiene bucal previa.",
            "color": "#0284c7",
        },
        {
            "codigo": "SRV-ODO-02",
            "nombre": "Profilaxis Dental y Destartraje con Ultrasonido",
            "descripcion": "Limpieza dental profunda para remoción de sarro supragingival, placa bacteriana y pulido dental.",
            "categoria": "Procedimiento",
            "precio_base": 35.00,
            "duracion_estimada_minutos": 45,
            "preparacion_requerida": "Higiene bucal previa a la cita.",
            "color": "#0284c7",
        },
        {
            "codigo": "SRV-ODO-03",
            "nombre": "Restauración con Resina Estética Fotocurada",
            "descripcion": "Eliminación de caries y reconstrucción estética del diente con resina compuesta de alta durabilidad.",
            "categoria": "Procedimiento",
            "precio_base": 40.00,
            "duracion_estimada_minutos": 40,
            "preparacion_requerida": "Sin preparación especial.",
            "color": "#0284c7",
        },
        {
            "codigo": "SRV-ODO-04",
            "nombre": "Tratamiento de Conducto / Endodoncia",
            "descripcion": "Tratamiento de la pulpa dental infectada o inflamada con sellado radicular y medicación.",
            "categoria": "Procedimiento",
            "precio_base": 90.00,
            "duracion_estimada_minutos": 60,
            "preparacion_requerida": "Traer radiografía periapical previa si dispone.",
            "color": "#0284c7",
        },
        {
            "codigo": "SRV-ODO-05",
            "nombre": "Extracción Dental Simple (Exodoncia)",
            "descripcion": "Extracción de pieza dental no restaurable bajo anestesia local troncular e infiltrativa.",
            "categoria": "Cirugía",
            "precio_base": 45.00,
            "duracion_estimada_minutos": 35,
            "preparacion_requerida": "Haber comido antes de la cita. No tomar aspirina.",
            "color": "#0284c7",
        },
    ],

    # 16. Oftalmología
    "OFTAL-01": [
        {
            "codigo": "SRV-OFT-01",
            "nombre": "Consulta Oftalmológica General y Refracción Computarizada",
            "descripcion": "Examen ocular completo: agudeza visual Snellen, refracción subjetiva, biomicroscopía y tonometría.",
            "categoria": "Consulta",
            "precio_base": 45.00,
            "duracion_estimada_minutos": 35,
            "preparacion_requerida": "Traer sus lentes de uso diario (si usa). Retirar lentes de contacto 24h antes.",
            "color": "#3b82f6",
        },
        {
            "codigo": "SRV-OFT-02",
            "nombre": "Fondo de Ojo con Dilatación Pupilar (Midriasis)",
            "descripcion": "Examen de retina, mácula y nervio óptico con oftalmoscopía indirecta bajo gotas midriáticas.",
            "categoria": "Procedimiento",
            "precio_base": 55.00,
            "duracion_estimada_minutos": 45,
            "preparacion_requerida": "Venir con acompañante y lentes oscuros (la visión cercana será borrosa por 3-4 horas).",
            "color": "#3b82f6",
        },
        {
            "codigo": "SRV-OFT-03",
            "nombre": "Tonometría Ocular de Aplanación (PIO)",
            "descripcion": "Toma de presión intraocular con tonómetro de Goldmann para descarte y seguimiento de glaucoma.",
            "categoria": "Procedimiento",
            "precio_base": 20.00,
            "duracion_estimada_minutos": 15,
            "preparacion_requerida": "Sin lentes de contacto puestos.",
            "color": "#3b82f6",
        },
        {
            "codigo": "SRV-OFT-04",
            "nombre": "Tamiz Visual Neonatal y Pediátrico",
            "descripcion": "Evaluación temprana de reflejos oculares, Brückner, Hirschberg y fijación visual en recién nacidos y lactantes.",
            "categoria": "Consulta",
            "precio_base": 40.00,
            "duracion_estimada_minutos": 30,
            "preparacion_requerida": "Bebé alimentado y en calma.",
            "color": "#3b82f6",
        },
        {
            "codigo": "SRV-OFT-05",
            "nombre": "Evaluación Preoperatoria de Catarata y Cirugía Refractiva",
            "descripcion": "Examen minucioso de segmento anterior, paquimetría, queratometría y cálculo de lente intraocular.",
            "categoria": "Consulta",
            "precio_base": 70.00,
            "duracion_estimada_minutos": 45,
            "preparacion_requerida": "Suspender uso de lentes de contacto blandos 7 días antes (o 15 días si son rígidos).",
            "color": "#3b82f6",
        },
    ],
}

async def seed_servicios_all():
    print("================================================================================")
    print("      SIEMBRA DE TIPOS DE SERVICIO CLÍNICO POR ESPECIALIDAD MÉDICA              ")
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

        # 2. Obtener Sucursal
        res_suc = await db.execute(select(Sucursal).where(Sucursal.empresa_id == empresa.id).limit(1))
        sucursal = res_suc.scalar_one_or_none()
        if not sucursal:
            res_suc_any = await db.execute(select(Sucursal).limit(1))
            sucursal = res_suc_any.scalar_one_or_none()

        sucursal_id = sucursal.id if sucursal else None
        print(f"Sucursal vinculada: ID {sucursal_id} | {sucursal.nombre if sucursal else 'Todas las sedes'}")
        print("--------------------------------------------------------------------------------")

        # 3. Obtener Especialidades
        res_esps = await db.execute(select(Especialidad).where(Especialidad.empresa_id == empresa.id))
        especialidades = res_esps.scalars().all()
        esps_por_codigo = {e.codigo: e for e in especialidades if e.codigo}
        esps_por_nombre = {e.nombre.lower().strip(): e for e in especialidades}

        total_creados = 0
        total_actualizados = 0

        for codigo_esp, servicios_list in CATALOGO_SERVICIOS_POR_ESPECIALIDAD.items():
            esp = esps_por_codigo.get(codigo_esp)
            if not esp:
                for k, v in esps_por_nombre.items():
                    if codigo_esp.lower() in k or k in codigo_esp.lower():
                        esp = v
                        break

            if not esp:
                print(f"[!] Omitiendo {codigo_esp}: especialidad no encontrada en base de datos.")
                continue

            print(f"\n📂 Especialidad: {esp.nombre} ({esp.codigo}) — ID {esp.id}")

            for s_def in servicios_list:
                stmt_s = select(Servicio).where(
                    Servicio.empresa_id == empresa.id,
                    or_(
                        Servicio.codigo == s_def["codigo"],
                        func.lower(Servicio.nombre) == s_def["nombre"].lower().strip()
                    )
                )
                res_s = await db.execute(stmt_s)
                servicio = res_s.scalar_one_or_none()

                if not servicio:
                    servicio = Servicio(
                        empresa_id=empresa.id,
                        sucursal_id=sucursal_id,
                        especialidad_id=esp.id,
                        codigo=s_def["codigo"],
                        nombre=s_def["nombre"],
                        descripcion=s_def["descripcion"],
                        categoria=s_def["categoria"],
                        precio_base=s_def["precio_base"],
                        duracion_estimada_minutos=s_def["duracion_estimada_minutos"],
                        preparacion_requerida=s_def["preparacion_requerida"],
                        requiere_medico=True,
                        color=s_def.get("color") or esp.color or "#0ea5e9",
                        activo=True,
                    )
                    db.add(servicio)
                    await db.flush()
                    total_creados += 1
                    estado = "NUEVO"
                else:
                    servicio.especialidad_id = esp.id
                    servicio.codigo = s_def["codigo"]
                    servicio.nombre = s_def["nombre"]
                    servicio.descripcion = s_def["descripcion"]
                    servicio.categoria = s_def["categoria"]
                    servicio.precio_base = s_def["precio_base"]
                    servicio.duracion_estimada_minutos = s_def["duracion_estimada_minutos"]
                    servicio.preparacion_requerida = s_def["preparacion_requerida"]
                    servicio.color = s_def.get("color") or esp.color or "#0ea5e9"
                    servicio.activo = True
                    await db.flush()
                    total_actualizados += 1
                    estado = "ACTUALIZADO"

                print(f"  [{estado}] {s_def['codigo']} - {s_def['nombre']} | {s_def['categoria']} | ${s_def['precio_base']} ({s_def['duracion_estimada_minutos']} min)")

        await db.commit()
        print("\n================================================================================")
        print(f"PROCESO DE SERVICIOS FINALIZADO: {total_creados} creados, {total_actualizados} actualizados.")
        print(f"Total Servicios Clínicos en Base de Datos: {total_creados + total_actualizados}")
        print("================================================================================")

if __name__ == "__main__":
    asyncio.run(seed_servicios_all())
