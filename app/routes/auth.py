"""
Rotas de autenticação - compatível com Replit OAuth
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.oauth import oauth, get_current_user, upsert_user_from_claims
from app.models import User
from app.models.auditoria import TipoAcao
from app.middleware.auditoria import registrar_acesso, criar_sessao, encerrar_sessao
import os

router = APIRouter()

@router.get("/auth/user")
async def api_get_current_user(request: Request, db: Session = Depends(get_db)):
    """
    Retorna usuário autenticado atual
    Compatível com: GET /api/auth/user (Node.js)
    """
    try:
        user = await get_current_user(request, db)
        return {
            "id": user.id,
            "name": user.nome,
            "email": user.email,
            "empresa_id": user.empresa_id,
            "papel": user.papel
        }
    except HTTPException:
        raise HTTPException(status_code=401, detail={"message": "Unauthorized"})

@router.post("/login")
async def login(request: Request, db: Session = Depends(get_db)):
    """
    Login com email e senha (aceita JSON ou form data)
    """
    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            body = await request.json()
            email = body.get("email")
            senha = body.get("senha")
        else:
            form = await request.form()
            email = form.get("email")
            senha = form.get("senha")
        
        # Verificar credenciais admin
        admin_email = os.getenv("ADMIN_EMAIL", "admin@bennu.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
        
        # Credenciais hardcoded
        users_hardcoded = {
            admin_email: {
                'senha': admin_password,
                'external_auth_id': 'admin_user',
                'nome': 'Administrador',
                'papel': 'admin'
            },
            'carolina': {
                'senha': 'Bennu3.0',
                'external_auth_id': 'carolina_user',
                'nome': 'Carolina',
                'papel': 'admin'
            },
            'marcelo': {
                'senha': 'Bennu3.0',
                'external_auth_id': 'marcelo_user',
                'nome': 'Marcelo',
                'papel': 'admin'
            }
        }
        
        if email in users_hardcoded and senha == users_hardcoded[email]['senha']:
            user_data = users_hardcoded[email]
            
            # Criar/encontrar usuário
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    external_auth_id=user_data['external_auth_id'],
                    email=email,
                    nome=user_data['nome'],
                    empresa_id=1,
                    papel=user_data['papel'],
                    ativo=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            else:
                # Atualizar external_auth_id se usuário existir mas não tiver
                current_auth_id = getattr(user, 'external_auth_id', None)
                if current_auth_id is None or current_auth_id == '':
                    setattr(user, 'external_auth_id', user_data['external_auth_id'])
                    db.commit()
                    db.refresh(user)
            
            # Criar sessão
            user_claims = {
                'sub': user_data['external_auth_id'],
                'email': email,
                'first_name': user_data['nome'],
                'last_name': '',
                'username': email.split('@')[0] if '@' in email else email
            }
            
            request.session['user_claims'] = user_claims
            request.session['access_token'] = f"{user_data['external_auth_id']}_token"
            
            # Armazenar user_id diretamente na sessão para evitar lookups no middleware
            request.session['user_id'] = user.id
            
            # Registrar acesso e criar sessão de auditoria
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
            
            try:
                import uuid
                
                # Gerar token de sessão único
                session_token = str(uuid.uuid4())
                
                # Registrar log de acesso
                registrar_acesso(
                    db=db,
                    user_id=user.id,
                    email=email,
                    acao=TipoAcao.LOGIN,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    sucesso=True,
                    mensagem="Login realizado com sucesso"
                )
                
                # Criar sessão
                sessao = criar_sessao(
                    db=db,
                    user_id=user.id,
                    session_token=session_token,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                
                # Guardar ID da sessão e token na session do FastAPI
                request.session['audit_session_id'] = sessao.id
                request.session['audit_session_token'] = session_token
                
            except Exception as e:
                print(f"⚠️ Erro ao registrar auditoria de login: {e}")
            
            is_form_submit = "application/json" not in content_type
            if is_form_submit:
                return RedirectResponse(url="/", status_code=302)
            return {"success": True, "message": "Login realizado com sucesso"}
        else:
            is_form_submit = "application/json" not in content_type
            if is_form_submit:
                return RedirectResponse(url="/login?error=1", status_code=302)
            raise HTTPException(status_code=401, detail="Email ou senha incorretos")
            
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        is_form_submit = "application/json" not in (request.headers.get("content-type", ""))
        if is_form_submit:
            return RedirectResponse(url="/login?error=1", status_code=302)
        raise HTTPException(status_code=400, detail="Erro no login")

@router.get("/login")
async def login_get(request: Request):
    """
    GET /api/login redireciona para a página de login
    """
    return RedirectResponse(url="/login", status_code=302)

@router.get("/callback")
async def oauth_callback(request: Request, db: Session = Depends(get_db)):
    """
    Callback OAuth - redireciona para home
    Compatível com: GET /api/callback (Node.js)
    """
    # Redirecionar para home sempre
    return RedirectResponse(url="/", status_code=302)

@router.get("/logout") 
async def logout(request: Request, db: Session = Depends(get_db)):
    """
    Faz logout e limpa sessão
    Compatível com: GET /api/logout (Node.js)
    """
    # Obter informações antes de limpar sessão
    user_claims = request.session.get('user_claims')
    audit_session_id = request.session.get('audit_session_id')
    
    try:
        # Se temos user_claims, registrar logout
        if user_claims and user_claims.get('email'):
            email = user_claims.get('email')
            user = db.query(User).filter(User.email == email).first()
            
            if user:
                ip_address = request.client.host if request.client else None
                user_agent = request.headers.get("user-agent")
                
                # Registrar logout
                registrar_acesso(
                    db=db,
                    user_id=user.id,
                    email=email,
                    acao=TipoAcao.LOGOUT,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    sucesso=True,
                    mensagem="Logout realizado com sucesso"
                )
                
                # Encerrar sessão se existir
                if audit_session_id:
                    encerrar_sessao(db=db, sessao_id=audit_session_id)
                    
    except Exception as e:
        print(f"⚠️ Erro ao registrar auditoria de logout: {e}")
    
    request.session.clear()
    return RedirectResponse(url="/login", status_code=302)