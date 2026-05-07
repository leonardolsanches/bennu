"""
Rotas para fornecedores
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Fornecedor, User
from app.auth.oauth import get_current_user
from pydantic import BaseModel

# Schemas Pydantic
class FornecedorCreate(BaseModel):
    empresa_id: Optional[int] = None
    nome: str
    documento: Optional[str] = None
    tipo_pessoa: Optional[str] = "juridica"
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    ativo: bool = True

class FornecedorResponse(BaseModel):
    id: int
    empresa_id: Optional[int]  # Pode ser NULL quando empresa é deletada (dados preservados)
    nome: str
    documento: Optional[str]
    tipo_pessoa: Optional[str]
    email: Optional[str]
    telefone: Optional[str]
    endereco: Optional[str]
    ativo: bool
    created_at: Optional[str]

    class Config:
        from_attributes = True

router = APIRouter()

@router.get("/fornecedores", response_model=list[FornecedorResponse])
async def get_fornecedores(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista fornecedores de todas as empresas"""
    try:
        fornecedores = db.query(Fornecedor).order_by(Fornecedor.nome).all()
        
        return [
            {
                "id": fornecedor.id,
                "empresa_id": fornecedor.empresa_id,
                "nome": fornecedor.nome,
                "documento": fornecedor.documento,
                "tipo_pessoa": fornecedor.tipo_pessoa,
                "email": fornecedor.email,
                "telefone": fornecedor.telefone,
                "endereco": fornecedor.endereco,
                "ativo": fornecedor.ativo,
                "created_at": fornecedor.created_at.isoformat() if fornecedor.created_at else None
            }
            for fornecedor in fornecedores
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar fornecedores: {str(e)}")

@router.get("/fornecedores/{fornecedor_id}", response_model=FornecedorResponse)
async def get_fornecedor_by_id(
    fornecedor_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Busca um fornecedor específico por ID"""
    try:
        fornecedor = db.query(Fornecedor).filter(Fornecedor.id == fornecedor_id).first()
        
        if not fornecedor:
            raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
        
        return {
            "id": fornecedor.id,
            "empresa_id": fornecedor.empresa_id,
            "nome": fornecedor.nome,
            "documento": fornecedor.documento,
            "tipo_pessoa": fornecedor.tipo_pessoa,
            "email": fornecedor.email,
            "telefone": fornecedor.telefone,
            "endereco": fornecedor.endereco,
            "ativo": fornecedor.ativo,
            "created_at": fornecedor.created_at.isoformat() if fornecedor.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar fornecedor: {str(e)}")

@router.post("/fornecedores", response_model=FornecedorResponse)
async def criar_fornecedor(
    fornecedor_data: FornecedorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cria um novo fornecedor"""
    try:
        data = fornecedor_data.dict()
        if data.get('empresa_id') is None:
            data['empresa_id'] = current_user.empresa_id
        
        fornecedor = Fornecedor(**data)
        db.add(fornecedor)
        db.commit()
        db.refresh(fornecedor)
        
        return {
            "id": fornecedor.id,
            "empresa_id": fornecedor.empresa_id,
            "nome": fornecedor.nome,
            "documento": fornecedor.documento,
            "tipo_pessoa": fornecedor.tipo_pessoa,
            "email": fornecedor.email,
            "telefone": fornecedor.telefone,
            "endereco": fornecedor.endereco,
            "ativo": fornecedor.ativo,
            "created_at": fornecedor.created_at.isoformat() if fornecedor.created_at else None
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar fornecedor: {str(e)}")

@router.put("/fornecedores/{fornecedor_id}", response_model=FornecedorResponse)
async def atualizar_fornecedor(
    fornecedor_id: int,
    fornecedor_data: FornecedorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualiza um fornecedor"""
    try:
        fornecedor = db.query(Fornecedor).filter(Fornecedor.id == fornecedor_id).first()
        
        if not fornecedor:
            raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
        
        # Atualizar apenas campos fornecidos, preservar empresa_id se não fornecido
        for key, value in fornecedor_data.dict().items():
            if key == 'empresa_id' and value is None:
                continue  # Preservar empresa_id existente
            setattr(fornecedor, key, value)
        
        db.commit()
        db.refresh(fornecedor)
        
        return {
            "id": fornecedor.id,
            "empresa_id": fornecedor.empresa_id,
            "nome": fornecedor.nome,
            "documento": fornecedor.documento,
            "tipo_pessoa": fornecedor.tipo_pessoa,
            "email": fornecedor.email,
            "telefone": fornecedor.telefone,
            "endereco": fornecedor.endereco,
            "ativo": fornecedor.ativo,
            "created_at": fornecedor.created_at.isoformat() if fornecedor.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar fornecedor: {str(e)}")

@router.delete("/fornecedores/{fornecedor_id}")
async def excluir_fornecedor(
    fornecedor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Exclui um fornecedor"""
    try:
        fornecedor = db.query(Fornecedor).filter(Fornecedor.id == fornecedor_id).first()
        
        if not fornecedor:
            raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
        
        db.delete(fornecedor)
        db.commit()
        
        return {"message": "Fornecedor excluído com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir fornecedor: {str(e)}")

# Manter compatibilidade com rota original para não quebrar código existente
@router.get("/fornecedores/empresa/{empresa_id}")
async def get_fornecedores_by_empresa_deprecated(
    empresa_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """DEPRECATED: Use GET /fornecedores em vez desta rota"""
    try:
        fornecedores = db.query(Fornecedor).filter(Fornecedor.empresa_id == empresa_id).all()
        
        return [
            {
                "id": fornecedor.id,
                "empresa_id": fornecedor.empresa_id,
                "nome": fornecedor.nome,
                "documento": fornecedor.documento,
                "tipo_pessoa": fornecedor.tipo_pessoa,
                "email": fornecedor.email,
                "telefone": fornecedor.telefone,
                "endereco": fornecedor.endereco,
                "ativo": fornecedor.ativo,
                "created_at": fornecedor.created_at.isoformat() if fornecedor.created_at else None
            }
            for fornecedor in fornecedores
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar fornecedores: {str(e)}")

# =======================
# ROTAS DE DELEÇÃO MÚLTIPLA
# =======================

from pydantic import BaseModel
from typing import List

class BulkDeleteRequest(BaseModel):
    ids: List[int]

@router.post("/fornecedores/bulk-delete") 
async def bulk_delete_fornecedores(
    request: BulkDeleteRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Excluir múltiplos fornecedores"""
    try:
        deleted_count = db.query(Fornecedor).filter(
            Fornecedor.id.in_(request.ids)
        ).delete(synchronize_session=False)
        
        db.commit()
        return {"message": f"{deleted_count} fornecedor(es) excluído(s) com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir fornecedores: {str(e)}")
