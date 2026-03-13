"""
Middleware de Auditoria - Bennu Finance
Rastreia automaticamente acessos, ações e uso do sistema
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import json
import logging

from app.models.auditoria import LogAcao, LogAcesso, SessaoUsuario, TipoAcao
from app.models.users import User
from app.database import SessionLocal

logger = logging.getLogger(__name__)

# Cache para evitar múltiplas queries ao mesmo email
_user_id_cache = {}


class AuditoriaMiddleware(BaseHTTPMiddleware):
    """
    Middleware para rastrear automaticamente todas as ações e acessos no sistema
    """
    
    # Rotas que não devem ser auditadas (assets, estáticos, etc)
    ROTAS_IGNORADAS = [
        "/static/",
        "/favicon.ico",
        "/health",
        "/api/health",
        "/docs",
        "/redoc",
        "/openapi.json"
    ]
    
    # Mapeamento de métodos HTTP para tipos de ação
    METODO_PARA_ACAO = {
        "GET": TipoAcao.VIEW,
        "POST": TipoAcao.CREATE,
        "PUT": TipoAcao.UPDATE,
        "PATCH": TipoAcao.UPDATE,
        "DELETE": TipoAcao.DELETE
    }
    
    async def dispatch(self, request: Request, call_next):
        # Ignorar rotas estáticas
        if any(request.url.path.startswith(rota) for rota in self.ROTAS_IGNORADAS):
            return await call_next(request)
        
        # Capturar informações da requisição
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        rota = request.url.path
        metodo = request.method
        
        # Obter usuário e sessão de auditoria (se existir)
        user_id = None
        sessao_id = None
        user_email = None
        try:
            # Tentar obter user_id de múltiplas fontes
            if hasattr(request, 'session'):
                # Primeira opção: user_id diretamente na sessão
                user_id = request.session.get('user_id')
                
                # Se não encontrou, tentar obter de user_claims
                if not user_id:
                    user_claims = request.session.get('user_claims')
                    if user_claims and isinstance(user_claims, dict):
                        # Tentar extrair user_id via lookup de email/username
                        email = user_claims.get('email')
                        if email:
                            user_email = email
                            # Buscar user_id pelo email no banco (com cache)
                            user_id = self._get_user_id_by_email(email)
                
                # Obter sessão de auditoria
                sessao_id = request.session.get('audit_session_id')
        except Exception as e:
            logger.error(f"Erro ao obter user_id/sessao_id: {e}")
        
        # Processar requisição
        response = await call_next(request)
        
        # Registrar apenas se for uma API route que modifica dados
        if rota.startswith("/api/") and metodo in ["POST", "PUT", "PATCH", "DELETE"]:
            try:
                self._registrar_acao(
                    user_id=user_id,
                    sessao_id=sessao_id,
                    metodo=metodo,
                    rota=rota,
                    ip_address=ip_address,
                    status_code=response.status_code
                )
            except Exception as e:
                logger.error(f"Erro ao registrar ação de auditoria: {e}")
        
        return response
    
    def _get_user_id_by_email(self, email: str) -> Optional[int]:
        """Busca user_id pelo email, com cache para performance"""
        global _user_id_cache
        
        # Verificar cache
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
    
    # Mapeamento de entidades para nomes legíveis em português
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
        db = None
        try:
            db = SessionLocal()
            
            # Determinar tipo de ação
            acao = self.METODO_PARA_ACAO.get(metodo, TipoAcao.VIEW)
            
            # Extrair entidade da rota (ex: /api/transacoes/123 -> transacoes)
            partes = rota.strip("/").split("/")
            entidade = partes[1] if len(partes) > 1 else "desconhecido"
            entidade_id = None
            
            # Tentar extrair ID da entidade
            if len(partes) > 2 and partes[2].isdigit():
                entidade_id = int(partes[2])
            
            # Criar descrição legível
            verbo = self.ACAO_VERBOS.get(metodo, metodo)
            nome_entidade = self.ENTIDADE_NOMES.get(entidade, entidade)
            
            if status_code >= 200 and status_code < 300:
                if entidade_id:
                    descricao = f"{verbo} {nome_entidade} #{entidade_id}"
                else:
                    descricao = f"{verbo} {nome_entidade}"
            else:
                descricao = f"Erro ao processar {nome_entidade} (Status {status_code})"
            
            # Criar log de ação
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
    """
    Registra um acesso (login/logout) no sistema
    """
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
    """
    Cria uma nova sessão de usuário
    """
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
    """
    Atualiza a última atividade da sessão e adiciona página visitada
    """
    sessao = db.query(SessaoUsuario).filter(SessaoUsuario.id == sessao_id).first()
    if sessao:
        sessao.ultima_atividade = datetime.now()
        
        # Adicionar página à lista de páginas visitadas
        if pagina:
            try:
                paginas = json.loads(sessao.paginas_visitadas or "[]")
                paginas.append({"pagina": pagina, "timestamp": datetime.now().isoformat()})
                sessao.paginas_visitadas = json.dumps(paginas[-100:])  # Manter últimas 100 páginas
            except:
                pass
        
        db.commit()


def encerrar_sessao(db: Session, sessao_id: int):
    """
    Encerra uma sessão e calcula a duração
    """
    sessao = db.query(SessaoUsuario).filter(SessaoUsuario.id == sessao_id).first()
    if sessao and sessao.ativa:
        sessao.fim = datetime.now()
        sessao.ativa = False
        
        # Calcular duração em segundos
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
    """
    Registra manualmente uma ação específica (para casos especiais)
    """
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
