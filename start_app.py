#!/usr/bin/env python3
"""
Bennu Finance - 100% Python (Backend + Frontend)
Sistema financeiro completo usando FastAPI + Jinja2 Templates
"""
import subprocess
import os
import sys
from pathlib import Path

def start_fastapi():
    """Inicia o servidor FastAPI com frontend Python"""
    print("🐍 Bennu Finance - Sistema 100% Python")
    print("🚀 Iniciando FastAPI + Jinja2 Templates...")
    
    # Change to app directory and start uvicorn
    os.chdir(Path(__file__).parent)
    
    try:
        subprocess.run([
            "uvicorn", 
            "app.main:app", 
            "--host", "0.0.0.0", 
            "--port", "5000",  # Usar porta 5000 padrão do Replit
            "--reload"
        ], check=True)
    except KeyboardInterrupt:
        print("\n👋 Servidor encerrado pelo usuário")
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro ao iniciar servidor: {e}")
        sys.exit(1)

def main():
    """Entry point principal"""
    print("🐍 Bennu Finance - Iniciando aplicação 100% Python...")
    start_fastapi()

if __name__ == "__main__":
    main()