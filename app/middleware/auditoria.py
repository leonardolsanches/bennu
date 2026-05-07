"""
Middleware de Auditoria - Bennu Finance
Rastreia automaticamente acessos, ações e uso do sistema.

IMPORTANTE: Implementado como ASGI puro (sem BaseHTTPMiddleware) para evitar
o deadlock conhecido do Starlette 0.42+ com call_next em picos de tráfego.
"""
from starlette.types import ASGIApp, Receive, Scope, Send
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from typing import Optional
import asyncio
import json
import logging
import traceback as tb_module

from app.models.auditoria import LogAcao, LogAcesso, SessaoUsuario, TipoAcao
from app.models.users import User
from app.database import SessionLocal

logger = logging.getLogger(__name__)

# Cache para evitar múltiplas queries ao mesmo email
_user_id_cache = {}


class AuditoriaMiddleware:
    """
    Middleware ASGI puro para rastrear ações e acessos no sistema.
    Convertido de BaseHTTPMiddleware para evitar deadlock no Starlette 0.42+
    que causava quedas aleatórias da aplicação em picos de tráfego.
    """

    ROTAS_IGNORADAS = [
        "/static/",
        "/favicon.ico",
        "/health",
        "/api/health",
        "/docs",
        "/redoc",
        "/openapi.json"
    ]

    METODO_PARA_ACAO = {
        "GET": TipoAcao.VIEW,
        "POST": TipoAcao.CREATE,
        "PUT": TipoAcao.UPDATE,
        "PATCH": TipoAcao.UPDATE,
        "DELETE": TipoAcao.DELETE
    }

    ENTIDADE_NOMES = {
        "transacoes": "transação",
        "categorias-contabeis": "categoria contábil",
        "categorias-gerenciais": "categoria gerencial",
        "subcategorias": "subcategoria",
        "subcategorias-gerenciais": "subcategoria gerencial",
        "centros-custo": "centro de custo",
        "contas-contabeis": "conta contábil",
        "empresas": "empresa",
        "clientes": "cliente",
        "fornecedores": "fornecedor",
        "produtos-servicos": "produto/serviço",
        "impostos": "imposto",
        "planejamento": "planejamento orçamentário",
        "users": "usuário"
    }

    ACAO_VERBOS = {
        "POST": "Criou",
        "PUT": "Atualizou",
        "PATCH": "Atualizou",
        "DELETE": "Removeu"
    }

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")

        # Ignorar rotas estáticas/health sem nenhum processamento adicional
        if any(path.startswith(r) for r in self.ROTAS_IGNORADAS):
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")

        # IP do cliente
        try:
            client = scope.get("client")
            ip_address = client[0] if client else None
        except Exception:
            ip_address = None

        # User-Agent
        try:
            headers = dict(scope.get("headers", []))
            user_agent = headers.get(b"user-agent", b"").decode("utf-8", errors="ignore") or None
        except Exception:
            user_agent = None

        # Usuário e sessão — lidos de scope["session"] populado pelo SessionMiddleware
        user_id = None
        sessao_id = None
        email_para_lookup = None
        try:
            session = scope.get("session", {})
            raw_uid = session.get("user_id")
            if raw_uid and isinstance(raw_uid, int):
                user_id = raw_uid

            if not user_id:
                user_claims = session.get("user_claims")
                if user_claims and isinstance(user_claims, dict):
                    email = user_claims.get("email")
                    if email and isinstance(email, str):
                        email_para_lookup = email

            sessao_id = session.get("audit_session_id")
            if sessao_id and not isinstance(sessao_id, int):
                sessao_id = None
        except Exception as e:
            logger.error(f"AuditoriaMiddleware: erro ao obter user_id/sessao_id: {e}")

        # Lookup do user_id por email — executado em thread pool para não bloquear o event loop
        if not user_id and email_para_lookup:
            try:
                user_id = await asyncio.to_thread(self._get_user_id_by_email, email_para_lookup)
            except Exception as e:
                logger.error(f"AuditoriaMiddleware: erro no lookup de user_id: {e}")

        # Capturar status code da resposta via send_wrapper
        status_code = [200]

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code[0] = message.get("status", 200)
            await send(message)

        # Processar requisição — NUNCA bloqueia, sempre repassa
        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            logger.error(f"AuditoriaMiddleware: erro na requisição {method} {path}: {e}\n{tb_module.format_exc()}")
            raise

        # Registrar apenas rotas de API que modificam dados
        # Executado em thread pool (fire-and-forget) para não bloquear o event loop
        if path.startswith("/api/") and method in ["POST", "PUT", "PATCH", "DELETE"]:
            try:
                loop = asyncio.get_event_loop()
                loop.run_in_executor(
                    None,
                    self._registrar_acao,
                    user_id, sessao_id, method, path, ip_address, status_code[0]
                )
            except Exception as e:
                logger.error(f"AuditoriaMiddleware: erro ao agendar registro de ação: {e}")

    def _get_user_id_by_email(self, email: str) -> Optional[int]:
        """Busca user_id pelo email, com cache para performance"""
        global _user_id_cache
        if email in _user_id_cache:
            return _user_id_cache[email]
        db = None
        try:
            db = SessionLocal()
            user = db.query(User).filter(User.email == email).first()
            if user:
                _user_id_cache[email] = user.id
                return user.id
        except Exception as e:
            logger.error(f"Erro ao buscar user_id por email: {e}")
        finally:
            if db:
                db.close()
        return None

    def _registrar_acao(
        self,
        user_id: Optional[int],
        sessao_id: Optional[int],
        metodo: str,
        rota: str,
        ip_address: Optional[str],
        status_code: int
    ):
        """Registra uma ação no log de auditoria"""
        # Pré-calcular dados antes do bloco db para usar no retry
        acao = self.METODO_PARA_ACAO.get(metodo, TipoAcao.VIEW)
        partes = rota.strip("/").split("/")
        entidade = partes[1] if len(partes) > 1 else "desconhecido"
        entidade_id = int(partes[2]) if len(partes) > 2 and partes[2].isdigit() else None
        verbo = self.ACAO_VERBOS.get(metodo, metodo)
        nome_entidade = self.ENTIDADE_NOMES.get(entidade, entidade)
        if 200 <= status_code < 300:
            descricao = f"{verbo} {nome_entidade} #{entidade_id}" if entidade_id else f"{verbo} {nome_entidade}"
        else:
            descricao = f"Erro ao processar {nome_entidade} (Status {status_code})"

        db = None
        try:
            db = SessionLocal()
            log_acao = LogAcao(
                user_id=user_id,
                sessao_id=sessao_id,
                acao=acao,
                entidade=entidade,
                entidade_id=entidade_id,
                descricao=descricao,
                ip_address=ip_address,
                rota=rota
            )
            db.add(log_acao)
            db.commit()
        except Exception as e:
            err_str = str(e)
            if ("UniqueViolation" in err_str or "duplicate key" in err_str or "unique constraint" in err_str) and db:
                try:
                    db.rollback()
                    db.execute(text(
                        "SELECT setval(pg_get_serial_sequence('logs_acoes', 'id'), "
                        "COALESCE((SELECT MAX(id) FROM logs_acoes), 1), true)"
                    ))
                    db.commit()
                    db.add(LogAcao(
                        user_id=user_id,
                        sessao_id=sessao_id,
                        acao=acao,
                        entidade=entidade,
                        entidade_id=entidade_id,
                        descricao=descricao,
                        ip_address=ip_address,
                        rota=rota
                    ))
                    db.commit()
                    logger.info("Log de ação salvo após auto-correção de sequence.")
                except Exception as e2:
                    logger.error(f"Erro ao salvar log de ação (retry): {e2}")
            else:
                logger.error(f"Erro ao salvar log de ação: {e}")
        finally:
            if db:
                db.close()


def registrar_acesso(
    db: Session,
    user_id: Optional[int],
    email: Optional[str],
    acao: TipoAcao,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    sucesso: bool = True,
    mensagem: Optional[str] = None
) -> LogAcesso:
    """Registra um acesso (login/logout) no sistema"""
    log_acesso = LogAcesso(
        user_id=user_id,
        email=email,
        acao=acao,
        ip_address=ip_address,
        user_agent=user_agent,
        sucesso=sucesso,
        mensagem=mensagem
    )
    db.add(log_acesso)
    db.commit()
    db.refresh(log_acesso)
    return log_acesso


def criar_sessao(
    db: Session,
    user_id: int,
    session_token: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> SessaoUsuario:
    """Cria uma nova sessão de usuário"""
    sessao = SessaoUsuario(
        user_id=user_id,
        session_token=session_token,
        ip_address=ip_address,
        user_agent=user_agent,
        ativa=True
    )
    db.add(sessao)
    db.commit()
    db.refresh(sessao)
    return sessao


def atualizar_atividade_sessao(
    db: Session,
    sessao_id: int,
    pagina: Optional[str] = None
):
    """Atualiza a última atividade da sessão e adiciona página visitada"""
    sessao = db.query(SessaoUsuario).filter(SessaoUsuario.id == sessao_id).first()
    if sessao:
        sessao.ultima_atividade = datetime.now()
        if pagina:
            try:
                paginas = json.loads(sessao.paginas_visitadas or "[]")
                paginas.append({"pagina": pagina, "timestamp": datetime.now().isoformat()})
                sessao.paginas_visitadas = json.dumps(paginas[-100:])
            except Exception:
                pass
        db.commit()


def encerrar_sessao(db: Session, sessao_id: int):
    """Encerra uma sessão e calcula a duração"""
    sessao = db.query(SessaoUsuario).filter(SessaoUsuario.id == sessao_id).first()
    if sessao and sessao.ativa:
        sessao.fim = datetime.now()
        sessao.ativa = False
        if sessao.inicio:
            duracao = (sessao.fim - sessao.inicio).total_seconds()
            sessao.duracao_segundos = int(duracao)
        db.commit()


def registrar_acao_manual(
    db: Session,
    user_id: Optional[int],
    acao: TipoAcao,
    entidade: str,
    entidade_id: Optional[int] = None,
    descricao: Optional[str] = None,
    dados_antes: Optional[dict] = None,
    dados_depois: Optional[dict] = None,
    ip_address: Optional[str] = None,
    rota: Optional[str] = None
) -> LogAcao:
    """Registra manualmente uma ação específica (para casos especiais)"""
    log_acao = LogAcao(
        user_id=user_id,
        acao=acao,
        entidade=entidade,
        entidade_id=entidade_id,
        descricao=descricao,
        dados_antes=json.dumps(dados_antes) if dados_antes else None,
        dados_depois=json.dumps(dados_depois) if dados_depois else None,
        ip_address=ip_address,
        rota=rota
    )
    db.add(log_acao)
    db.commit()
    db.refresh(log_acao)
    return log_acao
