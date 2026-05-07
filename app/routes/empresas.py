"""
Rotas de empresas - compatível com API Node.js
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from app.database import get_db
from app.models import Empresa, User
from app.auth.oauth import get_current_user
from pydantic import BaseModel

router = APIRouter()

# Schema para criação/atualização de empresa
class EmpresaCreate(BaseModel):
    nome_fantasia: str  # Campo enviado pelo formulário
    razao_social: Optional[str] = None  # Campo enviado pelo formulário
    impostos: Optional[list[int]] = None  # IDs dos impostos associados
    ativo: bool = True  # Campo enviado pelo formulário
    
    class Config:
        # Permitir alias para mapeamento de campos
        populate_by_name = True

class EmpresaResponse(BaseModel):
    id: int
    nome: Optional[str] = None  # Compatibilidade com frontend
    nome_fantasia: str
    cnpj: Optional[str] = None  # Compatibilidade com frontend
    razao_social: Optional[str]
    impostos: Optional[list[int]] = None  # IDs dos impostos
    ativo: bool
    created_at: Optional[str]

    class Config:
        from_attributes = True

@router.get("/empresas", response_model=list[EmpresaResponse])
async def get_empresas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista todas as empresas ativas
    Compatível com: GET /api/empresas
    """
    try:
        from app.models.auxiliares import Imposto
        empresas = db.query(Empresa).filter(Empresa.ativo == True).order_by(Empresa.nome_fantasia).all()
        
        # Formato compatível com frontend React
        result = []
        for emp in empresas:
            impostos_empresa = db.query(Imposto.id).filter(Imposto.empresa_id == emp.id).all()
            impostos_ids = [imp.id for imp in impostos_empresa]
            
            result.append({
                "id": emp.id,
                "nome": emp.nome_fantasia,
                "nome_fantasia": emp.nome_fantasia,
                "cnpj": emp.razao_social,
                "razao_social": emp.razao_social,
                "impostos": impostos_ids,
                "ativo": emp.ativo,
                "created_at": emp.created_at.isoformat() if emp.created_at is not None else None
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar empresas: {str(e)}")

@router.get("/empresas/{empresa_id}", response_model=EmpresaResponse)
async def get_empresa(
    empresa_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Busca empresa específica por ID
    """
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    from app.models.auxiliares import Imposto
    impostos_empresa = db.query(Imposto.id).filter(Imposto.empresa_id == empresa.id).all()
    impostos_ids = [imp.id for imp in impostos_empresa]
    
    return {
        "id": empresa.id,
        "nome_fantasia": empresa.nome_fantasia,
        "razao_social": empresa.razao_social,
        "impostos": impostos_ids,
        "ativo": empresa.ativo,
        "created_at": empresa.created_at.isoformat() if empresa.created_at is not None else None
    }

@router.post("/empresas", response_model=EmpresaResponse)
async def criar_empresa(
    empresa_data: EmpresaCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cria uma nova empresa
    """
    try:
        # Criar empresa com campos enviados pelo formulário
        empresa = Empresa(
            nome_fantasia=empresa_data.nome_fantasia,
            razao_social=empresa_data.razao_social,
            ativo=empresa_data.ativo
        )
        
        db.add(empresa)
        db.commit()
        db.refresh(empresa)
        
        from app.models.auxiliares import Imposto
        impostos_empresa = db.query(Imposto.id).filter(Imposto.empresa_id == empresa.id).all()
        impostos_ids = [imp.id for imp in impostos_empresa]
        
        return {
            "id": empresa.id,
            "nome": empresa.nome_fantasia,
            "nome_fantasia": empresa.nome_fantasia,
            "cnpj": empresa.razao_social,
            "razao_social": empresa.razao_social,
            "impostos": impostos_ids,
            "ativo": empresa.ativo,
            "created_at": empresa.created_at.isoformat() if empresa.created_at is not None else None
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar empresa: {str(e)}")

# =======================
# ROTAS DE DELEÇÃO MÚLTIPLA
# =======================
# IMPORTANTE: Rotas específicas (bulk-delete) devem vir ANTES de rotas com parâmetros ({empresa_id})
# para evitar que FastAPI interprete "bulk-delete" como um ID inteiro

class BulkDeleteRequest(BaseModel):
    ids: List[int]

@router.delete("/empresas/bulk-delete")
async def bulk_delete_empresas(
    request: BulkDeleteRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Excluir múltiplas empresas usando o serviço centralizado"""
    from app.services.empresas import EmpresaService
    
    try:
        # Usar o serviço centralizado para cada empresa
        resultados = []
        for empresa_id in request.ids:
            try:
                resultado = EmpresaService.delete_empresa_with_preservation(
                    empresa_id=empresa_id,
                    db=db,
                    current_user=current_user,
                    confirmar=True
                )
                resultados.append({
                    "id": empresa_id,
                    "nome": resultado['empresa_nome'],
                    "status": "success"
                })
            except Exception as e:
                resultados.append({
                    "id": empresa_id,
                    "status": "error",
                    "error": str(e)
                })
        
        # Contar sucessos e erros
        sucessos = [r for r in resultados if r["status"] == "success"]
        erros = [r for r in resultados if r["status"] == "error"]
        
        return {
            "message": f"{len(sucessos)} empresa(s) excluída(s) com sucesso. {len(erros)} erro(s).",
            "empresas_deletadas": len(sucessos),
            "resultados": resultados
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir empresas: {str(e)}")

@router.put("/empresas/{empresa_id}", response_model=EmpresaResponse)
async def atualizar_empresa(
    empresa_id: int,
    empresa_data: EmpresaCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Atualiza uma empresa
    """
    try:
        from app.models.auxiliares import Imposto
        empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
        
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
        
        empresa.nome_fantasia = empresa_data.nome_fantasia
        empresa.razao_social = empresa_data.razao_social
        empresa.ativo = empresa_data.ativo
        
        # Atualizar impostos: remover os antigos e adicionar os novos
        if empresa_data.impostos is not None:
            # Remover impostos antigos (setando empresa_id = NULL)
            db.query(Imposto).filter(Imposto.empresa_id == empresa_id).update(
                {Imposto.empresa_id: None}
            )
            
            # Adicionar novos impostos
            if empresa_data.impostos:
                db.query(Imposto).filter(Imposto.id.in_(empresa_data.impostos)).update(
                    {Imposto.empresa_id: empresa_id}
                )
        
        db.commit()
        db.refresh(empresa)
        
        impostos_empresa = db.query(Imposto.id).filter(Imposto.empresa_id == empresa.id).all()
        impostos_ids = [imp.id for imp in impostos_empresa]
        
        return {
            "id": empresa.id,
            "nome_fantasia": empresa.nome_fantasia,
            "razao_social": empresa.razao_social,
            "impostos": impostos_ids,
            "ativo": empresa.ativo,
            "created_at": empresa.created_at.isoformat() if empresa.created_at is not None else None
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar empresa: {str(e)}")

@router.delete("/empresas/{empresa_id}")
async def excluir_empresa(
    empresa_id: int,
    confirmar: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exclui uma empresa preservando dados mestres compartilhados.
    
    COMPORTAMENTO:
    - Dados MESTRES (categorias, produtos, clientes, fornecedores, contas, projetos, cartões):
      empresa_id → NULL (ficam disponíveis para outras empresas)
    - Dados TRANSACIONAIS (transações, planejamento, desmembramentos, faturas):
      Deletados em cascata junto com a empresa
    - Tabelas específicas (empresa_cnpjs, impostos empresa, projeto_classificacoes):
      Deletadas junto com a empresa
      
    NOTA: Este endpoint usa o serviço centralizado EmpresaService para garantir
    consistência com a interface administrativa.
    """
    from app.services.empresas import EmpresaService
    
    try:
        # Chamar o serviço centralizado de deleção
        resultado = EmpresaService.delete_empresa_with_preservation(
            empresa_id=empresa_id,
            db=db,
            current_user=current_user,
            confirmar=confirmar
        )
        
        # Retornar resultado compatível com interface de listagem
        return {
            "message": f"Empresa '{resultado['empresa_nome']}' excluída com sucesso. "
                      f"Dados mestres preservados ({len(resultado['dados_mestres_preservados'])} tipos), "
                      f"dados transacionais removidos ({len(resultado['dados_transacionais_deletados'])} tipos).",
            "resultado_detalhado": resultado
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir empresa: {str(e)}")