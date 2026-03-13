"""
Modelos SQLAlchemy mapeando o schema existente do PostgreSQL
IMPORTANTE: Preserva estrutura atual - NÃO altera dados!
"""
from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Numeric, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

# Importar Base unificado do database.py
from app.database import Base

class TipoTransacao(enum.Enum):
    RECEITA = "receita"
    DESPESA = "despesa"

class StatusTransacao(enum.Enum):
    PENDENTE = "pendente"
    CONFIRMADO = "confirmado"
    CANCELADO = "cancelado"

class TipoPessoa(enum.Enum):
    FISICA = "fisica"
    JURIDICA = "juridica"

class FormaPagamento(enum.Enum):
    DINHEIRO = "dinheiro"
    PIX = "pix"
    CARTAO_CREDITO = "cartao_credito"
    CARTAO_DEBITO = "cartao_debito"
    TRANSFERENCIA = "transferencia"
    BOLETO = "boleto"

class StatusCliente(enum.Enum):
    ATIVO = "ativo"
    INATIVO = "inativo"

class Papel(enum.Enum):
    ADMIN = "admin"
    USER = "user"