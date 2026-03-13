"""
Modelos para Categorias Contábeis e Gerenciais
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class CategoriaContabil(Base):
    __tablename__ = "categorias_contabeis"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)  # COMPARTILHADO: pode ser NULL
    nome = Column(String, nullable=False)
    pai_id = Column(Integer, ForeignKey("categorias_contabeis.id"), nullable=True)  # DEPRECATED - não mais usado
    centro_custo_id = Column(Integer, ForeignKey("centros_custo.id"), nullable=True)  # Novo: vincula categoria ao centro de custo
    codigo = Column(String(50), nullable=True)
    descricao = Column(Text, nullable=True)
    ativo = Column(Boolean, nullable=True, default=True)
    created_at = Column(DateTime, nullable=True, default=func.now())
    updated_at = Column(DateTime, nullable=True, default=func.now(), onupdate=func.now())

class CategoriaGerencial(Base):
    __tablename__ = "categorias_gerenciais"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)  # COMPARTILHADO: pode ser NULL
    nome = Column(String, nullable=False)
    pai_id = Column(Integer, ForeignKey("categorias_gerenciais.id"), nullable=True)
    codigo = Column(String(50), nullable=True)
    descricao = Column(Text, nullable=True)
    ativo = Column(Boolean, nullable=True, default=True)
    created_at = Column(DateTime, nullable=True, default=func.now())
    updated_at = Column(DateTime, nullable=True, default=func.now(), onupdate=func.now())

class CentroCusto(Base):
    __tablename__ = "centros_custo"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)  # COMPARTILHADO: pode ser NULL
    nome = Column(String, nullable=False)
    codigo = Column(String, nullable=True)
    ativo = Column(Boolean, nullable=True, default=True)

class Projeto(Base):
    __tablename__ = "projetos"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)  # COMPARTILHADO: pode ser NULL
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    classificacao_id = Column(Integer, nullable=True)
    nome = Column(String, nullable=False)
    codigo_interno = Column(String, nullable=True)
    ativo = Column(Boolean, nullable=True, default=True)