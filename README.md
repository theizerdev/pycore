# ⚡ PyCore - Enterprise Multi-Tenant SaaS & Core Boilerplate

**PyCore** es un sistema base full-stack empresarial de alto rendimiento diseñado para servir como cimiento modular para el desarrollo rápido y escalable de aplicaciones web (SaaS, ERP, CRM, Puntos de Venta, Sistemas Administrativos o de Salud).

Construido con **Python (FastAPI 0.110+) + React 19 + TypeScript + TailwindCSS**, con arquitectura asíncrona, seguridad por capas y soporte multi-tenant nativo.

---

## 🚀 Arquitectura Tecnológica

### Backend (Python)
- **Python 3.13+**
- **FastAPI 0.110+** - Framework asíncrono de alto rendimiento (ASGI) con OpenAPI/Swagger automático.
- **SQLAlchemy 2.0 (Async)** - ORM relacional moderno con soporte para SQLite y MySQL / PostgreSQL.
- **Pydantic v2** - Validación estricta de esquemas y serialización ultrarrápida.
- **Passlib & Bcrypt** - Hashing criptográfico seguro para contraseñas.
- **Python-Jose** - Autenticación y autorización basada en JSON Web Tokens (JWT).
- **WebSockets** - Comunicación bidireccional en tiempo real para eventos y notificaciones.

### Frontend (React)
- **React 19.2** + **TypeScript 6.0**
- **Vite 8.2** - Empaquetador y entorno de desarrollo de máxima velocidad.
- **TailwindCSS v4** - Sistema de diseño utility-first, paletas dinámicas y temas Claro / Oscuro / Sistema.
- **Lucide Icons** - Iconografía moderna y consistente.
- **Axios** - Cliente HTTP con interceptores automáticos de autenticación y manejo de sesiones.

---

## ⚡ Cómo Levantar Todo con un Solo Comando

En la raíz del proyecto (`c:\laragon\www\pyreact`), puedes usar cualquiera de las siguientes opciones:

### Opción 1: Mediante NPM (Recomendado)
```bash
npm run dev
```

### Opción 2: Mediante el Script de Windows (Doble Clic o Terminal)
```powershell
.\run.bat
```

### Opción 3: Mediante Python
```bash
python dev.py
```

Cualquiera de estos comandos levantará simultáneamente:
* 🟢 **Backend (FastAPI):** [http://127.0.0.1:8000](http://127.0.0.1:8000) (Swagger: `/docs`)
* 🔵 **Frontend (React + Vite):** [http://localhost:5173](http://localhost:5173)

---

## 🔐 Módulos Core Incluidos

1. **Empresas (Multi-Tenant):** Gestión de instituciones y organizaciones independientes con aislamiento total de datos.
2. **Sedes & Sucursales:** Soporte multi-sede con selector de sucursal activa en tiempo real.
3. **Roles & Matriz de Permisos (RBAC):** Control de acceso basado en roles con permisos granulares por módulo (*ver, crear, editar, eliminar, exportar*).
4. **Directorio de Usuarios:** Creación de usuarios con asignación de múltiples sucursales y roles dinámicos.
5. **Planes & Suscripciones SaaS:** Motor de facturación, límites de sucursales/usuarios y control de expiración.
6. **Localización & Monedas:** Catálogo de países, monedas, impuestos y tasas de cambio en tiempo real.
7. **Hub de Integraciones:** Conectores para WhatsApp API (Baileys), pasarelas de pago y webhooks.
8. **Auditoría & Monitoreo:** Registro inmutable de eventos con IP y payload, junto con métricas de salud del servidor.

---

## 🔑 Credenciales de Acceso Demostrativas

| Rol | Correo Electrónico | Contraseña |
| :--- | :--- | :--- |
| **Superadministrador** | `admin@pycore.com` | `Admin1234*` |
| **Administrador de Empresa** | `admin@plataforma.com` | `Admin1234*` |

---

## 📁 Estructura del Proyecto

```text
pyreact/
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints y enrutador REST v1
│   │   ├── core/         # Configuración, Base de Datos y Seguridad
│   │   ├── models/       # Modelos SQLAlchemy 2.0 Async
│   │   ├── schemas/      # Esquemas Pydantic v2
│   │   ├── services/     # Lógica de negocio, Seeder y Reminders
│   │   └── main.py       # Punto de entrada FastAPI
│   ├── requirements.txt  # Dependencias de Python
│   └── test_api.py       # Pruebas automatizadas de endpoints
├── frontend/
│   ├── src/
│   │   ├── api/          # Clientes HTTP y llamadas al backend
│   │   ├── components/   # Componentes UI reutilizables y layouts
│   │   ├── context/      # Contextos globales (Auth, Theme, Settings)
│   │   ├── pages/        # Vistas de Auth, Dashboard, SaaS, Seguridad, etc.
│   │   └── types/        # Definiciones de TypeScript
│   └── package.json
├── dev.py                # Lanzador unificado en Python
├── package.json          # Orquestador con Concurrently
└── run.bat               # Script ejecutable para Windows
```
