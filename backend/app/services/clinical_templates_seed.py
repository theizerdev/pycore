"""
Catálogo de plantillas clínicas sugeridas por especialidad médica.
Contiene preguntas de preconsulta (interrogatorio/triaje) y campos de examen clínico para la consulta médica.
Incluye las 14 especialidades oficiales requeridas con parámetros antropométricos y cálculo automático (Peso, Talla, IMC, Masa Muscular).
"""
import unicodedata
from typing import Dict, Any, List

def normalize_specialty_name(name: str) -> str:
    """Normaliza un nombre eliminando acentos, espacios extra y convirtiendo a minúsculas."""
    if not name:
        return ""
    clean = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')
    clean = clean.lower().strip()
    
    # Mapeo de sinónimos y variaciones comunes
    synonyms = {
        "ginecologia y obstetricia": "ginecologia",
        "obstetricia": "ginecologia",
        "otorrino": "otorrinolaringologia",
        "orl": "otorrinolaringologia",
        "salud ocupacional": "medicina ocupacional",
        "ocupacional": "medicina ocupacional",
        "cirugia mano": "cirugia de la mano",
        "mano": "cirugia de la mano",
        "gastro": "gastroenterologia",
        "cirugia infantil": "cirugia pediatrica",
        "interna": "medicina interna",
        "cirugia": "cirugia general",
        "endocrino": "endocrinologia",
        "traumatologia y ortopedia": "traumatologia",
        "ortopedia": "traumatologia",
        "trauma": "traumatologia",
        "nefro": "nefrologia",
        "pedia": "pediatria",
        "uro": "urologia",
        "general": "medicina general",
        "cardio": "cardiologia",
        "cardiol": "cardiologia",
        "derma": "dermatologia",
        "odonto": "odontologia",
        "oftalmo": "oftalmologia",
    }
    return synonyms.get(clean, clean)


# Lista oficial de las 14 especialidades solicitadas
CATALOGO_ESPECIALIDADES_OFICIALES: List[Dict[str, Any]] = [
    {
        "nombre": "Medicina General",
        "codigo": "MED-GEN",
        "descripcion": "Atención primaria integral, prevención, diagnóstico y tratamiento ambulatorio",
        "color": "#0d9488",
        "icono": "Stethoscope"
    },
    {
        "nombre": "Ginecología",
        "codigo": "GIN-OBS",
        "descripcion": "Salud integral de la mujer, control prenatal, obstetricia y patología ginecológica",
        "color": "#ec4899",
        "icono": "ShieldCheck"
    },
    {
        "nombre": "Otorrinolaringología",
        "codigo": "ORL-01",
        "descripcion": "Diagnóstico y tratamiento médico-quirúrgico de oído, nariz, garganta y senos paranasales",
        "color": "#8b5cf6",
        "icono": "Activity"
    },
    {
        "nombre": "Medicina Ocupacional",
        "codigo": "MED-OCU",
        "descripcion": "Salud laboral, vigilancia epidemiológica, aptitud física y prevención de riesgos laborales",
        "color": "#0284c7",
        "icono": "ShieldCheck"
    },
    {
        "nombre": "Cirugía de la mano",
        "codigo": "CIR-MAN",
        "descripcion": "Tratamiento quirúrgico y reconstructivo de afecciones de mano, muñeca y extremidad superior",
        "color": "#f97316",
        "icono": "Bone"
    },
    {
        "nombre": "Gastroenterología",
        "codigo": "GASTRO-01",
        "descripcion": "Enfermedades del tracto digestivo, hígado, vías biliares, páncreas y endoscopía",
        "color": "#10b981",
        "icono": "Activity"
    },
    {
        "nombre": "Cirugía Pediátrica",
        "codigo": "CIR-PED",
        "descripcion": "Cirugía neonatal, pediátrica y de malformaciones congénitas en niños y adolescentes",
        "color": "#f43f5e",
        "icono": "Baby"
    },
    {
        "nombre": "Medicina Interna",
        "codigo": "MED-INT",
        "descripcion": "Atención integral del adulto con enfermedades complejas, crónicas y multisistémicas",
        "color": "#1e40af",
        "icono": "Stethoscope"
    },
    {
        "nombre": "Cirugía General",
        "codigo": "CIR-GEN",
        "descripcion": "Intervenciones quirúrgicas del abdomen, pared abdominal, partes blandas y trauma quirúrgico",
        "color": "#0ea5e9",
        "icono": "Activity"
    },
    {
        "nombre": "Endocrinología",
        "codigo": "ENDOCR-01",
        "descripcion": "Trastornos hormonales, diabetes mellitus, tiroides, metabolismo y nutrición clínica",
        "color": "#a855f7",
        "icono": "HeartPulse"
    },
    {
        "nombre": "Traumatología",
        "codigo": "TRAUMA-01",
        "descripcion": "Lesiones del aparato locomotor, fracturas, patología articular, columna y ortopedia",
        "color": "#ea580c",
        "icono": "Bone"
    },
    {
        "nombre": "Nefrología",
        "codigo": "NEFRO-01",
        "descripcion": "Enfermedades renales, hipertensión arterial refractaria, equilibrio hidroelectrolítico y diálisis",
        "color": "#059669",
        "icono": "Activity"
    },
    {
        "nombre": "Pediatría",
        "codigo": "PED-01",
        "descripcion": "Control del niño sano, puericultura, crecimiento infantil y patologías pediátricas",
        "color": "#06b6d4",
        "icono": "Baby"
    },
    {
        "nombre": "Urología",
        "codigo": "URO-01",
        "descripcion": "Aparato urinario masculino y femenino, sistema reproductor masculino y patología prostática",
        "color": "#4f46e5",
        "icono": "Activity"
    }
]


# Parámetros basales estándar con antropometría en 12 columnas (3 + 3 + 3 + 3)
def get_signos_vitales_adulto(seccion_id: str = "con_signos_vitales") -> Dict[str, Any]:
    return {
        "id": seccion_id,
        "titulo": "Signos Vitales y Parámetros Basales",
        "descripcion": "Registro de constantes biológicas durante la consulta",
        "icono": "Activity",
        "campos": [
            {"key": "peso", "label": "Peso Corporal", "tipo": "number", "unidad": "kg", "min_val": 1.0, "max_val": 350.0, "requerido": True, "grid_cols": 3},
            {"key": "talla", "label": "Talla / Altura", "tipo": "number", "unidad": "cm", "min_val": 30.0, "max_val": 250.0, "requerido": True, "grid_cols": 3},
            {"key": "imc", "label": "Índice Masa Corporal (IMC)", "tipo": "calculated", "unidad": "kg/m²", "requerido": False, "grid_cols": 3, "placeholder": "Auto (Peso / Talla²)"},
            {"key": "masa_muscular", "label": "Masa Muscular / Magra", "tipo": "calculated", "unidad": "kg", "requerido": False, "grid_cols": 3, "placeholder": "Auto Boer"},
            {"key": "ta_sistolica", "label": "Tensión Sistólica", "tipo": "number", "unidad": "mmHg", "min_val": 50, "max_val": 260, "requerido": True, "grid_cols": 4},
            {"key": "ta_diastolica", "label": "Tensión Diastólica", "tipo": "number", "unidad": "mmHg", "min_val": 30, "max_val": 150, "requerido": True, "grid_cols": 4},
            {"key": "frecuencia_cardiaca", "label": "Frecuencia Cardíaca", "tipo": "number", "unidad": "lpm", "min_val": 30, "max_val": 220, "requerido": True, "grid_cols": 4},
            {"key": "frecuencia_respiratoria", "label": "Frecuencia Resp.", "tipo": "number", "unidad": "rpm", "min_val": 8, "max_val": 60, "requerido": False, "grid_cols": 4},
            {"key": "temperatura", "label": "Temperatura", "tipo": "number", "unidad": "°C", "min_val": 34.0, "max_val": 42.5, "requerido": True, "grid_cols": 4},
            {"key": "saturacion_o2", "label": "Saturación O2 (SpO2)", "tipo": "number", "unidad": "%", "min_val": 70, "max_val": 100, "requerido": False, "grid_cols": 4}
        ]
    }


DEFAULT_CLINICAL_TEMPLATES: Dict[str, Dict[str, Any]] = {
    # ── 1. MEDICINA GENERAL ──
    "medicina general": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_medgen_motivo",
                "titulo": "Motivo y Antecedentes Generales",
                "descripcion": "Interrogatorio previo para triaje y orientación médica",
                "icono": "ClipboardList",
                "campos": [
                    {"key": "motivo_consulta", "label": "¿Cuál es el motivo principal de su visita?", "tipo": "textarea", "placeholder": "Describa brevemente los síntomas principales...", "requerido": True, "grid_cols": 12},
                    {"key": "alergias_medicamentos", "label": "¿Tiene alergia a algún medicamento o sustancia?", "tipo": "select", "opciones": ["Ninguna conocida", "Penicilina / Amoxicilina", "AINEs (Ibuprofeno, Aspirina)", "Sulfas", "Otros antibióticos", "Múltiples alergias"], "requerido": True, "grid_cols": 6},
                    {"key": "enfermedades_cronicas", "label": "Enfermedades o diagnósticos previos", "tipo": "multiselect", "opciones": ["Hipertensión Arterial", "Diabetes Mellitus", "Asma / EPOC", "Dislipidemia", "Hipotiroidismo", "Cardiopatía", "Ninguna"], "requerido": False, "grid_cols": 6},
                    {"key": "fuma", "label": "¿Consume tabaco o cigarrillos?", "tipo": "boolean", "requerido": False, "grid_cols": 6},
                    {"key": "alcohol", "label": "Frecuencia de consumo de alcohol", "tipo": "select", "opciones": ["No consume", "Ocasional (social)", "Moderado (semanal)", "Frecuente"], "requerido": False, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            get_signos_vitales_adulto("con_medgen_signos"),
            {
                "id": "con_medgen_examen",
                "titulo": "Examen Físico Segmentario",
                "descripcion": "Inspección, palpación y auscultación",
                "icono": "Stethoscope",
                "campos": [
                    {"key": "estado_general", "label": "Estado General del Paciente", "tipo": "select", "opciones": ["Buen estado general, alerta y orientado", "Regular estado general, decaído", "Mal estado general / Facies álgica"], "requerido": True, "grid_cols": 12},
                    {"key": "cardiopulmonar", "label": "Auscultación Cardiopulmonar", "tipo": "textarea", "placeholder": "Ruidos cardíacos rítmicos normofonéticos, murmullo vesicular presente sin agregados...", "requerido": False, "grid_cols": 12},
                    {"key": "abdomen", "label": "Examen Abdominal", "tipo": "select", "opciones": ["Blando, depresible, no doloroso", "Dolor localizado a la palpación", "Defensa muscular / Peritonismo", "Meteorismo / Distensión"], "requerido": False, "grid_cols": 12},
                    {"key": "plan_conducta", "label": "Impresión Diagnóstica y Plan", "tipo": "textarea", "placeholder": "Diagnóstico presuntivo, indicaciones farmacológicas y recomendaciones...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    # ── 2. GINECOLOGÍA ──
    "ginecologia": {
        "widgets_activos": ["rueda_obstetrica"],
        "esquema_preconsulta": [
            {
                "id": "pre_gineco_historia",
                "titulo": "Antecedentes Gineco-Obstétricos (AGO)",
                "descripcion": "Historia menstrual y antecedentes reproductivos",
                "icono": "Calendar",
                "campos": [
                    {"key": "fum", "label": "Fecha de Última Menstruación (FUM)", "tipo": "date", "requerido": True, "grid_cols": 6},
                    {"key": "ciclos_regulares", "label": "¿Sus ciclos menstruales son regulares?", "tipo": "boolean", "requerido": True, "grid_cols": 6},
                    {"key": "metodo_anticonceptivo", "label": "Método anticonceptivo que utiliza", "tipo": "select", "opciones": ["Ninguno", "Anticonceptivos orales", "DIU Cobre", "DIU Hormonal (Mirena/Kyleena)", "Implante subdérmico", "Inyección mensual/trimestral", "Preservativo"], "requerido": True, "grid_cols": 6},
                    {"key": "menarquia_edad", "label": "Edad de primera menstruación (Menarquia)", "tipo": "number", "unidad": "años", "min_val": 8, "max_val": 20, "requerido": False, "grid_cols": 6},
                    {"key": "gestas", "label": "Número de Gestas (G)", "tipo": "number", "min_val": 0, "max_val": 20, "requerido": True, "grid_cols": 3},
                    {"key": "partos", "label": "Partos vaginales (P)", "tipo": "number", "min_val": 0, "max_val": 20, "requerido": True, "grid_cols": 3},
                    {"key": "cesareas", "label": "Cesáreas (C)", "tipo": "number", "min_val": 0, "max_val": 20, "requerido": True, "grid_cols": 3},
                    {"key": "abortos", "label": "Abortos / Pérdidas (A)", "tipo": "number", "min_val": 0, "max_val": 20, "requerido": True, "grid_cols": 3}
                ]
            }
        ],
        "esquema_consulta": [
            get_signos_vitales_adulto("con_gineco_signos"),
            {
                "id": "con_gineco_examen",
                "titulo": "Evaluación Ginecológica y Obstétrica",
                "descripcion": "Exploración pélvica, citología y control obstétrico",
                "icono": "ShieldCheck",
                "campos": [
                    {"key": "fecha_ultima_citologia", "label": "Fecha de última Citología / Pap", "tipo": "date", "requerido": False, "grid_cols": 6},
                    {"key": "resultado_citologia_previa", "label": "Resultado citológico previo", "tipo": "select", "opciones": ["Negativo para lesión intraepitelial / Normal", "ASCUS", "LIE Bajo Grado (VPH)", "LIE Alto Grado", "Pendiente / Primera vez"], "requerido": False, "grid_cols": 6},
                    {"key": "altura_uterina", "label": "Altura Uterina (embarazadas)", "tipo": "number", "unidad": "cm", "min_val": 10, "max_val": 50, "requerido": False, "grid_cols": 4},
                    {"key": "fcf", "label": "Frecuencia Cardíaca Fetal (FCF)", "tipo": "number", "unidad": "lpm", "min_val": 100, "max_val": 190, "requerido": False, "grid_cols": 4},
                    {"key": "movimientos_fetales", "label": "Movimientos Fetales", "tipo": "select", "opciones": ["No aplica (no embarazada / <18 sem)", "Presentes y activos", "Disminuidos", "Ausentes"], "requerido": False, "grid_cols": 4},
                    {"key": "examen_mamas", "label": "Examen Clínico de Mamas", "tipo": "select", "opciones": ["Sin nódulos ni masas palpables", "Nódulo palpable cuadrante superior externo", "Nódulo cuadrante interno", "Dolor mamario cíclico / Mastalgia", "Secreción por pezón"], "requerido": False, "grid_cols": 12},
                    {"key": "tacto_especuloscopia", "label": "Especuloscopía y Tacto Bimanual", "tipo": "textarea", "placeholder": "Cérvix epitelizado sin sangrado activo, útero en AVF de tamaño normal, anexos libres y no dolorosos...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    # ── 3. OTORRINOLARINGOLOGÍA ──
    "otorrinolaringologia": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_orl_sintomas",
                "titulo": "Sintomatología ORL y Factores de Riesgo",
                "descripcion": "Interrogatorio de oído, nariz, garganta y audición",
                "icono": "Activity",
                "campos": [
                    {"key": "motivo_orl_principal", "label": "Motivo principal de consulta ORL", "tipo": "select", "opciones": ["Hipoacusia / Pérdida de audición", "Acúfenos / Tinnitus (zumbido de oídos)", "Vértigo o inestabilidad al girar", "Obstrucción o congestión nasal crónica", "Epistaxis (sangrado nasal frecuente)", "Odinofagia o dolor de garganta recurrente", "Disfonía o ronquera persistente (>2 semanas)", "Ronquido nocturno / Sospecha de apnea"], "requerido": True, "grid_cols": 12},
                    {"key": "oido_afectado", "label": "Oído o lado predominantemente afectado", "tipo": "select", "opciones": ["Bilateral (ambos)", "Oído Derecho (OD)", "Oído Izquierdo (OI)", "No aplica a oídos"], "requerido": True, "grid_cols": 6},
                    {"key": "exposicion_ruido", "label": "¿Trabaja o se expone a ruidos de alta intensidad?", "tipo": "boolean", "requerido": False, "grid_cols": 6},
                    {"key": "alergias_rinitis", "label": "¿Padece rinitis alérgica o estornudos en salva?", "tipo": "boolean", "requerido": False, "grid_cols": 6},
                    {"key": "fumador_cronico", "label": "¿Es fumador activo o ex-fumador?", "tipo": "boolean", "requerido": False, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            get_signos_vitales_adulto("con_orl_signos"),
            {
                "id": "con_orl_examen",
                "titulo": "Exploración Otorrinolaringológica Integral",
                "descripcion": "Otoscopía, rinoscopía, orofaringe y cuello",
                "icono": "Stethoscope",
                "campos": [
                    {"key": "otoscopia_od", "label": "Otoscopía Oído Derecho (OD)", "tipo": "select", "opciones": ["Conducto libre, membrana timpánica íntegra y translúcida con cono luminoso", "Tapón de cerumen oclusivo", "Membrana hiperémica / Otitis Media Aguda", "Perforación timpánica visible", "Otitis externa con edema de conducto"], "requerido": True, "grid_cols": 6},
                    {"key": "otoscopia_oi", "label": "Otoscopía Oído Izquierdo (OI)", "tipo": "select", "opciones": ["Conducto libre, membrana timpánica íntegra y translúcida con cono luminoso", "Tapón de cerumen oclusivo", "Membrana hiperémica / Otitis Media Aguda", "Perforación timpánica visible", "Otitis externa con edema de conducto"], "requerido": True, "grid_cols": 6},
                    {"key": "rinoscopia_anterior", "label": "Rinoscopía Anterior y Fosas Nasales", "tipo": "select", "opciones": ["Mucosa rosada normotrófica, tabique alineado", "Hipertrofia de cornetes inferiores obstructiva", "Desviación septal obstructiva unilateral", "Pólipos nasales visibles (formación en uva)", "Mucosa pálida y edematosa (alérgica)"], "requerido": True, "grid_cols": 6},
                    {"key": "orofaringe_amigdalas", "label": "Orofaringe y Amígdalas Palatinas", "tipo": "select", "opciones": ["Faringe normocoloreada, amígdalas Grado I sin exudado", "Amígdalas Grado II-III hipertróficas cripticas", "Exudados pultáceos blanquecinos / Faringoamigdalitis bacteriana", "Pilar posterior eritematoso con faringitis granular"], "requerido": True, "grid_cols": 6},
                    {"key": "cuello_adenopatias", "label": "Palpación Cervical y Ganglionar", "tipo": "select", "opciones": ["Sin adenopatías palpables ni masas cervicales", "Adenopatías submandibulares reactivas dolorosas", "Adenopatía yugulodigástrica aumentada de tamaño", "Bocio tiroideo difuso palpable"], "requerido": False, "grid_cols": 6},
                    {"key": "laringoscopia_cuerdas", "label": "Laringoscopía Indirecta / Faringe", "tipo": "textarea", "placeholder": "Cuerdas vocales móviles simétricas en abducción/aducción, sin nódulos ni pólipos...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    # ── 4. MEDICINA OCUPACIONAL ──
    "medicina ocupacional": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_ocu_laboral",
                "titulo": "Perfil Ocupacional y Exposición Laboral",
                "descripcion": "Antecedentes del puesto de trabajo y factores de riesgo en la empresa",
                "icono": "ShieldCheck",
                "campos": [
                    {"key": "puesto_trabajo", "label": "Puesto o Cargo que desempeña en la empresa", "tipo": "text", "placeholder": "Ej. Operador de montacargas, Analista administrativo, Soldador...", "requerido": True, "grid_cols": 6},
                    {"key": "antiguedad_puesto", "label": "Antigüedad en este puesto laboral", "tipo": "select", "opciones": ["Menos de 6 meses", "De 6 meses a 1 año", "De 1 a 3 años", "De 3 a 5 años", "Más de 5 años"], "requerido": True, "grid_cols": 6},
                    {"key": "riesgos_laborales", "label": "Factores de riesgo presentes en su jornada", "tipo": "multiselect", "opciones": ["Postura prolongada de pie (>4 horas)", "Sedestación prolongada / Pantallas de visualización", "Levantamiento de cargas (>15 kg)", "Movimientos repetitivos de miembros superiores", "Ruido industrial continuo", "Exposición a solventes, humos o químicos", "Vibraciones mecánicas", "Trabajo en turnos nocturnos o rotativos"], "requerido": True, "grid_cols": 12},
                    {"key": "uso_epp", "label": "¿Utiliza Equipos de Protección Personal (EPP)?", "tipo": "select", "opciones": ["Sí, de forma continua y adecuada", "Parcialmente / Solo cuando se exige", "Raras veces", "No suministrados para el cargo"], "requerido": True, "grid_cols": 6},
                    {"key": "accidentes_laborales", "label": "¿Ha tenido accidentes laborales o enfermedades ocupacionales previas?", "tipo": "boolean", "requerido": True, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            get_signos_vitales_adulto("con_ocu_signos"),
            {
                "id": "con_ocu_evaluacion",
                "titulo": "Evaluación Osteomuscular, Ergonómica y Aptitud",
                "descripcion": "Examen dirigido a capacidad laboral y salud en el trabajo",
                "icono": "Activity",
                "campos": [
                    {"key": "columna_osteomuscular", "label": "Evaluación de Columna Vertebral y Arcos", "tipo": "select", "opciones": ["Columna alineada, arcos de movilidad indoloros y completos", "Contractura paravertebral lumbar con dolor a la flexión", "Contractura cervical con limitación en lateralizaciones", "Puntos miofasciales dolorosos / Cifosis postural"], "requerido": True, "grid_cols": 6},
                    {"key": "maniobras_ergonomicas", "label": "Pruebas de Miembros Superiores (Túnel Carpiano / Tendinitis)", "tipo": "select", "opciones": ["Phalen y Tinel negativos, hombros con movilidad completa", "Tinel (+) territorio mediano compatible con atrapamiento", "Signos de manguito rotador doloroso (Hawkins +)", "Epicondilitis lateral dolorosa al esfuerzo"], "requerido": True, "grid_cols": 6},
                    {"key": "agudeza_visual_ocupacional", "label": "Capacidad Visual en Trabajo", "tipo": "select", "opciones": ["20/20 con o sin lentes correctores (Apta)", "Disminución leve corregible", "Déficit visual que amerita refracción urgente"], "requerido": True, "grid_cols": 6},
                    {"key": "conclusion_aptitud", "label": "Concepto Clínico de Aptitud Laboral", "tipo": "select", "opciones": ["APTO (Sin restricciones)", "APTO CON RESTRICCIONES (Requiere adecuación ergonómica)", "NO APTO TEMPORALMENTE (Requiere tratamiento o rehabilitación)", "PENDIENTE POR EXÁMENES COMPLEMENTARIOS"], "requerido": True, "grid_cols": 6},
                    {"key": "recomendaciones_puesto", "label": "Restricciones y Recomendaciones al Puesto de Trabajo", "tipo": "textarea", "placeholder": "Pausas activas cada 2 horas, evitar cargas superiores a 10 kg por 30 días, remitir a oftalmología...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    # ── 5. CIRUGÍA DE LA MANO ──
    "cirugia de la mano": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_mano_antecedentes",
                "titulo": "Mano Dominante, Ocupación y Cuadro Clínico",
                "descripcion": "Antecedentes traumáticos, ocupacionales y sintomatología en mano",
                "icono": "Bone",
                "campos": [
                    {"key": "mano_dominante", "label": "Mano Dominante", "tipo": "select", "opciones": ["Mano Derecha", "Mano Izquierda", "Ambidiestro"], "requerido": True, "grid_cols": 4},
                    {"key": "mano_afectada", "label": "Mano que presenta la afección", "tipo": "select", "opciones": ["Mano Derecha (MD)", "Mano Izquierda (MI)", "Bilateral (Ambas)"], "requerido": True, "grid_cols": 4},
                    {"key": "tiempo_sintomas", "label": "Tiempo de evolución del cuadro", "tipo": "select", "opciones": ["Agudo traumático (<24 horas)", "De 1 a 7 días", "De 1 a 6 meses", "Crónico (>6 meses)"], "requerido": True, "grid_cols": 4},
                    {"key": "motivo_mano", "label": "Motivo principal de consulta en extremidad", "tipo": "select", "opciones": ["Adormecimiento / Hormigueo nocturno en dedos (Túnel Carpiano)", "Dedo trabado en flexión / Gatillo o resorte", "Dolor en base del pulgar al agarrar (Rizartrosis / De Quervain)", "Herida cortante con compromiso tendinoso o nervioso", "Fractura o luxación de falanges / metacarpianos / escafoides", "Nódulo o masa palpable (Ganglión / Quiste sinovial)", "Rigidez o retracción palmar (Dupuytren)"], "requerido": True, "grid_cols": 12},
                    {"key": "fuerza_prension_perdida", "label": "¿Ha perdido fuerza para destapar frascos o agarrar objetos?", "tipo": "boolean", "requerido": True, "grid_cols": 6},
                    {"key": "parestesias_nocturnas", "label": "¿Se despierta por la noche con hormigueo en la mano?", "tipo": "boolean", "requerido": True, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            get_signos_vitales_adulto("con_mano_signos"),
            {
                "id": "con_mano_examen",
                "titulo": "Examen Osteomuscular, Tendinoso y Nervioso de Mano",
                "descripcion": "Movilidad articular, maniobras específicas de compresión y sensibilidad",
                "icono": "Bone",
                "campos": [
                    {"key": "movilidad_dedos", "label": "Arcos de Movilidad Articular en Dedos", "tipo": "select", "opciones": ["Completos y simétricos (cierre de puño completo)", "Déficit de extensión terminal (dedo en martillo o mallet finger)", "Dedo en resorte con resalto doloroso", "Flexión incompleta por rigidez postraumática", "Contractura en flexión palmar (Dupuytren)"], "requerido": True, "grid_cols": 6},
                    {"key": "maniobras_nerviosas", "label": "Pruebas de Atrapamiento Nervioso", "tipo": "select", "opciones": ["Tinel y Phalen negativos", "Phalen (+) antes de 30 segundos (Túnel Carpiano moderado/severo)", "Tinel (+) en nervio mediano a nivel del carpo", "Tinel (+) en canal de Guyon (nervio cubital)", "Test de Finkelstein (+) franco (Tenosinovitis De Quervain)"], "requerido": True, "grid_cols": 6},
                    {"key": "sensibilidad_discriminacion", "label": "Sensibilidad y Territorio Nervioso", "tipo": "select", "opciones": ["Conservada y simétrica en pulpejos (<6mm discriminación)", "Hipoestesia en territorio mediano (1°, 2°, 3° dedo)", "Hipoestesia en territorio cubital (5° dedo y mitad cubital 4°)", "Anestesia completa en pulpejo por lesión nerviosa digital"], "requerido": True, "grid_cols": 6},
                    {"key": "test_allen_vascular", "label": "Perfusión y Test de Allen Vascular", "tipo": "select", "opciones": ["Llenado capilar < 2 segundos bilateral (Allen Normal)", "Retardo en flujo arterial radial", "Retardo en flujo arterial cubital", "Palidez persistente en falange distal"], "requerido": False, "grid_cols": 6},
                    {"key": "conducta_quirurgica_mano", "label": "Plan Quirúrgico o Manejo Ortopédico", "tipo": "textarea", "placeholder": "Liberación quirúrgica de túnel carpiano abierta/endoscópica, tenorrafia, inmovilización con férula espiga de pulgar...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    # ── 6. GASTROENTEROLOGÍA ──
    "gastroenterologia": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_gastro_sintomas",
                "titulo": "Sintomatología Digestiva y Factores de Alarma",
                "descripcion": "Interrogatorio gastrointestinal, hábitos evacuatorios y sangrado",
                "icono": "Activity",
                "campos": [
                    {"key": "sintomas_digestivos", "label": "Síntomas digestivos presentes en las últimas 4 semanas", "tipo": "multiselect", "opciones": ["Pirosis / Ardor retroesternal / Reflujo ácido", "Disfagia / Sensación de atasco al deglutir", "Dolor o ardor epigástrico en ayuno", "Distensión o pesadez postprandial precoz", "Diarrea crónica o heces pastosas recurrentes", "Estreñimiento severo (<3 evacuaciones semanales)", "Náuseas o vómitos frecuentes"], "requerido": True, "grid_cols": 12},
                    {"key": "sangrado_digestivo", "label": "¿Ha presentado sangrado en vómitos o heces?", "tipo": "select", "opciones": ["No ha presentado sangrado", "Melena (heces negras fétidas como alquitrán)", "Hematoquecia / Rectorragia (sangre roja con la deposición)", "Hematemesis (vómito con sangre fresca o posos de café)"], "requerido": True, "grid_cols": 6},
                    {"key": "perdida_peso", "label": "Variación de peso corporal en últimos 3 meses", "tipo": "select", "opciones": ["Peso estable", "Pérdida voluntaria con dieta/ejercicio", "Pérdida involuntaria leve (1-3 kg)", "Pérdida involuntaria moderada o severa (>5 kg)"], "requerido": True, "grid_cols": 6},
                    {"key": "antecedentes_gastro_familiares", "label": "¿Familiares directos con cáncer de estómago, colon o poliposis?", "tipo": "boolean", "requerido": True, "grid_cols": 6},
                    {"key": "consumo_aines", "label": "¿Consume analgésicos AINEs (Ibuprofeno, Diclofenac) con frecuencia?", "tipo": "boolean", "requerido": False, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            get_signos_vitales_adulto("con_gastro_signos"),
            {
                "id": "con_gastro_examen",
                "titulo": "Examen Físico Abdominal y Diagnóstico Gastroenterológico",
                "descripcion": "Palpación por cuadrantes, visceromegalias, signos de ascitis y tacto",
                "icono": "Activity",
                "campos": [
                    {"key": "palpacion_puntos_dolorosos", "label": "Palpación Abdominal y Puntos Dolorosos", "tipo": "select", "opciones": ["Abdomen blando, depresible, no doloroso a la palpación", "Dolor localizado a nivel de epigastrio sin defensa", "Dolor en hipocondrio derecho con Murphy (+) dudoso", "Dolor en fosa ilíaca izquierda (sospecha diverticulitis)", "Defensa abdominal involuntaria / Irritación peritoneal"], "requerido": True, "grid_cols": 6},
                    {"key": "ruidos_hidroaereos", "label": "Auscultación de Ruidos Hidroaéreos (RHA)", "tipo": "select", "opciones": ["RHA normoactivos en los 4 cuadrantes", "RHA aumentados / Metálicos de lucha", "RHA disminuidos / Hipoperistalsis", "Silencio abdominal auscultatorio"], "requerido": True, "grid_cols": 6},
                    {"key": "hepatomegalia_esplenomegalia", "label": "Examen de Hígado y Bazo", "tipo": "select", "opciones": ["Sin hepatomegalia ni esplenomegalia palpable", "Hepatomegalia leve a 2 cm bajo reborde costal", "Hepatomegalia nodular dura (sospecha hepatopatía avanzada)", "Esplenomegalia palpable grado I-II"], "requerido": True, "grid_cols": 6},
                    {"key": "signos_ascitis", "label": "Evaluación de Líquido Libre / Ascitis", "tipo": "select", "opciones": ["Sin signos de ascitis clínica", "Matidez en flancos desplazable", "Onda ascítica franca positiva"], "requerido": False, "grid_cols": 6},
                    {"key": "plan_endoscopico_conducta", "label": "Estudios Endoscópicos Solicitados e Impresión Clínica", "tipo": "textarea", "placeholder": "Indicación de Videoendoscopía Digestiva Alta (VEDA) con toma de biopsia para H. pylori, Colonoscopía diagnóstica, ecografía hepatobiliopancreática...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    # ── 7. CIRUGÍA PEDIÁTRICA ──
    "cirugia pediatrica": {
        "widgets_activos": ["percentiles_oms"],
        "esquema_preconsulta": [
            {
                "id": "pre_cirped_antecedentes",
                "titulo": "Antecedentes Perinatales y Motivo Quirúrgico Pediátrico",
                "descripcion": "Interrogatorio pediátrico y sintomatología quirúrgica",
                "icono": "Baby",
                "campos": [
                    {"key": "motivo_cirugia_pediatrica", "label": "Motivo de valoración quirúrgica pediátrica", "tipo": "select", "opciones": ["Hernia umbilical persistente", "Hernia inguinal o inguinoescrotal / Hidrocele", "Criptorquidia / Testículo no descendido o retráctil", "Fimosis patológica / Anillo fimótico fibrótico", "Dolor abdominal agudo (sospecha apendicitis infantil)", "Quiste tirogloso / Fístula o masa cervical congénita", "Malformación anorrectal congénita", "Cuerpo extraño ingerido o aspirado"], "requerido": True, "grid_cols": 12},
                    {"key": "tiempo_aparicion_cuadro", "label": "Tiempo de evolución del motivo actual", "tipo": "text", "placeholder": "Ej. Presente desde el nacimiento, 2 semanas, inicio hace 12 horas...", "requerido": True, "grid_cols": 6},
                    {"key": "sintomas_urgencia", "label": "¿Presenta vómitos biliosos, fiebre o dolor intenso?", "tipo": "boolean", "requerido": True, "grid_cols": 6},
                    {"key": "semanas_gestacion", "label": "Semanas de gestación al nacer (prematuridad)", "tipo": "number", "unidad": "semanas", "min_val": 24, "max_val": 43, "requerido": False, "grid_cols": 6},
                    {"key": "peso_nacer_gramos", "label": "Peso al nacer en gramos", "tipo": "number", "unidad": "g", "min_val": 500, "max_val": 5500, "requerido": False, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            {
                "id": "con_cirped_antropometria",
                "titulo": "Somatometría Pediátrica y Constantes",
                "descripcion": "Cálculo de percentiles OMS y signos vitales pediátricos",
                "icono": "Scale",
                "campos": [
                    {"key": "peso_actual", "label": "Peso Actual del Paciente", "tipo": "number", "unidad": "kg", "min_val": 1.0, "max_val": 100.0, "requerido": True, "grid_cols": 4},
                    {"key": "talla_actual", "label": "Talla / Estatura Pediátrica", "tipo": "number", "unidad": "cm", "min_val": 35.0, "max_val": 190.0, "requerido": True, "grid_cols": 4},
                    {"key": "perimetro_cefalico", "label": "Perímetro Cefálico", "tipo": "number", "unidad": "cm", "min_val": 25.0, "max_val": 65.0, "requerido": False, "grid_cols": 4},
                    {"key": "frecuencia_cardiaca_ped", "label": "Frecuencia Cardíaca", "tipo": "number", "unidad": "lpm", "min_val": 40, "max_val": 220, "requerido": True, "grid_cols": 4},
                    {"key": "frecuencia_respiratoria_ped", "label": "Frecuencia Respiratoria", "tipo": "number", "unidad": "rpm", "min_val": 12, "max_val": 70, "requerido": True, "grid_cols": 4},
                    {"key": "temperatura_ped", "label": "Temperatura Axilar", "tipo": "number", "unidad": "°C", "min_val": 34.0, "max_val": 42.0, "requerido": True, "grid_cols": 4}
                ]
            },
            {
                "id": "con_cirped_examen",
                "titulo": "Examen Físico Quirúrgico Pediátrico",
                "descripcion": "Pared abdominal, hernias, genitales y signos peritoneales infantiles",
                "icono": "Baby",
                "campos": [
                    {"key": "pared_abdominal_hernias", "label": "Pared Abdominal y Defectos Herniarios", "tipo": "select", "opciones": ["Pared íntegra sin defectos herniarios", "Hernia umbilical reductible con anillo <1.5 cm", "Hernia umbilical >2 cm en mayor de 4 años", "Hernia inguinal reductible", "Hernia inguinal irreductible / atascada (Emergencia quirúrgica)"], "requerido": True, "grid_cols": 6},
                    {"key": "genitales_pediatricos", "label": "Exploración Genitourinaria Pediátrica", "tipo": "select", "opciones": ["Testículos normodescendidos simétricos / Genitales normales", "Criptorquidia unilateral palpable en canal inguinal", "Criptorquidia no palpable", "Hidrocele comunicante traslúcido a la luz", "Fimosis fisiológica resolutiva", "Fimosis patológica con anillo fibroso cicatrizal"], "requerido": True, "grid_cols": 6},
                    {"key": "abdomen_doloroso_peritoneal", "label": "Evaluación de Dolor Abdominal / Apendicitis", "tipo": "select", "opciones": ["Abdomen blando, depresible, no doloroso", "Dolor en fosa ilíaca derecha con defensa voluntaria", "Signos peritoneales francos: Blumberg (+), dolor al saltar", "Masa palpable abdominal a descartar invaginación"], "requerido": False, "grid_cols": 6},
                    {"key": "criterio_quirurgico_prioridad", "label": "Conducta Quirúrgica y Prioridad", "tipo": "select", "opciones": ["Tratamiento expectante / No amerita cirugía actualmente", "Programar cirugía electiva ambulatoria", "Hospitalización y preparación para intervención quirúrgica de urgencia"], "requerido": True, "grid_cols": 6},
                    {"key": "plan_preoperatorio_indicaciones", "label": "Instrucciones Preoperatorias y Exámenes", "tipo": "textarea", "placeholder": "Ayuno de 6 horas para sólidos y 2 horas para líquidos claros, hemograma, coagulación completa, valoración cardiovascular prequirúrgica...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    # ── 8. MEDICINA INTERNA ──
    "medicina interna": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_medint_historia",
                "titulo": "Antecedentes Crónicos y Polifarmacia",
                "descripcion": "Evaluación integral de patologías crónicas del adulto",
                "icono": "ClipboardList",
                "campos": [
                    {"key": "enfermedades_internas", "label": "Comorbilidades diagnosticadas", "tipo": "multiselect", "opciones": ["Hipertensión Arterial Primaria", "Diabetes Mellitus Tipo 2", "Dislipidemia aterogénica", "Enfermedad Renal Crónica", "Insuficiencia Cardíaca Congestiva", "Enfermedad Pulmonar Obstructiva Crónica (EPOC)", "Enfermedad Autoinmune (Lupus, Artritis)", "Accidente Cerebrovascular previo"], "requerido": True, "grid_cols": 12},
                    {"key": "numero_medicamentos", "label": "¿Cuántos medicamentos diferentes consume diariamente?", "tipo": "select", "opciones": ["1 a 2 medicamentos", "3 a 5 medicamentos", "Más de 5 medicamentos (Polifarmacia mayor)"], "requerido": True, "grid_cols": 6},
                    {"key": "hospitalizaciones_ano", "label": "Ingresos hospitalarios en el último año", "tipo": "select", "opciones": ["Ninguno", "1 ingreso", "2 a 3 ingresos", "Más de 3 ingresos"], "requerido": True, "grid_cols": 6},
                    {"key": "alergias_farmacologicas", "label": "Alergias farmacológicas conocidas", "tipo": "text", "placeholder": "Indique medicamentos que le causen alergia o reacción adversa...", "requerido": False, "grid_cols": 12}
                ]
            }
        ],
        "esquema_consulta": [
            get_signos_vitales_adulto("con_medint_signos"),
            {
                "id": "con_medint_examen",
                "titulo": "Examen Clínico Integral por Sistemas",
                "descripcion": "Evaluación cardiopulmonar, vascular y neurológica del adulto",
                "icono": "Stethoscope",
                "campos": [
                    {"key": "estado_conciencia_cognitivo", "label": "Estado Clínico y Nivel de Conciencia", "tipo": "select", "opciones": ["Lúcido, orientado en 3 esferas, cooperador", "Deterioro cognitivo leve / Desorientación temporal parcial", "Somnoliento / Tendencia al letargo", "Confusión mental aguda / Síndrome confusional"], "requerido": True, "grid_cols": 6},
                    {"key": "pulsos_perifericos_vascular", "label": "Pulsos Periféricos y Perfusión", "tipo": "select", "opciones": ["Pulsos radiales, femorales y pedios presentes y simétricos", "Disminución de pulsos distales en extremidades inferiores", "Ausencia de pulso pedio o tibial posterior (arteriopatía)", "Llenado capilar distal enlentecido (>3 segundos)"], "requerido": True, "grid_cols": 6},
                    {"key": "auscultacion_pulmonar_avanzada", "label": "Auscultación Respiratoria", "tipo": "select", "opciones": ["Murmullo vesicular conservado sin ruidos agregados", "Crepitantes finos bibasales (signos de congestión pulmonar)", "Sibilancias y roncus espiratorios difusos", "Hipoventilación en base pulmonar (sospecha derrame pleural)"], "requerido": True, "grid_cols": 6},
                    {"key": "edemas_congestivos", "label": "Edemas y Signos de Sobrecarga Hídrica", "tipo": "select", "opciones": ["Sin edemas periféricos", "Edema pretibial Grado I (+) blando", "Edema maleolar Grado II (++) con fóvea marcada", "Edema Grado III-IV que asciende a muslos o anasarca"], "requerido": True, "grid_cols": 6},
                    {"key": "plan_terapeutico_integral", "label": "Conducta Médica Integral y Ajuste Farmacológico", "tipo": "textarea", "placeholder": "Optimización de antihipertensivos, metas de hemoglobina glicosilada, solicitud de perfil lipídico, ecocardiograma Doppler...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    # ── 9. CIRUGÍA GENERAL ──
    "cirugia general": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_cirgen_historia",
                "titulo": "Antecedentes Quirúrgicos y Riesgo Preoperatorio",
                "descripcion": "Cirugías previas, cicatrices y clasificación de riesgo",
                "icono": "Activity",
                "campos": [
                    {"key": "motivo_quirurgico", "label": "Motivo principal de valoración quirúrgica", "tipo": "select", "opciones": ["Colelitiasis / Cólico biliar recurrente (vesícula)", "Dolor abdominal agudo (sospecha apendicitis)", "Hernia inguinal o crural sintomática", "Hernia umbilical o epigástrica", "Eventración / Hernia incisional postoperatoria", "Patología mamaria / Nódulo palpable", "Lesión de partes blandas (Lipoma, quiste sebáceo)"], "requerido": True, "grid_cols": 12},
                    {"key": "cirugias_previas", "label": "Cirugías abdominales o mayores previas", "tipo": "multiselect", "opciones": ["Ninguna", "Apendicectomía previa", "Colecistectomía previa", "Cesárea previa", "Histerectomía", "Laparotomía exploradora previa"], "requerido": True, "grid_cols": 6},
                    {"key": "horas_ayuno", "label": "Horas de ayuno al momento de la consulta", "tipo": "select", "opciones": ["Menos de 2 horas", "Entre 2 y 6 horas", "Más de 8 horas de ayuno"], "requerido": False, "grid_cols": 6},
                    {"key": "alergia_latex_anestesia", "label": "¿Alergia al látex o reacciones adversas a anestésicos?", "tipo": "boolean", "requerido": True, "grid_cols": 6},
                    {"key": "medicacion_anticoagulante", "label": "¿Consume aspirina, clopidogrel o anticoagulantes?", "tipo": "boolean", "requerido": True, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            get_signos_vitales_adulto("con_cirgen_signos"),
            {
                "id": "con_cirgen_examen",
                "titulo": "Examen Quirúrgico Abdominal y Orificios Herniarios",
                "descripcion": "Inspección de pared, cicatrices, signos peritoníticos y anillos",
                "icono": "Activity",
                "campos": [
                    {"key": "inspeccion_cicatrices_pared", "label": "Pared Abdominal y Cicatrices Quirúrgicas", "tipo": "select", "opciones": ["Pared íntegra sin cicatrices previas", "Cicatriz de laparotomía mediana sin eventración", "Cicatriz con defecto herniario incisional reducible", "Cicatriz Kocher subcostal previa", "Cicatriz McBurney previa"], "requerido": True, "grid_cols": 6},
                    {"key": "palpacion_quirurgica_rebote", "label": "Palpación Quirúrgica y Signos de Irritación Peritoneal", "tipo": "select", "opciones": ["Abdomen blando, depresible, no doloroso", "Signo de Murphy (+) clínico evidente (vesícula dolorosa)", "Signo de Blumberg (+) rebote positivo fosa ilíaca derecha", "Abdomen en tabla con contractura involuntaria (peritonitis)", "Dolor difuso a la descompresión"], "requerido": True, "grid_cols": 6},
                    {"key": "orificios_herniarios_anillos", "label": "Examen de Orificios Herniarios", "tipo": "select", "opciones": ["Anillos inguinales y umbilical libres sin protrusión", "Hernia inguinal reducible con impulso a la tos", "Hernia inguinal incarcerada dolorosa (urgencia)", "Hernia umbilical con anillo > 2 cm", "Hernia epigástrica de la línea alba"], "requerido": True, "grid_cols": 6},
                    {"key": "clasificacion_riesgo_asa", "label": "Riesgo Quirúrgico Estimado (Escala ASA)", "tipo": "select", "opciones": ["ASA I: Paciente sano sin comorbilidades", "ASA II: Enfermedad sistémica leve controlada", "ASA III: Enfermedad sistémica severa pero no incapacitante", "ASA IV: Enfermedad severa con amenaza constante a la vida"], "requerido": True, "grid_cols": 6},
                    {"key": "procedimiento_propuesto", "label": "Procedimiento Quirúrgico Propuesto y Conducta", "tipo": "textarea", "placeholder": "Colecistectomía laparoscópica electiva programada, Hernioplastia inguinal con malla de polipropileno (técnica Lichtenstein), consentimientos informados...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    # ── 10. ENDOCRINOLOGÍA ──
    "endocrinologia": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_endo_historia",
                "titulo": "Antecedentes Metabólicos y Endocrinos",
                "descripcion": "Control glicémico, función tiroidea y síntomas hormonales",
                "icono": "HeartPulse",
                "campos": [
                    {"key": "motivo_endocrino", "label": "Motivo principal de consulta endocrina", "tipo": "select", "opciones": ["Diabetes Mellitus (debut o control)", "Hipotiroidismo / Tiroiditis de Hashimoto", "Hipertiroidismo / Bocio difuso o nodular", "Obesidad mórbida / Síndrome Metabólico", "Nódulo tiroideo en estudio ecográfico", "Osteopenia / Osteoporosis / Calcio", "Hiperprolactinemia / Alteraciones gonadales"], "requerido": True, "grid_cols": 12},
                    {"key": "control_hba1c", "label": "Último valor de Hemoglobina Glicosilada (HbA1c)", "tipo": "select", "opciones": ["HbA1c menor a 6.5% (Óptimo)", "HbA1c entre 6.5% y 7.5% (Aceptable)", "HbA1c entre 7.6% y 9.0% (Subóptimo)", "HbA1c mayor a 9.0% (Descompensado)", "No se ha realizado en más de 6 meses"], "requerido": False, "grid_cols": 6},
                    {"key": "sintomas_tiroideos", "label": "Síntomas tiroideos o neurovegetativos", "tipo": "multiselect", "opciones": ["Intolerancia al frío", "Intolerancia al calor y diaforesis", "Palpitaciones o temblor en manos", "Caída acentuada del cabello y piel seca", "Insomnio y ansiedad", "Constipación persistente", "Somnolencia diurna excesiva"], "requerido": False, "grid_cols": 12},
                    {"key": "tratamiento_actual_hormonal", "label": "¿Toma Levotiroxina, Insulina o Antidiabéticos?", "tipo": "text", "placeholder": "Indique dosis actual (ej. Eutirox 50 mcg, Metformina 850 mg...)", "requerido": False, "grid_cols": 12}
                ]
            }
        ],
        "esquema_consulta": [
            get_signos_vitales_adulto("con_endo_signos"),
            {
                "id": "con_endo_examen",
                "titulo": "Exploración Física Endocrina y Metabólica",
                "descripcion": "Palpación tiroidea, piel, distribución de tejido adiposo y pie diabético",
                "icono": "Activity",
                "campos": [
                    {"key": "glicemia_capilar_consulta", "label": "Glicemia Capilar en Consulta (HGT)", "tipo": "number", "unidad": "mg/dL", "min_val": 30, "max_val": 600, "requerido": False, "grid_cols": 4},
                    {"key": "palpacion_tiroides", "label": "Palpación de Glándula Tiroides", "tipo": "select", "opciones": ["Tiroides no palpable o de tamaño normal (<20g)", "Bocio difuso Grado I (palpable pero no visible con cuello extendido)", "Bocio Grado II (visible con el cuello en posición normal)", "Nódulo tiroideo solitario palpable firme", "Bocio multinodular"], "requerido": True, "grid_cols": 8},
                    {"key": "signos_resistencia_insulina", "label": "Signos de Resistencia a la Insulina en Piel", "tipo": "select", "opciones": ["Piel sin alteraciones metabólicas", "Acantosis nigricans leve en cuello / axilas", "Acantosis nigricans moderada a severa con acrocordones", "Hirsutismo clínico (Escala Ferriman > 8)"], "requerido": True, "grid_cols": 6},
                    {"key": "distribucion_grasa_visceral", "label": "Distribución del Tejido Adiposo", "tipo": "select", "opciones": ["Ginecoide (predominio en caderas y extremidades)", "Androide / Visceral (predominio abdominal central)", "Distribución homogénea armónica"], "requerido": False, "grid_cols": 6},
                    {"key": "examen_pie_diabetico", "label": "Examen de Pies en Paciente Diabético", "tipo": "select", "opciones": ["No aplica / Paciente no diabético", "Piel íntegra, pulsos presentes, sensibilidad monofilamento 10g normal", "Pérdida de sensibilidad protectora / Neuropatía sensitiva", "Callosidades o deformidad osteoarticular (dedos en garra)", "Úlcera activa presente (Clasificación Wagner I-II)"], "requerido": False, "grid_cols": 12},
                    {"key": "metas_terapeuticas_plan", "label": "Metas Terapéuticas y Plan Farmacológico", "tipo": "textarea", "placeholder": "Ajuste de dosis de levotiroxina, inicio de análogo GLP-1 o inhibidor SGLT2, metas de colesterol LDL < 70 mg/dL...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    # ── 11. TRAUMATOLOGÍA ──
    "traumatologia": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_trauma_mecanismo",
                "titulo": "Mecanismo de Lesión y Escala de Dolor",
                "descripcion": "Causa traumática, tiempo de evolución y capacidad de marcha",
                "icono": "Bone",
                "campos": [
                    {"key": "mecanismo_lesion", "label": "¿Cómo ocurrió la lesión o cuándo inició el dolor?", "tipo": "select", "opciones": ["Caída de propia altura", "Caída desde altura", "Accidente de tránsito / colisión", "Traumatismo deportivo", "Dolor insidioso / esfuerzo repetitivo", "Levantamiento de peso"], "requerido": True, "grid_cols": 6},
                    {"key": "tiempo_evolucion", "label": "Tiempo de evolución", "tipo": "select", "opciones": ["Menos de 24 horas (agudo)", "De 1 a 7 días", "De 1 a 4 semanas", "Crónico (> 1 mes)"], "requerido": True, "grid_cols": 6},
                    {"key": "intensidad_dolor", "label": "Intensidad del dolor (Escala EVA 1 al 10)", "tipo": "scale_1_10", "requerido": True, "grid_cols": 6},
                    {"key": "puede_caminar", "label": "¿Puede apoyar el miembro o mantenerse de pie?", "tipo": "boolean", "requerido": True, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            get_signos_vitales_adulto("con_trauma_signos"),
            {
                "id": "con_trauma_examen",
                "titulo": "Examen Osteoarticular Dirigido",
                "descripcion": "Inspección, palpación articular, arcos de movilidad y fuerza",
                "icono": "Bone",
                "campos": [
                    {"key": "region_afectada", "label": "Región Anatómica Lesionada", "tipo": "select", "opciones": ["Hombro / Clavícula", "Codo / Antebrazo", "Muñeca / Mano", "Columna Cervical", "Columna Lumbar / Pelvis", "Cadera / Muslo", "Rodilla", "Tobillo / Pie"], "requerido": True, "grid_cols": 6},
                    {"key": "inspeccion_deformidad", "label": "Inspección y Tumefacción", "tipo": "select", "opciones": ["Sin deformidad ni hematoma", "Edema localizado con eritema", "Deformidad anatómica evidente con crepitación", "Equimosis / Hematoma extenso", "Herida abierta (sospecha fractura expuesta)"], "requerido": True, "grid_cols": 6},
                    {"key": "movilidad_articular", "label": "Arcos de Movilidad Articular", "tipo": "select", "opciones": ["Completos y asintomáticos", "Completos pero con dolor en arcos extremos", "Limitación parcial del arco por dolor", "Bloqueo articular mecánico completo"], "requerido": True, "grid_cols": 6},
                    {"key": "fuerza_muscular_daniels", "label": "Fuerza Muscular (Escala Daniels)", "tipo": "select", "opciones": ["5/5 Normal contra resistencia máxima", "4/5 Vence resistencia moderada", "3/5 Vence gravedad solamente", "2/5 Movimiento solo sin gravedad", "0-1/5 Déficit motor severo"], "requerido": False, "grid_cols": 6},
                    {"key": "maniobras_especiales", "label": "Maniobras Especiales y Estabilidad Ligamentaria", "tipo": "textarea", "placeholder": "Pruebas de Lachman, cajón anterior/posterior, bostezo articular en valgo/varo, maniobra de Lasègue...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    # ── 12. NEFROLOGÍA ──
    "nefrologia": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_nefro_historia",
                "titulo": "Antecedentes Renales y Características de la Orina",
                "descripcion": "Función renal previa, proteinuria, edemas y diuresis",
                "icono": "Activity",
                "campos": [
                    {"key": "motivo_nefrologico", "label": "Motivo de valoración nefrológica", "tipo": "select", "opciones": ["Creatinina sérica elevada / Pérdida de función renal", "Proteinuria o microalbuminuria en orina", "Hematuria (sangre macro o microscópica en orina)", "Hipertensión Arterial resistente a >3 fármacos", "Litiasis renal recurrente / Cólicos nefríticos", "Edemas matutinos en párpados o piernas", "Enfermedad Renal Crónica avanzada en seguimiento"], "requerido": True, "grid_cols": 12},
                    {"key": "cambios_orina", "label": "Alteraciones percibidas en la orina", "tipo": "multiselect", "opciones": ["Orina con abundante espuma persistente", "Orina oscura / color té o refresco de cola", "Nicturia (levantarse > 2 veces de noche a orinar)", "Disminución notable del volumen urinario al día", "Dolor lumbar al orinar"], "requerido": True, "grid_cols": 12},
                    {"key": "edemas_matutinos", "label": "¿Despierta con los párpados hinchados o edemas faciales?", "tipo": "boolean", "requerido": True, "grid_cols": 6},
                    {"key": "consumo_nefrotoxicos", "label": "¿Consumo crónico de analgésicos AINEs o sustancias nefrotóxicas?", "tipo": "boolean", "requerido": False, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            get_signos_vitales_adulto("con_nefro_signos"),
            {
                "id": "con_nefro_examen",
                "titulo": "Exploración Física Nefrológica y Función Renal",
                "descripcion": "Estado volémico, edemas con fóvea, puntos renoureterales y Giordano",
                "icono": "Activity",
                "campos": [
                    {"key": "estado_volemico_edemas", "label": "Estado de Hidratación y Edema Periférico", "tipo": "select", "opciones": ["Euvolemico sin edemas periféricos", "Edema pretibial fóvea Grado I (+)", "Edema maleolar Grado II (++) con signo de fóvea claro", "Edema marcado hasta rodillas Grado III (+++)", "Anasarca generalizado (edema facial, extremidades y ascitis)"], "requerido": True, "grid_cols": 6},
                    {"key": "punopercusion_giordano", "label": "Puñopercusión Lumbar (Signo de Giordano)", "tipo": "select", "opciones": ["Negativa bilateral (no dolorosa)", "Positiva en fosa lumbar derecha", "Positiva en fosa lumbar izquierda", "Positiva bilateral"], "requerido": True, "grid_cols": 6},
                    {"key": "auscultacion_arterias_renales", "label": "Auscultación de Soplos en Arterias Renales", "tipo": "select", "opciones": ["Sin soplos audibles en hemiabdomen superior", "Soplo sistólico en flanco o epigastrio (sospecha estenosis arterial renal)"], "requerido": False, "grid_cols": 6},
                    {"key": "estadio_erc_tfge", "label": "Estadio Estimado de Enfermedad Renal Crónica (TFGe)", "tipo": "select", "opciones": ["Estadio 1: TFGe >= 90 ml/min con daño renal", "Estadio 2: TFGe 60-89 ml/min (leve)", "Estadio 3a: TFGe 45-59 ml/min (moderado)", "Estadio 3b: TFGe 30-44 ml/min (moderado a severo)", "Estadio 4: TFGe 15-29 ml/min (severo pre-diálisis)", "Estadio 5: TFGe < 15 ml/min o terapia de sustitución renal"], "requerido": True, "grid_cols": 6},
                    {"key": "conducta_nefroprotectora", "label": "Metas de Nefroprotección y Plan Terapéutico", "tipo": "textarea", "placeholder": "Ajuste de IECA/ARA-II, control estricto de PA < 120/80 mmHg, restricción proteica moderada, monitoreo de potasio y bicarbonato...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    # ── 13. PEDIATRÍA ──
    "pediatria": {
        "widgets_activos": ["percentiles_oms"],
        "esquema_preconsulta": [
            {
                "id": "pre_pedia_perinatal",
                "titulo": "Historia Perinatal y Vacunación",
                "descripcion": "Antecedentes del desarrollo y tamizaje pediátrico",
                "icono": "Baby",
                "campos": [
                    {"key": "semanas_gestacion_nacer", "label": "Semanas de gestación al nacer", "tipo": "number", "unidad": "sem", "min_val": 22, "max_val": 43, "requerido": True, "grid_cols": 6},
                    {"key": "tipo_parto", "label": "Vía de nacimiento", "tipo": "select", "opciones": ["Parto vaginal eutócico", "Cesárea electiva", "Cesárea de urgencia"], "requerido": True, "grid_cols": 6},
                    {"key": "peso_al_nacer", "label": "Peso al nacer en gramos", "tipo": "number", "unidad": "g", "min_val": 500, "max_val": 6000, "requerido": False, "grid_cols": 6},
                    {"key": "vacunas_al_dia", "label": "¿Tiene el esquema de vacunas al día?", "tipo": "boolean", "requerido": True, "grid_cols": 6},
                    {"key": "asiste_guarderia", "label": "¿Asiste a guardería o centro escolar?", "tipo": "boolean", "requerido": False, "grid_cols": 6},
                    {"key": "lactancia_materna", "label": "¿Recibió o recibe lactancia materna?", "tipo": "boolean", "requerido": False, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            {
                "id": "con_pedia_antropometria",
                "titulo": "Crecimiento Infantil y Somatometría",
                "descripcion": "Medidas para cálculo de curvas percentiles OMS",
                "icono": "Scale",
                "campos": [
                    {"key": "peso_actual", "label": "Peso Actual del Niño/a", "tipo": "number", "unidad": "kg", "min_val": 1.0, "max_val": 120.0, "requerido": True, "grid_cols": 4},
                    {"key": "talla_actual", "label": "Talla / Longitud", "tipo": "number", "unidad": "cm", "min_val": 30.0, "max_val": 200.0, "requerido": True, "grid_cols": 4},
                    {"key": "perimetro_cefalico", "label": "Perímetro Cefálico", "tipo": "number", "unidad": "cm", "min_val": 25.0, "max_val": 65.0, "requerido": False, "grid_cols": 4},
                    {"key": "desarrollo_psicomotor", "label": "Hitos del Desarrollo Psicomotor", "tipo": "select", "opciones": ["Acordes para la edad cronológica", "Alerta: retraso en motricidad gruesa", "Alerta: retraso de lenguaje / comunicación", "Retraso global en evaluación"], "requerido": False, "grid_cols": 6},
                    {"key": "fontanela_anterior", "label": "Estado de Fontanela Anterior (lactantes)", "tipo": "select", "opciones": ["Normotensa", "Abombada / Tensa", "Deprimida (signo de deshidratación)", "Cerrada"], "requerido": False, "grid_cols": 6},
                    {"key": "orofaringe_otoscopia", "label": "Examen de Faringe y Oídos", "tipo": "textarea", "placeholder": "Membranas timpánicas íntegras y translúcidas, amígdalas sin exudados...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    # ── 14. UROLOGÍA ──
    "urologia": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_uro_sintomas",
                "titulo": "Sintomatología Urinaria y Salud Prostática",
                "descripcion": "Interrogatorio de síntomas del tracto urinario inferior y función sexual",
                "icono": "Activity",
                "campos": [
                    {"key": "motivo_urologico", "label": "Motivo principal de consulta urológica", "tipo": "select", "opciones": ["Síntomas prostáticos obstructivos (chorro débil, goteo)", "Disuria / Dolor o ardor al orinar", "Hematuria (sangre visible en la orina)", "Litiasis urinaria / Cólico nefrítico", "Control preventivo de Antígeno Prostático (PSA)", "Disfunción eréctil / Salud sexual", "Masa, nódulo o dolor testicular"], "requerido": True, "grid_cols": 12},
                    {"key": "sintomas_ipss_obstructivos", "label": "Puntuación Internacional de Síntomas Prostáticos (IPSS)", "tipo": "select", "opciones": ["Síntomas leves (Puntuación 0 a 7)", "Síntomas moderados (Puntuación 8 a 19)", "Síntomas severos (Puntuación 20 a 35)"], "requerido": True, "grid_cols": 6},
                    {"key": "nicturia_frecuencia", "label": "¿Cuántas veces se levanta por la noche a orinar (Nicturia)?", "tipo": "select", "opciones": ["Ninguna o 1 vez", "2 a 3 veces", "4 o más veces por noche"], "requerido": True, "grid_cols": 6},
                    {"key": "retencion_urinaria_previa", "label": "¿Ha presentado retención aguda de orina que requirió sonda?", "tipo": "boolean", "requerido": False, "grid_cols": 6},
                    {"key": "antecedente_cancer_prostata", "label": "¿Familiares directos con cáncer de próstata?", "tipo": "boolean", "requerido": True, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            get_signos_vitales_adulto("con_uro_signos"),
            {
                "id": "con_uro_examen",
                "titulo": "Examen Físico Urológico y Tacto Rectal",
                "descripcion": "Genitales masculinos, palpación renal, globo vesical y próstata",
                "icono": "Activity",
                "campos": [
                    {"key": "palpacion_globo_vesical", "label": "Palpación Abdominal y Globo Vesical", "tipo": "select", "opciones": ["Abdomen blando sin globo vesical palpable", "Globo vesical palpable a nivel hipogástrico (retención)", "Puntos ureterales superiores dolorosos a la palpación"], "requerido": True, "grid_cols": 6},
                    {"key": "genitales_masculinos", "label": "Examen de Genitales Externos", "tipo": "select", "opciones": ["Meato uretral normal, testículos en bolsa simétricos", "Varicocele palpable grado II-III", "Hidrocele testicular traslúcido", "Quiste de epidídimo palpable indoloro", "Placa fibrosa en dorso peneano (Peyronie)"], "requerido": True, "grid_cols": 6},
                    {"key": "tacto_rectal_prostatico", "label": "Tacto Rectal Prostático (DRE)", "tipo": "select", "opciones": ["Próstata Grado I (~20g) fibroelástica, simétrica, no dolorosa", "Próstata Grado II (30-40g) difusa benigna", "Próstata Grado III-IV (>50g) hipertrofia benigna obstructiva", "Nódulo pétreo / irregular sospechoso de malignidad", "Tacto rectal no realizado en esta consulta"], "requerido": True, "grid_cols": 6},
                    {"key": "psa_valor_reciente", "label": "Último valor de Antígeno Prostático Específico (PSA Total)", "tipo": "text", "placeholder": "Ej. 1.4 ng/mL, 4.8 ng/mL con PSA Libre 18%...", "requerido": False, "grid_cols": 6},
                    {"key": "plan_urologico_conducta", "label": "Impresión Diagnóstica y Plan Urológico", "tipo": "textarea", "placeholder": "Indicación de Uroflujometría, ecografía prostática transrectal o vesicoprostática, inicio de alfa-bloqueante (Tamsulosina)...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    # ── COMPATIBILIDAD CON OTRAS ESPECIALIDADES ──
    "cardiologia": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_cardio_sintomas",
                "titulo": "Síntomas Cardiovasculares y Riesgo",
                "descripcion": "Interrogatorio previo de sintomatología cardíaca",
                "icono": "HeartPulse",
                "campos": [
                    {"key": "dolor_pecho", "label": "¿Ha presentado opresión o dolor en el pecho?", "tipo": "boolean", "requerido": True, "grid_cols": 6},
                    {"key": "disnea_grado", "label": "¿Dificultad respiratoria al caminar o recostarse?", "tipo": "select", "opciones": ["Sin disnea", "Disnea a grandes esfuerzos", "Disnea a moderados esfuerzos (1-2 cuadras)", "Disnea a mínimos esfuerzos / Ortopnea nocturna"], "requerido": True, "grid_cols": 6},
                    {"key": "palpitaciones", "label": "¿Episodios de taquicardia o palpitaciones fuertes?", "tipo": "boolean", "requerido": False, "grid_cols": 6},
                    {"key": "sincope_mareos", "label": "¿Episodios de desmayo (síncope) o mareos posturales?", "tipo": "boolean", "requerido": False, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            get_signos_vitales_adulto("con_cardio_signos"),
            {
                "id": "con_cardio_hemodinamia",
                "titulo": "Evaluación Cardíaca y Ritmo",
                "descripcion": "Auscultación cardiovascular y electrocardiograma",
                "icono": "Activity",
                "campos": [
                    {"key": "ritmo_cardiaco", "label": "Ritmo Cardíaco en Auscultación", "tipo": "select", "opciones": ["Sinusal rítmico", "Arritmia completa (posible FA)", "Extrasístoles frecuentes", "Bradicardia sinusal", "Taquicardia sinusal"], "requerido": True, "grid_cols": 6},
                    {"key": "soplos_cardiacos", "label": "Presencia de Soplos", "tipo": "select", "opciones": ["Sin soplos audibles", "Soplo sistólico Grado I-II/VI", "Soplo sistólico Grado III-IV/VI", "Soplo diastólico"], "requerido": True, "grid_cols": 6},
                    {"key": "edema_miembros", "label": "Edema en Extremidades Inferiores", "tipo": "select", "opciones": ["Sin edema", "Edema pretibial Grado I (+)", "Edema maleolar Grado II (++)", "Edema Grado III-IV"], "requerido": False, "grid_cols": 6},
                    {"key": "ecg_interpretacion", "label": "Interpretación de Electrocardiograma (ECG)", "tipo": "textarea", "placeholder": "Ritmo sinusal, FC 72 lpm, Eje QRS normal...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    "odontologia": {
        "widgets_activos": ["odontograma"],
        "esquema_preconsulta": [
            {
                "id": "pre_odonto_salud",
                "titulo": "Salud Bucal y Hábitos Odontológicos",
                "descripcion": "Motivo dental, sensibilidad y antecedentes",
                "icono": "Smile",
                "campos": [
                    {"key": "motivo_atencion_dental", "label": "Motivo principal de consulta", "tipo": "select", "opciones": ["Limpieza / Profilaxis y revisión", "Dolor agudo de muela o diente", "Caries visible", "Estética / Blanqueamiento", "Valoración ortodoncia", "Prótesis o implante"], "requerido": True, "grid_cols": 12},
                    {"key": "sangrado_encias", "label": "¿Sangran sus encías al cepillarse?", "tipo": "boolean", "requerido": True, "grid_cols": 6},
                    {"key": "sensibilidad_dental", "label": "¿Presenta sensibilidad intensa al frío o calor?", "tipo": "boolean", "requerido": True, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            {
                "id": "con_odonto_periodonto",
                "titulo": "Periodonto, Mucosas y ATM",
                "descripcion": "Exploración de encías, articulación y oclusión",
                "icono": "Smile",
                "campos": [
                    {"key": "higiene_bucal", "label": "Índice de Higiene Bucal", "tipo": "select", "opciones": ["Excelente / Sin placa bacteriana", "Buena con placa leve", "Deficiente con abundante sarro"], "requerido": True, "grid_cols": 6},
                    {"key": "estado_periodontal", "label": "Diagnóstico Periodontal", "tipo": "select", "opciones": ["Periodonto sano", "Gingivitis inducida por placa", "Periodontitis Estadio I-II"], "requerido": True, "grid_cols": 6},
                    {"key": "notas_odontograma", "label": "Plan de Tratamiento Odontológico", "tipo": "textarea", "placeholder": "Detalle de piezas a obturar, endodoncias requeridas...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    },

    "oftalmologia": {
        "widgets_activos": ["refraccion"],
        "esquema_preconsulta": [
            {
                "id": "pre_oftalmo_historia",
                "titulo": "Salud Ocular y Uso de Corrección",
                "descripcion": "Antecedentes visuales y síntomas reportados",
                "icono": "Eye",
                "campos": [
                    {"key": "usa_lentes_actualmente", "label": "¿Utiliza lentes actualmente?", "tipo": "select", "opciones": ["No uso", "Para ver de lejos", "Para lectura / cerca", "Bifocales / Progresivos"], "requerido": True, "grid_cols": 6},
                    {"key": "sintomas_oculares", "label": "Síntomas oculares principales", "tipo": "multiselect", "opciones": ["Visión borrosa", "Cansancio visual en pantallas", "Ojo rojo o inflamado", "Ardor o arenilla"], "requerido": True, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            {
                "id": "con_oftalmo_agudeza",
                "titulo": "Agudeza Visual y Presión Intraocular",
                "descripcion": "Cartilla de Snellen y tonometría",
                "icono": "Eye",
                "campos": [
                    {"key": "agudeza_od_sin_lentes", "label": "Agudeza Visual Ojo Derecho (OD)", "tipo": "select", "opciones": ["20/20", "20/25", "20/30", "20/40", "20/50", "20/70", "20/100", "20/200"], "requerido": True, "grid_cols": 6},
                    {"key": "agudeza_oi_sin_lentes", "label": "Agudeza Visual Ojo Izquierdo (OI)", "tipo": "select", "opciones": ["20/20", "20/25", "20/30", "20/40", "20/50", "20/70", "20/100", "20/200"], "requerido": True, "grid_cols": 6},
                    {"key": "pio_od", "label": "Presión Intraocular OD (PIO)", "tipo": "number", "unidad": "mmHg", "min_val": 4, "max_val": 60, "requerido": True, "grid_cols": 6},
                    {"key": "pio_oi", "label": "Presión Intraocular OI (PIO)", "tipo": "number", "unidad": "mmHg", "min_val": 4, "max_val": 60, "requerido": True, "grid_cols": 6}
                ]
            }
        ]
    },

    "dermatologia": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_derma_lesion",
                "titulo": "Evolución de la Lesión Cutánea",
                "descripcion": "Tiempo de evolución y sintomatología en piel",
                "icono": "ShieldCheck",
                "campos": [
                    {"key": "tiempo_aparicion", "label": "¿Cuánto tiempo tiene con la lesión?", "tipo": "select", "opciones": ["Días (reciente)", "Semanas", "Meses", "Años / Congénita"], "requerido": True, "grid_cols": 6},
                    {"key": "sintomas_lesion", "label": "Síntomas asociados", "tipo": "multiselect", "opciones": ["Prurito (comezón intensa)", "Dolor o ardor", "Sangrado espontáneo o al roce", "Aumento rápido de tamaño"], "requerido": True, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            get_signos_vitales_adulto("con_derma_signos"),
            {
                "id": "con_derma_examen",
                "titulo": "Dermatoscopía y Morfología Cutánea",
                "descripcion": "Topografía, tipo de lesión elemental y conducta",
                "icono": "Eye",
                "campos": [
                    {"key": "topografia", "label": "Localización Anatómica", "tipo": "text", "placeholder": "Ej. Región malar izquierda, dorso de la mano...", "requerido": True, "grid_cols": 6},
                    {"key": "tipo_lesion_elemental", "label": "Lesión Elemental Primaria", "tipo": "select", "opciones": ["Mácula / Mancha", "Pápula", "Placa", "Nódulo", "Vesícula / Ampolla", "Pústula"], "requerido": True, "grid_cols": 6},
                    {"key": "plan_dermatologico", "label": "Impresión Diagnóstica y Conducta", "tipo": "textarea", "placeholder": "Tratamiento tópico indicado, biopsia programada...", "requerido": False, "grid_cols": 12}
                ]
            }
        ]
    }
}


def get_template_for_specialty(name: str) -> Dict[str, Any]:
    """Retorna la plantilla clínica correspondiente a una especialidad normalizando su nombre."""
    key = normalize_specialty_name(name)
    if key in DEFAULT_CLINICAL_TEMPLATES:
        return DEFAULT_CLINICAL_TEMPLATES[key]
    
    # Búsqueda por subcadena si no hubo coincidencia exacta
    for k, template in DEFAULT_CLINICAL_TEMPLATES.items():
        if k in key or key in k:
            return template
            
    # Fallback a medicina general
    return DEFAULT_CLINICAL_TEMPLATES.get("medicina general", {
        "widgets_activos": [],
        "esquema_preconsulta": [],
        "esquema_consulta": []
    })
