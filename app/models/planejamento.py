from sqlalchemy import Column, Integer, String, Numeric, Boolean, Date, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base

class TipoVersaoEnum(str, enum.Enum):
    baseline = "baseline"
    revisao = "revisao"  # Mudou de "forecast" para "revisao"
    budget = "budget"
    scenario = "scenario"

class StatusPlanejamentoEnum(str, enum.Enum):
    rascunho = "rascunho"
    publicado = "publicado"

class CategoriaLinhaEnum(str, enum.Enum):
    receita = "receita"
    despesa = "despesa"
    investimento = "investimento"

class PlanejamentoVersao(Base):
    __tablename__ = "planejamento_versoes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey('empresas.id'), nullable=True)  # Opcional para despesas
    nome = Column(String, nullable=False)
    ano_referencia = Column(Integer, nullable=False)
    tipo = Column(SQLEnum(TipoVersaoEnum, name='tipo_versao_enum'), nullable=True)
    indice_revisao = Column(Integer, nullable=True)  # Mudou de indice_forecast
    status = Column(SQLEnum(StatusPlanejamentoEnum, name='status_planejamento_enum'), default=StatusPlanejamentoEnum.rascunho)
    is_ativo = Column(Boolean, default=True)
    data_publicacao = Column(DateTime, nullable=True)
    publicado_por = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, nullable=True)
    
    linhas = relationship("LinhaOrcamentaria", back_populates="versao", foreign_keys="[LinhaOrcamentaria.versao_id]")

class LinhaOrcamentaria(Base):
    __tablename__ = "linhas_orcamentarias"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey('empresas.id'), nullable=True)  # Opcional para despesas
    versao_id = Column(Integer, ForeignKey('planejamento_versoes.id'), nullable=False)
    versao_publicacao_id = Column(Integer, ForeignKey('planejamento_versoes.id'), nullable=True)  # Carimbo: versão em que foi criada/publicada
    ano = Column(Integer, nullable=False)
    mes = Column(Integer, nullable=False)
    
    cliente_id = Column(Integer, ForeignKey('clientes.id'), nullable=True)
    projeto_id = Column(Integer, nullable=True)
    produto_servico_id = Column(Integer, nullable=True)
    centro_custo_id = Column(Integer, nullable=True)
    conta_contabil_id = Column(Integer, nullable=True)
    # fornecedor_id removido - fornecedor só deve estar em lançamentos efetivos, não em planejamento
    
    categoria = Column(SQLEnum(CategoriaLinhaEnum, name='categoria_linha_enum'), nullable=True)
    descricao = Column(String, nullable=True)
    valor_previsto = Column(Numeric(15, 2), nullable=False)
    moeda = Column(String(10), default='BRL')
    
    categoria_contabil_id = Column(Integer, nullable=True)
    categoria_gerencial_id = Column(Integer, nullable=True)
    subcategoria_contabil_id = Column(Integer, nullable=True)
    subcategoria_gerencial_id = Column(Integer, nullable=True)
    
    parent_id = Column(Integer, nullable=True)
    tipo_filho = Column(String, nullable=True)
    
    data_vencimento_prevista = Column(Date, nullable=True)
    data_recebimento_prevista = Column(Date, nullable=True)
    data_pagamento_prevista = Column(Date, nullable=True)
    quitado = Column(Boolean, default=False)
    
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    versao = relationship("PlanejamentoVersao", back_populates="linhas", foreign_keys=[versao_id])
