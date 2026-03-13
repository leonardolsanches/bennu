# -*- coding: utf-8 -*-
"""
Modelos para tabelas auxiliares: produtos/serviços, contas contábeis, 
contas bancárias, impostos e cartões de crédito.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class ProdutoServico(Base):
    __tablename__ = "produtos_servicos"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)  # COMPARTILHADO: pode ser NULL
    nome = Column(String, nullable=False)
    tipo = Column(String, nullable=True)  # 'produto' ou 'servico'
    sku = Column(String, nullable=True)
    ativo = Column(Boolean, nullable=True, default=True)


class ContaContabil(Base):
    __tablename__ = "contas_contabeis"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)  # COMPARTILHADO: pode ser NULL
    codigo = Column(String, nullable=False)
    nome = Column(String, nullable=False)
    tipo = Column(String, nullable=True)  # 'ativo', 'passivo', 'receita', 'despesa'
    nivel = Column(Integer, nullable=True)
    pai_id = Column(Integer, nullable=True)
    aceita_lancamento = Column(Boolean, nullable=True, default=True)
    ativo = Column(Boolean, nullable=True, default=True)
    created_at = Column(DateTime, nullable=True, default=func.now())
    updated_at = Column(DateTime, nullable=True, default=func.now(), onupdate=func.now())


class ContaBancaria(Base):
    __tablename__ = "contas_bancarias"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)  # COMPARTILHADO: pode ser NULL
    banco = Column(String, nullable=False)
    codigo_banco = Column(String, nullable=True)
    agencia = Column(String, nullable=False)
    conta = Column(String, nullable=False)
    digito = Column(String, nullable=True)
    tipo = Column(String, nullable=True)  # 'corrente', 'poupanca'
    saldo_inicial = Column(Numeric, nullable=True)
    ativa = Column(Boolean, nullable=True, default=True)
    ativo = Column(Boolean, nullable=True, default=True)
    created_at = Column(DateTime, nullable=True, default=func.now())


class Imposto(Base):
    __tablename__ = "impostos"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    produto_servico_id = Column(Integer, ForeignKey("produtos_servicos.id"), nullable=True)  # NULL = imposto geral da empresa
    nome = Column(String, nullable=False)
    codigo = Column(String, nullable=True)
    tipo = Column(String, nullable=True)  # 'federal', 'estadual', 'municipal'
    valor = Column(Numeric, nullable=False)
    cumulativo = Column(Boolean, nullable=True, default=False)
    ativo = Column(Boolean, nullable=True, default=True)
    created_at = Column(DateTime, nullable=True, default=func.now())


class CartaoCredito(Base):
    __tablename__ = "cartoes_credito"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)  # COMPARTILHADO: pode ser NULL
    nome = Column(String, nullable=False)
    bandeira = Column(String, nullable=True)  # 'visa', 'mastercard', 'elo'
    banco = Column(String, nullable=True)
    limite = Column(Numeric, nullable=True)
    dia_vencimento = Column(Integer, nullable=True)
    dia_fechamento = Column(Integer, nullable=True)
    ultimos_4_digitos = Column(String, nullable=True)
    ativo = Column(Boolean, nullable=True, default=True)
    created_at = Column(DateTime, nullable=True, default=func.now())


class ProjetoCliente(Base):
    """Tabela de associação many-to-many entre Projeto e Cliente"""
    __tablename__ = "projeto_clientes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    projeto_id = Column(Integer, ForeignKey("projetos.id", ondelete="CASCADE"), nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False)


class ProdutoServicoCliente(Base):
    """Tabela de associação many-to-many entre ProdutoServico e Cliente"""
    __tablename__ = "produto_servico_clientes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    produto_servico_id = Column(Integer, ForeignKey("produtos_servicos.id", ondelete="CASCADE"), nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False)