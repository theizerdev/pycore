#!/usr/bin/env python
"""
⚡ MediSoftSuite Artisan CLI
Inspirado en Laravel Artisan para administración de migraciones, base de datos y tareas del sistema.
"""
import sys
import os
import subprocess
import argparse

# Configurar codificación para consola Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Directorios base
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

# Localizar Python de backend
VENV_PYTHON = os.path.join(BACKEND_DIR, "venv", "Scripts", "python.exe")
if not os.path.exists(VENV_PYTHON):
    VENV_PYTHON = sys.executable

ALEMBIC_BIN = os.path.join(BACKEND_DIR, "venv", "Scripts", "alembic.exe")
if not os.path.exists(ALEMBIC_BIN):
    ALEMBIC_BIN = "alembic"

# Colores ANSI estilo Laravel Artisan
C_RESET = "\033[0m"
C_BOLD = "\033[1m"
C_RED = "\033[31m"
C_GREEN = "\033[32m"
C_YELLOW = "\033[33m"
C_BLUE = "\033[34m"
C_MAGENTA = "\033[35m"
C_CYAN = "\033[36m"
C_WHITE = "\033[37m"
C_BG_GREEN = "\033[42m\033[30m"
C_BG_RED = "\033[41m\033[37m"
C_BG_BLUE = "\033[44m\033[37m"

def print_banner():
    print(f"\n{C_BOLD}{C_CYAN}  ⚡ MediSoftSuite CLI{C_RESET} {C_YELLOW}v1.0.0{C_RESET} {C_WHITE}(FastAPI + SQLAlchemy 2.0 Async + React 19){C_RESET}\n")

def run_cmd(cmd, cwd=BACKEND_DIR):
    """Ejecuta un comando en el directorio del backend."""
    try:
        res = subprocess.run(cmd, cwd=cwd, shell=True)
        return res.returncode
    except Exception as e:
        print(f"{C_RED}[ERROR]{C_RESET} Fallo ejecutando comando: {e}")
        return 1

def cmd_migrate(args):
    """Ejecuta las migraciones pendientes (alembic upgrade head)."""
    print(f"{C_BOLD}{C_GREEN}Iniciando migraciones de base de datos...{C_RESET}")
    code = run_cmd(f'"{ALEMBIC_BIN}" upgrade head')
    if code == 0:
        print(f"\n{C_BG_GREEN} SUCCESS {C_RESET} {C_GREEN}Migraciones aplicadas con éxito.{C_RESET}\n")
    else:
        print(f"\n{C_BG_RED} FAILED {C_RESET} {C_RED}Ocurrió un error al aplicar las migraciones.{C_RESET}\n")
    return code

def cmd_migrate_rollback(args):
    """Revierte la última migración (alembic downgrade -1)."""
    steps = getattr(args, 'step', 1) or 1
    print(f"{C_BOLD}{C_YELLOW}Revirtiendo {steps} paso(s) de migración...{C_RESET}")
    code = run_cmd(f'"{ALEMBIC_BIN}" downgrade -{steps}')
    if code == 0:
        print(f"\n{C_BG_GREEN} SUCCESS {C_RESET} {C_GREEN}Rollback completado con éxito.{C_RESET}\n")
    else:
        print(f"\n{C_BG_RED} FAILED {C_RESET} {C_RED}Error al ejecutar rollback.{C_RESET}\n")
    return code

def cmd_migrate_status(args):
    """Muestra el estado actual y el historial de migraciones."""
    print(f"{C_BOLD}{C_CYAN}Versión actual de la base de datos:{C_RESET}")
    run_cmd(f'"{ALEMBIC_BIN}" current')
    print(f"\n{C_BOLD}{C_CYAN}Historial de revisiones de migraciones:{C_RESET}")
    run_cmd(f'"{ALEMBIC_BIN}" history --verbose')
    return 0

def cmd_make_migration(args):
    """Crea una nueva migración autogenerada a partir de los modelos SQLAlchemy."""
    name = args.name
    if not name:
        print(f"{C_RED}Debes indicar un nombre para la migración. Ej: artisan make:migration agregar_campo_x{C_RESET}")
        return 1
    print(f"{C_BOLD}{C_CYAN}Generando nueva migración: '{name}'...{C_RESET}")
    code = run_cmd(f'"{ALEMBIC_BIN}" revision --autogenerate -m "{name}"')
    if code == 0:
        print(f"\n{C_BG_GREEN} SUCCESS {C_RESET} {C_GREEN}Migración creada en backend/alembic/versions/{C_RESET}\n")
    return code

def cmd_db_seed(args):
    """Ejecuta el seeder inicial de seguridad, roles, empresas y especialidades."""
    print(f"{C_BOLD}{C_CYAN}Ejecutando Seeder de datos iniciales...{C_RESET}")
    script = """
import asyncio
from app.core.database import AsyncSessionLocal
from app.services.seeder import seed_initial_data

async def main():
    async with AsyncSessionLocal() as session:
        await seed_initial_data(session)
    print('[OK] Seeder ejecutado exitosamente.')

asyncio.run(main())
"""
    code = run_cmd(f'"{VENV_PYTHON}" -c "{script}"')
    if code == 0:
        print(f"\n{C_BG_GREEN} SUCCESS {C_RESET} {C_GREEN}Base de datos poblada con éxito.{C_RESET}\n")
    return code

def cmd_migrate_fresh(args):
    """Recrea las tablas de base de datos desde cero y opcionalmente ejecuta el seeder."""
    seed = getattr(args, 'seed', False)
    print(f"{C_BOLD}{C_YELLOW}Recreando la base de datos completa (migrate:fresh)...{C_RESET}")
    script = """
import asyncio
from app.core.database import engine, Base, AsyncSessionLocal
from app.services.seeder import seed_initial_data
import app.models

async def main():
    async with engine.begin() as conn:
        print('Eliminando tablas existentes...')
        await conn.run_sync(Base.metadata.drop_all)
        print('Creando tablas nuevas desde los modelos...')
        await conn.run_sync(Base.metadata.create_all)
    print('[OK] Tablas recreadas.')

asyncio.run(main())
"""
    code = run_cmd(f'"{VENV_PYTHON}" -c "{script}"')
    if code == 0:
        # Sellar en Alembic como head
        run_cmd(f'"{ALEMBIC_BIN}" stamp head')
        if seed:
            cmd_db_seed(args)
        print(f"\n{C_BG_GREEN} SUCCESS {C_RESET} {C_GREEN}Base de datos recreada limpiamente.{C_RESET}\n")
    return code

def cmd_schedule_run(args):
    """Ejecuta inmediatamente el lote de automatizaciones programadas (suscripciones y citas)."""
    print(f"{C_BOLD}{C_CYAN}Ejecutando tareas programadas en segundo plano (schedule:run)...{C_RESET}")
    script = """
import asyncio
from app.services.background_scheduler import run_all_scheduled_tasks

async def main():
    res = await run_all_scheduled_tasks()
    print('[OK] Resultado del scheduler:')
    print(res)

asyncio.run(main())
"""
    code = run_cmd(f'"{VENV_PYTHON}" -c "{script}"')
    if code == 0:
        print(f"\n{C_BG_GREEN} SUCCESS {C_RESET} {C_GREEN}Tareas programadas ejecutadas con éxito.{C_RESET}\n")
    else:
        print(f"\n{C_BG_RED} FAILED {C_RESET} {C_RED}Error al ejecutar tareas programadas.{C_RESET}\n")
    return code

def cmd_test(args):
    """Ejecuta las pruebas automatizadas del backend con pytest."""
    print(f"{C_BOLD}{C_CYAN}Ejecutando suite de pruebas automatizadas con pytest...{C_RESET}")
    return run_cmd(f'"{VENV_PYTHON}" -m pytest -v')

def print_help():
    print_banner()
    print(f"{C_BOLD}Uso:{C_RESET}")
    print(f"  artisan <comando> [opciones]\n")
    print(f"{C_BOLD}Comandos disponibles:{C_RESET}")
    print(f"  {C_GREEN}migrate{C_RESET}                    Ejecuta todas las migraciones pendientes")
    print(f"  {C_GREEN}migrate:rollback{C_RESET}           Revierte el último lote/paso de migraciones (--step=1)")
    print(f"  {C_GREEN}migrate:status{C_RESET}             Muestra el estado actual y revisiones de la base de datos")
    print(f"  {C_GREEN}migrate:fresh{C_RESET}              Reconstruye las tablas desde cero (--seed para poblar)")
    print(f"  {C_GREEN}make:migration <nombre>{C_RESET}   Crea una nueva migración autogenerada")
    print(f"  {C_GREEN}db:seed{C_RESET}                    Ejecuta los seeders de datos iniciales")
    print(f"  {C_GREEN}schedule:run{C_RESET}               Ejecuta el lote de tareas programadas (suscripciones y citas)")
    print(f"  {C_GREEN}test{C_RESET}                       Ejecuta la suite de pruebas unitarias y de integración")
    print(f"  {C_GREEN}list | help{C_RESET}                Muestra esta lista de comandos\n")

def main():
    if len(sys.argv) < 2:
        print_help()
        return

    action = sys.argv[1]

    if action in ["--help", "-h", "help", "list"]:
        print_help()
        return

    print_banner()

    if action == "migrate":
        sys.exit(cmd_migrate(None))
    elif action == "migrate:rollback":
        parser = argparse.ArgumentParser()
        parser.add_argument("--step", type=int, default=1)
        args, _ = parser.parse_known_args(sys.argv[2:])
        sys.exit(cmd_migrate_rollback(args))
    elif action == "migrate:status":
        sys.exit(cmd_migrate_status(None))
    elif action == "migrate:fresh":
        parser = argparse.ArgumentParser()
        parser.add_argument("--seed", action="store_true", default=False)
        args, _ = parser.parse_known_args(sys.argv[2:])
        sys.exit(cmd_migrate_fresh(args))
    elif action == "make:migration":
        if len(sys.argv) < 3:
            print(f"{C_RED}Error: Debes especificar el nombre de la migración.{C_RESET}")
            print(f"Ejemplo: artisan make:migration agregar_campos_paciente")
            sys.exit(1)
        name = sys.argv[2]
        class Args:
            pass
        args = Args()
        args.name = name
        sys.exit(cmd_make_migration(args))
    elif action == "db:seed":
        sys.exit(cmd_db_seed(None))
    elif action == "schedule:run":
        sys.exit(cmd_schedule_run(None))
    elif action == "test":
        sys.exit(cmd_test(None))
    else:
        print(f"{C_RED}Comando desconocido '{action}'.{C_RESET}")
        print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
