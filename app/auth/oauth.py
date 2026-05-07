"""
Autenticação Replit OAuth usando Authlib - compatível com Node.js
"""
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.requests import Request
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.models import User
import os

# Configuração OAuth
config = Config('.env')
oauth = OAuth(config)

# Registrar provedor Replit OAuth - usar variáveis do Render se disponíveis
client_id = os.getenv('REPLIT_CLIENT_ID') or os.getenv('OAUTH_CLIENT_ID') or "fake-client-id"
client_secret = os.getenv('REPLIT_CLIENT_SECRET') or os.getenv('OAUTH_CLIENT_SECRET') or "fake-client-secret"

if client_id == "fake-client-id" or client_secret == "fake-client-secret":
    print("⚠️  WARNING: OAuth credentials not configured. Add REPLIT_CLIENT_ID and REPLIT_CLIENT_SECRET to environment variables.")
    print("⚠️  Sistema funcionará mas login OAuth não estará disponível.")

oauth.register(
    name='replit',
    client_id=client_id,
    client_secret=client_secret,
    authorize_url='https://replit.com/auth/oauth2/auth',
    access_token_url='https://replit.com/auth/oauth2/token',
    client_kwargs={
        'scope': 'user:read'
    }
)

async def get_current_user(request: Request, db: Session = Depends(get_db)):
    """
    Dependency para verificar usuário autenticado
    Compatível com isAuthenticated do Node.js
    """
    user_claims = request.session.get('user_claims')

    # 🔧 MODO DESENVOLVIMENTO: bypass SOMENTE em ambiente local/dev explícito
    # NUNCA ativar em produção mesmo que as variáveis OAuth não estejam configuradas
    is_dev_mode = os.getenv('ENVIRONMENT', 'production').lower() in ('development', 'dev', 'local')
    oauth_not_configured = (client_id == "fake-client-id" or client_secret == "fake-client-secret")

    if not user_claims and is_dev_mode and oauth_not_configured:
        print("🔧 DESENVOLVIMENTO: OAuth não configurado, usando usuário padrão admin@bennu.com")
        user = db.query(User).filter(User.email == 'admin@bennu.com').first()
        if user:
            if user.empresa_id:
                try:
                    from sqlalchemy import text
                    db.execute(text("SET LOCAL app.empresa_id = :empresa_id"), {"empresa_id": user.empresa_id})
                except Exception as e:
                    print(f"Erro ao configurar contexto de tenant: {e}")
            return user
        else:
            print("❌ ERRO: Usuário admin padrão não encontrado")
            raise HTTPException(status_code=500, detail="Default user not found")

    if not user_claims:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Buscar usuário pelo external_auth_id (OAuth sub) com retry
    external_auth_id = user_claims.get('sub')
    
    try:
        user = db.query(User).filter(User.external_auth_id == external_auth_id).first()
    except Exception as e:
        print(f"Erro SSL na busca do usuário: {e}")
        # Tentar novamente com nova sessão
        try:
            db.close()
            db = SessionLocal()
            user = db.query(User).filter(User.external_auth_id == external_auth_id).first()
        except Exception as retry_error:
            print(f"Erro no retry SSL: {retry_error}")
            raise HTTPException(status_code=500, detail="Database connection error")
        finally:
            db.close()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # 🔒 SEGURANÇA: Configurar contexto de tenant no banco para RLS
    if user.empresa_id:
        try:
            from sqlalchemy import text
            db.execute(text("SET LOCAL app.empresa_id = :empresa_id"), {"empresa_id": user.empresa_id})
        except Exception as e:
            print(f"Erro ao configurar contexto de tenant: {e}")

    return user

async def upsert_user_from_claims(claims: dict, db: Session):
    """
    Cria ou atualiza usuário baseado nos claims OAuth
    Compatível com server/replitAuth.ts
    """
    external_auth_id = claims.get('sub')  # String do OAuth
    email = claims.get('email')
    full_name = f"{claims.get('first_name', '')} {claims.get('last_name', '')}".strip() or email

    # Verificar se usuário existe pelo external_auth_id
    user = db.query(User).filter(User.external_auth_id == external_auth_id).first()

    if user:
        # Atualizar dados existentes
        user.email = email
        user.nome = full_name
    else:
        # Criar novo usuário (ID integer autoincrement + external_auth_id string)
        user = User(
            external_auth_id=external_auth_id,
            email=email,
            nome=full_name,
            empresa_id=1,  # Empresa padrão
            papel='admin',
            ativo=True
        )
        db.add(user)

    db.commit()
    db.refresh(user)
    return user