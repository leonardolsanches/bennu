"""
Rotas para categorias contábeis e gerenciais
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.categorias import CategoriaContabil, CategoriaGerencial, CentroCusto, Projeto
from app.auth.oauth import get_current_user

router = APIRouter()

@router.get("/categorias-contabeis")
async def get_categorias_contabeis(
    response: Response,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    empresa: Optional[int] = Query(None),
    empresaId: Optional[int] = Query(None),
    pai_id: Optional[int] = Query(None),
    categoria_pai_id: Optional[int] = Query(None),
    centro_custo_id: Optional[int] = Query(None)
):
    """Lista categorias contábeis"""
    try:
        # Adicionar cabeçalhos para evitar cache
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

        # Listar categorias contábeis de todas as empresas
        query = db.query(CategoriaContabil).filter(
            CategoriaContabil.ativo == True
        )

        # Filtrar por centro de custo se fornecido (nova hierarquia)
        if centro_custo_id is not None:
            query = query.filter(CategoriaContabil.centro_custo_id == centro_custo_id)
        # Filtrar por categoria pai se fornecido (suporta ambos os nomes de parâmetro) - DEPRECATED
        elif pai_id is not None or categoria_pai_id is not None:
            parent_id = pai_id or categoria_pai_id
            if parent_id == "":
                query = query.filter(CategoriaContabil.pai_id.is_(None))
            else:
                query = query.filter(CategoriaContabil.pai_id == parent_id)

        categorias = query.order_by(CategoriaContabil.nome).all()

        return [
            {
                "id": cat.id,
                "empresa_id": cat.empresa_id,
                "nome": cat.nome,
                "codigo": cat.codigo,
                "descricao": cat.descricao,
                "ativo": cat.ativo,
                "pai_id": cat.pai_id
            }
            for cat in categorias
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar categorias contábeis: {str(e)}")

@router.get("/categorias-contabeis/{categoria_id}")
async def get_categoria_contabil(
    categoria_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém uma categoria contábil específica por ID"""
    try:
        categoria = db.query(CategoriaContabil).filter(
            CategoriaContabil.id == categoria_id
        ).first()

        if not categoria:
            raise HTTPException(status_code=404, detail="Categoria contábil não encontrada")

        return {
            "id": categoria.id,
            "empresa_id": categoria.empresa_id,
            "nome": categoria.nome,
            "codigo": categoria.codigo,
            "descricao": categoria.descricao,
            "ativo": categoria.ativo,
            "pai_id": categoria.pai_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar categoria contábil: {str(e)}")

@router.post("/categorias-contabeis/ensure-principais")
async def ensure_categorias_principais(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Endpoint placeholder - códigos são gerados automaticamente pelo sistema"""
    return {"status": "ok", "message": "Categorias principais verificadas"}

@router.get("/categorias-gerenciais")
async def get_categorias_gerenciais(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    empresa: Optional[int] = Query(None),
    empresaId: Optional[int] = Query(None),
    pai_id: Optional[int] = Query(None),
    categoria_pai_id: Optional[int] = Query(None)
):
    """Lista categorias gerenciais"""
    try:
        # Listar categorias gerenciais de todas as empresas
        query = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.ativo == True
        )

        # Filtrar por categoria pai se fornecido (suporta ambos os nomes de parâmetro)
        parent_id = pai_id or categoria_pai_id
        if parent_id is not None:
            if parent_id == "":
                # Se pai_id for string vazia, buscar categorias principais (pai_id is null)
                query = query.filter(CategoriaGerencial.pai_id.is_(None))
            else:
                # Se pai_id for um número, buscar subcategorias desse pai
                query = query.filter(CategoriaGerencial.pai_id == parent_id)
        else:
            # Se não especificar pai_id, retornar apenas categorias principais (pai_id is null)
            # Isso evita que subcategorias apareçam na listagem de categorias principais
            query = query.filter(CategoriaGerencial.pai_id.is_(None))

        categorias = query.order_by(CategoriaGerencial.nome).all()

        return [
            {
                "id": cat.id,
                "empresa_id": cat.empresa_id,
                "nome": cat.nome,
                "codigo": cat.codigo,
                "descricao": cat.descricao,
                "ativo": cat.ativo,
                "pai_id": cat.pai_id
            }
            for cat in categorias
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar categorias gerenciais: {str(e)}")

@router.get("/categorias-gerenciais/{categoria_id}")
async def get_categoria_gerencial(
    categoria_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém uma categoria gerencial específica por ID"""
    try:
        categoria = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.id == categoria_id
        ).first()

        if not categoria:
            raise HTTPException(status_code=404, detail="Categoria gerencial não encontrada")

        return {
            "id": categoria.id,
            "empresa_id": categoria.empresa_id,
            "nome": categoria.nome,
            "codigo": categoria.codigo,
            "descricao": categoria.descricao,
            "ativo": categoria.ativo
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar categoria gerencial: {str(e)}")

@router.get("/centros-custo")
async def get_centros_custo(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    empresa: Optional[int] = Query(None),
    empresaId: Optional[int] = Query(None)
):
    """Lista centros de custo de todas as empresas"""
    try:
        query = db.query(CentroCusto).filter(
            CentroCusto.ativo == True
        )

        centros = query.order_by(CentroCusto.nome).all()

        return [
            {
                "id": centro.id,
                "empresa_id": centro.empresa_id,
                "nome": centro.nome,
                "codigo": centro.codigo,
                "ativo": centro.ativo
            }
            for centro in centros
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar centros de custo: {str(e)}")

@router.get("/centros-custo/{centro_id}")
async def get_centro_custo(
    centro_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém um centro de custo específico por ID"""
    try:
        centro = db.query(CentroCusto).filter(
            CentroCusto.id == centro_id
        ).first()

        if not centro:
            raise HTTPException(status_code=404, detail="Centro de custo não encontrado")

        return {
            "id": centro.id,
            "empresa_id": centro.empresa_id,
            "nome": centro.nome,
            "codigo": centro.codigo,
            "ativo": centro.ativo
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar centro de custo: {str(e)}")


class CentroCustoCreate(BaseModel):
    nome: str
    codigo: Optional[str] = None
    ativo: Optional[bool] = True


class CentroCustoUpdate(BaseModel):
    nome: Optional[str] = None
    codigo: Optional[str] = None
    ativo: Optional[bool] = None


@router.post("/centros-custo")
async def create_centro_custo(
    centro: CentroCustoCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Criar novo centro de custo"""
    try:
        # Gerar código automático se não fornecido
        codigo = centro.codigo
        if not codigo:
            from sqlalchemy import func
            max_codigo = db.query(func.max(CentroCusto.id)).scalar() or 0
            codigo = f"CC{max_codigo + 1:04d}"
        
        novo_centro = CentroCusto(
            empresa_id=current_user.empresa_id,
            nome=centro.nome,
            codigo=codigo,
            ativo=centro.ativo if centro.ativo is not None else True
        )

        db.add(novo_centro)
        db.commit()
        db.refresh(novo_centro)

        return {
            "id": novo_centro.id,
            "empresa_id": novo_centro.empresa_id,
            "nome": novo_centro.nome,
            "codigo": novo_centro.codigo,
            "ativo": novo_centro.ativo
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar centro de custo: {str(e)}")


@router.put("/centros-custo/{centro_id}")
async def update_centro_custo(
    centro_id: int,
    centro: CentroCustoUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualizar centro de custo existente"""
    try:
        centro_db = db.query(CentroCusto).filter(
            CentroCusto.id == centro_id
        ).first()

        if not centro_db:
            raise HTTPException(status_code=404, detail="Centro de custo não encontrado")

        if centro.nome is not None:
            centro_db.nome = centro.nome
        if centro.codigo is not None:
            centro_db.codigo = centro.codigo
        if centro.ativo is not None:
            centro_db.ativo = centro.ativo

        db.commit()
        db.refresh(centro_db)

        return {
            "id": centro_db.id,
            "empresa_id": centro_db.empresa_id,
            "nome": centro_db.nome,
            "codigo": centro_db.codigo,
            "ativo": centro_db.ativo
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar centro de custo: {str(e)}")


@router.delete("/centros-custo/{centro_id}")
async def delete_centro_custo(
    centro_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Excluir centro de custo"""
    try:
        centro_db = db.query(CentroCusto).filter(
            CentroCusto.id == centro_id
        ).first()

        if not centro_db:
            raise HTTPException(status_code=404, detail="Centro de custo não encontrado")

        db.delete(centro_db)
        db.commit()

        return {"message": "Centro de custo excluído com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir centro de custo: {str(e)}")


@router.get("/projetos")
async def get_projetos(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(100)
):
    """Lista projetos de todas as empresas"""
    try:
        projetos = db.query(Projeto).filter(
            Projeto.ativo == True
        ).limit(limit).all()

        return [
            {
                "id": projeto.id,
                "empresa_id": projeto.empresa_id,
                "nome": projeto.nome,
                "codigo_interno": projeto.codigo_interno,
                "classificacao_id": projeto.classificacao_id,
                "ativo": projeto.ativo
            }
            for projeto in projetos
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar projetos: {str(e)}")

@router.get("/projetos/{projeto_id}")
async def get_projeto(
    projeto_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém um projeto específico por ID"""
    try:
        projeto = db.query(Projeto).filter(
            Projeto.id == projeto_id
        ).first()

        if not projeto:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")

        return {
            "id": projeto.id,
            "empresa_id": projeto.empresa_id,
            "nome": projeto.nome,
            "codigo_interno": projeto.codigo_interno,
            "classificacao_id": projeto.classificacao_id,
            "ativo": projeto.ativo
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar projeto: {str(e)}")

# =======================
# ROTAS DE DELEÇÃO MÚLTIPLA
# =======================

from pydantic import BaseModel
from typing import List

class BulkDeleteRequest(BaseModel):
    ids: List[int]

@router.delete("/categorias-contabeis/bulk-delete")
async def bulk_delete_categorias_contabeis(
    request: BulkDeleteRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Excluir múltiplas categorias contábeis"""
    try:
        deleted_count = db.query(CategoriaContabil).filter(
            CategoriaContabil.id.in_(request.ids)
        ).delete(synchronize_session=False)

        db.commit()
        return {"message": f"{deleted_count} categoria(s) contábil(is) excluída(s) com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir categorias contábeis: {str(e)}")

@router.delete("/categorias-gerenciais/bulk-delete")
async def bulk_delete_categorias_gerenciais(
    request: BulkDeleteRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Exclusão em lote de categorias gerenciais com cascata"""
    try:
        # Validar se há IDs para deletar
        if not request.ids:
            raise HTTPException(status_code=400, detail="Nenhum ID fornecido para exclusão")

        print(f"🗑️ Iniciando exclusão de {len(request.ids)} categorias gerenciais")

        # ETAPA 1: Primeiro limpar referências em TODAS as tabelas para TODAS as categorias que serão deletadas
        from app.models.transacoes import TransacaoFinanceira

        # ETAPA 2: Buscar todas as categorias dos IDs especificados
        todas_categorias = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.id.in_(request.ids)
        ).all()

        if not todas_categorias:
            raise HTTPException(status_code=404, detail="Nenhuma categoria encontrada para exclusão")

        # ETAPA 3: Para TODAS as categorias (pai ou subcategoria), buscar suas subcategorias filhas
        ids_para_deletar = set(request.ids)

        # Função recursiva para encontrar todas as subcategorias de uma categoria
        def encontrar_todas_subcategorias(categoria_id):
            subcategorias_encontradas = set()

            # Buscar subcategorias diretas desta categoria
            subcategorias_filhas = db.query(CategoriaGerencial).filter(
                CategoriaGerencial.pai_id == categoria_id
            ).all()

            for sub in subcategorias_filhas:
                subcategorias_encontradas.add(sub.id)
                print(f"🔍 Incluindo subcategoria {sub.nome} (ID: {sub.id}) para exclusão")

                # Recursivamente buscar subcategorias desta subcategoria
                subcategorias_netas = encontrar_todas_subcategorias(sub.id)
                subcategorias_encontradas.update(subcategorias_netas)

            return subcategorias_encontradas

        # Para cada categoria nos IDs originais, encontrar todas as suas subcategorias
        for categoria in todas_categorias:
            subcategorias_encontradas = encontrar_todas_subcategorias(categoria.id)
            ids_para_deletar.update(subcategorias_encontradas)

        # ETAPA 3.5: Limpar referências em TODAS as tabelas para TODAS as categorias que serão deletadas
        transacoes_atualizadas = 0
        orcamentos_atualizados = 0

        for categoria_id in ids_para_deletar:
            # Limpar referências de categoria_gerencial_id em transacoes_financeiras
            result1 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.categoria_gerencial_id == categoria_id
            ).update({TransacaoFinanceira.categoria_gerencial_id: None})

            # Limpar referências de subcategoria_gerencial_id em transacoes_financeiras
            result2 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.subcategoria_gerencial_id == categoria_id
            ).update({TransacaoFinanceira.subcategoria_gerencial_id: None})

            transacoes_atualizadas += result1 + result2

            # Limpar referências em linhas_orcamentarias (se existir a tabela)
            try:
                from sqlalchemy import text
                result3 = db.execute(
                    text("UPDATE linhas_orcamentarias SET categoria_gerencial_id = NULL WHERE categoria_gerencial_id = :categoria_id"),
                    {"categoria_id": categoria_id}
                )
                orcamentos_atualizados += result3.rowcount if hasattr(result3, 'rowcount') else 0
            except Exception as e:
                print(f"⚠️ Erro ao limpar linhas_orcamentarias para categoria {categoria_id}: {str(e)}")

        if transacoes_atualizadas > 0:
            print(f"🔧 {transacoes_atualizadas} transações desvinculadas das categorias")
        if orcamentos_atualizados > 0:
            print(f"🔧 {orcamentos_atualizados} linhas orçamentárias desvinculadas das categorias")
        if transacoes_atualizadas > 0 or orcamentos_atualizados > 0:
            db.flush()

        # ETAPA 4: Buscar todas as categorias que serão deletadas
        categorias_para_deletar = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.id.in_(list(ids_para_deletar))
        ).all()

        print(f"📋 Total de categorias a serem deletadas: {len(categorias_para_deletar)}")

        # ETAPA 5: Organizar por níveis hierárquicos (folhas primeiro)
        def organizar_por_niveis(categorias):
            # Mapear todas as categorias por ID
            cat_map = {cat.id: cat for cat in categorias}
            ids_set = set(cat_map.keys())

            niveis = []
            processados = set()

            while len(processados) < len(categorias):
                nivel_atual = []

                for cat in categorias:
                    if cat.id in processados:
                        continue

                    # Verificar se esta categoria tem filhas não processadas
                    tem_filhas_nao_processadas = False
                    for outra_cat in categorias:
                        if (outra_cat.pai_id == cat.id and 
                            outra_cat.id not in processados):
                            tem_filhas_nao_processadas = True
                            break

                    # Se não tem filhas não processadas, pode ser deletada neste nível
                    if not tem_filhas_nao_processadas:
                        nivel_atual.append(cat)

                if not nivel_atual:
                    # Fallback: pegar qualquer categoria restante
                    for cat in categorias:
                        if cat.id not in processados:
                            nivel_atual.append(cat)
                            break

                niveis.append(nivel_atual)
                for cat in nivel_atual:
                    processados.add(cat.id)

            return niveis

        niveis_deletar = organizar_por_niveis(categorias_para_deletar)
        deleted_count = 0

        # ETAPA 6: Deletar por níveis (folhas primeiro)
        for i, nivel in enumerate(niveis_deletar):
            print(f"🗑️ Deletando nível {i+1}: {len(nivel)} categorias")

            for categoria in nivel:
                try:
                    tipo_categoria = "subcategoria" if categoria.pai_id else "categoria pai"
                    print(f"🗑️ Deletando {tipo_categoria}: {categoria.nome} (ID: {categoria.id})")
                    db.delete(categoria)
                    deleted_count += 1
                except Exception as e:
                    print(f"❌ Erro ao deletar categoria {categoria.nome}: {str(e)}")

            # Flush após cada nível para garantir que as deleções sejam processadas
            try:
                db.flush()
                print(f"✅ Nível {i+1} processado com sucesso")
            except Exception as e:
                print(f"❌ Erro ao processar nível {i+1}: {str(e)}")
                raise

        # Commit final
        if deleted_count > 0:
            db.commit()
            print(f"✅ {deleted_count} categorias deletadas com sucesso")
            return {"message": f"{deleted_count} categorias excluídas com sucesso"}
        else:
            db.rollback()
            raise HTTPException(status_code=400, detail="Nenhuma categoria pôde ser excluída")

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro geral ao deletar categorias gerenciais: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao excluir categorias gerenciais: {str(e)}")

# Endpoint unificado para subcategorias (contábeis + gerenciais)
@router.get("/subcategorias")
async def get_subcategorias(
    response: Response,
    limit: int = 1000,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar todas as subcategorias (contábeis + gerenciais)"""
    try:
        # Adicionar cabeçalhos para evitar cache
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        # Buscar subcategorias contábeis de todas as empresas
        subcategorias_contabeis = db.query(CategoriaContabil).filter(
            CategoriaContabil.pai_id.isnot(None)
        ).limit(limit).all()

        # Buscar subcategorias gerenciais de todas as empresas
        subcategorias_gerenciais = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.pai_id.isnot(None)
        ).limit(limit).all()

        # Buscar categorias pai para referência
        categorias_contabeis_pai = db.query(CategoriaContabil).filter(
            CategoriaContabil.pai_id.is_(None)
        ).all()

        categorias_gerenciais_pai = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.pai_id.is_(None)
        ).all()

        # Criar mapa de categorias pai
        pai_map = {}
        for cat in categorias_contabeis_pai:
            pai_map[cat.id] = cat.nome
        for cat in categorias_gerenciais_pai:
            pai_map[cat.id] = cat.nome

        # Converter para formato unificado
        resultado = []

        for sub in subcategorias_contabeis:
            resultado.append({
                "id": f"contabil_{sub.id}",
                "nome": sub.nome,
                "codigo": sub.codigo,
                "tipo": "contabil",
                "categoria_pai": pai_map.get(sub.pai_id, "N/A"),
                "ativo": sub.ativo,
                "real_id": sub.id,
                "pai_id": sub.pai_id
            })

        for sub in subcategorias_gerenciais:
            resultado.append({
                "id": f"gerencial_{sub.id}",
                "nome": sub.nome,
                "codigo": sub.codigo,
                "tipo": "gerencial", 
                "categoria_pai": pai_map.get(sub.pai_id, "N/A"),
                "ativo": sub.ativo,
                "real_id": sub.id,
                "pai_id": sub.pai_id
            })

        return resultado

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/subcategorias/{subcategoria_id}")
async def delete_subcategoria(
    subcategoria_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletar uma subcategoria específica"""
    try:
        # Extrair tipo e ID real
        if subcategoria_id.startswith("contabil_"):
            tipo = "contabil"
            real_id = int(subcategoria_id.replace("contabil_", ""))
            model = CategoriaContabil
        elif subcategoria_id.startswith("gerencial_"):
            tipo = "gerencial"
            real_id = int(subcategoria_id.replace("gerencial_", ""))
            model = CategoriaGerencial
        else:
            raise HTTPException(status_code=400, detail="ID de subcategoria inválido")

        # Buscar e deletar
        subcategoria = db.query(model).filter(
            model.id == real_id,
            model.empresa_id == current_user.empresa_id,
            model.pai_id.isnot(None)  # Garantir que é uma subcategoria
        ).first()

        if not subcategoria:
            raise HTTPException(status_code=404, detail="Subcategoria não encontrada")

        db.delete(subcategoria)
        db.commit()

        return {"message": "Subcategoria excluída com sucesso"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/subcategorias/bulk-delete")
async def bulk_delete_subcategorias(
    request: BulkDeleteRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Exclusão em lote de subcategorias com limpeza de referências"""
    try:
        from app.models.transacoes import TransacaoFinanceira
        
        deleted_count = 0
        transacoes_limpas = 0

        for subcategoria_id in request.ids:
            # Extrair tipo e ID real
            if subcategoria_id.startswith("contabil_"):
                real_id = int(subcategoria_id.replace("contabil_", ""))
                model = CategoriaContabil
                campo_categoria = TransacaoFinanceira.categoria_contabil_id
                campo_subcategoria = TransacaoFinanceira.subcategoria_contabil_id
            elif subcategoria_id.startswith("gerencial_"):
                real_id = int(subcategoria_id.replace("gerencial_", ""))
                model = CategoriaGerencial
                campo_categoria = TransacaoFinanceira.categoria_gerencial_id
                campo_subcategoria = TransacaoFinanceira.subcategoria_gerencial_id
            else:
                continue  # Pular IDs inválidos

            # Buscar subcategoria
            subcategoria = db.query(model).filter(
                model.id == real_id,
                model.pai_id.isnot(None)  # Garantir que é uma subcategoria
            ).first()

            if subcategoria:
                # ETAPA 1: Limpar referências em transações
                # Limpar como subcategoria
                result1 = db.query(TransacaoFinanceira).filter(
                    campo_subcategoria == real_id
                ).update({campo_subcategoria: None})
                
                # Limpar como categoria (caso seja usada incorretamente)
                result2 = db.query(TransacaoFinanceira).filter(
                    campo_categoria == real_id
                ).update({campo_categoria: None})
                
                transacoes_limpas += result1 + result2
                
                if result1 > 0 or result2 > 0:
                    print(f"🔧 Limpadas {result1 + result2} referências da subcategoria {subcategoria.nome}")
                    db.flush()
                
                # ETAPA 2: Deletar subcategoria
                db.delete(subcategoria)
                deleted_count += 1
                print(f"🗑️ Subcategoria deletada: {subcategoria.nome}")

        db.commit()
        
        message = f"{deleted_count} subcategorias excluídas com sucesso"
        if transacoes_limpas > 0:
            message += f" ({transacoes_limpas} referências removidas de transações)"
        
        return {"message": message, "deleted_count": deleted_count, "transacoes_limpas": transacoes_limpas}

    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao deletar subcategorias: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao deletar subcategorias: {str(e)}")


@router.delete("/centros-custo/bulk-delete")
async def bulk_delete_centros_custo(
    request: BulkDeleteRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Excluir múltiplos centros de custo"""
    try:
        deleted_count = db.query(CentroCusto).filter(
            CentroCusto.id.in_(request.ids),
            CentroCusto.empresa_id == current_user.empresa_id
        ).delete(synchronize_session=False)

        db.commit()
        return {"message": f"{deleted_count} centro(s) de custo excluído(s) com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir centros de custo: {str(e)}")

@router.delete("/projetos/bulk-delete")
async def bulk_delete_projetos(
    request: BulkDeleteRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Excluir múltiplos projetos"""
    try:
        deleted_count = db.query(Projeto).filter(
            Projeto.id.in_(request.ids),
            Projeto.empresa_id == current_user.empresa_id
        ).delete(synchronize_session=False)

        db.commit()
        return {"message": f"{deleted_count} projeto(s) excluído(s) com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir projetos: {str(e)}")

# =======================
# ROTAS CRUD PARA SUBCATEGORIAS
# =======================

from pydantic import BaseModel

class CategoriaCreateRequest(BaseModel):
    nome: str
    codigo: Optional[str] = None
    descricao: Optional[str] = None
    pai_id: Optional[int] = None
    ativo: Optional[bool] = True

class CategoriaUpdateRequest(BaseModel):
    nome: Optional[str] = None
    codigo: Optional[str] = None
    descricao: Optional[str] = None
    pai_id: Optional[int] = None
    ativo: Optional[bool] = None

class SubcategoriaCreateRequest(BaseModel):
    nome: str
    tipo: str  # 'contabil' ou 'gerencial'
    pai_id: int
    descricao: Optional[str] = None
    ativo: Optional[bool] = True

def generate_codigo_sequencial(db: Session, table_name: str, prefix: str, empresa_id: int) -> str:
    """Gera código sequencial concorrência-safe para qualquer tabela"""
    try:
        max_retries = 5
        for attempt in range(max_retries):
            try:
                # Para evitar conflitos de concorrência, usar MAX(codigo) + 1 dentro de transação
                if table_name == "categorias_contabeis":
                    # Buscar o maior número no código existente para esta empresa
                    result = db.query(CategoriaContabil.codigo).filter(
                        CategoriaContabil.empresa_id == empresa_id,
                        CategoriaContabil.codigo.like(f"{prefix}%")
                    ).all()
                elif table_name == "categorias_gerenciais":
                    result = db.query(CategoriaGerencial.codigo).filter(
                        CategoriaGerencial.empresa_id == empresa_id,
                        CategoriaGerencial.codigo.like(f"{prefix}%")
                    ).all()
                else:
                    return f"{prefix}001"  # Primeiro código para tabela desconhecida
                
                # Extrair números dos códigos existentes
                max_num = 0
                for row in result:
                    if row[0] and row[0].startswith(prefix):
                        try:
                            num_part = row[0][len(prefix):]
                            if num_part.isdigit():
                                max_num = max(max_num, int(num_part))
                        except (ValueError, IndexError):
                            continue
                
                # Próximo número sequencial
                next_num = max_num + 1
                return f"{prefix}{next_num:03d}"  # Formato: PREFIX001, PREFIX002, etc.
                
            except Exception as e:
                # Em caso de deadlock ou erro de concorrência, tentar novamente
                if attempt == max_retries - 1:
                    # Último recurso: usar timestamp para garantir unicidade
                    import time
                    timestamp_suffix = int(time.time() * 1000) % 1000
                    return f"{prefix}{timestamp_suffix:03d}"
                continue
        
    except Exception:
        # Fallback final em caso de erro crítico
        import random
        return f"{prefix}{random.randint(100, 999)}"

@router.post("/categorias-contabeis")
async def create_categoria_contabil(
    categoria: CategoriaCreateRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Criar nova categoria contábil"""
    try:
        nova_categoria = CategoriaContabil(
            empresa_id=current_user.empresa_id,
            nome=categoria.nome,
            codigo=categoria.codigo,
            descricao=categoria.descricao,
            pai_id=categoria.pai_id,
            ativo=categoria.ativo
        )

        db.add(nova_categoria)
        db.commit()
        db.refresh(nova_categoria)

        return {
            "id": nova_categoria.id,
            "empresa_id": nova_categoria.empresa_id,
            "nome": nova_categoria.nome,
            "codigo": nova_categoria.codigo,
            "descricao": nova_categoria.descricao,
            "pai_id": nova_categoria.pai_id,
            "ativo": nova_categoria.ativo
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar categoria contábil: {str(e)}")

@router.put("/categorias-contabeis/{categoria_id}")
async def update_categoria_contabil(
    categoria_id: int,
    categoria: CategoriaUpdateRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualizar categoria contábil"""
    try:
        existing = db.query(CategoriaContabil).filter(
            CategoriaContabil.id == categoria_id,
            CategoriaContabil.empresa_id == current_user.empresa_id
        ).first()

        if not existing:
            raise HTTPException(status_code=404, detail="Categoria contábil não encontrada")

        # Atualizar apenas campos fornecidos
        for field, value in categoria.dict(exclude_unset=True).items():
            setattr(existing, field, value)

        db.commit()
        db.refresh(existing)

        return {
            "id": existing.id,
            "empresa_id": existing.empresa_id,
            "nome": existing.nome,
            "codigo": existing.codigo,
            "descricao": existing.descricao,
            "pai_id": existing.pai_id,
            "ativo": existing.ativo
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar categoria contábil: {str(e)}")

@router.delete("/categorias-contabeis/{categoria_id}")
async def delete_categoria_contabil(
    categoria_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Excluir categoria contábil"""
    try:
        categoria = db.query(CategoriaContabil).filter(
            CategoriaContabil.id == categoria_id,
            CategoriaContabil.empresa_id == current_user.empresa_id
        ).first()

        if not categoria:
            raise HTTPException(status_code=404, detail="Categoria contábil não encontrada")

        db.delete(categoria)
        db.commit()

        return {"message": "Categoria contábil excluída com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir categoria contábil: {str(e)}")

@router.post("/categorias-gerenciais")
async def create_categoria_gerencial(
    categoria: CategoriaCreateRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Criar nova categoria gerencial"""
    try:
        nova_categoria = CategoriaGerencial(
            empresa_id=current_user.empresa_id,
            nome=categoria.nome,
            codigo=categoria.codigo,
            descricao=categoria.descricao,
            pai_id=categoria.pai_id,
            ativo=categoria.ativo
        )

        db.add(nova_categoria)
        db.commit()
        db.refresh(nova_categoria)

        return {
            "id": nova_categoria.id,
            "empresa_id": nova_categoria.empresa_id,
            "nome": nova_categoria.nome,
            "codigo": nova_categoria.codigo,
            "descricao": nova_categoria.descricao,
            "pai_id": nova_categoria.pai_id,
            "ativo": nova_categoria.ativo
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar categoria gerencial: {str(e)}")

@router.post("/subcategorias")
async def create_subcategoria(
    subcategoria: SubcategoriaCreateRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Criar nova subcategoria (contábil ou gerencial)"""
    try:
        if subcategoria.tipo == 'contabil':
            # Verificar se a categoria pai contábil existe (cross-company: permite categorias globais)
            categoria_pai = db.query(CategoriaContabil).filter(
                CategoriaContabil.id == subcategoria.pai_id
            ).first()
            
            if not categoria_pai:
                raise HTTPException(status_code=404, detail="Categoria pai contábil não encontrada")
            
            # Gerar código automático para subcategoria contábil
            codigo = generate_codigo_sequencial(db, "categorias_contabeis", "SC", current_user.empresa_id)
            
            nova_subcategoria = CategoriaContabil(
                empresa_id=current_user.empresa_id,
                nome=subcategoria.nome,
                codigo=codigo,
                descricao=subcategoria.descricao,
                pai_id=subcategoria.pai_id,
                ativo=subcategoria.ativo
            )
            
        elif subcategoria.tipo == 'gerencial':
            # Verificar se a categoria pai gerencial existe (cross-company: permite categorias globais)
            categoria_pai = db.query(CategoriaGerencial).filter(
                CategoriaGerencial.id == subcategoria.pai_id
            ).first()
            
            if not categoria_pai:
                raise HTTPException(status_code=404, detail="Categoria pai gerencial não encontrada")
            
            # Gerar código automático para subcategoria gerencial
            codigo = generate_codigo_sequencial(db, "categorias_gerenciais", "SG", current_user.empresa_id)
            
            nova_subcategoria = CategoriaGerencial(
                empresa_id=current_user.empresa_id,
                nome=subcategoria.nome,
                codigo=codigo,
                descricao=subcategoria.descricao,
                pai_id=subcategoria.pai_id,
                ativo=subcategoria.ativo
            )
        else:
            raise HTTPException(status_code=400, detail="Tipo deve ser 'contabil' ou 'gerencial'")

        db.add(nova_subcategoria)
        db.commit()
        db.refresh(nova_subcategoria)

        return {
            "id": nova_subcategoria.id,
            "empresa_id": nova_subcategoria.empresa_id,
            "nome": nova_subcategoria.nome,
            "codigo": getattr(nova_subcategoria, 'codigo', None),
            "descricao": nova_subcategoria.descricao,
            "pai_id": nova_subcategoria.pai_id,
            "tipo": subcategoria.tipo,
            "ativo": nova_subcategoria.ativo
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar subcategoria: {str(e)}")

@router.post("/transacoes/validar-categorias")
async def validar_e_corrigir_categorias_transacoes(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Valida e corrige inconsistências entre categorias e subcategorias em transações"""
    try:
        from app.models.transacoes import TransacaoFinanceira
        
        # Buscar transações com possíveis inconsistências
        transacoes_problema = []
        transacoes_corrigidas = 0
        
        # 1. Verificar inconsistências contábeis
        transacoes_contabeis = db.query(TransacaoFinanceira).filter(
            TransacaoFinanceira.categoria_contabil_id.isnot(None),
            TransacaoFinanceira.subcategoria_contabil_id.isnot(None)
        ).all()
        
        for transacao in transacoes_contabeis:
            # Verificar se a subcategoria contábil realmente pertence à categoria contábil
            subcategoria = db.query(CategoriaContabil).filter(
                CategoriaContabil.id == transacao.subcategoria_contabil_id
            ).first()
            
            if subcategoria and subcategoria.pai_id != transacao.categoria_contabil_id:
                # Inconsistência detectada! Limpar subcategoria
                transacao.subcategoria_contabil_id = None
                transacoes_corrigidas += 1
                transacoes_problema.append({
                    'id': transacao.id,
                    'tipo': 'contabil',
                    'problema': f'Subcategoria {subcategoria.nome} não pertence à categoria contábil selecionada'
                })
        
        # 2. Verificar inconsistências gerenciais
        transacoes_gerenciais = db.query(TransacaoFinanceira).filter(
            TransacaoFinanceira.categoria_gerencial_id.isnot(None),
            TransacaoFinanceira.subcategoria_gerencial_id.isnot(None)
        ).all()
        
        for transacao in transacoes_gerenciais:
            # Verificar se a subcategoria gerencial realmente pertence à categoria gerencial
            subcategoria = db.query(CategoriaGerencial).filter(
                CategoriaGerencial.id == transacao.subcategoria_gerencial_id
            ).first()
            
            if subcategoria and subcategoria.pai_id != transacao.categoria_gerencial_id:
                # Inconsistência detectada! Limpar subcategoria
                transacao.subcategoria_gerencial_id = None
                transacoes_corrigidas += 1
                transacoes_problema.append({
                    'id': transacao.id,
                    'tipo': 'gerencial',
                    'problema': f'Subcategoria {subcategoria.nome} não pertence à categoria gerencial selecionada'
                })
        
        if transacoes_corrigidas > 0:
            db.commit()
        
        return {
            "message": f"{transacoes_corrigidas} transações corrigidas",
            "transacoes_corrigidas": transacoes_corrigidas,
            "problemas_encontrados": transacoes_problema
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao validar categorias: {str(e)}")

def validate_categoria_subcategoria_consistency(
    db: Session, 
    categoria_contabil_id: Optional[int], 
    subcategoria_contabil_id: Optional[int],
    categoria_gerencial_id: Optional[int], 
    subcategoria_gerencial_id: Optional[int],
    empresa_id: int
) -> dict:
    """Valida consistência entre categorias e subcategorias antes de salvar transação"""
    errors = []
    
    # Validar consistência contábil
    if categoria_contabil_id and subcategoria_contabil_id:
        subcategoria = db.query(CategoriaContabil).filter(
            CategoriaContabil.id == subcategoria_contabil_id
        ).first()
        
        if not subcategoria:
            errors.append("Subcategoria contábil não encontrada")
        elif subcategoria.pai_id != categoria_contabil_id:
            errors.append("Subcategoria contábil não pertence à categoria selecionada")
    
    # Validar consistência gerencial  
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

@router.get("/categorias-gerenciais/{categoria_id}")
async def get_categoria_gerencial_by_id(
    categoria_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Buscar categoria gerencial por ID (necessário para edição)"""
    try:
        categoria = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.id == categoria_id
        ).first()

        if not categoria:
            raise HTTPException(status_code=404, detail="Categoria gerencial não encontrada")

        return {
            "id": categoria.id,
            "empresa_id": categoria.empresa_id,
            "nome": categoria.nome,
            "codigo": categoria.codigo,
            "descricao": categoria.descricao,
            "pai_id": categoria.pai_id,
            "ativo": categoria.ativo
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar categoria gerencial: {str(e)}")

@router.put("/categorias-gerenciais/{categoria_id}")
async def update_categoria_gerencial(
    categoria_id: int,
    categoria: CategoriaUpdateRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualizar categoria gerencial"""
    try:
        existing = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.id == categoria_id
        ).first()

        if not existing:
            raise HTTPException(status_code=404, detail="Categoria gerencial não encontrada")

        # Atualizar apenas campos fornecidos
        for field, value in categoria.dict(exclude_unset=True).items():
            setattr(existing, field, value)

        db.commit()
        db.refresh(existing)

        return {
            "id": existing.id,
            "empresa_id": existing.empresa_id,
            "nome": existing.nome,
            "codigo": existing.codigo,
            "descricao": existing.descricao,
            "pai_id": existing.pai_id,
            "ativo": existing.ativo
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar categoria gerencial: {str(e)}")

@router.delete("/categorias-gerenciais/{categoria_id}")
async def delete_categoria_gerencial(
    categoria_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Excluir categoria gerencial com cascata completa"""
    try:
        categoria = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.id == categoria_id
        ).first()

        if not categoria:
            raise HTTPException(status_code=404, detail="Categoria gerencial não encontrada")

        print(f"🗑️ Iniciando exclusão da categoria: {categoria.nome} (ID: {categoria.id})")

        # ETAPA 1: Limpar referências em transações para esta categoria e suas subcategorias
        from app.models.transacoes import TransacaoFinanceira

        # Função recursiva para encontrar todas as subcategorias
        def encontrar_todas_subcategorias(cat_id):
            subcategorias_encontradas = set()
            subcategorias_filhas = db.query(CategoriaGerencial).filter(
                CategoriaGerencial.pai_id == cat_id
            ).all()

            for sub in subcategorias_filhas:
                subcategorias_encontradas.add(sub.id)
                # Recursivamente buscar subcategorias desta subcategoria
                subcategorias_netas = encontrar_todas_subcategorias(sub.id)
                subcategorias_encontradas.update(subcategorias_netas)

            return subcategorias_encontradas

        # Encontrar todas as subcategorias desta categoria
        todas_subcategorias = encontrar_todas_subcategorias(categoria_id)
        ids_para_limpar = {categoria_id} | todas_subcategorias

        print(f"🔧 Limpando referências em transações para {len(ids_para_limpar)} categorias")

        transacoes_atualizadas = 0
        orcamentos_atualizados = 0

        for cat_id in ids_para_limpar:
            # Limpar referências de categoria_gerencial_id em transacoes_financeiras
            result1 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.categoria_gerencial_id == cat_id
            ).update({TransacaoFinanceira.categoria_gerencial_id: None})

            # Limpar referências de subcategoria_gerencial_id em transacoes_financeiras
            result2 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.subcategoria_gerencial_id == cat_id
            ).update({TransacaoFinanceira.subcategoria_gerencial_id: None})

            transacoes_atualizadas += result1 + result2

            # Limpar referências em linhas_orcamentarias (se existir a tabela)
            try:
                from sqlalchemy import text
                result3 = db.execute(
                    text("UPDATE linhas_orcamentarias SET categoria_gerencial_id = NULL WHERE categoria_gerencial_id = :categoria_id"),
                    {"categoria_id": cat_id}
                )
                orcamentos_atualizados += result3.rowcount if hasattr(result3, 'rowcount') else 0
            except Exception as e:
                print(f"⚠️ Erro ao limpar linhas_orcamentarias para categoria {cat_id}: {str(e)}")

        if transacoes_atualizadas > 0:
            print(f"🔧 {transacoes_atualizadas} referências em transações removidas")
        if orcamentos_atualizados > 0:
            print(f"🔧 {orcamentos_atualizados} linhas orçamentárias desvinculadas")
        if transacoes_atualizadas > 0 or orcamentos_atualizados > 0:
            db.flush()

        # ETAPA 2: Deletar subcategorias (ordenadas por profundidade)
        def organizar_subcategorias_por_profundidade():
            subcategorias_para_deletar = db.query(CategoriaGerencial).filter(
                CategoriaGerencial.id.in_(list(todas_subcategorias))
            ).all()

            # Organizar por níveis (folhas primeiro)
            niveis = []
            processados = set()

            while len(processados) < len(subcategorias_para_deletar):
                nivel_atual = []

                for sub in subcategorias_para_deletar:
                    if sub.id in processados:
                        continue

                    # Verificar se esta subcategoria tem filhas não processadas
                    tem_filhas_nao_processadas = False
                    for outra_sub in subcategorias_para_deletar:
                        if (outra_sub.pai_id == sub.id and 
                            outra_sub.id not in processados):
                            tem_filhas_nao_processadas = True
                            break

                    # Se não tem filhas não processadas, pode ser deletada neste nível
                    if not tem_filhas_nao_processadas:
                        nivel_atual.append(sub)

                if not nivel_atual:
                    # Fallback: pegar qualquer subcategoria restante
                    for sub in subcategorias_para_deletar:
                        if sub.id not in processados:
                            nivel_atual.append(sub)
                            break

                niveis.append(nivel_atual)
                for sub in nivel_atual:
                    processados.add(sub.id)

            return niveis

        if todas_subcategorias:
            niveis_subcategorias = organizar_subcategorias_por_profundidade()
            print(f"🗑️ Deletando {len(todas_subcategorias)} subcategorias em {len(niveis_subcategorias)} níveis")

            for i, nivel in enumerate(niveis_subcategorias):
                for sub in nivel:
                    print(f"   🗑️ Deletando subcategoria: {sub.nome} (ID: {sub.id})")
                    db.delete(sub)
                db.flush()
                print(f"✅ Nível {i+1} de subcategorias processado")

        # ETAPA 3: Deletar a categoria principal
        print(f"🗑️ Deletando categoria principal: {categoria.nome} (ID: {categoria.id})")
        db.delete(categoria)

        # Commit final
        db.commit()
        print(f"✅ Categoria {categoria.nome} e suas subcategorias excluídas com sucesso")

        return {"message": "Categoria gerencial e suas subcategorias excluídas com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao excluir categoria gerencial: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao excluir categoria gerencial: {str(e)}")

@router.post("/subcategorias-gerenciais/reativar")
async def reativar_subcategoria_gerencial(
    codigo: str,
    categoria_pai_codigo: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reativar subcategoria gerencial por código e associar à categoria pai"""
    try:
        # Buscar categoria pai pelo código
        categoria_pai = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.codigo == categoria_pai_codigo,
            CategoriaGerencial.pai_id.is_(None)  # Garantir que é categoria pai
        ).first()

        if not categoria_pai:
            raise HTTPException(status_code=404, detail=f"Categoria pai com código '{categoria_pai_codigo}' não encontrada")

        # Buscar subcategoria pelo código
        subcategoria = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.codigo == codigo
        ).first()

        if not subcategoria:
            # Se não existe, criar nova subcategoria
            subcategoria = CategoriaGerencial(
                empresa_id=current_user.empresa_id,
                nome=f"Subcategoria {codigo}",
                codigo=codigo,
                pai_id=categoria_pai.id,
                ativo=True,
                descricao=f"Subcategoria reativada com código {codigo}"
            )
            db.add(subcategoria)
            message = f"Nova subcategoria criada com código {codigo}"
        else:
            # Se existe, reativar e associar à categoria pai
            subcategoria.pai_id = categoria_pai.id
            subcategoria.ativo = True
            message = f"Subcategoria {codigo} reativada"

        db.commit()
        db.refresh(subcategoria)

        return {
            "message": message,
            "subcategoria": {
                "id": subcategoria.id,
                "nome": subcategoria.nome,
                "codigo": subcategoria.codigo,
                "categoria_pai": categoria_pai.nome,
                "ativo": subcategoria.ativo
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao reativar subcategoria: {str(e)}")

@router.delete("/subcategorias-gerenciais/delete-all")
async def delete_all_subcategorias_gerenciais(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletar TODAS as subcategorias gerenciais do banco de dados"""
    try:
        # Buscar TODAS as subcategorias gerenciais (que têm pai_id não nulo)
        subcategorias = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.pai_id.isnot(None)
        ).all()

        if not subcategorias:
            return {"message": "Nenhuma subcategoria gerencial encontrada", "deleted_count": 0}

        print(f"🗑️ Iniciando exclusão de TODAS as {len(subcategorias)} subcategorias gerenciais")

        # ETAPA 1: Limpar referências em transações
        from app.models.transacoes import TransacaoFinanceira

        transacoes_atualizadas = 0
        for subcategoria in subcategorias:
            # Limpar referências em transacoes_financeiras
            result1 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.categoria_gerencial_id == subcategoria.id
            ).update({TransacaoFinanceira.categoria_gerencial_id: None})

            result2 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.subcategoria_gerencial_id == subcategoria.id
            ).update({TransacaoFinanceira.subcategoria_gerencial_id: None})

            transacoes_atualizadas += result1 + result2

        if transacoes_atualizadas > 0:
            print(f"🔧 {transacoes_atualizadas} referências em transações removidas")
            db.flush()

        # ETAPA 2: Deletar todas as subcategorias
        deleted_count = 0
        for subcategoria in subcategorias:
            print(f"🗑️ Deletando subcategoria: {subcategoria.nome} (ID: {subcategoria.id})")
            db.delete(subcategoria)
            deleted_count += 1

        # Commit final
        db.commit()
        print(f"✅ {deleted_count} subcategorias gerenciais deletadas com sucesso")

        return {
            "message": f"Todas as subcategorias gerenciais foram deletadas com sucesso!",
            "deleted_count": deleted_count,
            "transacoes_atualizadas": transacoes_atualizadas,
            "status": "success"
        }

    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao deletar subcategorias gerenciais: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao deletar subcategorias gerenciais: {str(e)}")

@router.delete("/categorias-contabeis/delete-principais")
async def delete_categorias_principais_especificas(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletar categorias contábeis específicas por nome"""
    try:
        from app.models.transacoes import TransacaoFinanceira
        
        # Nomes das categorias a serem deletadas
        categorias_nomes = [
            "GASTOS DE ADMINISTRAÇÃO",
            "GASTOS DE COMERCIALIZAÇÃO", 
            "RECEITAS DE VENDAS",
            "RECEITAS FINANCEIRAS"
        ]
        
        deleted_categorias = 0
        deleted_subcategorias = 0
        transacoes_limpas = 0
        
        print(f"🗑️ Iniciando exclusão de categorias contábeis por nomes: {categorias_nomes}")
        
        # ETAPA 1: Buscar todas as categorias principais pelos nomes
        categorias_principais = db.query(CategoriaContabil).filter(
            CategoriaContabil.nome.in_(categorias_nomes),
            CategoriaContabil.pai_id.is_(None)  # Apenas categorias principais
        ).all()
        
        if not categorias_principais:
            return {
                "message": "Nenhuma categoria encontrada para exclusão",
                "deleted_categorias": 0,
                "deleted_subcategorias": 0
            }
        
        # ETAPA 2: Para cada categoria principal, buscar suas subcategorias filhas
        todas_subcategorias_ids = set()
        
        for categoria in categorias_principais:
            # Buscar subcategorias desta categoria
            subcategorias_filhas = db.query(CategoriaContabil).filter(
                CategoriaContabil.pai_id == categoria.id
            ).all()
            
            for sub in subcategorias_filhas:
                todas_subcategorias_ids.add(sub.id)
                print(f"🔍 Subcategoria da categoria {categoria.nome}: {sub.nome}")
        
        # ETAPA 3: Limpar referências em transações
        
        # Limpar referências para categorias principais
        for categoria in categorias_principais:
            result1 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.categoria_contabil_id == categoria.id
            ).update({TransacaoFinanceira.categoria_contabil_id: None})
            
            transacoes_limpas += result1
            print(f"🔧 Limpas {result1} referências de categoria_contabil_id para categoria {categoria.nome}")
        
        # Limpar referências para todas as subcategorias
        for subcategoria_id in todas_subcategorias_ids:
            result2 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.subcategoria_contabil_id == subcategoria_id
            ).update({TransacaoFinanceira.subcategoria_contabil_id: None})
            
            transacoes_limpas += result2
        
        if transacoes_limpas > 0:
            print(f"🔧 Total de {transacoes_limpas} referências em transações removidas")
            db.flush()
        
        # ETAPA 4: Deletar subcategorias primeiro (ordem hierárquica)
        for subcategoria_id in todas_subcategorias_ids:
            subcategoria = db.query(CategoriaContabil).filter(
                CategoriaContabil.id == subcategoria_id
            ).first()
            
            if subcategoria:
                print(f"🗑️ Deletando subcategoria: {subcategoria.nome}")
                db.delete(subcategoria)
                deleted_subcategorias += 1
        
        # ETAPA 5: Deletar categorias principais
        for categoria in categorias_principais:
            print(f"🗑️ Deletando categoria principal: {categoria.nome}")
            db.delete(categoria)
            deleted_categorias += 1
        
        # Commit final
        if deleted_categorias > 0 or deleted_subcategorias > 0:
            db.commit()
            print(f"✅ Exclusão concluída: {deleted_categorias} categorias e {deleted_subcategorias} subcategorias")
            
            return {
                "message": f"Exclusão concluída com sucesso!",
                "deleted_categorias": deleted_categorias,
                "deleted_subcategorias": deleted_subcategorias,
                "transacoes_limpas": transacoes_limpas,
                "categorias_deletadas": [cat.nome for cat in categorias_principais]
            }
        else:
            return {
                "message": "Nenhuma categoria ou subcategoria encontrada para exclusão",
                "deleted_categorias": 0,
                "deleted_subcategorias": 0
            }

    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao deletar categorias principais: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao deletar categorias: {str(e)}")

@router.delete("/categorias-contabeis/delete-problematicas")
async def delete_categorias_problematicas(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletar as 4 categorias contábeis problemáticas específicas"""
    try:
        from app.models.transacoes import TransacaoFinanceira
        
        # Nomes exatos das categorias a serem deletadas
        categorias_nomes = [
            "GASTOS DE ADMINISTRAÇÃO",
            "GASTOS DE COMERCIALIZAÇÃO", 
            "RECEITAS DE VENDAS",
            "RECEITAS FINANCEIRAS"
        ]
        
        deleted_categorias = 0
        deleted_subcategorias = 0
        transacoes_limpas = 0
        
        print(f"🗑️ Iniciando exclusão FORÇADA das categorias problemáticas: {categorias_nomes}")
        
        # ETAPA 1: Buscar TODAS as categorias com esses nomes (independente de pai_id)
        categorias_encontradas = db.query(CategoriaContabil).filter(
            CategoriaContabil.nome.in_(categorias_nomes),
            CategoriaContabil.empresa_id == current_user.empresa_id
        ).all()
        
        print(f"🔍 Encontradas {len(categorias_encontradas)} categorias para deletar")
        
        if not categorias_encontradas:
            return {
                "message": "Nenhuma categoria encontrada com esses nomes",
                "deleted_categorias": 0,
                "deleted_subcategorias": 0
            }
        
        # ETAPA 2: Para cada categoria encontrada, buscar suas subcategorias filhas recursivamente
        todas_subcategorias_ids = set()
        
        def buscar_subcategorias_recursivo(categoria_id):
            subcategorias = db.query(CategoriaContabil).filter(
                CategoriaContabil.pai_id == categoria_id,
                CategoriaContabil.empresa_id == current_user.empresa_id
            ).all()
            
            for sub in subcategorias:
                todas_subcategorias_ids.add(sub.id)
                print(f"🔍 Subcategoria encontrada: {sub.nome} (ID: {sub.id})")
                # Buscar subcategorias desta subcategoria (recursivo)
                buscar_subcategorias_recursivo(sub.id)
        
        for categoria in categorias_encontradas:
            print(f"🔍 Categoria principal: {categoria.nome} (ID: {categoria.id}, pai_id: {categoria.pai_id})")
            buscar_subcategorias_recursivo(categoria.id)
        
        # ETAPA 3: Limpar TODAS as referências em transações
        
        # Limpar referências para categorias principais
        for categoria in categorias_encontradas:
            # Limpar categoria_contabil_id
            result1 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.categoria_contabil_id == categoria.id,
                TransacaoFinanceira.empresa_id == current_user.empresa_id
            ).update({TransacaoFinanceira.categoria_contabil_id: None})
            
            # Limpar subcategoria_contabil_id (caso a categoria seja usada como subcategoria)
            result2 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.subcategoria_contabil_id == categoria.id,
                TransacaoFinanceira.empresa_id == current_user.empresa_id
            ).update({TransacaoFinanceira.subcategoria_contabil_id: None})
            
            transacoes_limpas += result1 + result2
            print(f"🔧 Limpas {result1 + result2} referências para categoria {categoria.nome}")
        
        # Limpar referências para todas as subcategorias
        for subcategoria_id in todas_subcategorias_ids:
            result3 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.categoria_contabil_id == subcategoria_id,
                TransacaoFinanceira.empresa_id == current_user.empresa_id
            ).update({TransacaoFinanceira.categoria_contabil_id: None})
            
            result4 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.subcategoria_contabil_id == subcategoria_id,
                TransacaoFinanceira.empresa_id == current_user.empresa_id
            ).update({TransacaoFinanceira.subcategoria_contabil_id: None})
            
            transacoes_limpas += result3 + result4
        
        if transacoes_limpas > 0:
            print(f"🔧 Total de {transacoes_limpas} referências em transações removidas")
            db.flush()
        
        # ETAPA 4: Deletar subcategorias primeiro (ordem hierárquica)
        for subcategoria_id in todas_subcategorias_ids:
            subcategoria = db.query(CategoriaContabil).filter(
                CategoriaContabil.id == subcategoria_id
            ).first()
            
            if subcategoria:
                print(f"🗑️ Deletando subcategoria: {subcategoria.nome}")
                db.delete(subcategoria)
                deleted_subcategorias += 1
        
        # ETAPA 5: Deletar categorias principais
        for categoria in categorias_encontradas:
            print(f"🗑️ Deletando categoria: {categoria.nome}")
            db.delete(categoria)
            deleted_categorias += 1
        
        # Commit final
        if deleted_categorias > 0 or deleted_subcategorias > 0:
            db.commit()
            print(f"✅ Exclusão concluída: {deleted_categorias} categorias e {deleted_subcategorias} subcategorias")
            
            return {
                "message": f"Exclusão FORÇADA concluída com sucesso!",
                "deleted_categorias": deleted_categorias,
                "deleted_subcategorias": deleted_subcategorias,
                "transacoes_limpas": transacoes_limpas,
                "categorias_deletadas": [cat.nome for cat in categorias_encontradas]
            }
        else:
            return {
                "message": "Nenhuma categoria encontrada para exclusão",
                "deleted_categorias": 0,
                "deleted_subcategorias": 0
            }

    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao deletar categorias problemáticas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao deletar categorias: {str(e)}")

@router.delete("/admin/categorias-contabeis/delete-problematicas")
async def admin_delete_categorias_problematicas(
    db: Session = Depends(get_db),
    admin_key: str = Query(..., description="Chave de administrador")
):
    """ENDPOINT ADMINISTRATIVO: Deletar as 4 categorias contábeis problemáticas sem autenticação"""
    try:
        # Validação de chave administrativa
        import os
        expected_admin_key = os.getenv("ADMIN_KEY", "admin123")
        if admin_key != expected_admin_key:
            raise HTTPException(status_code=403, detail="Chave de administrador inválida")

        from app.models.transacoes import TransacaoFinanceira
        
        # Nomes exatos das categorias a serem deletadas
        categorias_nomes = [
            "GASTOS DE ADMINISTRAÇÃO",
            "GASTOS DE COMERCIALIZAÇÃO", 
            "RECEITAS DE VENDAS",
            "RECEITAS FINANCEIRAS"
        ]
        
        deleted_categorias = 0
        deleted_subcategorias = 0
        transacoes_limpas = 0
        
        print(f"🗑️ [ADMIN] Iniciando exclusão FORÇADA das categorias problemáticas: {categorias_nomes}")
        
        # ETAPA 1: Buscar TODAS as categorias com esses nomes de TODAS as empresas
        categorias_encontradas = db.query(CategoriaContabil).filter(
            CategoriaContabil.nome.in_(categorias_nomes)
        ).all()
        
        print(f"🔍 [ADMIN] Encontradas {len(categorias_encontradas)} categorias para deletar")
        
        if not categorias_encontradas:
            return {
                "message": "Nenhuma categoria encontrada com esses nomes",
                "deleted_categorias": 0,
                "deleted_subcategorias": 0
            }
        
        # ETAPA 2: Para cada categoria encontrada, buscar suas subcategorias filhas recursivamente
        todas_subcategorias_ids = set()
        
        def buscar_subcategorias_recursivo(categoria_id, empresa_id):
            subcategorias = db.query(CategoriaContabil).filter(
                CategoriaContabil.pai_id == categoria_id,
                CategoriaContabil.empresa_id == empresa_id
            ).all()
            
            for sub in subcategorias:
                todas_subcategorias_ids.add(sub.id)
                print(f"🔍 [ADMIN] Subcategoria encontrada: {sub.nome} (ID: {sub.id})")
                # Buscar subcategorias desta subcategoria (recursivo)
                buscar_subcategorias_recursivo(sub.id, empresa_id)
        
        for categoria in categorias_encontradas:
            print(f"🔍 [ADMIN] Categoria principal: {categoria.nome} (ID: {categoria.id}, empresa: {categoria.empresa_id})")
            buscar_subcategorias_recursivo(categoria.id, categoria.empresa_id)
        
        # ETAPA 3: Limpar TODAS as referências em transações de TODAS as empresas
        
        # Limpar referências para categorias principais
        for categoria in categorias_encontradas:
            # Limpar categoria_contabil_id
            result1 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.categoria_contabil_id == categoria.id,
                TransacaoFinanceira.empresa_id == categoria.empresa_id
            ).update({TransacaoFinanceira.categoria_contabil_id: None})
            
            # Limpar subcategoria_contabil_id (caso a categoria seja usada como subcategoria)
            result2 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.subcategoria_contabil_id == categoria.id,
                TransacaoFinanceira.empresa_id == categoria.empresa_id
            ).update({TransacaoFinanceira.subcategoria_contabil_id: None})
            
            transacoes_limpas += result1 + result2
            print(f"🔧 [ADMIN] Limpas {result1 + result2} referências para categoria {categoria.nome}")
        
        # Limpar referências para todas as subcategorias
        for subcategoria_id in todas_subcategorias_ids:
            # Buscar a subcategoria para obter empresa_id
            subcategoria = db.query(CategoriaContabil).filter(
                CategoriaContabil.id == subcategoria_id
            ).first()
            
            if subcategoria:
                result3 = db.query(TransacaoFinanceira).filter(
                    TransacaoFinanceira.categoria_contabil_id == subcategoria_id,
                    TransacaoFinanceira.empresa_id == subcategoria.empresa_id
                ).update({TransacaoFinanceira.categoria_contabil_id: None})
                
                result4 = db.query(TransacaoFinanceira).filter(
                    TransacaoFinanceira.subcategoria_contabil_id == subcategoria_id,
                    TransacaoFinanceira.empresa_id == subcategoria.empresa_id
                ).update({TransacaoFinanceira.subcategoria_contabil_id: None})
                
                transacoes_limpas += result3 + result4
        
        if transacoes_limpas > 0:
            print(f"🔧 [ADMIN] Total de {transacoes_limpas} referências em transações removidas")
            db.flush()
        
        # ETAPA 4: Deletar subcategorias primeiro (ordem hierárquica)
        for subcategoria_id in todas_subcategorias_ids:
            subcategoria = db.query(CategoriaContabil).filter(
                CategoriaContabil.id == subcategoria_id
            ).first()
            
            if subcategoria:
                print(f"🗑️ [ADMIN] Deletando subcategoria: {subcategoria.nome}")
                db.delete(subcategoria)
                deleted_subcategorias += 1
        
        # ETAPA 5: Deletar categorias principais
        for categoria in categorias_encontradas:
            print(f"🗑️ [ADMIN] Deletando categoria: {categoria.nome}")
            db.delete(categoria)
            deleted_categorias += 1
        
        # Commit final
        if deleted_categorias > 0 or deleted_subcategorias > 0:
            db.commit()
            print(f"✅ [ADMIN] Exclusão concluída: {deleted_categorias} categorias e {deleted_subcategorias} subcategorias")
            
            return {
                "message": f"[ADMIN] Exclusão FORÇADA concluída com sucesso!",
                "deleted_categorias": deleted_categorias,
                "deleted_subcategorias": deleted_subcategorias,
                "transacoes_limpas": transacoes_limpas,
                "categorias_deletadas": [cat.nome for cat in categorias_encontradas]
            }
        else:
            return {
                "message": "[ADMIN] Nenhuma categoria encontrada para exclusão",
                "deleted_categorias": 0,
                "deleted_subcategorias": 0
            }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ [ADMIN] Erro ao deletar categorias problemáticas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao deletar categorias: {str(e)}")

@router.post("/subcategorias-gerenciais/criar-argentina")
async def criar_subcategoria_argentina(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Criar subcategoria Argentina na categoria Outra Categoria"""
    try:
        # Buscar categoria "Outra Categoria"
        categoria_outra = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.nome == "Outra Categoria",
            CategoriaGerencial.empresa_id == current_user.empresa_id,
            CategoriaGerencial.pai_id.is_(None)
        ).first()
        
        if not categoria_outra:
            raise HTTPException(status_code=404, detail="Categoria 'Outra Categoria' não encontrada")
        
        # Verificar se subcategoria Argentina já existe
        argentina_existente = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.nome == "Argentina",
            CategoriaGerencial.pai_id == categoria_outra.id,
            CategoriaGerencial.empresa_id == current_user.empresa_id
        ).first()
        
        if argentina_existente:
            return {
                "message": "Subcategoria Argentina já existe",
                "subcategoria": {
                    "id": argentina_existente.id,
                    "nome": argentina_existente.nome,
                    "codigo": argentina_existente.codigo,
                    "categoria_pai": categoria_outra.nome,
                    "ativo": argentina_existente.ativo
                }
            }
        
        # Gerar código automático
        codigo = generate_codigo_sequencial(db, "categorias_gerenciais", "SG", current_user.empresa_id)
        
        # Criar subcategoria Argentina
        nova_subcategoria = CategoriaGerencial(
            empresa_id=current_user.empresa_id,
            nome="Argentina",
            codigo=codigo,
            descricao="Subcategoria para operações na Argentina",
            pai_id=categoria_outra.id,
            ativo=True
        )
        
        db.add(nova_subcategoria)
        db.commit()
        db.refresh(nova_subcategoria)
        
        return {
            "message": "Subcategoria Argentina criada com sucesso!",
            "subcategoria": {
                "id": nova_subcategoria.id,
                "nome": nova_subcategoria.nome,
                "codigo": nova_subcategoria.codigo,
                "categoria_pai": categoria_outra.nome,
                "ativo": nova_subcategoria.ativo
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar subcategoria Argentina: {str(e)}")

@router.delete("/categorias-contabeis/delete-by-codes")
async def delete_categorias_by_codes(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletar categorias contábeis específicas por código (030, 001) e subcategorias específicas"""
    try:
        from app.models.transacoes import TransacaoFinanceira
        
        # Códigos das categorias principais a serem deletadas
        categorias_codes = ["030", "001"]
        
        # Códigos das subcategorias específicas a serem deletadas
        subcategorias_codes = ["54", "55", "56", "31", "32", "33", "34"]
        
        deleted_categorias = 0
        deleted_subcategorias = 0
        transacoes_limpas = 0
        
        print(f"🗑️ Iniciando exclusão de categorias contábeis por códigos: {categorias_codes}")
        print(f"🗑️ E subcategorias contábeis por códigos: {subcategorias_codes}")
        
        # ETAPA 1: Buscar todas as categorias principais pelos códigos
        categorias_principais = db.query(CategoriaContabil).filter(
            CategoriaContabil.codigo.in_(categorias_codes),
            CategoriaContabil.empresa_id == current_user.empresa_id,
            CategoriaContabil.pai_id.is_(None)  # Apenas categorias principais
        ).all()
        
        # ETAPA 2: Buscar subcategorias específicas pelos códigos
        subcategorias_especificas = db.query(CategoriaContabil).filter(
            CategoriaContabil.codigo.in_(subcategorias_codes),
            CategoriaContabil.empresa_id == current_user.empresa_id,
            CategoriaContabil.pai_id.isnot(None)  # Apenas subcategorias
        ).all()
        
        # ETAPA 3: Para cada categoria principal, buscar suas subcategorias filhas
        todas_subcategorias_ids = set()
        
        for categoria in categorias_principais:
            # Buscar subcategorias desta categoria
            subcategorias_filhas = db.query(CategoriaContabil).filter(
                CategoriaContabil.pai_id == categoria.id
            ).all()
            
            for sub in subcategorias_filhas:
                todas_subcategorias_ids.add(sub.id)
                print(f"🔍 Subcategoria da categoria {categoria.codigo}: {sub.nome} (código: {sub.codigo})")
        
        # Adicionar subcategorias específicas
        for sub in subcategorias_especificas:
            todas_subcategorias_ids.add(sub.id)
            print(f"🔍 Subcategoria específica: {sub.nome} (código: {sub.codigo})")
        
        # ETAPA 4: Limpar referências em transações
        
        # Limpar referências para categorias principais
        for categoria in categorias_principais:
            result1 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.categoria_contabil_id == categoria.id,
                TransacaoFinanceira.empresa_id == current_user.empresa_id
            ).update({TransacaoFinanceira.categoria_contabil_id: None})
            
            transacoes_limpas += result1
            print(f"🔧 Limpas {result1} referências de categoria_contabil_id para categoria {categoria.codigo}")
        
        # Limpar referências para todas as subcategorias
        for subcategoria_id in todas_subcategorias_ids:
            result2 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.subcategoria_contabil_id == subcategoria_id,
                TransacaoFinanceira.empresa_id == current_user.empresa_id
            ).update({TransacaoFinanceira.subcategoria_contabil_id: None})
            
            transacoes_limpas += result2
        
        if transacoes_limpas > 0:
            print(f"🔧 Total de {transacoes_limpas} referências em transações removidas")
            db.flush()
        
        # ETAPA 5: Deletar subcategorias primeiro (ordem hierárquica)
        for subcategoria_id in todas_subcategorias_ids:
            subcategoria = db.query(CategoriaContabil).filter(
                CategoriaContabil.id == subcategoria_id
            ).first()
            
            if subcategoria:
                print(f"🗑️ Deletando subcategoria: {subcategoria.nome} (código: {subcategoria.codigo})")
                db.delete(subcategoria)
                deleted_subcategorias += 1
        
        # ETAPA 6: Deletar categorias principais
        for categoria in categorias_principais:
            print(f"🗑️ Deletando categoria principal: {categoria.nome} (código: {categoria.codigo})")
            db.delete(categoria)
            deleted_categorias += 1
        
        # Commit final
        if deleted_categorias > 0 or deleted_subcategorias > 0:
            db.commit()
            print(f"✅ Exclusão concluída: {deleted_categorias} categorias e {deleted_subcategorias} subcategorias")
            
            return {
                "message": f"Exclusão concluída com sucesso!",
                "deleted_categorias": deleted_categorias,
                "deleted_subcategorias": deleted_subcategorias,
                "transacoes_limpas": transacoes_limpas,
                "categorias_codes": categorias_codes,
                "subcategorias_codes": subcategorias_codes
            }
        else:
            return {
                "message": "Nenhuma categoria ou subcategoria encontrada para exclusão",
                "deleted_categorias": 0,
                "deleted_subcategorias": 0
            }

    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao deletar categorias por códigos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao deletar categorias: {str(e)}")

@router.delete("/subcategorias/delete-a-categorizar")
async def delete_subcategoria_a_categorizar(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletar subcategoria 'A Categorizar' (contábil e gerencial) - TODAS as empresas"""
    try:
        from app.models.transacoes import TransacaoFinanceira
        
        deleted_count = 0
        transacoes_limpas = 0
        
        print(f"🗑️ Iniciando exclusão da subcategoria 'A Categorizar' de TODAS as empresas")
        
        # ETAPA 1: Buscar TODAS as subcategorias contábeis "A Categorizar" (todas as empresas)
        subcategorias_contabeis = db.query(CategoriaContabil).filter(
            CategoriaContabil.nome == "A Categorizar",
            CategoriaContabil.pai_id.isnot(None)
        ).all()
        
        for subcategoria_contabil in subcategorias_contabeis:
            print(f"🔍 Encontrada subcategoria contábil: {subcategoria_contabil.nome} (ID: {subcategoria_contabil.id}, Empresa: {subcategoria_contabil.empresa_id})")
            
            # Limpar TODAS as referências em transações (independente de empresa)
            result1 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.subcategoria_contabil_id == subcategoria_contabil.id
            ).update({TransacaoFinanceira.subcategoria_contabil_id: None}, synchronize_session=False)
            
            result2 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.categoria_contabil_id == subcategoria_contabil.id
            ).update({TransacaoFinanceira.categoria_contabil_id: None}, synchronize_session=False)
            
            transacoes_limpas += result1 + result2
            print(f"🔧 Limpas {result1 + result2} referências de subcategoria contábil")
            
            # Flush para garantir que as atualizações sejam aplicadas
            db.flush()
            
            # Deletar subcategoria
            db.delete(subcategoria_contabil)
            deleted_count += 1
            print(f"🗑️ Subcategoria contábil 'A Categorizar' deletada")
        
        # ETAPA 2: Buscar TODAS as subcategorias gerenciais "A Categorizar" (todas as empresas)
        subcategorias_gerenciais = db.query(CategoriaGerencial).filter(
            CategoriaGerencial.nome == "A Categorizar",
            CategoriaGerencial.pai_id.isnot(None)
        ).all()
        
        for subcategoria_gerencial in subcategorias_gerenciais:
            print(f"🔍 Encontrada subcategoria gerencial: {subcategoria_gerencial.nome} (ID: {subcategoria_gerencial.id}, Empresa: {subcategoria_gerencial.empresa_id})")
            
            # Limpar TODAS as referências em transações (independente de empresa)
            result3 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.subcategoria_gerencial_id == subcategoria_gerencial.id
            ).update({TransacaoFinanceira.subcategoria_gerencial_id: None}, synchronize_session=False)
            
            result4 = db.query(TransacaoFinanceira).filter(
                TransacaoFinanceira.categoria_gerencial_id == subcategoria_gerencial.id
            ).update({TransacaoFinanceira.categoria_gerencial_id: None}, synchronize_session=False)
            
            transacoes_limpas += result3 + result4
            print(f"🔧 Limpas {result3 + result4} referências de subcategoria gerencial")
            
            # Flush para garantir que as atualizações sejam aplicadas
            db.flush()
            
            # Deletar subcategoria
            db.delete(subcategoria_gerencial)
            deleted_count += 1
            print(f"🗑️ Subcategoria gerencial 'A Categorizar' deletada")
        
        if deleted_count > 0:
            db.commit()
            print(f"✅ Exclusão concluída: {deleted_count} subcategoria(s) deletada(s)")
            
            return {
                "message": f"Subcategoria 'A Categorizar' excluída com sucesso!",
                "deleted_count": deleted_count,
                "transacoes_limpas": transacoes_limpas
            }
        else:
            return {
                "message": "Nenhuma subcategoria 'A Categorizar' encontrada",
                "deleted_count": 0,
                "transacoes_limpas": 0
            }

    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao deletar subcategoria 'A Categorizar': {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao deletar subcategoria: {str(e)}")