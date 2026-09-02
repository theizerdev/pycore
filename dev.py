import subprocess
import sys
import os
import signal

def main():
    root_dir = os.path.abspath(os.path.dirname(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    python_executable = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    if not os.path.exists(python_executable):
        python_executable = sys.executable

    print("=" * 65)
    print("        INICIANDO PYCORE (FASTAPI + REACT 19)")
    print("=" * 65)
    print(" -> Backend:  http://127.0.0.1:8000 (Swagger: /docs)")
    print(" -> Frontend: http://localhost:5173")
    print(" Presiona Ctrl+C para detener ambos servidores.")
    print("=" * 65)

    # Iniciar Backend
    backend_cmd = [
        python_executable, "-m", "uvicorn", "app.main:app",
        "--reload", "--port", "8000"
    ]
    backend_proc = subprocess.Popen(backend_cmd, cwd=backend_dir)

    # Iniciar Frontend
    frontend_cmd = "npm.cmd run dev"
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=frontend_dir, shell=True)

    def shutdown(sig, frame):
        print("\nDeteniendo servidores...")
        backend_proc.terminate()
        frontend_proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        shutdown(None, None)

if __name__ == "__main__":
    main()
