# -*- coding: utf-8 -*-
"""
Rotas para tabelas auxiliares: produtos/serviços, contas contábeis,
contas bancárias, impostos e cartões de crédito.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.auth.oauth import get_current_user
from app.models.auxiliares import ProdutoServico, ContaContabil, ContaBancaria, Imposto, CartaoCredito
from app.models.categorias import CategoriaContabil, CategoriaGerencial, CentroCusto, Projeto
from app.models import Empresa

router = APIRouter()

# Schemas Pydantic para validação

class ProdutoServicoCreate(BaseModel):
    empresa_id: Optional[int] = None
    nome: str
    clientes: Optional[List[int]] = None
    ativo: bool = True

class ProdutoServicoResponse(BaseModel):
    id: int
    empresa_id: Optional[int]
    nome: str
    ativo: bool
    clientes: Optional[List[int]] = None
    clientes_nomes: Optional[str] = None

    class Config:
        from_attributes = True

class ContaContabilCreate(BaseModel):
    empresa_id: Optional[int] = None
    codigo: str
    nome: str
    tipo: Optional[str] = None
    nivel: Optional[int] = None
    pai_id: Optional[int] = None
    aceita_lancamento: bool = True
    ativo: bool = True

class ContaContabilResponse(BaseModel):
    id: int
    empresa_id: Optional[int]  # Pode ser NULL quando empresa é deletada (dados preservados)
    codigo: str
    nome: str
    tipo: Optional[str]
    nivel: Optional[int]
    pai_id: Optional[int]
    aceita_lancamento: bool
    ativo: bool

    class Config:
        from_attributes = True

class ContaBancariaCreate(BaseModel):
    empresa_id: Optional[int] = None
    banco: str
    codigo_banco: Optional[str] = None
    agencia: str
    conta: str
    digito: Optional[str] = None
    tipo: Optional[str] = None
    saldo_inicial: Optional[float] = None
    ativa: bool = True
    ativo: bool = True

class ContaBancariaResponse(BaseModel):
    id: int
    empresa_id: Optional[int]  # Pode ser NULL quando empresa é deletada (dados preservados)
    banco: str
    codigo_banco: Optional[str]
    agencia: str
    conta: str
    digito: Optional[str]
    tipo: Optional[str]
    saldo_inicial: Optional[float]
    ativa: bool

    class Config:
        from_attributes = True

class ImpostoCreate(BaseModel):
    empresa_id: Optional[int] = None
    produto_servico_id: Optional[int] = None  # NULL = imposto geral da empresa
    nome: str
    codigo: Optional[str] = None
    tipo: Optional[str] = None
    valor: float
    cumulativo: bool = False
    ativo: bool = True

class ImpostoResponse(BaseModel):
    id: int
    empresa_id: Optional[int]  # Pode ser NULL quando empresa é deletada (dados preservados)
    empresa_nome: Optional[str] = None
    produto_servico_id: Optional[int] = None
    produto_servico_nome: Optional[str] = None
    nome: str
    codigo: Optional[str]
    tipo: Optional[str]
    valor: float
    cumulativo: Optional[bool] = False
    ativo: bool

    class Config:
        from_attributes = True

class CartaoCreditoCreate(BaseModel):
    empresa_id: Optional[int] = None
    nome: str
    bandeira: Optional[str] = None
    banco: Optional[str] = None
    limite: Optional[float] = None
    dia_vencimento: Optional[int] = None
    dia_fechamento: Optional[int] = None
    ultimos_4_digitos: Optional[str] = None
    ativo: bool = True

class CartaoCreditoResponse(BaseModel):
    id: int
    empresa_id: Optional[int]  # Pode ser NULL quando empresa é deletada (dados preservados)
    nome: str
    bandeira: Optional[str]
    banco: Optional[str]
    limite: Optional[float]
    dia_vencimento: Optional[int]
    dia_fechamento: Optional[int]
    ultimos_4_digitos: Optional[str]
    ativo: bool

    class Config:
        from_attributes = True


# === PRODUTOS/SERVIÇOS (SERVIÇOS) ===
# Import modelos de associação
from app.models.auxiliares import ProdutoServicoCliente
from app.models.clientes import Cliente as ClienteModel

@router.get("/produtos-servicos")
async def listar_produtos_servicos(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Lista todos os serviços com clientes associados"""
    produtos = db.query(ProdutoServico).all()
    
    result = []
    for produto in produtos:
        cliente_ids = db.query(ProdutoServicoCliente.cliente_id).filter(
            ProdutoServicoCliente.produto_servico_id == produto.id
        ).all()
        cliente_ids = [c[0] for c in cliente_ids]
        
        clientes_nomes = ""
        if cliente_ids:
            clientes = db.query(ClienteModel.nome).filter(ClienteModel.id.in_(cliente_ids)).all()
            clientes_nomes = ", ".join([c[0] for c in clientes])
        
        result.append({
            "id": produto.id,
            "empresa_id": produto.empresa_id,
            "nome": produto.nome,
            "ativo": produto.ativo,
            "clientes": cliente_ids,
            "clientes_nomes": clientes_nomes
        })
    
    return result

@router.get("/produtos-servicos/{produto_id}")
async def obter_produto_servico(
    produto_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Obtém um serviço específico com seus clientes"""
    produto = db.query(ProdutoServico).filter(ProdutoServico.id == produto_id).first()

    if not produto:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")

    cliente_ids = db.query(ProdutoServicoCliente.cliente_id).filter(
        ProdutoServicoCliente.produto_servico_id == produto.id
    ).all()
    cliente_ids = [c[0] for c in cliente_ids]
    
    clientes_nomes = ""
    if cliente_ids:
        clientes = db.query(ClienteModel.nome).filter(ClienteModel.id.in_(cliente_ids)).all()
        clientes_nomes = ", ".join([c[0] for c in clientes])

    return {
        "id": produto.id,
        "empresa_id": produto.empresa_id,
        "nome": produto.nome,
        "ativo": produto.ativo,
        "clientes": cliente_ids,
        "clientes_nomes": clientes_nomes
    }

@router.post("/produtos-servicos")
async def criar_produto_servico(
    produto_data: ProdutoServicoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Cria um novo serviço com clientes associados"""
    clientes_ids = produto_data.clientes or []
    
    data = produto_data.dict(exclude={'clientes'})
    if data.get('empresa_id') is None:
        data['empresa_id'] = current_user.empresa_id
    
    data = {k: v for k, v in data.items() if v is not None}
    
    produto = ProdutoServico(**data)
    db.add(produto)
    db.commit()
    db.refresh(produto)
    
    for cliente_id in clientes_ids:
        assoc = ProdutoServicoCliente(produto_servico_id=produto.id, cliente_id=cliente_id)
        db.add(assoc)
    db.commit()
    
    clientes_nomes = ""
    if clientes_ids:
        clientes = db.query(ClienteModel.nome).filter(ClienteModel.id.in_(clientes_ids)).all()
        clientes_nomes = ", ".join([c[0] for c in clientes])
    
    return {
        "id": produto.id,
        "empresa_id": produto.empresa_id,
        "nome": produto.nome,
        "ativo": produto.ativo,
        "clientes": clientes_ids,
        "clientes_nomes": clientes_nomes
    }

@router.put("/produtos-servicos/{produto_id}")
async def atualizar_produto_servico(
    produto_id: int,
    produto_data: ProdutoServicoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Atualiza um serviço e seus clientes associados"""
    produto = db.query(ProdutoServico).filter(ProdutoServico.id == produto_id).first()

    if not produto:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")

    produto.nome = produto_data.nome
    produto.ativo = produto_data.ativo
    
    db.query(ProdutoServicoCliente).filter(ProdutoServicoCliente.produto_servico_id == produto_id).delete()
    
    clientes_ids = produto_data.clientes or []
    for cliente_id in clientes_ids:
        assoc = ProdutoServicoCliente(produto_servico_id=produto_id, cliente_id=cliente_id)
        db.add(assoc)
    
    db.commit()
    db.refresh(produto)
    
    clientes_nomes = ""
    if clientes_ids:
        clientes = db.query(ClienteModel.nome).filter(ClienteModel.id.in_(clientes_ids)).all()
        clientes_nomes = ", ".join([c[0] for c in clientes])
    
    return {
        "id": produto.id,
        "empresa_id": produto.empresa_id,
        "nome": produto.nome,
        "ativo": produto.ativo,
        "clientes": clientes_ids,
        "clientes_nomes": clientes_nomes
    }

@router.delete("/produtos-servicos/{produto_id}")
async def excluir_produto_servico(
    produto_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Exclui um serviço e suas associações"""
    produto = db.query(ProdutoServico).filter(ProdutoServico.id == produto_id).first()

    if not produto:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")

    db.query(ProdutoServicoCliente).filter(ProdutoServicoCliente.produto_servico_id == produto_id).delete()
    db.delete(produto)
    db.commit()
    return {"message": "Serviço excluído com sucesso"}


# === CONTAS CONTÁBEIS ===

@router.get("/contas-contabeis", response_model=List[ContaContabilResponse])
async def listar_contas_contabeis(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Lista todas as contas contábeis de todas as empresas"""
    contas = db.query(ContaContabil).all()
    return contas

@router.get("/contas-contabeis/{conta_id}", response_model=ContaContabilResponse)
async def obter_conta_contabil(
    conta_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Obtém uma conta contábil específica por ID"""
    conta = db.query(ContaContabil).filter(
        ContaContabil.id == conta_id
    ).first()

    if not conta:
        raise HTTPException(status_code=404, detail="Conta contábil não encontrada")

    return conta

@router.post("/contas-contabeis", response_model=ContaContabilResponse)
async def criar_conta_contabil(
    conta_data: ContaContabilCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Cria uma nova conta contábil"""
    data = conta_data.dict()
    if data.get('empresa_id') is None:
        data['empresa_id'] = current_user.empresa_id

    conta = ContaContabil(**data)
    db.add(conta)
    db.commit()
    db.refresh(conta)
    return conta

@router.put("/contas-contabeis/{conta_id}", response_model=ContaContabilResponse)
async def atualizar_conta_contabil(
    conta_id: int,
    conta_data: ContaContabilCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Atualiza uma conta contábil"""
    conta = db.query(ContaContabil).filter(
        ContaContabil.id == conta_id
    ).first()

    if not conta:
        raise HTTPException(status_code=404, detail="Conta contábil não encontrada")

    # Atualizar apenas campos fornecidos, preservar empresa_id se não fornecido
    for key, value in conta_data.dict().items():
        if key == 'empresa_id' and value is None:
            continue  # Preservar empresa_id existente
        setattr(conta, key, value)

    db.commit()
    db.refresh(conta)
    return conta

@router.delete("/contas-contabeis/{conta_id}")
async def excluir_conta_contabil(
    conta_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Exclui uma conta contábil"""
    conta = db.query(ContaContabil).filter(
        ContaContabil.id == conta_id
    ).first()

    if not conta:
        raise HTTPException(status_code=404, detail="Conta contábil não encontrada")

    db.delete(conta)
    db.commit()
    return {"message": "Conta contábil excluída com sucesso"}


# === CONTAS BANCÁRIAS ===

@router.get("/contas-bancarias", response_model=List[ContaBancariaResponse])
async def listar_contas_bancarias(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Lista todas as contas bancárias de todas as empresas"""
    contas = db.query(ContaBancaria).all()
    return contas

@router.get("/contas-bancarias/{conta_id}", response_model=ContaBancariaResponse)
async def obter_conta_bancaria(
    conta_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Obtém uma conta bancária específica por ID"""
    conta = db.query(ContaBancaria).filter(
        ContaBancaria.id == conta_id
    ).first()

    if not conta:
        raise HTTPException(status_code=404, detail="Conta bancária não encontrada")

    return conta

@router.post("/contas-bancarias", response_model=ContaBancariaResponse)
async def criar_conta_bancaria(
    conta_data: ContaBancariaCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Cria uma nova conta bancária"""
    data = conta_data.dict()
    if data.get('empresa_id') is None:
        data['empresa_id'] = current_user.empresa_id

    conta = ContaBancaria(**data)
    db.add(conta)
    db.commit()
    db.refresh(conta)
    return conta

@router.put("/contas-bancarias/{conta_id}", response_model=ContaBancariaResponse)
async def atualizar_conta_bancaria(
    conta_id: int,
    conta_data: ContaBancariaCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Atualiza uma conta bancária"""
    conta = db.query(ContaBancaria).filter(
        ContaBancaria.id == conta_id
    ).first()

    if not conta:
        raise HTTPException(status_code=404, detail="Conta bancária não encontrada")

    # Atualizar apenas campos fornecidos, preservar empresa_id se não fornecido
    for key, value in conta_data.dict().items():
        if key == 'empresa_id' and value is None:
            continue  # Preservar empresa_id existente
        setattr(conta, key, value)

    db.commit()
    db.refresh(conta)
    return conta

@router.delete("/contas-bancarias/{conta_id}")
async def excluir_conta_bancaria(
    conta_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Exclui uma conta bancária"""
    conta = db.query(ContaBancaria).filter(
        ContaBancaria.id == conta_id
    ).first()

    if not conta:
        raise HTTPException(status_code=404, detail="Conta bancária não encontrada")

    db.delete(conta)
    db.commit()
    return {"message": "Conta bancária excluída com sucesso"}


# === IMPOSTOS ===

@router.get("/impostos", response_model=List[ImpostoResponse])
async def listar_impostos(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Lista todos os impostos de todas as empresas com nome da empresa e produto/serviço"""
    # LEFT JOIN com empresas e produtos_servicos para obter os nomes
    impostos_query = db.query(
        Imposto, 
        Empresa.nome_fantasia.label('empresa_nome'),
        ProdutoServico.nome.label('produto_servico_nome')
    ).outerjoin(
        Empresa, Imposto.empresa_id == Empresa.id
    ).outerjoin(
        ProdutoServico, Imposto.produto_servico_id == ProdutoServico.id
    ).all()

    # Formatar resposta com empresa_nome e produto_servico_nome
    resultado = []
    for imposto, empresa_nome, produto_servico_nome in impostos_query:
        imposto_dict = {
            "id": imposto.id,
            "empresa_id": imposto.empresa_id,
            "empresa_nome": empresa_nome if empresa_nome else "Empresa não encontrada",
            "produto_servico_id": imposto.produto_servico_id,
            "produto_servico_nome": produto_servico_nome,
            "nome": imposto.nome,
            "codigo": imposto.codigo if imposto.codigo else "",
            "tipo": imposto.tipo if imposto.tipo else "",
            "valor": float(imposto.valor) if imposto.valor else 0.0,
            "cumulativo": imposto.cumulativo if imposto.cumulativo else False,
            "ativo": imposto.ativo if imposto.ativo else True
        }
        resultado.append(imposto_dict)

    return resultado

@router.get("/impostos/{imposto_id}")
async def obter_imposto(
    imposto_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Obtém um imposto específico por ID"""
    result = db.query(
        Imposto,
        Empresa.nome_fantasia.label('empresa_nome'),
        ProdutoServico.nome.label('produto_servico_nome')
    ).outerjoin(
        Empresa, Imposto.empresa_id == Empresa.id
    ).outerjoin(
        ProdutoServico, Imposto.produto_servico_id == ProdutoServico.id
    ).filter(
        Imposto.id == imposto_id
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Imposto não encontrado")

    imposto, empresa_nome, produto_servico_nome = result
    return {
        "id": imposto.id,
        "empresa_id": imposto.empresa_id,
        "empresa_nome": empresa_nome if empresa_nome else "Empresa não encontrada",
        "produto_servico_id": imposto.produto_servico_id,
        "produto_servico_nome": produto_servico_nome,
        "nome": imposto.nome,
        "codigo": imposto.codigo if imposto.codigo else "",
        "tipo": imposto.tipo if imposto.tipo else "",
        "valor": float(imposto.valor) if imposto.valor else 0.0,
        "ativo": imposto.ativo if imposto.ativo else True
    }

@router.post("/impostos", response_model=ImpostoResponse)
async def criar_imposto(
    imposto_data: ImpostoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Cria um novo imposto"""
    try:
        data = imposto_data.dict()
        # Usar empresa_id do user, ou primeira empresa se user não tiver
        if data.get('empresa_id') is None:
            if current_user.empresa_id:
                data['empresa_id'] = current_user.empresa_id
            else:
                # Pegar primeira empresa disponível
                empresa = db.query(Empresa).first()
                if not empresa:
                    raise HTTPException(status_code=400, detail="Nenhuma empresa disponível")
                data['empresa_id'] = empresa.id

        imposto = Imposto(**data)
        db.add(imposto)
        db.commit()
        db.refresh(imposto)
        return imposto
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao criar imposto: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Erro ao criar imposto: {str(e)}")

@router.put("/impostos/{imposto_id}", response_model=ImpostoResponse)
async def atualizar_imposto(
    imposto_id: int,
    imposto_data: ImpostoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Atualiza um imposto"""
    try:
        imposto = db.query(Imposto).filter(
            Imposto.id == imposto_id
        ).first()

        if not imposto:
            raise HTTPException(status_code=404, detail="Imposto não encontrado")

        # Atualizar apenas campos fornecidos, preservar empresa_id se não fornecido
        for key, value in imposto_data.dict().items():
            if key == 'empresa_id' and value is None:
                continue  # Preservar empresa_id existente
            setattr(imposto, key, value)

        db.commit()
        db.refresh(imposto)
        return imposto
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao atualizar imposto: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Erro ao atualizar imposto: {str(e)}")

@router.delete("/impostos/{imposto_id}")
async def excluir_imposto(
    imposto_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Exclui um imposto"""
    imposto = db.query(Imposto).filter(
        Imposto.id == imposto_id
    ).first()

    if not imposto:
        raise HTTPException(status_code=404, detail="Imposto não encontrado")

    db.delete(imposto)
    db.commit()
    return {"message": "Imposto excluído com sucesso"}


# === CARTÕES DE CRÉDITO ===

@router.get("/cartoes-credito", response_model=List[CartaoCreditoResponse])
async def listar_cartoes_credito(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Lista todos os cartões de crédito de todas as empresas"""
    cartoes = db.query(CartaoCredito).all()
    return cartoes

@router.get("/cartoes-credito/{cartao_id}", response_model=CartaoCreditoResponse)
async def obter_cartao_credito(
    cartao_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Obtém um cartão de crédito específico por ID"""
    cartao = db.query(CartaoCredito).filter(
        CartaoCredito.id == cartao_id
    ).first()

    if not cartao:
        raise HTTPException(status_code=404, detail="Cartão de crédito não encontrado")

    return cartao

@router.post("/cartoes-credito", response_model=CartaoCreditoResponse)
async def criar_cartao_credito(
    cartao_data: CartaoCreditoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Cria um novo cartão de crédito"""
    data = cartao_data.dict()
    if data.get('empresa_id') is None:
        data['empresa_id'] = current_user.empresa_id

    cartao = CartaoCredito(**data)
    db.add(cartao)
    db.commit()
    db.refresh(cartao)
    return cartao

@router.put("/cartoes-credito/{cartao_id}", response_model=CartaoCreditoResponse)
async def atualizar_cartao_credito(
    cartao_id: int,
    cartao_data: CartaoCreditoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Atualiza um cartão de crédito"""
    cartao = db.query(CartaoCredito).filter(
        CartaoCredito.id == cartao_id
    ).first()

    if not cartao:
        raise HTTPException(status_code=404, detail="Cartão de crédito não encontrado")

    # Atualizar apenas campos fornecidos, preservar empresa_id se não fornecido
    for key, value in cartao_data.dict().items():
        if key == 'empresa_id' and value is None:
            continue  # Preservar empresa_id existente
        setattr(cartao, key, value)

    db.commit()
    db.refresh(cartao)
    return cartao

@router.delete("/cartoes-credito/{cartao_id}")
async def excluir_cartao_credito(
    cartao_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # User import added below
):
    """Exclui um cartão de crédito"""
    cartao = db.query(CartaoCredito).filter(
        CartaoCredito.id == cartao_id
    ).first()

    if not cartao:
        raise HTTPException(status_code=404, detail="Cartão de crédito não encontrado")

    db.delete(cartao)
    db.commit()
    return {"message": "Cartão de crédito excluído com sucesso!"}

# =======================
# ROTAS DE DELEÇÃO MÚLTIPLA
# =======================

class BulkDeleteRequest(BaseModel):
    ids: List[int]

@router.delete("/produtos-servicos/bulk-delete")
async def bulk_delete_produtos_servicos(
    request: BulkDeleteRequest,
    current_user = Depends(get_current_user), # User import added below
    db: Session = Depends(get_db)
):
    """Excluir múltiplos produtos/serviços"""
    try:
        if not request.ids:
            return {"message": "Nenhum ID fornecido para exclusão"}

        deleted_count = db.query(ProdutoServico).filter(
            ProdutoServico.id.in_(request.ids)
        ).delete(synchronize_session=False)

        db.commit()
        return {"message": f"{deleted_count} produto(s)/serviço(s) excluído(s) com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir produtos/serviços: {str(e)}")

@router.delete("/contas-contabeis/bulk-delete")
async def bulk_delete_contas_contabeis(
    request: BulkDeleteRequest,
    current_user = Depends(get_current_user), # User import added below
    db: Session = Depends(get_db)
):
    """Excluir múltiplas contas contábeis"""
    try:
        if not request.ids:
            return {"message": "Nenhum ID fornecido para exclusão"}

        deleted_count = db.query(ContaContabil).filter(
            ContaContabil.id.in_(request.ids)
        ).delete(synchronize_session=False)

        db.commit()
        return {"message": f"{deleted_count} conta(s) contábil(is) excluída(s) com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir contas contábeis: {str(e)}")

@router.delete("/contas-bancarias/bulk-delete")
async def bulk_delete_contas_bancarias(
    request: BulkDeleteRequest,
    current_user = Depends(get_current_user), # User import added below
    db: Session = Depends(get_db)
):
    """Excluir múltiplas contas bancárias"""
    try:
        if not request.ids:
            return {"message": "Nenhum ID fornecido para exclusão"}

        deleted_count = db.query(ContaBancaria).filter(
            ContaBancaria.id.in_(request.ids)
        ).delete(synchronize_session=False)

        db.commit()
        return {"message": f"{deleted_count} conta(s) bancária(s) excluída(s) com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir contas bancárias: {str(e)}")

@router.delete("/impostos/bulk-delete")
async def bulk_delete_impostos(
    request: BulkDeleteRequest,
    current_user = Depends(get_current_user), # User import added below
    db: Session = Depends(get_db)
):
    """Excluir múltiplos impostos"""
    try:
        if not request.ids:
            return {"message": "Nenhum ID fornecido para exclusão"}

        deleted_count = db.query(Imposto).filter(
            Imposto.id.in_(request.ids)
        ).delete(synchronize_session=False)

        db.commit()
        return {"message": f"{deleted_count} imposto(s) excluído(s) com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir impostos: {str(e)}")

@router.delete("/cartoes-credito/bulk-delete")
async def bulk_delete_cartoes_credito(
    request: BulkDeleteRequest,
    current_user = Depends(get_current_user), # User import added below
    db: Session = Depends(get_db)
):
    """Excluir múltiplos cartões de crédito"""
    try:
        if not request.ids:
            return {"message": "Nenhum ID fornecido para exclusão"}

        deleted_count = db.query(CartaoCredito).filter(
            CartaoCredito.id.in_(request.ids)
        ).delete(synchronize_session=False)

        db.commit()
        return {"message": f"{deleted_count} cartão(ões) de crédito excluído(s) com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir cartões de crédito: {str(e)}")


# ============= SUBCATEGORIAS =============
# NOTA: Endpoints de subcategorias foram movidos para categorias.py
# para evitar conflitos de rotas duplicadas (GET, POST, DELETE em /api/subcategorias)

# Added import for User model
from app.models.users import User
from app.models.auxiliares import ProjetoCliente, ProdutoServicoCliente
from app.models.clientes import Cliente

# === SCHEMAS PYDANTIC PARA PROJETO ===

class ProjetoCreate(BaseModel):
    empresa_id: Optional[int] = None
    clientes: Optional[List[int]] = None
    classificacao_id: Optional[int] = None
    nome: str
    ativo: bool = True

class ProjetoResponse(BaseModel):
    id: int
    empresa_id: Optional[int]
    nome: str
    ativo: bool
    clientes: Optional[List[int]] = None
    clientes_nomes: Optional[str] = None

    class Config:
        from_attributes = True

# === PROJETOS ===
@router.get("/projetos")
async def listar_projetos(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Lista todos os projetos com clientes associados"""
    projetos = db.query(Projeto).all()
    
    result = []
    for projeto in projetos:
        cliente_ids = db.query(ProjetoCliente.cliente_id).filter(
            ProjetoCliente.projeto_id == projeto.id
        ).all()
        cliente_ids = [c[0] for c in cliente_ids]
        
        clientes_nomes = ""
        if cliente_ids:
            clientes = db.query(Cliente.nome).filter(Cliente.id.in_(cliente_ids)).all()
            clientes_nomes = ", ".join([c[0] for c in clientes])
        
        result.append({
            "id": projeto.id,
            "empresa_id": projeto.empresa_id,
            "nome": projeto.nome,
            "ativo": projeto.ativo,
            "clientes": cliente_ids,
            "clientes_nomes": clientes_nomes
        })
    
    return result

@router.get("/projetos/{projeto_id}")
async def obter_projeto(
    projeto_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Obtém um projeto específico com seus clientes"""
    projeto = db.query(Projeto).filter(Projeto.id == projeto_id).first()
    
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    cliente_ids = db.query(ProjetoCliente.cliente_id).filter(
        ProjetoCliente.projeto_id == projeto.id
    ).all()
    cliente_ids = [c[0] for c in cliente_ids]
    
    clientes_nomes = ""
    if cliente_ids:
        clientes = db.query(Cliente.nome).filter(Cliente.id.in_(cliente_ids)).all()
        clientes_nomes = ", ".join([c[0] for c in clientes])
    
    return {
        "id": projeto.id,
        "empresa_id": projeto.empresa_id,
        "nome": projeto.nome,
        "ativo": projeto.ativo,
        "clientes": cliente_ids,
        "clientes_nomes": clientes_nomes
    }

@router.post("/projetos")
async def criar_projeto(
    projeto_data: ProjetoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Cria um novo projeto com clientes associados"""
    clientes_ids = projeto_data.clientes or []
    
    data = projeto_data.dict(exclude={'clientes'})
    if data.get('empresa_id') is None:
        data['empresa_id'] = current_user.empresa_id
    
    data = {k: v for k, v in data.items() if v is not None}
    
    db_projeto = Projeto(**data)
    db.add(db_projeto)
    db.commit()
    db.refresh(db_projeto)
    
    for cliente_id in clientes_ids:
        assoc = ProjetoCliente(projeto_id=db_projeto.id, cliente_id=cliente_id)
        db.add(assoc)
    db.commit()
    
    clientes_nomes = ""
    if clientes_ids:
        clientes = db.query(Cliente.nome).filter(Cliente.id.in_(clientes_ids)).all()
        clientes_nomes = ", ".join([c[0] for c in clientes])
    
    return {
        "id": db_projeto.id,
        "empresa_id": db_projeto.empresa_id,
        "nome": db_projeto.nome,
        "ativo": db_projeto.ativo,
        "clientes": clientes_ids,
        "clientes_nomes": clientes_nomes
    }

@router.put("/projetos/{projeto_id}")
async def atualizar_projeto(
    projeto_id: int,
    projeto_data: ProjetoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Atualiza um projeto e seus clientes associados"""
    projeto = db.query(Projeto).filter(Projeto.id == projeto_id).first()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    projeto.nome = projeto_data.nome
    projeto.ativo = projeto_data.ativo
    if projeto_data.classificacao_id:
        projeto.classificacao_id = projeto_data.classificacao_id
    
    db.query(ProjetoCliente).filter(ProjetoCliente.projeto_id == projeto_id).delete()
    
    clientes_ids = projeto_data.clientes or []
    for cliente_id in clientes_ids:
        assoc = ProjetoCliente(projeto_id=projeto_id, cliente_id=cliente_id)
        db.add(assoc)
    
    db.commit()
    db.refresh(projeto)
    
    clientes_nomes = ""
    if clientes_ids:
        clientes = db.query(Cliente.nome).filter(Cliente.id.in_(clientes_ids)).all()
        clientes_nomes = ", ".join([c[0] for c in clientes])
    
    return {
        "id": projeto.id,
        "empresa_id": projeto.empresa_id,
        "nome": projeto.nome,
        "ativo": projeto.ativo,
        "clientes": clientes_ids,
        "clientes_nomes": clientes_nomes
    }

@router.delete("/projetos/{projeto_id}")
async def excluir_projeto(
    projeto_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Exclui um projeto e suas associações"""
    projeto = db.query(Projeto).filter(Projeto.id == projeto_id).first()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    db.query(ProjetoCliente).filter(ProjetoCliente.projeto_id == projeto_id).delete()
    db.delete(projeto)
    db.commit()
    return {"message": "Projeto excluído com sucesso"}