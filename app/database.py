"""
Configuração do banco de dados PostgreSQL
Usa SQLAlchemy 2.0 + psycopg2 para conectar ao Neon
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# URL do banco Neon (mesma do Node.js)
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("NEON_DATABASE_URL")

if not DATABASE_URL:
    print("❌ FATAL: DATABASE_URL não encontrada. Configure DATABASE_URL ou NEON_DATABASE_URL nas variáveis de ambiente.")
    # Placeholder para não quebrar o import — qualquer acesso ao DB falhará com erro claro
    DATABASE_URL = "postgresql://localhost/bennu_finance_missing_db_url"

_is_neon = "neon" in DATABASE_URL or "neon.tech" in DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={
        "sslmode": "require",
        "connect_timeout": 10,
        "application_name": "bennu_finance_python"
    } if _is_neon else {},
    pool_pre_ping=True,
    pool_recycle=300,  # Renovar conexões a cada 5 minutos
    pool_size=10,
    max_overflow=20,
    echo=False
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency para injetar sessão do banco nas rotas"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()