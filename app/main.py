"""
Bennu Finance - FastAPI Backend + Frontend
Sistema de gestão financeira 100% Python com HTML/CSS/JS
"""
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
import traceback
from app.routes import empresas, transacoes, auth, categorias, clientes, fornecedores, auxiliares, listagem, relatorios, desmembramento, planejamento, auditoria, admin_backup
from app.auth.oauth import get_current_user
from app.middleware.auditoria import AuditoriaMiddleware
import os


from starlette.types import ASGIApp, Receive, Scope, Send as ASGISend
from starlette.datastructures import MutableHeaders


class NoCacheStaticMiddleware:
    """ASGI puro — substitui @app.middleware('http') que usava BaseHTTPMiddleware.
    Adiciona headers no-cache para /static/js/ e /static/css/ via send_wrapper,
    sem risco de deadlock no Starlette 0.42+."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: ASGISend):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        is_static = path.startswith("/static/js/") or path.startswith("/static/css/")

        if not is_static:
            await self.app(scope, receive, send)
            return

        async def send_with_no_cache(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
                headers["Pragma"] = "no-cache"
                headers["Expires"] = "0"
            await send(message)

        await self.app(scope, receive, send_with_no_cache)


class AuthMiddleware:
    """Middleware ASGI puro — sem BaseHTTPMiddleware para evitar conflito com AuditoriaMiddleware."""

    PUBLIC_PATHS = {
        "/login",
        "/api/login",
        "/api/logout",
        "/api/callback",
        "/health",
        "/api/health",
        "/debug-session",
    }
    PUBLIC_PREFIXES = ("/static/", "/favicon")

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: ASGISend):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if path in self.PUBLIC_PATHS or any(path.startswith(p) for p in self.PUBLIC_PREFIXES):
            await self.app(scope, receive, send)
            return

        session = scope.get("session", {})
        if not session.get("user_claims"):
            response = RedirectResponse(url="/login", status_code=302)
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)

app = FastAPI(
    title="Bennu Finance",
    description="Sistema de gestão financeira empresarial 100% Python",
    version="2.0.1"
)

# Templates Jinja2
templates = Jinja2Templates(directory="app/templates")

# Middleware de Auditoria (innermost - executa por último)
app.add_middleware(AuditoriaMiddleware)

# Middleware de Autenticação — executa após Session popular request.session
app.add_middleware(AuthMiddleware)

# Middleware de sessão (necessário para OAuth)
session_secret = os.getenv("SESSION_SECRET") or os.getenv("SECRET_KEY")
if not session_secret:
    import secrets
    session_secret = secrets.token_hex(32)
    print("⚠️  WARNING: SESSION_SECRET não configurada. Usando chave temporária (sessões não persistirão entre restarts). Configure SESSION_SECRET nas variáveis de ambiente!")

app.add_middleware(
    SessionMiddleware,
    secret_key=session_secret,
    max_age=86400,  # 24 horas
    same_site="lax",
    https_only=False  # Permitir HTTP e HTTPS para compatibilidade com Render
)

# CORS para desenvolvimento e produção
allowed_origins = ["http://localhost:3000", "http://localhost:5000"]

# Em produção, adicionar domínios do Render
if os.getenv("NODE_ENV") == "production":
    render_url = os.getenv("RENDER_EXTERNAL_URL")
    if render_url:
        allowed_origins.append(render_url)
        allowed_origins.append(render_url.replace("http://", "https://"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(NoCacheStaticMiddleware)

# Incluir rotas (compatíveis com API Node.js)
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(empresas.router, prefix="/api", tags=["empresas"])
app.include_router(transacoes.router, prefix="/api", tags=["transacoes"])
app.include_router(categorias.router, prefix="/api", tags=["categorias"])
app.include_router(clientes.router, prefix="/api", tags=["clientes"])
app.include_router(fornecedores.router, prefix="/api", tags=["fornecedores"])
app.include_router(auxiliares.router, prefix="/api", tags=["auxiliares"])
app.include_router(listagem.router, tags=["listagem"])
app.include_router(relatorios.router, prefix="/api", tags=["relatorios"])
app.include_router(desmembramento.router, prefix="/api", tags=["desmembramento"])
app.include_router(planejamento.router, prefix="/api", tags=["planejamento"])
app.include_router(auditoria.router, tags=["admin"])
app.include_router(admin_backup.router, prefix="/api", tags=["admin-backup"])

# Servir arquivos estáticos (CSS, JS, images)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Rota principal - Dashboard
@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    try:
        return templates.TemplateResponse(request, "dashboard.html")
    except Exception as e:
        tb = traceback.format_exc()
        print(f"❌ ERRO ao renderizar dashboard: {e}\n{tb}")
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bennu Finance - Erro</title>
            <meta charset="utf-8">
        </head>
        <body>
            <h1>Erro no Sistema</h1>
            <p>Ocorreu um erro ao carregar a página: {str(e)}</p>
            <pre style="background:#f5f5f5;padding:12px;font-size:11px;overflow:auto">{tb}</pre>
            <a href="/login">Fazer Login</a>
        </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=500)

# Rota de login
@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse(request, "login.html")

# ─── DIAGNÓSTICO TEMPORÁRIO (remover após resolver bug) ───────────────────────
@app.get("/debug-session")
async def debug_session(request: Request):
    """Endpoint temporário para diagnosticar bug de sessão em produção"""
    import traceback as _tb
    result = {}
    try:
        has_session = hasattr(request, 'session')
        result['has_session'] = has_session
        if has_session:
            try:
                session_keys = list(request.session.keys())
                result['session_keys'] = session_keys
            except Exception as e:
                result['session_keys_error'] = str(e)
            try:
                user_id = request.session.get('user_id')
                result['user_id'] = user_id
                result['user_id_type'] = type(user_id).__name__
            except Exception as e:
                result['user_id_error'] = str(e)
            try:
                user_claims = request.session.get('user_claims')
                result['user_claims_type'] = type(user_claims).__name__
                if isinstance(user_claims, dict):
                    result['user_claims_keys'] = list(user_claims.keys())
                    for k, v in user_claims.items():
                        result[f'claim_{k}_type'] = type(v).__name__
                        result[f'claim_{k}_value'] = str(v)[:100]
                else:
                    result['user_claims_value'] = str(user_claims)[:200]
            except Exception as e:
                result['user_claims_error'] = str(e)
                result['user_claims_traceback'] = _tb.format_exc()
    except Exception as e:
        result['global_error'] = str(e)
        result['global_traceback'] = _tb.format_exc()

    try:
        test_render = templates.TemplateResponse(request, "dashboard.html")
        result['template_render'] = 'SUCCESS'
    except Exception as e:
        result['template_render'] = 'FAILED'
        result['template_error'] = str(e)
        result['template_traceback'] = _tb.format_exc()

    return result
# ──────────────────────────────────────────────────────────────────────────────

# Rotas de páginas

@app.get("/nova-despesa", response_class=HTMLResponse)
async def nova_despesa_page(request: Request):
    transacao_id = request.query_params.get('id')
    return templates.TemplateResponse(request, "nova_despesa.html", {"transacao_id": transacao_id})

@app.get("/nova-receita", response_class=HTMLResponse)
async def nova_receita_page(request: Request):
    transacao_id = request.query_params.get('id')
    return templates.TemplateResponse(request, "nova_receita.html", {"transacao_id": transacao_id})

@app.get("/nova_receita", response_class=HTMLResponse)
async def nova_receita_page_underscore(request: Request):
    transacao_id = request.query_params.get('id')
    return templates.TemplateResponse(request, "nova_receita.html", {"transacao_id": transacao_id})

# Rota de edição de transações
@app.get("/transacoes/editar/{transacao_id}", response_class=HTMLResponse)
async def editar_transacao_page(
    request: Request,
    transacao_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Página de edição - usa formulário completo baseado no tipo da transação
    """
    try:
        from app.models import TransacaoFinanceira
        print(f"🔍 Carregando página de edição para transação {transacao_id}")

        transacao = db.query(TransacaoFinanceira).filter(
            TransacaoFinanceira.id == transacao_id
        ).first()

        if not transacao:
            print(f"❌ Transação {transacao_id} não encontrada")
            raise HTTPException(status_code=404, detail="Transação não encontrada")

        print(f"✅ Transação encontrada: tipo={transacao.tipo}, empresa_id={transacao.empresa_id}")

        if transacao.tipo == 'receita':
            template_name = "nova_receita.html"
        else:
            template_name = "nova_despesa.html"

        return templates.TemplateResponse(request, template_name, {
            "transacao_id": transacao_id,
            "user": current_user
        })

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao carregar página de edição: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@app.get("/cadastros", response_class=HTMLResponse)
async def cadastros_page(request: Request):
    return templates.TemplateResponse(request, "cadastros.html")

@app.get("/categorizar")
async def categorizar_page(request: Request, current_user = Depends(get_current_user)):
    """Página para categorizar transações"""
    return templates.TemplateResponse(request, "categorizar.html", {"user": current_user})

@app.get("/gerenciar-subcategorias")
async def gerenciar_subcategorias_page(request: Request, current_user = Depends(get_current_user)):
    """Página para gerenciar subcategorias"""
    return templates.TemplateResponse(request, "gerenciar_subcategorias.html", {"user": current_user})

@app.get("/relatorios", response_class=HTMLResponse)
async def relatorios_page(request: Request):
    return templates.TemplateResponse(request, "relatorios.html")

@app.get("/relatorios/pl-contabil", response_class=HTMLResponse)
async def relatorios_pl_contabil(request: Request):
    return templates.TemplateResponse(request, "pl-contabil.html")

@app.get("/relatorios/cashflow")
async def cashflow_page(request: Request):
    return templates.TemplateResponse(request, "cashflow.html")

@app.get("/relatorios/cash-control")
async def cash_control_page(request: Request):
    return templates.TemplateResponse(request, "cash-control.html")

@app.get("/relatorios/contas-a-pagar")
async def contas_a_pagar_page(request: Request):
    return templates.TemplateResponse(request, "contas-a-pagar.html")

@app.get("/relatorios/contas-a-receber")
async def contas_a_receber_page(request: Request):
    return templates.TemplateResponse(request, "contas-a-receber.html")

@app.get("/relatorios/retencao-fonte")
async def retencao_fonte_page(request: Request):
    return templates.TemplateResponse(request, "retencao-fonte.html")

@app.get("/relatorios/pl-consolidado", response_class=HTMLResponse)
async def pl_consolidado_page(request: Request):
    return templates.TemplateResponse(request, "pl-consolidado.html")

@app.get("/relatorios/extrato-financeiro", response_class=HTMLResponse)
async def extrato_financeiro_page(request: Request):
    return templates.TemplateResponse(request, "pl-contabil.html")

@app.get("/relatorios/receita-cliente", response_class=HTMLResponse)
async def receita_cliente_page(request: Request):
    return templates.TemplateResponse(request, "pl-contabil.html")

@app.get("/relatorios/top-despesas", response_class=HTMLResponse)
async def top_despesas_page(request: Request):
    return templates.TemplateResponse(request, "pl-contabil.html")

@app.get("/relatorios/planejado-realizado", response_class=HTMLResponse)
async def planejado_realizado_page(request: Request):
    return templates.TemplateResponse(request, "pl-contabil.html")

@app.get("/desmembrar", response_class=HTMLResponse)
async def desmembrar_page(request: Request, current_user = Depends(get_current_user)):
    """Página para desmembrar transações"""
    return templates.TemplateResponse(request, "desmembrar.html", {"user": current_user})

@app.get("/planejar", response_class=HTMLResponse)
async def planejar_page(request: Request, current_user = Depends(get_current_user)):
    """Página principal de planejamento orçamentário"""
    return templates.TemplateResponse(request, "planejar.html", {"user": current_user})

@app.get("/planejar/nova-receita", response_class=HTMLResponse)
async def planejar_nova_receita_page(request: Request, current_user = Depends(get_current_user)):
    """Página para planejar nova receita"""
    return templates.TemplateResponse(request, "planejar_receita.html", {"user": current_user})

@app.get("/planejar/nova-despesa", response_class=HTMLResponse)
async def planejar_nova_despesa_page(request: Request, current_user = Depends(get_current_user)):
    """Página para planejar nova despesa"""
    return templates.TemplateResponse(request, "planejar_despesa.html", {"user": current_user})

@app.get("/planejar/editar-receita/{linha_id}", response_class=HTMLResponse)
async def editar_planejamento_receita_page(request: Request, linha_id: int, current_user = Depends(get_current_user)):
    """Página para editar planejamento de receita"""
    return templates.TemplateResponse(request, "editar_planejamento_receita.html", {
        "user": current_user,
        "linha_id": linha_id
    })

@app.get("/planejar/editar-despesa/{linha_id}", response_class=HTMLResponse)
async def editar_planejamento_despesa_page(request: Request, linha_id: int, current_user = Depends(get_current_user)):
    """Página para editar planejamento de despesa"""
    return templates.TemplateResponse(request, "editar_planejamento_despesa.html", {
        "user": current_user,
        "linha_id": linha_id
    })

@app.get("/planejar/versoes", response_class=HTMLResponse)
async def planejar_versoes_page(request: Request, current_user = Depends(get_current_user)):
    """Página para gerenciar versões do planejamento (baseline, revisões)"""
    return templates.TemplateResponse(request, "planejar_versoes.html", {"user": current_user})

@app.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request, current_user = Depends(get_current_user)):
    """Painel Administrativo - Auditoria e Monitoramento de Uso"""
    return templates.TemplateResponse(request, "admin.html", {"user": current_user})

@app.get("/admin-impostos", response_class=HTMLResponse)
async def admin_impostos_page(request: Request, current_user = Depends(get_current_user)):
    """Painel Administrativo - Gestão de Impostos por Empresa e Produto/Serviço"""
    return templates.TemplateResponse(request, "admin_impostos.html", {"user": current_user})

@app.get("/admin-rateio", response_class=HTMLResponse)
async def admin_rateio(request: Request):
    return templates.TemplateResponse(request, "admin_rateio.html")

@app.get("/admin-rateio-impostos", response_class=HTMLResponse)
async def admin_rateio_impostos(request: Request):
    return templates.TemplateResponse(request, "admin_rateio_impostos.html")

@app.get("/admin-backup", response_class=HTMLResponse)
async def admin_backup_page(request: Request, current_user = Depends(get_current_user)):
    """Painel Administrativo - Backup, Restore e Limpeza do Banco de Dados"""
    return templates.TemplateResponse(request, "admin_backup.html", {"user": current_user})

@app.get("/health")
async def health_check_root():
    """Endpoint ultra-leve para health check do ECS/ALB — sem DB, responde em <1ms."""
    return {"status": "ok"}

@app.get("/api/health")
async def health_check():
    """Health check diagnóstico — usa engine isolada com connect_timeout=3s para não vazar threads."""
    import asyncio
    from sqlalchemy import create_engine

    db_status = "unavailable"
    try:
        database_url = os.getenv("DATABASE_URL", "")
        if not database_url:
            db_status = "no DATABASE_URL"
        else:
            def _ping_db():
                engine = create_engine(
                    database_url,
                    connect_args={"connect_timeout": 3},
                    pool_size=1,
                    max_overflow=0,
                    pool_timeout=3,
                    pool_pre_ping=False,
                )
                try:
                    with engine.connect() as conn:
                        conn.execute(text("SELECT 1"))
                    return "connected"
                except Exception as e:
                    return f"error: {str(e)[:120]}"
                finally:
                    engine.dispose()

            loop = asyncio.get_event_loop()
            db_status = await asyncio.wait_for(
                loop.run_in_executor(None, _ping_db),
                timeout=5.0
            )
    except asyncio.TimeoutError:
        db_status = "timeout (>5s)"
    except Exception as e:
        db_status = f"error: {str(e)[:120]}"

    return {"status": "ok", "backend": "Python/FastAPI", "database": db_status}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True if os.getenv("NODE_ENV") == "development" else False
    )
