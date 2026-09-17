<p align="center">
  <img src="docs/assets/medisoft_logo_dark.png" alt="MediSoft Suite Logo" width="520" />
</p>

<p align="center">
  <strong>Sistema Integral de Gestión Clínica, Hospitalaria y Consulta Médica Multi-Tenant SaaS</strong><br>
  <em>Diseñado para clínicas, centros de salud, consultorios médicos independientes y redes hospitalarias multi-sede.</em>
</p>

<p align="center">
  <a href="https://medisoft.theizerdev.com"><img src="https://img.shields.io/badge/Producción-medisoft.theizerdev.com-0284c7?style=for-the-badge&logo=nginx&logoColor=white" alt="Producción" /></a>
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4.0-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="TailwindCSS v4" />
  <img src="https://img.shields.io/badge/MariaDB-10.x-003545?style=for-the-badge&logo=mariadb&logoColor=white" alt="MariaDB" />
  <img src="https://img.shields.io/badge/WebSockets-Real--Time-7c3aed?style=for-the-badge&logo=websocket&logoColor=white" alt="WebSockets" />
  <img src="https://img.shields.io/badge/Python-3.13+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.13" />
</p>

---

## 🏥 ¿Qué es MediSoft Suite?

**MediSoft Suite** es un ecosistema tecnológico full-stack empresarial concebido para digitalizar, optimizar y centralizar toda la operativa clínica, administrativa y financiera de instituciones de salud. 

Construido sobre una arquitectura moderna y asíncrona (**Python FastAPI + React 19**), incorpora aislamiento de datos multi-empresa nativo (**Multi-Tenant**), comunicación bidireccional en tiempo real (**WebSockets**) y automatización de procesos clínicos mediante asistentes inteligentes y recordatorios vía **WhatsApp Business**.

---

## 🌟 Módulos y Funcionalidades del Sistema

MediSoft Suite ofrece una cobertura integral de 360° para el sector salud, organizada en los siguientes módulos especializados:

### 1. 📅 Agenda Inteligente & Citas Médicas
- **Calendario Clínico Dinámico:** Integración con **FullCalendar** en vistas mensual, semanal, diaria y lista detallada.
- **Flujo de Estados de Cita:** Transiciones automáticas entre *Programada*, *Confirmada*, *En Sala de Espera*, *En Consulta*, *Atendida*, *Cancelada* y *No Asistió*.
- **Control de Sobreturnos:** Habilitación de cupos de sobreturno con registro de motivo clínico justificado.
- **Bloqueos de Agenda:** Programación de períodos no laborales, descansos, congresos o emergencias por médico y sucursal.
- **Gestión Financiera de la Cita:** Registro de precio estimado, método de pago asignado (Efectivo, PagoMóvil, Transferencia, Tarjeta) y estatus de cobro en tiempo real.

### 2. 🩺 Consultas Médicas & Expediente Clínico (EMR / EHR)
- **Atención Clínica Estructurada:** Módulo interactivo con toma de constantes y signos vitales (Presión arterial, FC, FR, Temperatura, Saturación O2, Peso, Altura e IMC automático).
- **Anamnesis y Evolución:** Redacción guiada de Motivo de Consulta, Enfermedad Actual, Antecedentes Personales/Familiares y Examen Físico segmentado por sistemas.
- **Catálogo de Diagnósticos CIE-10:** Búsqueda rápida y asociación de diagnósticos primarios y secundarios.
- **Récipes e Indicaciones Médicas:** Generación digital de recetas farmacológicas, dosificación, duración e indicaciones generales.
- **Expediente del Paciente (Drawer Lateral):** Acceso instantáneo al histórico de consultas, diagnósticos previos y cronología sin abandonar la pantalla de atención.
- **Impresión de Documentos:** Exportación e impresión estandarizada de recetas, reposos médicos, constancias y órdenes de estudios en PDF.

### 3. 📝 Preconsulta Pública & Triaje Digital
- **Enlace Público para Pacientes:** Formulario web accesible mediante URL única o código QR disponible en la sala de espera.
- **Registro Previo de Síntomas:** Los pacientes ingresan sus datos, alergias, síntomas actuales y antecedentes antes de ser llamados.
- **Triaje Automatizado:** Optimización de tiempos en consulta al precargar los datos directamente en el expediente del doctor.

### 4. 📺 Turnero Digital en Pantalla (Sala de Espera)
- **Monitor en Tiempo Real:** Pantalla pública optimizada para televisores y monitores en salas de espera de recepciones y clínicas.
- **Llamado Visual y Sonoro:** Notificación sonora con síntesis de voz que anuncia el turno del paciente y el consultorio/médico asignado.
- **Gestión de Cola:** Actualización instantánea vía WebSockets al momento en que el médico llama a su próximo paciente.

### 5. 🦷 Odontograma Gráfico Interactivo
- **Mapa Dental 2D Completo:** Diagrama dental interactivo para pacientes adultos y pediátricos (dentición permanente y temporal).
- **Marcado de Patologías y Tratamientos:** Registro visual por cara dental (caries, obturación, endodoncia, prótesis, corona, extracción indicada, implante).
- **Historial Dental Integrado:** Evolución del estado dental del paciente consulta tras consulta.

### 6. 👨‍⚕️ Directorio Médico & Especialidades
- **Gestión de Profesionales:** Ficha de médicos con número de colegiatura (MPPS / Colegio de Médicos), especialidades y sucursales asignadas.
- **Horarios de Atención Personalizados:** Configuración de franjas horarias por día de la semana y duración de turnos.
- **Plantillas Clínicas por Especialidad:** Creación de plantillas preconfiguradas (Cardiología, Pediatría, Ginecología, Traumatología, etc.) para acelerar la redacción del acto médico.

### 7. 👥 Directorio de Pacientes & Archivo Digital
- **Historial Clínico Centralizado:** Registro completo con cédula/documento, fecha de nacimiento, tipo de sangre, dirección y contactos de emergencia.
- **Repositorio de Estudios y Documentos:** Carga y almacenamiento de archivos adjuntos (Rayos X, resonancias, ecografías, analíticas de laboratorio, PDFs e imágenes).

### 8. 💬 Chat Clínico & Mensajería en Tiempo Real
- **Canales por Sucursal:** Salas de comunicación colaborativa para el personal de cada sede o clínica.
- **Mensajería Directa:** Chats privados 1 a 1 entre médicos, enfermeros y personal de recepción.
- **Notas de Voz:** Grabación de notas de voz desde el navegador y reproductor de audio clínico integrado.
- **Conectividad WebSockets:** Recepción instantánea de mensajes, estados de lectura y conteo de mensajes pendientes.

### 9. 📲 Centro de WhatsApp Business (Integración Baileys)
- **Recordatorios Automatizados:** Envío programado diario a través de background workers notificando a los pacientes sus citas del día siguiente.
- **Gestión de Instancias:** Vinculación directa mediante código QR por sucursal.
- **Plantillas y Spintax:** Generación de mensajes dinámicos con variables personalizadas `{paciente}`, `{medico}`, `{fecha}`, `{hora}` y variaciones aleatorias para evitar bloqueos.
- **Políticas Anti-Baneo:** Control estricto de tasa de envío (rate limit) y franja horaria permitida para despachos masivos.

### 10. 🏢 Multi-Tenant (Empresas, Clínicas & Sucursales)
- **Aislamiento Total de Datos:** Garantía de privacidad y segregación lógica de bases de datos por clínica.
- **Selector de Sucursal en Vivo:** Cambio instantáneo de sede activa sin necesidad de cerrar sesión.
- **Mapas y Geolocalización:** Integración con **MapTiler SDK** para ubicación geográfica de cada consultorio y cálculo de distancias.

### 11. 🛡️ Seguridad, Auditoría & Permisos (RBAC)
- **Control de Acceso Basado en Roles:** Perfiles de Superadministrador, Administrador de Empresa, Médico, Recepción, Facturación y Enfermería.
- **Matriz de Permisos Granulares:** Más de 40 permisos individuales categorizados por sector (*ver, crear, editar, eliminar, exportar, sincronizar*).
- **Registro Inmutable de Auditoría:** Trazabilidad completa de cada acción con fecha, usuario, módulo, payload, IP y User-Agent.
- **Monitor de Seguridad y Sesiones:** Visualización y revocación remota de tokens activos y bloqueo de direcciones IP sospechosas.

### 12. 💳 SaaS, Suscripciones & Facturación
- **Planes SaaS Flexibles:** Creación de planes con límites de médicos, sucursales asignadas y cuotas de uso.
- **Gestión de Pagos:** Módulo para registro de transferencias, PagoMóvil y pasarelas de pago con validación de comprobantes.
- **Control de Expiración:** Tarea en segundo plano que supervisa la vigencia de las cuentas y notifica renovaciones.

### 13. 💱 Multi-Moneda & Monitor de Tasas de Cambio
- **Soporte de Divisas:** Facturación y cotización en Dólares (USD), Bolívares (VES) y Euros (EUR).
- **Sincronización Automatizada:** Monitoreo y actualización continua con las tasas oficiales del **Banco Central de Venezuela (BCV)** y tasas de mercado.

### 14. 📊 Monitoreo del Servidor & Métricas
- **Health Check & Diagnóstico:** Medición en tiempo real de uso de CPU, memoria RAM, estado del pool de conexiones MariaDB y latencia de red.
- **Dashboards Visuales:** Gráficos estadísticos con **ApexCharts** para visualización de consultas atendidas, ingresos y ocupación médica.

---

## 🚀 Arquitectura Tecnológica

```text
                               ┌─────────────────────────────────────────┐
                               │   Cliente Web (Desktop / Tablet / Móvil)│
                               └────────────────────┬────────────────────┘
                                                    │ HTTPS / WSS
                               ┌────────────────────▼────────────────────┐
                               │        Nginx (Proxy Reverso + SSL)      │
                               └──────────┬───────────────────┬──────────┘
             /assets/*, /index.html       │                   │ /api/*, /ws/*, /docs
                               ┌──────────▼─────────┐         │
                               │  React 19 (Vite)   │         │
                               │  TailwindCSS v4    │         │
                               └────────────────────┘         │
                                                              │
                               ┌──────────────────────────────▼──────────┐
                               │    Backend FastAPI (Uvicorn / ASGI)     │
                               │        Python 3.13+ Asíncrono           │
                               └──────────┬───────────────────┬──────────┘
                                          │                   │
                     SQLAlchemy 2.0 Async │                   │ Asyncio Task
                               ┌──────────▼─────────┐ ┌───────▼──────────┐
                               │ MariaDB / MySQL    │ │Background Workers│
                               │ (30 Tablas Clínicas│ │(WhatsApp / BCV / │
                               │  Pool Pre-Ping)    │ │ Recordatorios)   │
                               └────────────────────┘ └──────────────────┘
```

### Backend (Python)
- **Python 3.13+** con motor asíncrono nativo.
- **FastAPI 0.110+**: OpenAPI 3.1, Swagger interactivo (`/docs`) y validación estricta con **Pydantic v2**.
- **SQLAlchemy 2.0 Async**: ORM de última generación con soporte para `aiomysql` y `asyncmy`.
- **Seguridad**: Autenticación criptográfica con JWT (**python-jose**), hashing con **Bcrypt** y middleware de CORS estricto.
- **WebSockets ASGI**: Canales de mensajería y turnos en tiempo real con control de desconexión.
- **Tareas de Fondo (Scheduler)**: Automatización de recordatorios de citas y vencimiento de suscripciones.

### Frontend (React)
- **React 19.2** + **TypeScript 6.0**: Máxima velocidad de renderizado y tipado estricto.
- **Vite 8.2**: Empaquetador ultrarrápido con división inteligente de chunks (Rollup/Rolldown).
- **TailwindCSS v4**: Sistema de estilos basado en variables CSS dinámicas y soporte nativo para modo oscuro.
- **Componentes UI & Calendario**: **Radix UI Primitives**, **FullCalendar v6**, **ApexCharts**, **MapTiler SDK** y **Lucide Icons**.

---

## 💻 Instalación y Puesta en Marcha

### Requisitos Previos
- **Node.js** v20+ / v24+
- **Python** 3.11+ / 3.13+
- **MariaDB** o **MySQL** 8.0+

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/medisoft.git
cd medisoft
git checkout medisoft
```

### 2. Configurar el Backend (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # En Windows: .\venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de base de datos MariaDB:
# DATABASE_URL="mysql+aiomysql://usuario:password@127.0.0.1:3306/medisoft"

# Inicializar base de datos y ejecutar Seeder
python init_db.py

# Iniciar servidor de desarrollo
uvicorn app.main:app --reload --port 8000
```

### 3. Configurar el Frontend (React + Vite)
```bash
cd ../frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# VITE_API_URL=http://localhost:8000/api/v1 (en desarrollo)

# Iniciar servidor de desarrollo
npm run dev
```

### 4. Ejecución Unificada (Desarrollo)
En la raíz del proyecto, puedes iniciar simultáneamente el Backend y Frontend:
```bash
npm run dev
# o mediante Python:
python dev.py
```

- 🟢 **Frontend:** [http://localhost:5173](http://localhost:5173)
- 🔵 **Backend API:** [http://localhost:8000](http://localhost:8000)
- 📖 **Documentación Swagger:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🌐 Despliegue en Servidor de Producción (Linux / Nginx)

El sistema incluye integración lista para servidores Debian/Ubuntu con **Systemd** y **Nginx**:

### 1. Servicio Systemd (`/etc/systemd/system/medisoft-backend.service`)
```ini
[Unit]
Description=MediSoft FastAPI Backend Service
After=network.target mariadb.service mysql.service

[Service]
User=root
WorkingDirectory=/var/www/html/medisoft/backend
ExecStart=/var/www/html/medisoft/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8002 --workers 2
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

Habilitar e iniciar:
```bash
systemctl daemon-reload
systemctl enable --now medisoft-backend
```

### 2. Configuración Nginx (`/etc/nginx/sites-available/medisoft.theizerdev.com`)
```nginx
server {
    server_name medisoft.theizerdev.com;
    root /var/www/html/medisoft/frontend/dist;
    index index.html;
    client_max_body_size 64M;

    # Frontend SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Backend Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8002/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Real-Time
    location /ws {
        proxy_pass http://127.0.0.1:8002/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Documentación Swagger
    location ~ ^/(docs|openapi.json|redoc) {
        proxy_pass http://127.0.0.1:8002;
        proxy_set_header Host $host;
    }

    listen 443 ssl;
    # Certificados gestionados por Certbot...
}
```

Certificado SSL gratuito con **Let's Encrypt**:
```bash
certbot --nginx -d medisoft.theizerdev.com
```

---

## 🔑 Credenciales de Acceso Demostrativas

| Rol | Correo Electrónico | Contraseña | Perfil / Acceso |
| :--- | :--- | :--- | :--- |
| **Superadministrador** | `admin@pycore.com` | `Admin1234*` | Acceso global irrestricto y gestión multi-empresa |
| **Administrador Clínico** | `admin@plataforma.com` | `Admin1234*` | Gestión administrativa de la clínica y configuración |
| **Médico Especialista** | `admin@medflow.com` | `Admin1234*` | Agenda médica, consultas, récipes y pacientes |

---

## 📁 Estructura del Repositorio

```text
medisoft/
├── docs/
│   └── assets/                    # Logotipos oficiales (Dark / Light)
├── backend/
│   ├── app/
│   │   ├── api/v1/                # Endpoints REST (citas, consultas, médicos, auth, chat...)
│   │   ├── core/                  # Configuración, motor MySQL Async, seguridad y migraciones
│   │   ├── models/                # Modelos SQLAlchemy 2.0 (30 entidades clínicas y SaaS)
│   │   ├── schemas/               # Validadores Pydantic v2
│   │   ├── services/              # Lógica de negocio, WhatsApp, BCV, Seeder y Schedulers
│   │   └── main.py                # Entrada principal FastAPI y ciclo de vida (lifespan)
│   ├── init_db.py                 # Creador de tablas y seeder inicial
│   ├── requirements.txt           # Dependencias de Python
│   └── test_api.py                # Suite de pruebas automatizadas
├── frontend/
│   ├── public/                    # Faviconos y logos SVG/PNG
│   ├── src/
│   │   ├── api/                   # Clientes Axios e interceptores JWT
│   │   ├── components/            # Layouts, Sidebar, Modales clínicos y Widgets
│   │   ├── context/               # AuthContext, ThemeContext, EmpresaContext
│   │   ├── lib/                   # Funciones auxiliares de estilo (cn) y optimizador de imágenes
│   │   ├── pages/                 # Vistas clínicas (Citas, Consultas, Odontograma, Turnero...)
│   │   └── types/                 # Definiciones de TypeScript
│   ├── package.json               # Dependencias de React y scripts
│   └── vite.config.ts             # Configuración de compilación Vite y proxies
├── dev.py                         # Orquestador local en Python
└── README.md                      # Documentación oficial del proyecto
```

---

<p align="center">
  Diseñado y desarrollado con pasión por <strong>Theizer Dev</strong>.<br>
  © 2026 MediSoft Suite. Todos los derechos reservados.
</p>
