"""
Modelos de Auditoria - Bennu Finance
Rastreamento de acessos, ações e uso do sistema
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base
import enum


class TipoAcao(str, enum.Enum):
    """Tipos de ações rastreadas"""
    LOGIN = "login"
    LOGOUT = "logout"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    VIEW = "view"
    EXPORT = "export"
    IMPORT = "import"


class LogAcesso(Base):
    """
    Registra todos os acessos ao sistema (login/logout)
    """
    __tablename__ = "logs_acesso"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    email = Column(String(255), nullable=True)
    acao = Column(SQLEnum(TipoAcao), nullable=False)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    sucesso = Column(Boolean, default=True)
    mensagem = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    user = relationship("User", back_populates="logs_acesso")


class LogAcao(Base):
    """
    Registra todas as ações dos usuários no sistema (CRUD operations)
    """
    __tablename__ = "logs_acoes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    sessao_id = Column(Integer, ForeignKey('sessoes_usuario.id'), nullable=True)
    acao = Column(SQLEnum(TipoAcao), nullable=False)
    entidade = Column(String(100), nullable=False)  # nome da tabela/modelo
    entidade_id = Column(Integer, nullable=True)  # ID do registro afetado
    descricao = Column(Text, nullable=True)
    dados_antes = Column(Text, nullable=True)  # JSON com dados anteriores (UPDATE/DELETE)
    dados_depois = Column(Text, nullable=True)  # JSON com dados novos (CREATE/UPDATE)
    ip_address = Column(String(50), nullable=True)
    rota = Column(String(255), nullable=True)  # endpoint acessado
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="logs_acoes")
    sessao = relationship("SessaoUsuario", back_populates="acoes")


class SessaoUsuario(Base):
    """
    Rastreia sessões ativas e tempo de uso
    """
    __tablename__ = "sessoes_usuario"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    session_token = Column(String(255), unique=True, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    inicio = Column(DateTime(timezone=True), server_default=func.now())
    ultima_atividade = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    fim = Column(DateTime(timezone=True), nullable=True)
    duracao_segundos = Column(Integer, nullable=True)  # calculado ao encerrar
    ativa = Column(Boolean, default=True)
    paginas_visitadas = Column(Text, nullable=True)  # JSON com lista de páginas
    
    # Relationships
    user = relationship("User", back_populates="sessoes")
    acoes = relationship("LogAcao", back_populates="sessao", cascade="all, delete-orphan")


class MetricaUso(Base):
    """
    Métricas agregadas de uso do sistema (por dia/semana/mês)
    """
    __tablename__ = "metricas_uso"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    data = Column(DateTime(timezone=True), nullable=False)
    periodo = Column(String(20), nullable=False)  # 'dia', 'semana', 'mes'
    total_acessos = Column(Integer, default=0)
    usuarios_unicos = Column(Integer, default=0)
    total_acoes = Column(Integer, default=0)
    tempo_medio_sessao = Column(Integer, default=0)  # em segundos
    pagina_mais_visitada = Column(String(255), nullable=True)
    acao_mais_comum = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
