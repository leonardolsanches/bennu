"""
Modelo Clientes
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class Cliente(Base):
    __tablename__ = "clientes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)  # COMPARTILHADO: pode ser NULL
    nome = Column(String, nullable=False)
    documento = Column(String, nullable=True)
    status = Column(String, nullable=True)  # 'ativo', 'inativo'
    created_at = Column(DateTime, nullable=True, default=func.now())
    
    # Relacionamentos
    empresa = relationship("Empresa", back_populates="clientes")
    transacoes = relationship("TransacaoFinanceira", back_populates="cliente")