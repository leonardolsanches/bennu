from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.auth.oauth import get_current_user
from app.models.desmembramento import DesmembramentoTransacao, DesmembramentoItem
from app.models.transacoes import TransacaoFinanceira

router = APIRouter()

class DesmembramentoItemCreate(BaseModel):
    valor: float
    cliente_id: Optional[int] = None
    categoria_contabil_id: Optional[int] = None
    subcategoria_contabil_id: Optional[int] = None
    categoria_gerencial_id: Optional[int] = None
    subcategoria_gerencial_id: Optional[int] = None
    centro_custo_id: Optional[int] = None
    projeto_id: Optional[int] = None
    produto_servico_id: Optional[int] = None
    competencia_ano: int
    competencia_mes: int
    descricao: Optional[str] = None

class DesmembramentoCreate(BaseModel):
    transacao_origem_id: int
    itens: List[DesmembramentoItemCreate]
    observacoes: Optional[str] = None

@router.post("/desmembramento/criar")
async def criar_desmembramento(
    dados: DesmembramentoCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cria um desmembramento de transação:
    1. Marca a transação origem como 'desmembrado'
    2. Cria novas transações derivadas
    3. Registra o desmembramento
    """
    try:
        # 1. Buscar transação origem
        transacao_origem = db.query(TransacaoFinanceira).filter(
            TransacaoFinanceira.id == dados.transacao_origem_id
        ).first()
        
        if not transacao_origem:
            raise HTTPException(status_code=404, detail="Transação origem não encontrada")
        
        # Verificar se já foi desmembrado (através do registro de desmembramento)
        ja_desmembrado = db.query(DesmembramentoTransacao).filter(
            DesmembramentoTransacao.transacao_origem_id == dados.transacao_origem_id
        ).first()
        
        if ja_desmembrado:
            raise HTTPException(status_code=400, detail="Transação já foi desmembrada")
        
        # Validar soma dos valores
        total_itens = sum(item.valor for item in dados.itens)
        valor_origem = abs(float(transacao_origem.valor))
        
        if abs(total_itens - valor_origem) > 0.01:
            raise HTTPException(
                status_code=400, 
                detail=f"A soma dos itens (R$ {total_itens:.2f}) deve ser igual ao valor da transação origem (R$ {valor_origem:.2f})"
            )
        
        # 2. Criar registro de desmembramento
        desmembramento = DesmembramentoTransacao(
            empresa_id=transacao_origem.empresa_id,
            transacao_origem_id=transacao_origem.id,
            created_by=current_user.id,
            observacoes=dados.observacoes
        )
        db.add(desmembramento)
        db.flush()
        
        # 3. Criar transações derivadas e itens de desmembramento
        transacoes_criadas = []
        for item_data in dados.itens:
            # Criar transação derivada (FILHO)
            # Herdar competências da transação origem (contábil e gerencial)
            transacao_derivada = TransacaoFinanceira(
                empresa_id=transacao_origem.empresa_id,
                tipo=transacao_origem.tipo,
                valor=item_data.valor if transacao_origem.tipo == 'receita' else -abs(item_data.valor),
                descricao=item_data.descricao or f"Desmembramento de: {transacao_origem.descricao}",
                data_lancamento=transacao_origem.data_lancamento,
                data_pagamento=transacao_origem.data_pagamento,
                competencia_ano=item_data.competencia_ano,
                competencia_mes=item_data.competencia_mes,
                competencia_ano_contabil=transacao_origem.competencia_ano_contabil or item_data.competencia_ano,
                competencia_mes_contabil=transacao_origem.competencia_mes_contabil or item_data.competencia_mes,
                competencia_ano_gerencial=transacao_origem.competencia_ano_gerencial or item_data.competencia_ano,
                competencia_mes_gerencial=transacao_origem.competencia_mes_gerencial or item_data.competencia_mes,
                cliente_id=item_data.cliente_id,
                categoria_contabil_id=item_data.categoria_contabil_id,
                subcategoria_contabil_id=item_data.subcategoria_contabil_id,
                categoria_gerencial_id=item_data.categoria_gerencial_id,
                subcategoria_gerencial_id=item_data.subcategoria_gerencial_id,
                centro_custo_id=item_data.centro_custo_id,
                projeto_id=item_data.projeto_id,
                produto_servico_id=item_data.produto_servico_id,
                forma_pgto=transacao_origem.forma_pgto,
                status=transacao_origem.status,
                created_by=current_user.id,
                parent_id=transacao_origem.id,
                tipo_filho='split',
                entra_no_gerencial=True
            )
            db.add(transacao_derivada)
            db.flush()
            
            # Criar item de desmembramento
            item_desmembramento = DesmembramentoItem(
                desmembramento_id=desmembramento.id,
                transacao_derivada_id=transacao_derivada.id,
                valor=item_data.valor,
                cliente_id=item_data.cliente_id,
                categoria_contabil_id=item_data.categoria_contabil_id,
                subcategoria_contabil_id=item_data.subcategoria_contabil_id,
                categoria_gerencial_id=item_data.categoria_gerencial_id,
                subcategoria_gerencial_id=item_data.subcategoria_gerencial_id,
                centro_custo_id=item_data.centro_custo_id,
                projeto_id=item_data.projeto_id,
                produto_servico_id=item_data.produto_servico_id,
                competencia_ano=item_data.competencia_ano,
                competencia_mes=item_data.competencia_mes,
                descricao=item_data.descricao
            )
            db.add(item_desmembramento)
            
            transacoes_criadas.append({
                "id": transacao_derivada.id,
                "valor": float(transacao_derivada.valor),
                "descricao": transacao_derivada.descricao
            })
        
        # 4. Marcar transação PAI para NÃO entrar nos relatórios (filhos entrarão)
        transacao_origem.entra_no_gerencial = False
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Desmembramento criado com sucesso! {len(transacoes_criadas)} transações derivadas.",
            "desmembramento_id": desmembramento.id,
            "transacao_origem_id": transacao_origem.id,
            "transacoes_criadas": transacoes_criadas
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao criar desmembramento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar desmembramento: {str(e)}")

@router.get("/desmembramento/{transacao_id}")
async def buscar_desmembramento(
    transacao_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Busca informações de desmembramento de uma transação
    """
    try:
        desmembramento = db.query(DesmembramentoTransacao).filter(
            DesmembramentoTransacao.transacao_origem_id == transacao_id
        ).first()
        
        if not desmembramento:
            return {"desmembrado": False}
        
        itens = []
        for item in desmembramento.itens:
            transacao = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.id == item.transacao_derivada_id
            ).first()
            
            itens.append({
                "id": item.id,
                "transacao_derivada_id": item.transacao_derivada_id,
                "valor": float(item.valor),
                "cliente_id": item.cliente_id,
                "categoria_contabil_id": item.categoria_contabil_id,
                "categoria_gerencial_id": item.categoria_gerencial_id,
                "centro_custo_id": item.centro_custo_id,
                "competencia_ano": item.competencia_ano,
                "competencia_mes": item.competencia_mes,
                "descricao": item.descricao,
                "transacao_descricao": transacao.descricao if transacao else None
            })
        
        return {
            "desmembrado": True,
            "desmembramento_id": desmembramento.id,
            "observacoes": desmembramento.observacoes,
            "created_at": desmembramento.created_at.isoformat() if desmembramento.created_at else None,
            "itens": itens
        }
        
    except Exception as e:
        print(f"❌ Erro ao buscar desmembramento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar desmembramento: {str(e)}")

@router.delete("/desmembramento/{desmembramento_id}")
async def excluir_desmembramento(
    desmembramento_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exclui um desmembramento:
    1. Deleta as transações derivadas
    2. Remove o status 'desmembrado' da transação origem
    3. Deleta o registro de desmembramento
    """
    try:
        desmembramento = db.query(DesmembramentoTransacao).filter(
            DesmembramentoTransacao.id == desmembramento_id
        ).first()
        
        if not desmembramento:
            raise HTTPException(status_code=404, detail="Desmembramento não encontrado")
        
        # 1. Deletar transações derivadas
        for item in desmembramento.itens:
            transacao = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.id == item.transacao_derivada_id
            ).first()
            if transacao:
                db.delete(transacao)
        
        # 2. Restaurar transação PAI para voltar a entrar nos relatórios
        transacao_origem = db.query(TransacaoFinanceira).filter(
            TransacaoFinanceira.id == desmembramento.transacao_origem_id
        ).first()
        
        if transacao_origem:
            transacao_origem.entra_no_gerencial = True
        
        # 3. Deletar desmembramento (itens deletados em cascata)
        db.delete(desmembramento)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Desmembramento excluído com sucesso"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao excluir desmembramento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao excluir desmembramento: {str(e)}")
