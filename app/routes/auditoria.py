"""
Rotas de Auditoria - Bennu Finance
Endpoints para dashboard administrativo e análise de uso do sistema
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_, case, extract
from datetime import datetime, timedelta
from typing import List, Optional
import json

from app.database import get_db
from app.models.auditoria import LogAcesso, LogAcao, SessaoUsuario, MetricaUso, TipoAcao
from app.models.users import User

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard/metricas")
async def get_metricas_dashboard(
    periodo: str = Query("7d", description="Período: 24h, 7d, 30d, 90d"),
    db: Session = Depends(get_db)
):
    """
    Retorna métricas agregadas para o dashboard administrativo
    """
    # Calcular data inicial baseado no período
    agora = datetime.now()
    if periodo == "24h":
        data_inicial = agora - timedelta(hours=24)
    elif periodo == "7d":
        data_inicial = agora - timedelta(days=7)
    elif periodo == "30d":
        data_inicial = agora - timedelta(days=30)
    elif periodo == "90d":
        data_inicial = agora - timedelta(days=90)
    else:
        data_inicial = agora - timedelta(days=7)
    
    # Total de acessos
    total_acessos = db.query(func.count(LogAcesso.id)).filter(
        LogAcesso.created_at >= data_inicial
    ).scalar()
    
    # Usuários únicos
    usuarios_unicos = db.query(func.count(func.distinct(LogAcesso.user_id))).filter(
        and_(
            LogAcesso.created_at >= data_inicial,
            LogAcesso.user_id.isnot(None)
        )
    ).scalar()
    
    # Total de ações
    total_acoes = db.query(func.count(LogAcao.id)).filter(
        LogAcao.created_at >= data_inicial
    ).scalar()
    
    # Sessões ativas
    sessoes_ativas = db.query(func.count(SessaoUsuario.id)).filter(
        SessaoUsuario.ativa == True
    ).scalar()
    
    # Tempo médio de sessão (sessões encerradas no período)
    tempo_medio = db.query(func.avg(SessaoUsuario.duracao_segundos)).filter(
        and_(
            SessaoUsuario.fim >= data_inicial,
            SessaoUsuario.duracao_segundos.isnot(None)
        )
    ).scalar() or 0
    
    # Ações por tipo
    acoes_por_tipo = db.query(
        LogAcao.acao,
        func.count(LogAcao.id).label("total")
    ).filter(
        LogAcao.created_at >= data_inicial
    ).group_by(LogAcao.acao).all()
    
    # Entidades mais modificadas
    entidades_populares = db.query(
        LogAcao.entidade,
        func.count(LogAcao.id).label("total")
    ).filter(
        and_(
            LogAcao.created_at >= data_inicial,
            LogAcao.acao.in_([TipoAcao.CREATE, TipoAcao.UPDATE, TipoAcao.DELETE])
        )
    ).group_by(LogAcao.entidade).order_by(desc("total")).limit(10).all()
    
    # Gráfico de atividade por dia
    atividade_diaria = db.query(
        func.date_trunc('day', LogAcao.created_at).label("dia"),
        func.count(LogAcao.id).label("total")
    ).filter(
        LogAcao.created_at >= data_inicial
    ).group_by("dia").order_by("dia").all()
    
    return {
        "periodo": periodo,
        "data_inicial": data_inicial.isoformat(),
        "metricas": {
            "total_acessos": total_acessos or 0,
            "usuarios_unicos": usuarios_unicos or 0,
            "total_acoes": total_acoes or 0,
            "sessoes_ativas": sessoes_ativas or 0,
            "tempo_medio_sessao_minutos": round(tempo_medio / 60, 1) if tempo_medio else 0
        },
        "acoes_por_tipo": [{"tipo": str(a.acao), "total": a.total} for a in acoes_por_tipo],
        "entidades_populares": [{"entidade": e.entidade, "total": e.total} for e in entidades_populares],
        "atividade_diaria": [{"dia": a.dia.isoformat(), "total": a.total} for a in atividade_diaria]
    }


@router.get("/usuarios/atividade")
async def get_atividade_usuarios(
    limite: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Retorna lista de usuários com suas atividades recentes
    """
    # Subquery para última atividade
    ultima_atividade_subq = db.query(
        LogAcao.user_id,
        func.max(LogAcao.created_at).label("ultima_atividade")
    ).group_by(LogAcao.user_id).subquery()
    
    # Query principal com JOIN
    usuarios = db.query(
        User.id,
        User.nome,
        User.email,
        func.count(func.distinct(LogAcao.id)).label("total_acoes"),
        func.count(func.distinct(SessaoUsuario.id)).label("total_sessoes"),
        func.max(SessaoUsuario.inicio).label("ultimo_acesso"),
        ultima_atividade_subq.c.ultima_atividade
    ).outerjoin(
        LogAcao, LogAcao.user_id == User.id
    ).outerjoin(
        SessaoUsuario, SessaoUsuario.user_id == User.id
    ).outerjoin(
        ultima_atividade_subq, ultima_atividade_subq.c.user_id == User.id
    ).group_by(
        User.id, User.nome, User.email, ultima_atividade_subq.c.ultima_atividade
    ).order_by(
        desc("ultimo_acesso")
    ).limit(limite).all()
    
    return {
        "usuarios": [
            {
                "id": u.id,
                "nome": u.nome,
                "email": u.email,
                "total_acoes": u.total_acoes or 0,
                "total_sessoes": u.total_sessoes or 0,
                "ultimo_acesso": u.ultimo_acesso.isoformat() if u.ultimo_acesso else None,
                "ultima_atividade": u.ultima_atividade.isoformat() if u.ultima_atividade else None
            }
            for u in usuarios
        ]
    }


@router.get("/logs/acoes")
async def get_logs_acoes(
    page: int = Query(1, ge=1),
    limite: int = Query(50, ge=1, le=200),
    user_id: Optional[int] = None,
    entidade: Optional[str] = None,
    acao: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Retorna logs de ações com paginação e filtros
    """
    # Construir query base com LEFT JOIN para incluir logs sem user_id
    query = db.query(
        LogAcao,
        User.nome.label("usuario_nome"),
        User.email.label("usuario_email")
    ).outerjoin(
        User, User.id == LogAcao.user_id,
        full=False  # Incluir logs mesmo sem user correspondente
    )
    
    # Aplicar filtros
    if user_id:
        query = query.filter(LogAcao.user_id == user_id)
    if entidade:
        query = query.filter(LogAcao.entidade == entidade)
    if acao:
        query = query.filter(LogAcao.acao == acao)
    
    # Contar total
    total = query.count()
    
    # Aplicar paginação
    offset = (page - 1) * limite
    logs = query.order_by(desc(LogAcao.created_at)).offset(offset).limit(limite).all()
    
    return {
        "total": total,
        "page": page,
        "limite": limite,
        "total_pages": (total + limite - 1) // limite,
        "logs": [
            {
                "id": log.LogAcao.id,
                "usuario": {
                    "id": log.LogAcao.user_id,
                    "nome": log.usuario_nome,
                    "email": log.usuario_email
                },
                "acao": str(log.LogAcao.acao),
                "entidade": log.LogAcao.entidade,
                "entidade_id": log.LogAcao.entidade_id,
                "descricao": log.LogAcao.descricao,
                "rota": log.LogAcao.rota,
                "ip_address": log.LogAcao.ip_address,
                "created_at": log.LogAcao.created_at.isoformat()
            }
            for log in logs
        ]
    }


@router.get("/logs/acessos")
async def get_logs_acessos(
    page: int = Query(1, ge=1),
    limite: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Retorna logs de acessos (login/logout) com paginação
    """
    # Contar total
    total = db.query(func.count(LogAcesso.id)).scalar()
    
    # Query com paginação
    offset = (page - 1) * limite
    logs = db.query(
        LogAcesso,
        User.nome.label("usuario_nome")
    ).outerjoin(User, User.id == LogAcesso.user_id)\
     .order_by(desc(LogAcesso.created_at))\
     .offset(offset)\
     .limit(limite)\
     .all()
    
    return {
        "total": total,
        "page": page,
        "limite": limite,
        "total_pages": (total + limite - 1) // limite,
        "logs": [
            {
                "id": log.LogAcesso.id,
                "usuario": {
                    "id": log.LogAcesso.user_id,
                    "nome": log.usuario_nome,
                    "email": log.LogAcesso.email
                },
                "acao": str(log.LogAcesso.acao),
                "sucesso": log.LogAcesso.sucesso,
                "mensagem": log.LogAcesso.mensagem,
                "ip_address": log.LogAcesso.ip_address,
                "user_agent": log.LogAcesso.user_agent,
                "created_at": log.LogAcesso.created_at.isoformat()
            }
            for log in logs
        ]
    }


@router.get("/sessoes/ativas")
async def get_sessoes_ativas(
    db: Session = Depends(get_db)
):
    """
    Retorna todas as sessões ativas com informações dos usuários
    """
    sessoes = db.query(
        SessaoUsuario,
        User.nome.label("usuario_nome"),
        User.email.label("usuario_email")
    ).join(User, User.id == SessaoUsuario.user_id)\
     .filter(SessaoUsuario.ativa == True)\
     .order_by(desc(SessaoUsuario.ultima_atividade))\
     .all()
    
    return {
        "total": len(sessoes),
        "sessoes": [
            {
                "id": s.SessaoUsuario.id,
                "usuario": {
                    "id": s.SessaoUsuario.user_id,
                    "nome": s.usuario_nome,
                    "email": s.usuario_email
                },
                "inicio": s.SessaoUsuario.inicio.isoformat(),
                "ultima_atividade": s.SessaoUsuario.ultima_atividade.isoformat(),
                "duracao_minutos": round((datetime.now() - s.SessaoUsuario.inicio).total_seconds() / 60, 1),
                "ip_address": s.SessaoUsuario.ip_address,
                "paginas_visitadas": json.loads(s.SessaoUsuario.paginas_visitadas or "[]")
            }
            for s in sessoes
        ]
    }


@router.get("/relatorio/uso")
async def get_relatorio_uso(
    data_inicial: Optional[str] = None,
    data_final: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Gera relatório completo de uso do sistema
    """
    # Definir datas
    if data_final:
        fim = datetime.fromisoformat(data_final)
    else:
        fim = datetime.now()
    
    if data_inicial:
        inicio = datetime.fromisoformat(data_inicial)
    else:
        inicio = fim - timedelta(days=30)
    
    # Métricas gerais
    total_usuarios = db.query(func.count(User.id)).scalar()
    usuarios_ativos = db.query(func.count(func.distinct(LogAcao.user_id))).filter(
        LogAcao.created_at >= inicio
    ).scalar()
    
    # Ações por usuário
    acoes_por_usuario = db.query(
        User.nome,
        User.email,
        func.count(LogAcao.id).label("total_acoes")
    ).join(LogAcao, LogAcao.user_id == User.id)\
     .filter(LogAcao.created_at >= inicio)\
     .group_by(User.nome, User.email)\
     .order_by(desc("total_acoes"))\
     .limit(10)\
     .all()
    
    # Ações por hora do dia (para identificar horários de pico)
    acoes_por_hora = db.query(
        extract('hour', LogAcao.created_at).label("hora"),
        func.count(LogAcao.id).label("total")
    ).filter(LogAcao.created_at >= inicio)\
     .group_by("hora")\
     .order_by("hora")\
     .all()
    
    return {
        "periodo": {
            "inicio": inicio.isoformat(),
            "fim": fim.isoformat()
        },
        "resumo": {
            "total_usuarios": total_usuarios,
            "usuarios_ativos": usuarios_ativos or 0,
            "taxa_ativacao": round((usuarios_ativos / total_usuarios * 100), 1) if total_usuarios > 0 else 0
        },
        "top_usuarios": [
            {"nome": u.nome, "email": u.email, "total_acoes": u.total_acoes}
            for u in acoes_por_usuario
        ],
        "acoes_por_hora": [
            {"hora": int(a.hora), "total": a.total}
            for a in acoes_por_hora
        ]
    }
