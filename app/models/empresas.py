"""
Modelo Empresas
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class Empresa(Base):
    __tablename__ = "empresas"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    nome_fantasia = Column(String, nullable=False)
    razao_social = Column(String, nullable=True)
    ativo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=True, default=func.now())
    updated_at = Column(DateTime, nullable=True, default=func.now(), onupdate=func.now())
    
    # Relacionamentos
    usuarios = relationship("User", back_populates="empresa")
    transacoes = relationship("TransacaoFinanceira", back_populates="empresa")
    clientes = relationship("Cliente", back_populates="empresa")
    fornecedores = relationship("Fornecedor", back_populates="empresa")