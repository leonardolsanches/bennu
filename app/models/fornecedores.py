"""
Modelo Fornecedores
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class Fornecedor(Base):
    __tablename__ = "fornecedores"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)  # COMPARTILHADO: pode ser NULL
    nome = Column(String, nullable=False)
    documento = Column(String, nullable=True)
    tipo_pessoa = Column(String, nullable=True)  # 'fisica', 'juridica'
    email = Column(String, nullable=True)
    telefone = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    observacoes = Column(Text, nullable=True)
    ativo = Column(Boolean, nullable=True, default=True)
    created_at = Column(DateTime, nullable=True, default=func.now())
    
    # Relacionamentos
    empresa = relationship("Empresa", back_populates="fornecedores")
    transacoes = relationship("TransacaoFinanceira", back_populates="fornecedor")