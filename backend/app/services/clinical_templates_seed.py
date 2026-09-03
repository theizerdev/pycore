"""
Catálogo de plantillas clínicas sugeridas por especialidad médica.
Contiene preguntas de preconsulta (interrogatorio/triaje) y campos de examen clínico para la consulta médica.
"""
from typing import Dict, Any

DEFAULT_CLINICAL_TEMPLATES: Dict[str, Dict[str, Any]] = {
    # ── MEDICINA GENERAL ──
    "medicina general": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_medgen_motivo",
                "titulo": "Motivo y Antecedentes Generales",
                "descripcion": "Interrogatorio previo para triaje y orientación médica",
                "icono": "ClipboardList",
                "campos": [
                    {
                        "key": "motivo_consulta",
                        "label": "¿Cuál es el motivo principal de su visita?",
                        "tipo": "textarea",
                        "placeholder": "Describa brevemente los síntomas principales que presenta...",
                        "requerido": True,
                        "grid_cols": 12
                    },
                    {
                        "key": "alergias_medicamentos",
                        "label": "¿Tiene alergia a algún medicamento o sustancia?",
                        "tipo": "select",
                        "opciones": ["Ninguna conocida", "Penicilina / Amoxicilina", "AINEs (Ibuprofeno, Aspirina)", "Sulfas", "Otros antibióticos", "Múltiples alergias"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {
                        "key": "enfermedades_cronicas",
                        "label": "Enfermedades o diagnósticos previos",
                        "tipo": "multiselect",
                        "opciones": ["Hipertensión Arterial", "Diabetes Mellitus", "Asma / EPOC", "Dislipidemia", "Hipotiroidismo", "Cardiopatía", "Ninguna"],
                        "requerido": False,
                        "grid_cols": 6
                    },
                    {
                        "key": "fuma",
                        "label": "¿Consume tabaco o cigarrillos?",
                        "tipo": "boolean",
                        "requerido": False,
                        "grid_cols": 6
                    },
                    {
                        "key": "alcohol",
                        "label": "Frecuencia de consumo de alcohol",
                        "tipo": "select",
                        "opciones": ["No consume", "Ocasional (social)", "Moderado (semanal)", "Frecuente"],
                        "requerido": False,
                        "grid_cols": 6
                    }
                ]
            }
        ],
        "esquema_consulta": [
            {
                "id": "con_medgen_signos",
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
            },
            {
                "id": "con_medgen_examen",
                "titulo": "Examen Físico Segmentario",
                "descripcion": "Inspección, palpación y auscultación",
                "icono": "Stethoscope",
                "campos": [
                    {
                        "key": "aspecto_general",
                        "label": "Estado General / Conciencia",
                        "tipo": "select",
                        "opciones": ["Alerta, orientado en 3 esferas", "Somnoliento / Apatía", "Facies álgica", "Dificultad respiratoria evidente"],
                        "requerido": False,
                        "grid_cols": 6
                    },
                    {
                        "key": "escala_dolor",
                        "label": "Escala Visual Analógica del Dolor (EVA)",
                        "tipo": "scale_1_10",
                        "requerido": False,
                        "grid_cols": 6
                    },
                    {
                        "key": "cardiopulmonar",
                        "label": "Auscultación Cardiopulmonar",
                        "tipo": "textarea",
                        "placeholder": "Ruidos cardíacos rítmicos normofonéticos, murmullo vesicular presente sin agregados...",
                        "requerido": False,
                        "grid_cols": 12
                    },
                    {
                        "key": "abdomen",
                        "label": "Examen Abdominal",
                        "tipo": "select",
                        "opciones": ["Blando, depresible, no doloroso", "Dolor localizado a la palpación", "Defensa muscular / Peritonismo", "Meteorismo / Distensión"],
                        "requerido": False,
                        "grid_cols": 12
                    }
                ]
            }
        ]
    },

    # ── CARDIOLOGÍA ──
    "cardiología": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_cardio_sintomas",
                "titulo": "Síntomas Cardiovasculares y Riesgo",
                "descripcion": "Interrogatorio previo de sintomatología cardíaca",
                "icono": "HeartPulse",
                "campos": [
                    {"key": "dolor_pecho", "label": "¿Ha presentado opresión o dolor en el pecho?", "tipo": "boolean", "requerido": True, "grid_cols": 6},
                    {
                        "key": "disnea_grado",
                        "label": "¿Dificultad respiratoria al caminar o recostarse?",
                        "tipo": "select",
                        "opciones": ["Sin disnea", "Disnea a grandes esfuerzos", "Disnea a moderados esfuerzos (1-2 cuadras)", "Disnea a mínimos esfuerzos / Ortopnea nocturna"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {"key": "palpitaciones", "label": "¿Episodios de taquicardia o palpitaciones fuertes?", "tipo": "boolean", "requerido": False, "grid_cols": 6},
                    {"key": "sincope_mareos", "label": "¿Episodios de desmayo (síncope) o mareos posturales?", "tipo": "boolean", "requerido": False, "grid_cols": 6},
                    {"key": "antecedente_infarto_familiar", "label": "¿Padre o madre con infarto antes de los 55 años?", "tipo": "boolean", "requerido": False, "grid_cols": 12}
                ]
            }
        ],
        "esquema_consulta": [
            {
                "id": "con_cardio_hemodinamia",
                "titulo": "Evaluación Cardíaca y Ritmo",
                "descripcion": "Parámetros y auscultación cardiovascular avanzada",
                "icono": "Activity",
                "campos": [
                    {"key": "ta_sentado", "label": "Presión Arterial (Sentado)", "tipo": "text", "placeholder": "Ej. 120/80 mmHg", "requerido": True, "grid_cols": 4},
                    {"key": "ta_bipedestacion", "label": "Presión Arterial (De pie)", "tipo": "text", "placeholder": "Ej. 118/78 mmHg", "requerido": False, "grid_cols": 4},
                    {"key": "frecuencia_cardiaca", "label": "Frecuencia Cardíaca", "tipo": "number", "unidad": "lpm", "requerido": True, "grid_cols": 4},
                    {
                        "key": "ritmo_cardiaco",
                        "label": "Ritmo Cardíaco en Auscultación",
                        "tipo": "select",
                        "opciones": ["Sinusal rítmico", "Arritmia completa (posible FA)", "Extrasístoles frecuentes", "Bradicardia sinusal", "Taquicardia sinusal"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {
                        "key": "soplos_cardiacos",
                        "label": "Presencia de Soplos",
                        "tipo": "select",
                        "opciones": ["Sin soplos audibles", "Soplo sistólico Grado I-II/VI", "Soplo sistólico Grado III-IV/VI", "Soplo diastólico", "Chasquido de apertura / Clic"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {
                        "key": "edema_miembros",
                        "label": "Edema en Extremidades Inferiores",
                        "tipo": "select",
                        "opciones": ["Sin edema", "Edema pretibial Grado I (+)", "Edema maleolar Grado II (++)", "Edema infra/suprarotuliano Grado III-IV"],
                        "requerido": False,
                        "grid_cols": 6
                    },
                    {
                        "key": "ingurgitacion_yugular",
                        "label": "Ingurgitación Yugular a 45°",
                        "tipo": "select",
                        "opciones": ["Ausente (Normal)", "Grado I", "Grado II", "Grado III con reflujo hepatoyugular"],
                        "requerido": False,
                        "grid_cols": 6
                    },
                    {
                        "key": "ecg_interpretacion",
                        "label": "Interpretación de Electrocardiograma (ECG)",
                        "tipo": "textarea",
                        "placeholder": "Ritmo sinusal, FC 72 lpm, Eje QRS +60°, sin alteraciones de la repolarización ventricular...",
                        "requerido": False,
                        "grid_cols": 12
                    }
                ]
            }
        ]
    },

    # ── PEDIATRÍA ──
    "pediatría": {
        "widgets_activos": ["percentiles_oms"],
        "esquema_preconsulta": [
            {
                "id": "pre_pedia_perinatal",
                "titulo": "Historia Perinatal y Vacunación",
                "descripcion": "Antecedentes del desarrollo y tamizaje pediátrico",
                "icono": "Baby",
                "campos": [
                    {"key": "semanas_gestacion_nacer", "label": "Semanas de gestación al nacer", "tipo": "number", "unidad": "semanas", "min_val": 22, "max_val": 43, "requerido": True, "grid_cols": 6},
                    {
                        "key": "tipo_parto",
                        "label": "Vía de nacimiento",
                        "tipo": "select",
                        "opciones": ["Parto vaginal eutócico", "Cesárea electiva", "Cesárea de urgencia"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {"key": "peso_al_nacer", "label": "Peso al nacer", "tipo": "number", "unidad": "gramos", "min_val": 500, "max_val": 6000, "requerido": False, "grid_cols": 6},
                    {"key": "vacunas_al_dia", "label": "¿Tiene el esquema de vacunas al día?", "tipo": "boolean", "requerido": True, "grid_cols": 6},
                    {"key": "asiste_guarderia", "label": "¿Asiste a guardería o centro educativo?", "tipo": "boolean", "requerido": False, "grid_cols": 6},
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
                    {
                        "key": "desarrollo_psicomotor",
                        "label": "Hitos del Desarrollo Psicomotor",
                        "tipo": "select",
                        "opciones": ["Acordes para la edad cronológica", "Alerta: retraso en motricidad gruesa", "Alerta: retraso de lenguaje / comunicación", "Retraso global en evaluación"],
                        "requerido": False,
                        "grid_cols": 6
                    },
                    {
                        "key": "fontanela_anterior",
                        "label": "Estado de Fontanela Anterior (lactantes)",
                        "tipo": "select",
                        "opciones": ["Normotensa", "Abombada / Tensa", "Deprimida (signo de deshidratación)", "Cerrada"],
                        "requerido": False,
                        "grid_cols": 6
                    },
                    {
                        "key": "orofaringe_otoscopia",
                        "label": "Examen de Faringe y Oídos",
                        "tipo": "textarea",
                        "placeholder": "Membranas timpánicas íntegras y translúcidas, amígdalas sin exudados...",
                        "requerido": False,
                        "grid_cols": 12
                    }
                ]
            }
        ]
    },

    # ── GINECOLOGÍA Y OBSTETRICIA ──
    "ginecología y obstetricia": {
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
                    {
                        "key": "metodo_anticonceptivo",
                        "label": "Método anticonceptivo que utiliza",
                        "tipo": "select",
                        "opciones": ["Ninguno", "Anticonceptivos orales", "DIU Cobre", "DIU Hormonal (Mirena/Kyleena)", "Implante subdérmico", "Inyección mensual/trimestral", "Preservativo"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {"key": "menarquia_edad", "label": "Edad de la primera menstruación (Menarquia)", "tipo": "number", "unidad": "años", "min_val": 8, "max_val": 20, "requerido": False, "grid_cols": 6},
                    {"key": "gestas", "label": "Número de Gestas (G)", "tipo": "number", "min_val": 0, "max_val": 20, "requerido": True, "grid_cols": 3},
                    {"key": "partos", "label": "Partos vaginales (P)", "tipo": "number", "min_val": 0, "max_val": 20, "requerido": True, "grid_cols": 3},
                    {"key": "cesareas", "label": "Cesáreas (C)", "tipo": "number", "min_val": 0, "max_val": 20, "requerido": True, "grid_cols": 3},
                    {"key": "abortos", "label": "Abortos / Pérdidas (A)", "tipo": "number", "min_val": 0, "max_val": 20, "requerido": True, "grid_cols": 3}
                ]
            }
        ],
        "esquema_consulta": [
            {
                "id": "con_gineco_examen",
                "titulo": "Evaluación Ginecológica y Obstétrica",
                "descripcion": "Citología, control prenatal y exploración pélvica",
                "icono": "ShieldCheck",
                "campos": [
                    {"key": "fecha_ultima_citologia", "label": "Fecha de última Citología / Pap", "tipo": "date", "requerido": False, "grid_cols": 6},
                    {
                        "key": "resultado_citologia_previa",
                        "label": "Resultado citológico previo",
                        "tipo": "select",
                        "opciones": ["Negativo para lesión intraepitelial / Normal", "ASCUS", "LIE Bajo Grado (VPH)", "LIE Alto Grado", "Pendiente / Primera vez"],
                        "requerido": False,
                        "grid_cols": 6
                    },
                    {"key": "altura_uterina", "label": "Altura Uterina (embarazadas)", "tipo": "number", "unidad": "cm", "min_val": 10, "max_val": 50, "requerido": False, "grid_cols": 4},
                    {"key": "fcf", "label": "Frecuencia Cardíaca Fetal (FCF)", "tipo": "number", "unidad": "lpm", "min_val": 100, "max_val": 190, "requerido": False, "grid_cols": 4},
                    {
                        "key": "movimientos_fetales",
                        "label": "Movimientos Fetales",
                        "tipo": "select",
                        "opciones": ["No aplica (no embarazada / <18 sem)", "Presentes y activos", "Disminuidos", "Ausentes"],
                        "requerido": False,
                        "grid_cols": 4
                    },
                    {
                        "key": "examen_mamas",
                        "label": "Examen Clínico de Mamas",
                        "tipo": "select",
                        "opciones": ["Sin nódulos ni masas palpables", "Nódulo palpable cuadrante superior externo", "Nódulo cuadrante interno", "Dolor mamario cíclico / Mastalgia", "Secreción por pezón"],
                        "requerido": False,
                        "grid_cols": 12
                    }
                ]
            }
        ]
    },

    # ── ODONTOLOGÍA ──
    "odontología": {
        "widgets_activos": ["odontograma"],
        "esquema_preconsulta": [
            {
                "id": "pre_odonto_salud",
                "titulo": "Salud Bucal y Hábitos Odontológicos",
                "descripcion": "Motivo dental, sensibilidad y antecedentes",
                "icono": "Sparkles",
                "campos": [
                    {
                        "key": "motivo_atencion_dental",
                        "label": "Motivo principal de consulta",
                        "tipo": "select",
                        "opciones": ["Limpieza / Profilaxis y revisión", "Dolor agudo de muela o diente", "Caries visible", "Estética / Blanqueamiento dental", "Valoración ortodoncia", "Prótesis o implante dental", "Extracción"],
                        "requerido": True,
                        "grid_cols": 12
                    },
                    {"key": "sangrado_encias", "label": "¿Sangran sus encías al cepillarse o usar hilo dental?", "tipo": "boolean", "requerido": True, "grid_cols": 6},
                    {"key": "sensibilidad_dental", "label": "¿Presenta sensibilidad intensa al frío, calor o dulces?", "tipo": "boolean", "requerido": True, "grid_cols": 6},
                    {"key": "bruxismo", "label": "¿Aprieta o rechina los dientes de noche (bruxismo)?", "tipo": "boolean", "requerido": False, "grid_cols": 6},
                    {"key": "anestesia_dental_previa", "label": "¿Ha tenido reacciones adversas a la anestesia dental?", "tipo": "boolean", "requerido": True, "grid_cols": 6}
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
                    {
                        "key": "higiene_bucal",
                        "label": "Índice de Higiene Bucal",
                        "tipo": "select",
                        "opciones": ["Excelente / Sin placa bacteriana", "Buena con placa leve", "Aceptable con cálculo supragingival", "Deficiente con abundante sarro"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {
                        "key": "estado_periodontal",
                        "label": "Diagnóstico Periodontal",
                        "tipo": "select",
                        "opciones": ["Periodonto sano", "Gingivitis inducida por placa", "Periodontitis Estadio I (Leve)", "Periodontitis Estadio II-III (Moderada/Avanzada)"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {
                        "key": "atm_evaluacion",
                        "label": "Articulación Temporomandibular (ATM)",
                        "tipo": "select",
                        "opciones": ["Apertura normal sin chasquidos ni dolor", "Chasquido / Clic unilateral", "Chasquido bilateral", "Dolor a la palpación preauricular", "Limitación de apertura"],
                        "requerido": False,
                        "grid_cols": 6
                    },
                    {
                        "key": "oclusion_dental",
                        "label": "Relación Oclusal (Angle)",
                        "tipo": "select",
                        "opciones": ["Clase I (Normoclusión)", "Clase II División 1", "Clase II División 2", "Clase III"],
                        "requerido": False,
                        "grid_cols": 6
                    },
                    {
                        "key": "notas_odontograma",
                        "label": "Plan de Tratamiento y Prioridad",
                        "tipo": "textarea",
                        "placeholder": "Detalle de piezas a obturar con resina, endodoncias requeridas, citas programadas...",
                        "requerido": False,
                        "grid_cols": 12
                    }
                ]
            }
        ]
    },

    # ── OFTALMOLOGÍA ──
    "oftalmología": {
        "widgets_activos": ["refraccion"],
        "esquema_preconsulta": [
            {
                "id": "pre_oftalmo_historia",
                "titulo": "Salud Ocular y Uso de Corrección",
                "descripcion": "Antecedentes visuales y síntomas reportados",
                "icono": "Eye",
                "campos": [
                    {
                        "key": "usa_lentes_actualmente",
                        "label": "¿Utiliza lentes o anteojos en este momento?",
                        "tipo": "select",
                        "opciones": ["No uso", "Para ver de lejos", "Para lectura / cerca", "Bifocales / Progresivos", "Lentes de contacto blandos", "Lentes de contacto rígidos"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {
                        "key": "sintomas_oculares",
                        "label": "Síntomas oculares principales",
                        "tipo": "multiselect",
                        "opciones": ["Visión borrosa", "Cansancio visual al trabajar en pantallas", "Ojo rojo o inflamado", "Ardor o sensación de arenilla", "Destellos de luz o moscas volantes", "Dolor ocular"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {"key": "antecedente_glaucoma", "label": "¿Familiares directos con Glaucoma o pérdida de visión?", "tipo": "boolean", "requerido": False, "grid_cols": 6},
                    {"key": "cirugia_ocular_previa", "label": "¿Ha tenido alguna cirugía ocular previa?", "tipo": "boolean", "requerido": False, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            {
                "id": "con_oftalmo_agudeza",
                "titulo": "Agudeza Visual y Presión Intraocular",
                "descripcion": "Cartilla de Snellen y tonometría de aplanación",
                "icono": "Eye",
                "campos": [
                    {
                        "key": "agudeza_od_sin_lentes",
                        "label": "Agudeza Visual Ojo Derecho (OD) sin corrección",
                        "tipo": "select",
                        "opciones": ["20/20", "20/25", "20/30", "20/40", "20/50", "20/70", "20/100", "20/200", "Cuenta dedos", "Mov. Manos", "Percepción de luz"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {
                        "key": "agudeza_oi_sin_lentes",
                        "label": "Agudeza Visual Ojo Izquierdo (OI) sin corrección",
                        "tipo": "select",
                        "opciones": ["20/20", "20/25", "20/30", "20/40", "20/50", "20/70", "20/100", "20/200", "Cuenta dedos", "Mov. Manos", "Percepción de luz"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {"key": "pio_od", "label": "Presión Intraocular OD (PIO)", "tipo": "number", "unidad": "mmHg", "min_val": 4, "max_val": 60, "requerido": True, "grid_cols": 6},
                    {"key": "pio_oi", "label": "Presión Intraocular OI (PIO)", "tipo": "number", "unidad": "mmHg", "min_val": 4, "max_val": 60, "requerido": True, "grid_cols": 6},
                    {
                        "key": "biomicroscopia_polo_anterior",
                        "label": "Biomicroscopía (Lámpara de Hendidura)",
                        "tipo": "textarea",
                        "placeholder": "Córnea transparente sin leucomas, cámara anterior profunda, iris normotrófico, cristalino transparente...",
                        "requerido": False,
                        "grid_cols": 12
                    },
                    {
                        "key": "fondo_de_ojo",
                        "label": "Fondo de Ojo / Oftalmoscopía",
                        "tipo": "textarea",
                        "placeholder": "Papila óptica de bordes netos, relación copa/disco 0.3, mácula sin alteraciones, vasos retinianos con calibre conservado...",
                        "requerido": False,
                        "grid_cols": 12
                    }
                ]
            }
        ]
    },

    # ── TRAUMATOLOGÍA Y ORTOPEDIA ──
    "traumatología y ortopedia": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_trauma_mecanismo",
                "titulo": "Mecanismo de Lesión y Dolor",
                "descripcion": "Causa traumática, tiempo de evolución y marcha",
                "icono": "Bone",
                "campos": [
                    {
                        "key": "mecanismo_lesion",
                        "label": "¿Cómo ocurrió la lesión o cuándo inició el dolor?",
                        "tipo": "select",
                        "opciones": ["Caída de propia altura", "Caída desde altura", "Accidente de tránsito / colisión", "Traumatismo deportivo", "Dolor insidioso / esfuerzo repetitivo", "Levantamiento de peso"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {
                        "key": "tiempo_evolucion",
                        "label": "Tiempo de evolución",
                        "tipo": "select",
                        "opciones": ["Menos de 24 horas (agudo)", "De 1 a 7 días", "De 1 a 4 semanas", "Crónico (> 1 mes)"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {"key": "intensidad_dolor", "label": "Intensidad de dolor inicial", "tipo": "scale_1_10", "requerido": True, "grid_cols": 6},
                    {"key": "puede_caminar", "label": "¿Puede apoyar el miembro / caminar?", "tipo": "boolean", "requerido": True, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            {
                "id": "con_trauma_examen",
                "titulo": "Examen Osteoarticular Dirigido",
                "descripcion": "Inspección, palpación articular y maniobras",
                "icono": "Bone",
                "campos": [
                    {
                        "key": "region_afectada",
                        "label": "Región Anatómica Lesionada",
                        "tipo": "select",
                        "opciones": ["Hombro / Clavícula", "Codo / Antebrazo", "Muñeca / Mano", "Columna Cervical", "Columna Lumbar / Pelvis", "Cadera / Muslo", "Rodilla", "Tobillo / Pie"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {
                        "key": "inspeccion_deformidad",
                        "label": "Inspección y Tumefacción",
                        "tipo": "select",
                        "opciones": ["Sin deformidad ni hematoma", "Edema localizado con eritema", "Deformidad anatómica evidente", "Equimosis / Hematoma extenso", "Herida abierta (posible fractura expuesta)"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {
                        "key": "movilidad_articular",
                        "label": "Arcos de Movilidad",
                        "tipo": "select",
                        "opciones": ["Completos y asintomáticos", "Completos pero con dolor terminal", "Limitación parcial del arco por dolor", "Bloqueo articular mecánico"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {
                        "key": "fuerza_muscular_daniels",
                        "label": "Fuerza Muscular (Escala Daniels)",
                        "tipo": "select",
                        "opciones": ["5/5 Normal contra resistencia máxima", "4/5 Vence resistencia moderada", "3/5 Vence gravedad solamente", "2/5 Movimiento solo sin gravedad", "0-1/5 Déficit motor severo"],
                        "requerido": False,
                        "grid_cols": 6
                    },
                    {
                        "key": "maniobras_especiales",
                        "label": "Maniobras Especiales (Lachman, Neer, Lasègue, etc.)",
                        "tipo": "textarea",
                        "placeholder": "Describa el resultado de pruebas específicas articulares y estabilidad ligamentaria...",
                        "requerido": False,
                        "grid_cols": 12
                    }
                ]
            }
        ]
    },

    # ── DERMATOLOGÍA ──
    "dermatología": {
        "widgets_activos": [],
        "esquema_preconsulta": [
            {
                "id": "pre_derma_lesion",
                "titulo": "Evolución de la Lesión Cutánea",
                "descripcion": "Antecedentes de exposición y síntomas en piel",
                "icono": "ShieldCheck",
                "campos": [
                    {
                        "key": "tiempo_aparicion",
                        "label": "¿Cuánto tiempo tiene con la lesión o erupción?",
                        "tipo": "select",
                        "opciones": ["Días (reciente)", "Semanas", "Meses", "Años / Congénita"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {
                        "key": "sintomas_lesion",
                        "label": "Sensaciones o síntomas asociados",
                        "tipo": "multiselect",
                        "opciones": ["Prurito (comezón intensa)", "Dolor o ardor", "Sangrado espontáneo o al roce", "Aumento rápido de tamaño", "Ningún síntoma molesto"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {"key": "exposicion_solar_frecuente", "label": "¿Exposición solar prolongada o quemaduras previas?", "tipo": "boolean", "requerido": False, "grid_cols": 6},
                    {"key": "antecedente_cancer_piel", "label": "¿Antecedente familiar o personal de cáncer de piel?", "tipo": "boolean", "requerido": False, "grid_cols": 6}
                ]
            }
        ],
        "esquema_consulta": [
            {
                "id": "con_derma_examen",
                "titulo": "Dermatoscopía y Morfología Cutánea",
                "descripcion": "Topografía, tipo de lesión elemental y regla ABCDE",
                "icono": "Eye",
                "campos": [
                    {
                        "key": "topografia",
                        "label": "Localización Anatómica Principal",
                        "tipo": "text",
                        "placeholder": "Ej. Región malar izquierda, dorso de la mano, tronco...",
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {
                        "key": "tipo_lesion_elemental",
                        "label": "Lesión Elemental Primaria",
                        "tipo": "select",
                        "opciones": ["Mácula / Mancha", "Pápula", "Placa", "Nódulo", "Vesícula / Ampolla", "Pústula", "Habón / Roncha"],
                        "requerido": True,
                        "grid_cols": 6
                    },
                    {
                        "key": "dermatoscopia_abcde",
                        "label": "Criterios Dermatoscópicos (Regla ABCDE para nevos)",
                        "tipo": "select",
                        "opciones": ["Nevus simétrico típico / Benigno", "Asimetría leve de bordes regulares", "Bordes irregulares o pigmento heterogéneo", "Sospecha de Melanoma / Derivación a biopsia"],
                        "requerido": False,
                        "grid_cols": 12
                    },
                    {
                        "key": "plan_dermatologico",
                        "label": "Impresión Diagnóstica y Conducta",
                        "tipo": "textarea",
                        "placeholder": "Tratamiento tópico indicado, fotoprotección prescrita, toma de biopsia punch programada...",
                        "requerido": False,
                        "grid_cols": 12
                    }
                ]
            }
        ]
    }
}
