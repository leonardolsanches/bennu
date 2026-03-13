"""
Modelo Users - mapeia tabela existente
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    external_auth_id = Column(String(255), unique=True, nullable=True)  # Para OAuth
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)  # COMPARTILHADO: pode ser NULL quando empresa é deletada
    nome = Column(String, nullable=False)
    email = Column(String, nullable=False)
    senha_hash = Column(String, nullable=True)
    papel = Column(String, nullable=True)  # Enum como string
    ativo = Column(Boolean, nullable=True, default=True)
    created_at = Column(DateTime, nullable=True, default=func.now())
    
    # Relacionamentos
    empresa = relationship("Empresa", back_populates="usuarios")
    logs_acesso = relationship("LogAcesso", back_populates="user", cascade="all, delete-orphan")
    logs_acoes = relationship("LogAcao", back_populates="user", cascade="all, delete-orphan")
    sessoes = relationship("SessaoUsuario", back_populates="user", cascade="all, delete-orphan")