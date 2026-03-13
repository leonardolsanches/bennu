"""
Validation services for category and transaction consistency
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.categorias import CategoriaContabil, CategoriaGerencial, CentroCusto, Projeto
from app.models.clientes import Cliente
from app.models.fornecedores import Fornecedor
from app.models.auxiliares import ContaContabil, ProdutoServico


def validate_categoria_subcategoria_consistency(
    db: Session, 
    categoria_contabil_id: Optional[int], 
    subcategoria_contabil_id: Optional[int],
    categoria_gerencial_id: Optional[int], 
    subcategoria_gerencial_id: Optional[int],
    empresa_id: int
) -> dict:
    """
    ✅ CROSS-COMPANY: Valida apenas existência e consistência de categorias.
    Sistema configurado para permitir edição cross-company conforme replit.md.
    
    Returns:
        dict: {"valid": bool, "errors": list[str]}
    """
    errors = []
    
    # ✅ CROSS-COMPANY: Verificar apenas existência da categoria contábil (qualquer empresa)
    if categoria_contabil_id:
        categoria = db.query(CategoriaContabil).filter(
            CategoriaContabil.id == categoria_contabil_id
        ).first()
        
        if not categoria:
            errors.append("Categoria contábil não encontrada")
    
    # ✅ CROSS-COMPANY: Verificar apenas existência da categoria gerencial (qualquer empresa)
    if categoria_gerencial_id:
        categoria = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.id == categoria_gerencial_id
        ).first()
        
        if not categoria:
            errors.append("Categoria gerencial não encontrada")
    
    # ✅ CROSS-COMPANY: Validar consistência contábil (categoria + subcategoria)
    if categoria_contabil_id and subcategoria_contabil_id:
        subcategoria = db.query(CategoriaContabil).filter(
            CategoriaContabil.id == subcategoria_contabil_id
        ).first()
        
        if not subcategoria:
            errors.append("Subcategoria contábil não encontrada")
        elif subcategoria.pai_id != categoria_contabil_id:
            errors.append("Subcategoria contábil não pertence à categoria selecionada")
    
    # ✅ CROSS-COMPANY: Validar consistência gerencial (categoria + subcategoria)
    if categoria_gerencial_id and subcategoria_gerencial_id:
        subcategoria = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.id == subcategoria_gerencial_id
        ).first()
        
        if not subcategoria:
            errors.append("Subcategoria gerencial não encontrada")
        elif subcategoria.pai_id != categoria_gerencial_id:
            errors.append("Subcategoria gerencial não pertence à categoria selecionada")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors
    }


def validate_foreign_keys_ownership(
    db: Session,
    empresa_id: int,
    cliente_id: Optional[int] = None,
    fornecedor_id: Optional[int] = None,
    centro_custo_id: Optional[int] = None,
    conta_contabil_id: Optional[int] = None,
    projeto_id: Optional[int] = None,
    produto_servico_id: Optional[int] = None,
    categoria_contabil_id: Optional[int] = None,
    subcategoria_contabil_id: Optional[int] = None,
    categoria_gerencial_id: Optional[int] = None,
    subcategoria_gerencial_id: Optional[int] = None
) -> dict:
    """
    ✅ CROSS-COMPANY: Valida apenas existência das chaves estrangeiras.
    Sistema configurado para permitir edição cross-company conforme replit.md.
    
    Returns:
        dict: {"valid": bool, "errors": list[str]}
    """
    errors = []
    
    # ✅ CROSS-COMPANY: Validar apenas existência do cliente (qualquer empresa)
    if cliente_id:
        cliente = db.query(Cliente).filter(
            Cliente.id == cliente_id
        ).first()
        if not cliente:
            errors.append("Cliente não encontrado")
    
    # ✅ CROSS-COMPANY: Validar apenas existência do fornecedor (qualquer empresa)
    if fornecedor_id:
        fornecedor = db.query(Fornecedor).filter(
            Fornecedor.id == fornecedor_id
        ).first()
        if not fornecedor:
            errors.append("Fornecedor não encontrado")
    
    # ✅ CROSS-COMPANY: Validar apenas existência do centro de custo (qualquer empresa)
    if centro_custo_id:
        centro_custo = db.query(CentroCusto).filter(
            CentroCusto.id == centro_custo_id
        ).first()
        if not centro_custo:
            errors.append("Centro de custo não encontrado")
    
    # ✅ CROSS-COMPANY: Validar apenas existência da conta contábil (qualquer empresa)
    if conta_contabil_id:
        conta_contabil = db.query(ContaContabil).filter(
            ContaContabil.id == conta_contabil_id
        ).first()
        if not conta_contabil:
            errors.append("Conta contábil não encontrada")
    
    # ✅ CROSS-COMPANY: Validar apenas existência do projeto (qualquer empresa)
    if projeto_id:
        projeto = db.query(Projeto).filter(
            Projeto.id == projeto_id
        ).first()
        if not projeto:
            errors.append("Projeto não encontrado")
    
    # ✅ CROSS-COMPANY: Validar apenas existência do produto/serviço (qualquer empresa)
    if produto_servico_id:
        produto_servico = db.query(ProdutoServico).filter(
            ProdutoServico.id == produto_servico_id
        ).first()
        if not produto_servico:
            errors.append("Produto/serviço não encontrado")
    
    # Validar categorias usando função existente
    categoria_validation = validate_categoria_subcategoria_consistency(
        db=db,
        categoria_contabil_id=categoria_contabil_id,
        subcategoria_contabil_id=subcategoria_contabil_id,
        categoria_gerencial_id=categoria_gerencial_id,
        subcategoria_gerencial_id=subcategoria_gerencial_id,
        empresa_id=empresa_id
    )
    
    # Combinar erros de categorias com demais validações
    errors.extend(categoria_validation["errors"])
    
    return {
        "valid": len(errors) == 0,
        "errors": errors
    }