"""
Modelo TransacoesFinanceiras - tabela principal do sistema
"""
from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Numeric, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class TransacaoFinanceira(Base):
    __tablename__ = "transacoes_financeiras"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    tipo = Column(String, nullable=False)  # 'receita' ou 'despesa'
    data_lancamento = Column(Date, nullable=False)
    competencia_ano = Column(Integer, nullable=False)
    competencia_mes = Column(Integer, nullable=False)
    
    # Competências separadas para relatórios contábeis e gerenciais
    competencia_ano_contabil = Column(Integer, nullable=True)
    competencia_mes_contabil = Column(Integer, nullable=True)
    competencia_ano_gerencial = Column(Integer, nullable=True)
    competencia_mes_gerencial = Column(Integer, nullable=True)
    
    # IDs relacionados (nullable)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    projeto_id = Column(Integer, nullable=True)
    produto_servico_id = Column(Integer, nullable=True)
    centro_custo_id = Column(Integer, nullable=True)
    conta_contabil_id = Column(Integer, nullable=True)
    categoria_contabil_id = Column(Integer, nullable=True)
    categoria_gerencial_id = Column(Integer, nullable=True)
    subcategoria_contabil_id = Column(Integer, nullable=True)
    subcategoria_gerencial_id = Column(Integer, nullable=True)
    linha_orcamentaria_id = Column(Integer, nullable=True)
    fornecedor_id = Column(Integer, ForeignKey("fornecedores.id"), nullable=True)
    
    # Campos principais
    nome = Column(String, nullable=True)
    descricao = Column(String, nullable=True)
    valor = Column(Numeric, nullable=False)
    status = Column(String, nullable=True)
    forma_pgto = Column(String, nullable=True)
    
    # Datas
    data_vencimento = Column(Date, nullable=True)
    data_pagamento = Column(Date, nullable=True)
    
    # Valores de caixa (entrada/saída efetiva)
    valor_recebido = Column(Numeric, nullable=True)
    valor_pago = Column(Numeric, nullable=True)
    
    # Documentos e links
    numero_nota_fiscal = Column(String, nullable=True)
    link_nota_fiscal = Column(String, nullable=True)
    numero_pedido_compra = Column(String, nullable=True)
    link_pedido_compra = Column(String, nullable=True)
    link_boleto = Column(String, nullable=True)
    link_comprovante = Column(String, nullable=True)
    
    # Campos especiais
    referencia_externa = Column(String, nullable=True)
    parent_id = Column(Integer, nullable=True)
    tipo_filho = Column(String, nullable=True)
    titulo_breve = Column(String, nullable=True)
    moeda = Column(String, nullable=True, default='BRL')
    
    # Flags booleanas
    eh_duplicado = Column(Boolean, nullable=False, default=False)
    is_cc_pagamento = Column(Boolean, nullable=False, default=False)
    entra_no_gerencial = Column(Boolean, nullable=False, default=True)
    exibir_no_cash_control = Column(Boolean, nullable=False, default=True)
    
    # Auditoria
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=True, default=func.now())
    updated_at = Column(DateTime, nullable=True, default=func.now(), onupdate=func.now())
    
    # Relacionamentos
    empresa = relationship("Empresa", back_populates="transacoes")
    cliente = relationship("Cliente", back_populates="transacoes")
    fornecedor = relationship("Fornecedor", back_populates="transacoes")