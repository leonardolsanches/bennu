"""
Rotas para clientes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Cliente, User
from app.auth.oauth import get_current_user
from pydantic import BaseModel

router = APIRouter()

# Schemas Pydantic
class ClienteCreate(BaseModel):
    empresa_id: Optional[int] = None
    nome: str
    documento: Optional[str] = None
    status: Optional[str] = "ativo"

class ClienteResponse(BaseModel):
    id: int
    empresa_id: Optional[int]  # Pode ser NULL quando empresa é deletada (dados preservados)
    nome: str
    documento: Optional[str]
    status: Optional[str]
    created_at: Optional[str]

    class Config:
        from_attributes = True

@router.get("/clientes", response_model=list[ClienteResponse])
async def get_clientes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    com_receitas: bool = Query(False, description="Filtrar apenas clientes com receitas")
):
    """Lista clientes de todas as empresas"""
    try:
        if com_receitas:
            # Buscar apenas clientes que possuem receitas
            from app.models.transacoes import TransacaoFinanceira
            from datetime import datetime
            
            ano_atual = datetime.now().year
            clientes = db.query(Cliente).join(TransacaoFinanceira).filter(
                Cliente.status == 'ativo',
                TransacaoFinanceira.tipo == 'receita',
                TransacaoFinanceira.competencia_ano == ano_atual,
                TransacaoFinanceira.valor > 0
            ).order_by(Cliente.nome).distinct().all()
        else:
            clientes = db.query(Cliente).order_by(Cliente.nome).all()
        
        return [
            {
                "id": cliente.id,
                "empresa_id": cliente.empresa_id,
                "nome": cliente.nome,
                "documento": cliente.documento,
                "status": cliente.status,
                "created_at": cliente.created_at.isoformat() if cliente.created_at else None
            }
            for cliente in clientes
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar clientes: {str(e)}")

@router.get("/clientes/{cliente_id}", response_model=ClienteResponse)
async def get_cliente_by_id(
    cliente_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Busca um cliente específico por ID"""
    try:
        cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
        
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        return {
            "id": cliente.id,
            "empresa_id": cliente.empresa_id,
            "nome": cliente.nome,
            "documento": cliente.documento,
            "status": cliente.status,
            "created_at": cliente.created_at.isoformat() if cliente.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar cliente: {str(e)}")

@router.post("/clientes", response_model=ClienteResponse)
async def criar_cliente(
    cliente_data: ClienteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cria um novo cliente"""
    try:
        # Usar empresa_id do usuário apenas como padrão se não especificado
        data = cliente_data.dict()
        if data.get('empresa_id') is None:
            data['empresa_id'] = current_user.empresa_id
        
        cliente = Cliente(**data)
        db.add(cliente)
        db.commit()
        db.refresh(cliente)
        
        return {
            "id": cliente.id,
            "empresa_id": cliente.empresa_id,
            "nome": cliente.nome,
            "documento": cliente.documento,
            "status": cliente.status,
            "created_at": cliente.created_at.isoformat() if cliente.created_at else None
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar cliente: {str(e)}")

# =======================
# ROTAS DE DELEÇÃO MÚLTIPLA
# =======================
# IMPORTANTE: Rotas específicas (bulk-delete) devem vir ANTES de rotas com parâmetros ({cliente_id})
# para evitar que FastAPI interprete "bulk-delete" como um ID inteiro

from typing import List

class BulkDeleteRequest(BaseModel):
    ids: List[int]

@router.delete("/clientes/bulk-delete")
async def bulk_delete_clientes(
    request: BulkDeleteRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Excluir múltiplos clientes - com deleção automática de dados relacionados"""
    try:
        from sqlalchemy import text
        from app.models.transacoes import TransacaoFinanceira
        from app.models.planejamento import LinhaOrcamentaria
        
        print(f"🗑️ Iniciando exclusão em massa de {len(request.ids)} cliente(s): {request.ids}")
        
        total_dependencias = 0
        
        # FASE 1: Deletar transações financeiras relacionadas
        for cliente_id in request.ids:
            # Contar transações
            transacoes_count = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.cliente_id == cliente_id
            ).count()
            
            if transacoes_count > 0:
                print(f"🔧 Cliente {cliente_id}: deletando {transacoes_count} transações financeiras")
                
                # Deletar dependências das transações primeiro
                db.execute(
                    text("DELETE FROM transacao_impostos WHERE transacao_id IN (SELECT id FROM transacoes_financeiras WHERE cliente_id = :cliente_id)"),
                    {"cliente_id": cliente_id}
                )
                db.execute(
                    text("DELETE FROM transacao_categoria_contabil WHERE transacao_id IN (SELECT id FROM transacoes_financeiras WHERE cliente_id = :cliente_id)"),
                    {"cliente_id": cliente_id}
                )
                db.execute(
                    text("DELETE FROM transacao_categoria_gerencial WHERE transacao_id IN (SELECT id FROM transacoes_financeiras WHERE cliente_id = :cliente_id)"),
                    {"cliente_id": cliente_id}
                )
                
                # Deletar transações
                db.query(TransacaoFinanceira).filter(
                    TransacaoFinanceira.cliente_id == cliente_id
                ).delete(synchronize_session=False)
                
                total_dependencias += transacoes_count
        
        # FASE 2: Deletar linhas orçamentárias relacionadas
        for cliente_id in request.ids:
            linhas_count = db.query(LinhaOrcamentaria).filter(
                LinhaOrcamentaria.cliente_id == cliente_id
            ).count()
            
            if linhas_count > 0:
                print(f"🔧 Cliente {cliente_id}: deletando {linhas_count} linhas orçamentárias")
                db.query(LinhaOrcamentaria).filter(
                    LinhaOrcamentaria.cliente_id == cliente_id
                ).delete(synchronize_session=False)
                total_dependencias += linhas_count
        
        # FASE 2.5: Anular cliente_id na tabela pl_map (mapeamento de planejamento)
        pl_map_count = db.execute(
            text("UPDATE pl_map SET cliente_id = NULL WHERE cliente_id IN :cliente_ids"),
            {"cliente_ids": tuple(request.ids)}
        ).rowcount
        
        if pl_map_count > 0:
            print(f"🔧 {pl_map_count} registros de pl_map tiveram cliente_id anulado")
            total_dependencias += pl_map_count
        
        # FASE 3: Anular cliente_id em projetos (SET NULL ao invés de deletar)
        projetos_count = db.execute(
            text("UPDATE projetos SET cliente_id = NULL WHERE cliente_id IN :cliente_ids"),
            {"cliente_ids": tuple(request.ids)}
        ).rowcount
        
        if projetos_count > 0:
            print(f"🔧 {projetos_count} projetos tiveram cliente_id anulado (preservados)")
            total_dependencias += projetos_count
        
        # FASE 4: Deletar os clientes
        deleted_count = db.query(Cliente).filter(
            Cliente.id.in_(request.ids)
        ).delete(synchronize_session=False)
        
        db.commit()
        
        print(f"✅ {deleted_count} cliente(s) deletado(s) com sucesso ({total_dependencias} dependências removidas/atualizadas)")
        
        return {
            "message": f"{deleted_count} cliente(s) excluído(s) com sucesso",
            "dependencias_removidas": total_dependencias,
            "detalhes": f"{total_dependencias} registros relacionados foram automaticamente removidos ou atualizados"
        }
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao excluir clientes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao excluir clientes: {str(e)}")

@router.put("/clientes/{cliente_id}", response_model=ClienteResponse)
async def atualizar_cliente(
    cliente_id: int,
    cliente_data: ClienteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualiza um cliente"""
    try:
        cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
        
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        # Atualizar apenas campos fornecidos, preservar empresa_id se não fornecido
        for key, value in cliente_data.dict().items():
            if key == 'empresa_id' and value is None:
                continue  # Preservar empresa_id existente
            setattr(cliente, key, value)
        
        db.commit()
        db.refresh(cliente)
        
        return {
            "id": cliente.id,
            "empresa_id": cliente.empresa_id,
            "nome": cliente.nome,
            "documento": cliente.documento,
            "status": cliente.status,
            "created_at": cliente.created_at.isoformat() if cliente.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar cliente: {str(e)}")

@router.delete("/clientes/{cliente_id}")
async def excluir_cliente(
    cliente_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Exclui um cliente"""
    try:
        cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
        
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        db.delete(cliente)
        db.commit()
        
        return {"message": "Cliente excluído com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir cliente: {str(e)}")
