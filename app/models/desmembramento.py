from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class DesmembramentoTransacao(Base):
    __tablename__ = "desmembramentos_transacoes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey('empresas.id'), nullable=False)
    transacao_origem_id = Column(Integer, ForeignKey('transacoes_financeiras.id'), nullable=False)
    created_by = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    observacoes = Column(Text, nullable=True)
    
    itens = relationship("DesmembramentoItem", back_populates="desmembramento", cascade="all, delete-orphan")

class DesmembramentoItem(Base):
    __tablename__ = "desmembramentos_itens"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    desmembramento_id = Column(Integer, ForeignKey('desmembramentos_transacoes.id'), nullable=False)
    transacao_derivada_id = Column(Integer, ForeignKey('transacoes_financeiras.id'), nullable=False)
    valor = Column(Numeric(15, 2), nullable=False)
    
    cliente_id = Column(Integer, ForeignKey('clientes.id'), nullable=True)
    categoria_contabil_id = Column(Integer, nullable=True)
    subcategoria_contabil_id = Column(Integer, nullable=True)
    categoria_gerencial_id = Column(Integer, nullable=True)
    subcategoria_gerencial_id = Column(Integer, nullable=True)
    centro_custo_id = Column(Integer, nullable=True)
    projeto_id = Column(Integer, nullable=True)
    produto_servico_id = Column(Integer, nullable=True)
    
    competencia_ano = Column(Integer, nullable=False)
    competencia_mes = Column(Integer, nullable=False)
    descricao = Column(String, nullable=True)
    
    desmembramento = relationship("DesmembramentoTransacao", back_populates="itens")
