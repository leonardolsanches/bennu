"""
Bennu Finance - FastAPI Backend + Frontend
Sistema de gestão financeira 100% Python com HTML/CSS/JS
"""
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.routes import empresas, transacoes, auth, categorias, clientes, fornecedores, auxiliares, listagem, relatorios, desmembramento, planejamento, auditoria, admin_backup
from app.auth.oauth import get_current_user
from app.middleware.auditoria import AuditoriaMiddleware
import os

app = FastAPI(
    title="Bennu Finance",
    description="Sistema de gestão financeira empresarial 100% Python",
    version="2.0.0"
)

# Templates Jinja2
templates = Jinja2Templates(directory="app/templates")

# Middleware de Auditoria (adicionar PRIMEIRO para executar ÚLTIMO, após SessionMiddleware)
app.add_middleware(AuditoriaMiddleware)

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

@app.middleware("http")
async def no_cache_static_js_css(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/static/js/") or path.startswith("/static/css/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

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
        return templates.TemplateResponse("dashboard.html", {"request": request})
    except Exception as e:
        # Se houver erro no template, retornar página de erro simples
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
            <a href="/login">Fazer Login</a>
        </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=500)

# Rota de login
@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

# Rotas de páginas

@app.get("/nova-despesa", response_class=HTMLResponse)
async def nova_despesa_page(request: Request):
    transacao_id = request.query_params.get('id')
    return templates.TemplateResponse("nova_despesa.html", {
        "request": request,
        "transacao_id": transacao_id
    })

@app.get("/nova-receita", response_class=HTMLResponse)
async def nova_receita_page(request: Request):
    # Get the transaction ID from query parameters for editing
    transacao_id = request.query_params.get('id')
    return templates.TemplateResponse("nova_receita.html", {
        "request": request,
        "transacao_id": transacao_id
    })

@app.get("/nova_receita", response_class=HTMLResponse)
async def nova_receita_page_underscore(request: Request):
    # Route with underscore to match JavaScript calls
    transacao_id = request.query_params.get('id')
    return templates.TemplateResponse("nova_receita.html", {
        "request": request,
        "transacao_id": transacao_id
    })

# Rota removida - usando a implementação correta em routes/transacoes.py que detecta o tipo

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

        # ✅ ACESSO TOTAL: Usuário pode editar qualquer transação independente da empresa
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

        return templates.TemplateResponse(template_name, {
            "request": request,
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
    return templates.TemplateResponse("cadastros.html", {"request": request})

@app.get("/categorizar")
async def categorizar_page(request: Request, current_user = Depends(get_current_user)):
    """Página para categorizar transações"""
    return templates.TemplateResponse("categorizar.html", {"request": request, "user": current_user})

@app.get("/gerenciar-subcategorias")
async def gerenciar_subcategorias_page(request: Request, current_user = Depends(get_current_user)):
    """Página para gerenciar subcategorias"""
    return templates.TemplateResponse("gerenciar_subcategorias.html", {"request": request, "user": current_user})

@app.get("/relatorios", response_class=HTMLResponse)
async def relatorios_page(request: Request):
    return templates.TemplateResponse("relatorios.html", {"request": request})

@app.get("/relatorios/pl-contabil", response_class=HTMLResponse)
async def relatorios_pl_contabil(request: Request):
    return templates.TemplateResponse("pl-contabil.html", {"request": request})

@app.get("/relatorios/cashflow")
async def cashflow_page(request: Request):
    return templates.TemplateResponse("cashflow.html", {"request": request})

@app.get("/relatorios/cash-control")
async def cash_control_page(request: Request):
    return templates.TemplateResponse("cash-control.html", {"request": request})

@app.get("/relatorios/contas-a-pagar")
async def contas_a_pagar_page(request: Request):
    return templates.TemplateResponse("contas-a-pagar.html", {"request": request})

@app.get("/relatorios/contas-a-receber")
async def contas_a_receber_page(request: Request):
    return templates.TemplateResponse("contas-a-receber.html", {"request": request})

@app.get("/relatorios/retencao-fonte")
async def retencao_fonte_page(request: Request):
    return templates.TemplateResponse("retencao-fonte.html", {"request": request})

@app.get("/relatorios/pl-consolidado", response_class=HTMLResponse)
async def pl_consolidado_page(request: Request):
    return templates.TemplateResponse("pl-consolidado.html", {"request": request})

@app.get("/relatorios/extrato-financeiro", response_class=HTMLResponse)
async def extrato_financeiro_page(request: Request):
    # Por enquanto redireciona para P&L, implementar depois
    return templates.TemplateResponse("pl-contabil.html", {"request": request})

@app.get("/relatorios/receita-cliente", response_class=HTMLResponse)
async def receita_cliente_page(request: Request):
    # Por enquanto redireciona para P&L, implementar depois
    return templates.TemplateResponse("pl-contabil.html", {"request": request})

@app.get("/relatorios/top-despesas", response_class=HTMLResponse)
async def top_despesas_page(request: Request):
    # Por enquanto redireciona para P&L, implementar depois
    return templates.TemplateResponse("pl-contabil.html", {"request": request})

@app.get("/relatorios/planejado-realizado", response_class=HTMLResponse)
async def planejado_realizado_page(request: Request):
    # Por enquanto redireciona para P&L, implementar depois
    return templates.TemplateResponse("pl-contabil.html", {"request": request})

@app.get("/desmembrar", response_class=HTMLResponse)
async def desmembrar_page(request: Request, current_user = Depends(get_current_user)):
    """Página para desmembrar transações"""
    return templates.TemplateResponse("desmembrar.html", {"request": request, "user": current_user})

@app.get("/planejar", response_class=HTMLResponse)
async def planejar_page(request: Request, current_user = Depends(get_current_user)):
    """Página principal de planejamento orçamentário"""
    return templates.TemplateResponse("planejar.html", {"request": request, "user": current_user})

@app.get("/planejar/nova-receita", response_class=HTMLResponse)
async def planejar_nova_receita_page(request: Request, current_user = Depends(get_current_user)):
    """Página para planejar nova receita"""
    return templates.TemplateResponse("planejar_receita.html", {"request": request, "user": current_user})

@app.get("/planejar/nova-despesa", response_class=HTMLResponse)
async def planejar_nova_despesa_page(request: Request, current_user = Depends(get_current_user)):
    """Página para planejar nova despesa"""
    return templates.TemplateResponse("planejar_despesa.html", {"request": request, "user": current_user})

@app.get("/planejar/editar-receita/{linha_id}", response_class=HTMLResponse)
async def editar_planejamento_receita_page(request: Request, linha_id: int, current_user = Depends(get_current_user)):
    """Página para editar planejamento de receita"""
    return templates.TemplateResponse("editar_planejamento_receita.html", {
        "request": request,
        "user": current_user,
        "linha_id": linha_id
    })

@app.get("/planejar/editar-despesa/{linha_id}", response_class=HTMLResponse)
async def editar_planejamento_despesa_page(request: Request, linha_id: int, current_user = Depends(get_current_user)):
    """Página para editar planejamento de despesa"""
    return templates.TemplateResponse("editar_planejamento_despesa.html", {
        "request": request,
        "user": current_user,
        "linha_id": linha_id
    })

@app.get("/planejar/versoes", response_class=HTMLResponse)
async def planejar_versoes_page(request: Request, current_user = Depends(get_current_user)):
    """Página para gerenciar versões do planejamento (baseline, revisões)"""
    return templates.TemplateResponse("planejar_versoes.html", {"request": request, "user": current_user})

@app.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request, current_user = Depends(get_current_user)):
    """Painel Administrativo - Auditoria e Monitoramento de Uso"""
    return templates.TemplateResponse("admin.html", {"request": request, "user": current_user})

@app.get("/admin-impostos", response_class=HTMLResponse)
async def admin_impostos_page(request: Request, current_user = Depends(get_current_user)):
    """Painel Administrativo - Gestão de Impostos por Empresa e Produto/Serviço"""
    return templates.TemplateResponse("admin_impostos.html", {"request": request, "user": current_user})

@app.get("/admin-rateio", response_class=HTMLResponse)
async def admin_rateio(request: Request):
    return templates.TemplateResponse("admin_rateio.html", {"request": request})

@app.get("/admin-rateio-impostos", response_class=HTMLResponse)
async def admin_rateio_impostos(request: Request):
    return templates.TemplateResponse("admin_rateio_impostos.html", {"request": request})

@app.get("/admin-backup", response_class=HTMLResponse)
async def admin_backup_page(request: Request, current_user = Depends(get_current_user)):
    """Painel Administrativo - Backup, Restore e Limpeza do Banco de Dados"""
    return templates.TemplateResponse("admin_backup.html", {"request": request, "user": current_user})

@app.get("/health")
async def health_check_root():
    """Endpoint leve para health check do ALB/ECS — sem dependência de banco."""
    return {"status": "ok"}

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Test DB connectivity
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "backend": "Python/FastAPI", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True if os.getenv("NODE_ENV") == "development" else False
    )