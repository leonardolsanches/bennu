"""
Rotas para planejamento orçamentário
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from app.database import get_db
from app.auth.oauth import get_current_user
from app.models.planejamento import LinhaOrcamentaria, PlanejamentoVersao, CategoriaLinhaEnum, StatusPlanejamentoEnum, TipoVersaoEnum
from app.models.empresas import Empresa
from app.models.clientes import Cliente
from app.models.fornecedores import Fornecedor
from app.models.categorias import CategoriaGerencial, CategoriaContabil, Projeto
from app.models.auxiliares import ProdutoServico
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from decimal import Decimal

router = APIRouter()


class LinhaOrcamentariaCreate(BaseModel):
    empresa_id: Optional[int] = None  # Opcional para despesas
    ano: int
    categoria: str  # 'receita' ou 'despesa'
    descricao: str
    versao_id: Optional[int] = None  # Versão de planejamento selecionada pelo usuário

    # Valores mensais: dict com chaves 1-12 (mês) e valores (montante)
    valores_mensais: dict[int, float]

    # Classificações (mesmos campos de transações)
    # NOTA: fornecedor_id removido - fornecedores só em lançamentos efetivos
    cliente_id: Optional[int] = None
    projeto_id: Optional[int] = None
    produto_servico_id: Optional[int] = None
    centro_custo_id: Optional[int] = None
    categoria_contabil_id: Optional[int] = None
    categoria_gerencial_id: Optional[int] = None
    subcategoria_contabil_id: Optional[int] = None
    subcategoria_gerencial_id: Optional[int] = None

    # Competências
    competencia_contabil_mes: Optional[int] = None
    competencia_contabil_ano: Optional[int] = None
    competencia_gerencial_mes: Optional[int] = None
    competencia_gerencial_ano: Optional[int] = None


class LinhaOrcamentariaUpdate(BaseModel):
    descricao: Optional[str] = None
    valor_previsto: Optional[float] = None
    cliente_id: Optional[int] = None
    projeto_id: Optional[int] = None
    produto_servico_id: Optional[int] = None
    centro_custo_id: Optional[int] = None
    categoria_contabil_id: Optional[int] = None
    categoria_gerencial_id: Optional[int] = None
    subcategoria_contabil_id: Optional[int] = None
    subcategoria_gerencial_id: Optional[int] = None


@router.get("/planejamento/linhas")
async def listar_linhas_orcamentarias(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    ano: Optional[int] = Query(None),
    empresa_id: Optional[int] = Query(None),
    categoria: Optional[str] = Query(None),
    versao_id: Optional[int] = Query(None)
):
    """
    Lista linhas orçamentárias com filtros opcionais, incluindo nomes de cliente e projeto via JOIN
    """
    try:
        # Query base com JOINs para pegar nomes em uma única consulta
        query = db.query(
            LinhaOrcamentaria,
            Cliente.nome.label('cliente_nome'),
            Projeto.nome.label('projeto_nome')
        ).outerjoin(
            Cliente, LinhaOrcamentaria.cliente_id == Cliente.id
        ).outerjoin(
            Projeto, LinhaOrcamentaria.projeto_id == Projeto.id
        )
        
        if versao_id:
            # Filtrar por versão específica
            query = query.filter(LinhaOrcamentaria.versao_id == versao_id)
        else:
            # Versão ativa (comportamento padrão)
            query = query.join(
                PlanejamentoVersao,
                LinhaOrcamentaria.versao_id == PlanejamentoVersao.id
            ).filter(
                PlanejamentoVersao.is_ativo == True
            )

        # Aplicar filtros
        if ano:
            query = query.filter(LinhaOrcamentaria.ano == ano)
        if empresa_id:
            query = query.filter(LinhaOrcamentaria.empresa_id == empresa_id)
        if categoria:
            query = query.filter(LinhaOrcamentaria.categoria == categoria)

        resultados = query.order_by(
            LinhaOrcamentaria.ano,
            LinhaOrcamentaria.mes,
            LinhaOrcamentaria.categoria
        ).all()

        # Serializar resultados incluindo nome da versão
        linhas = []
        for linha, cliente_nome, projeto_nome in resultados:
            # Buscar nome da versão
            versao_nome = None
            if linha.versao_id:
                versao = db.query(PlanejamentoVersao).filter(
                    PlanejamentoVersao.id == linha.versao_id
                ).first()
                if versao:
                    versao_nome = versao.nome
            
            linhas.append({
                "id": linha.id,
                "empresa_id": linha.empresa_id,
                "versao_id": linha.versao_id,
                "versao_nome": versao_nome,
                "versao_publicacao_id": linha.versao_publicacao_id,
                "ano": linha.ano,
                "mes": linha.mes,
                "categoria": linha.categoria,
                "descricao": linha.descricao,
                "valor_previsto": float(linha.valor_previsto),
                "cliente_id": linha.cliente_id,
                "cliente_nome": cliente_nome,
                "projeto_id": linha.projeto_id,
                "projeto_nome": projeto_nome,
                "produto_servico_id": linha.produto_servico_id,
                "categoria_contabil_id": linha.categoria_contabil_id,
                "categoria_gerencial_id": linha.categoria_gerencial_id,
                "subcategoria_contabil_id": linha.subcategoria_contabil_id,
                "subcategoria_gerencial_id": linha.subcategoria_gerencial_id,
                "created_at": linha.created_at.isoformat() if linha.created_at else None
            })

        return {"linhas": linhas, "total": len(linhas)}

    except Exception as e:
        print(f"❌ Erro ao listar linhas orçamentárias: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/planejamento/linhas")
async def criar_linha_orcamentaria(
    dados: LinhaOrcamentariaCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cria linhas orçamentárias com valores mensais personalizados
    """
    try:
        # Validar valores_mensais
        if not dados.valores_mensais:
            raise HTTPException(status_code=400, detail="valores_mensais é obrigatório")

        # Validar que pelo menos um mês tem valor > 0
        valores_validos = {mes: valor for mes, valor in dados.valores_mensais.items() if valor > 0}
        if not valores_validos:
            raise HTTPException(status_code=400, detail="Pelo menos um mês deve ter valor maior que zero")

        # Usar versão explicitamente selecionada, ou buscar a ativa como fallback
        versao = None
        if dados.versao_id:
            versao = db.query(PlanejamentoVersao).filter(
                PlanejamentoVersao.id == dados.versao_id
            ).first()
            if not versao:
                raise HTTPException(
                    status_code=404,
                    detail=f"Versão de planejamento #{dados.versao_id} não encontrada."
                )

        if not versao:
            versao = db.query(PlanejamentoVersao).filter(
                PlanejamentoVersao.empresa_id == dados.empresa_id,
                PlanejamentoVersao.ano_referencia == dados.ano,
                PlanejamentoVersao.is_ativo == True
            ).first()

        if not versao:
            # Criar nova versão somente se nenhuma versão foi encontrada
            versao = PlanejamentoVersao(
                empresa_id=dados.empresa_id,
                nome=f"Orçamento {dados.ano}",
                ano_referencia=dados.ano,
                tipo=TipoVersaoEnum.baseline,
                status=StatusPlanejamentoEnum.rascunho,
                is_ativo=False,
                created_at=datetime.utcnow()
            )
            db.add(versao)
            db.flush()

        # Criar linha para cada mês com valor > 0
        linhas_criadas = []
        for mes, valor in valores_validos.items():
            # Validar mês (1-12)
            if not (1 <= mes <= 12):
                continue

            linha = LinhaOrcamentaria(
                empresa_id=dados.empresa_id,
                versao_id=versao.id,
                versao_publicacao_id=versao.id,  # Carimbo: marca em qual versão foi criada
                ano=dados.ano,
                mes=mes,
                categoria=dados.categoria,
                descricao=dados.descricao,
                valor_previsto=Decimal(str(valor)),
                cliente_id=dados.cliente_id,
                projeto_id=dados.projeto_id,
                produto_servico_id=dados.produto_servico_id,
                centro_custo_id=dados.centro_custo_id,
                categoria_contabil_id=dados.categoria_contabil_id,
                categoria_gerencial_id=dados.categoria_gerencial_id,
                subcategoria_contabil_id=dados.subcategoria_contabil_id,
                subcategoria_gerencial_id=dados.subcategoria_gerencial_id,
                created_at=datetime.utcnow()
            )
            db.add(linha)
            linhas_criadas.append({
                "mes": mes,
                "valor": float(valor)
            })

        db.commit()

        return {
            "success": True,
            "message": f"{len(linhas_criadas)} linhas orçamentárias criadas",
            "linhas": linhas_criadas,
            "linhas_criadas": len(linhas_criadas),
            "versao_id": versao.id
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao criar linhas orçamentárias: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/planejamento/linhas/{linha_id}")
async def atualizar_linha_orcamentaria(
    linha_id: int,
    dados: LinhaOrcamentariaUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Atualiza uma linha orçamentária específica
    """
    try:
        linha = db.query(LinhaOrcamentaria).filter(
            LinhaOrcamentaria.id == linha_id
        ).first()

        if not linha:
            raise HTTPException(status_code=404, detail="Linha orçamentária não encontrada")

        # Atualizar campos fornecidos
        update_data = dados.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == 'valor_previsto' and value is not None:
                setattr(linha, field, Decimal(str(value)))
            else:
                setattr(linha, field, value)

        db.commit()
        db.refresh(linha)

        return {
            "success": True,
            "message": "Linha orçamentária atualizada",
            "linha": {
                "id": linha.id,
                "descricao": linha.descricao,
                "valor_previsto": float(linha.valor_previsto)
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao atualizar linha orçamentária: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/planejamento/linhas/{linha_id}")
async def deletar_linha_orcamentaria(
    linha_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deleta uma linha orçamentária
    """
    try:
        linha = db.query(LinhaOrcamentaria).filter(
            LinhaOrcamentaria.id == linha_id
        ).first()

        if not linha:
            raise HTTPException(status_code=404, detail="Linha orçamentária não encontrada")

        db.delete(linha)
        db.commit()

        return {
            "success": True,
            "message": "Linha orçamentária deletada"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao deletar linha orçamentária: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/planejamento/linhas/{linha_id}")
async def get_linha_by_id(
    linha_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Buscar uma linha orçamentária específica por ID
    """
    try:
        linha = db.query(LinhaOrcamentaria).filter(
            LinhaOrcamentaria.id == linha_id
        ).first()

        if not linha:
            raise HTTPException(status_code=404, detail="Linha orçamentária não encontrada")

        # Buscar nomes relacionados
        cliente_nome = None
        fornecedor_nome = None
        projeto_nome = None
        produto_servico_nome = None
        categoria_gerencial_nome = None
        categoria_contabil_nome = None

        if linha.cliente_id:
            cliente = db.query(Cliente).filter(Cliente.id == linha.cliente_id).first()
            if cliente:
                cliente_nome = cliente.nome

        # fornecedor_id removido - planejamento não tem fornecedores
        # (fornecedores só existem em lançamentos efetivos)

        if linha.projeto_id:
            projeto = db.query(Projeto).filter(Projeto.id == linha.projeto_id).first()
            if projeto:
                projeto_nome = projeto.nome

        if linha.produto_servico_id:
            produto = db.query(ProdutoServico).filter(ProdutoServico.id == linha.produto_servico_id).first()
            if produto:
                produto_servico_nome = produto.nome

        if linha.categoria_gerencial_id:
            cat = db.query(CategoriaGerencial).filter(CategoriaGerencial.id == linha.categoria_gerencial_id).first()
            if cat:
                categoria_gerencial_nome = cat.nome

        if linha.categoria_contabil_id:
            cat = db.query(CategoriaContabil).filter(CategoriaContabil.id == linha.categoria_contabil_id).first()
            if cat:
                categoria_contabil_nome = cat.nome

        return {
            "id": linha.id,
            "empresa_id": linha.empresa_id,
            "versao_id": linha.versao_id,
            "versao_publicacao_id": linha.versao_publicacao_id,
            "ano": linha.ano,
            "mes": linha.mes,
            "categoria": linha.categoria,
            "descricao": linha.descricao,
            "valor_previsto": float(linha.valor_previsto) if linha.valor_previsto else 0.0,
            "cliente_id": linha.cliente_id,
            "cliente_nome": cliente_nome,
            "projeto_id": linha.projeto_id,
            "projeto_nome": projeto_nome,
            "produto_servico_id": linha.produto_servico_id,
            "produto_servico_nome": produto_servico_nome,
            "categoria_gerencial_id": linha.categoria_gerencial_id,
            "categoria_gerencial_nome": categoria_gerencial_nome,
            "categoria_contabil_id": linha.categoria_contabil_id,
            "categoria_contabil_nome": categoria_contabil_nome,
            "subcategoria_gerencial_id": linha.subcategoria_gerencial_id,
            "subcategoria_contabil_id": linha.subcategoria_contabil_id,
            "centro_custo_id": linha.centro_custo_id,
            "conta_contabil_id": linha.conta_contabil_id
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao buscar linha orçamentária: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@router.get("/linhas")
async def get_linhas(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    ano: Optional[int] = Query(None)
):
    """
    Endpoint original, mantido por compatibilidade, mas agora duplicado na rota /planejamento/linhas
    """
    # Este endpoint é um duplicado do /planejamento/linhas. Para evitar confusão,
    # vamos redirecioná-lo para o endpoint mais específico, se possível, ou manter
    # o comportamento original se necessário.
    # Por enquanto, vamos apenas listar as linhas orçamentárias como antes.
    # Considerar refatorar ou remover este endpoint em futuras versões se não for mais necessário.
    return await listar_linhas_orcamentarias(current_user, db, ano)


@router.get("/planejamento/versoes")
async def listar_versoes(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    empresa_id: Optional[int] = Query(None),
    ano: Optional[int] = Query(None)
):
    """
    Lista versões de planejamento
    """
    try:
        query = db.query(PlanejamentoVersao)

        if empresa_id:
            query = query.filter(PlanejamentoVersao.empresa_id == empresa_id)
        if ano:
            query = query.filter(PlanejamentoVersao.ano_referencia == ano)

        versoes = query.order_by(
            PlanejamentoVersao.ano_referencia.desc(),
            PlanejamentoVersao.created_at.desc()
        ).all()

        resultado = []
        for versao in versoes:
            resultado.append({
                "id": versao.id,
                "empresa_id": versao.empresa_id,
                "nome": versao.nome,
                "ano_referencia": versao.ano_referencia,
                "tipo": versao.tipo,
                "indice_revisao": versao.indice_revisao,
                "status": versao.status,
                "is_ativo": versao.is_ativo,
                "data_publicacao": versao.data_publicacao.isoformat() if versao.data_publicacao else None,
                "publicado_por": versao.publicado_por,
                "created_at": versao.created_at.isoformat() if versao.created_at else None
            })

        return {"versoes": resultado, "total": len(resultado)}

    except Exception as e:
        print(f"❌ Erro ao listar versões: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/planejamento/versoes")
async def criar_versao(
    request: Request,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cria uma nova versão de planejamento
    """
    try:
        data = await request.json()
        nome = data.get('nome')
        ano = data.get('ano') or data.get('ano_referencia')
        tipo = data.get('tipo', 'baseline')
        status = data.get('status', 'rascunho')
        
        if not nome or not ano:
            raise HTTPException(status_code=400, detail="Nome e ano são obrigatórios")

        # Verificar nome duplicado no mesmo ano
        nome_existente = db.query(PlanejamentoVersao).filter(
            PlanejamentoVersao.ano_referencia == ano,
            PlanejamentoVersao.nome == nome
        ).first()
        if nome_existente:
            raise HTTPException(
                status_code=409,
                detail=f"Já existe uma versão chamada '{nome}' para o ano {ano}. Escolha um nome diferente."
            )

        # Criar nova versão
        nova_versao = PlanejamentoVersao(
            nome=nome,
            ano_referencia=ano,
            tipo=tipo,
            status=status,
            indice_revisao=0,
            is_ativo=False
        )
        
        db.add(nova_versao)
        db.commit()
        db.refresh(nova_versao)
        
        return {
            "success": True,
            "message": f"Versão '{nome}' criada com sucesso",
            "versao": {
                "id": nova_versao.id,
                "nome": nova_versao.nome,
                "ano": nova_versao.ano_referencia,
                "tipo": nova_versao.tipo,
                "status": nova_versao.status
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao criar versão: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/planejamento/linhas/por-versao/{versao_id}")
async def listar_linhas_por_versao(
    versao_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    por_publicacao: bool = Query(False)  # Se True, filtra por versao_publicacao_id; se False, por versao_id
):
    """
    Lista linhas orçamentárias filtradas por versão

    por_publicacao=False: mostra linhas que PERTENCEM à versão (versao_id)
    por_publicacao=True: mostra linhas CRIADAS/PUBLICADAS na versão (versao_publicacao_id)
    """
    try:
        if por_publicacao:
            linhas = db.query(LinhaOrcamentaria).filter(
                LinhaOrcamentaria.versao_publicacao_id == versao_id
            ).all()
        else:
            linhas = db.query(LinhaOrcamentaria).filter(
                LinhaOrcamentaria.versao_id == versao_id
            ).all()

        resultado = []
        for linha in linhas:
            resultado.append({
                "id": linha.id,
                "empresa_id": linha.empresa_id,
                "versao_id": linha.versao_id,
                "versao_publicacao_id": linha.versao_publicacao_id,
                "ano": linha.ano,
                "mes": linha.mes,
                "categoria": linha.categoria,
                "descricao": linha.descricao,
                "valor_previsto": float(linha.valor_previsto) if linha.valor_previsto else 0,
                "cliente_id": linha.cliente_id,
                "projeto_id": linha.projeto_id,
                "produto_servico_id": linha.produto_servico_id,
                "centro_custo_id": linha.centro_custo_id,
                "categoria_contabil_id": linha.categoria_contabil_id,
                "categoria_gerencial_id": linha.categoria_gerencial_id,
                "subcategoria_contabil_id": linha.subcategoria_contabil_id,
                "subcategoria_gerencial_id": linha.subcategoria_gerencial_id
            })

        return {
            "success": True,
            "linhas": resultado,
            "total": len(resultado),
            "filtro_aplicado": "versao_publicacao_id" if por_publicacao else "versao_id"
        }

    except Exception as e:
        print(f"❌ Erro ao listar linhas por versão: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/planejamento/versoes/{versao_id}/publicar")
async def publicar_versao(
    versao_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Publica uma versão de planejamento (rascunho -> baseline)
    """
    try:
        versao = db.query(PlanejamentoVersao).filter(
            PlanejamentoVersao.id == versao_id
        ).first()

        if not versao:
            raise HTTPException(status_code=404, detail="Versão não encontrada")

        if versao.status == StatusPlanejamentoEnum.publicado:
            raise HTTPException(status_code=400, detail="Versão já está publicada")

        # Verificar se já existe baseline para empresa/ano (se empresa_id não for None)
        if versao.empresa_id:
            baseline_existente = db.query(PlanejamentoVersao).filter(
                PlanejamentoVersao.empresa_id == versao.empresa_id,
                PlanejamentoVersao.ano_referencia == versao.ano_referencia,
                PlanejamentoVersao.tipo == TipoVersaoEnum.baseline,
                PlanejamentoVersao.status == StatusPlanejamentoEnum.publicado,
                PlanejamentoVersao.id != versao.id
            ).first()

            if baseline_existente:
                # Desativar baseline anterior
                baseline_existente.is_ativo = False
                print(f"⚠️  Baseline anterior desativado: {baseline_existente.nome}")

        # Publicar como baseline
        versao.status = StatusPlanejamentoEnum.publicado
        versao.tipo = TipoVersaoEnum.baseline
        versao.is_ativo = True  # Ativar ao publicar
        versao.data_publicacao = datetime.utcnow()
        versao.publicado_por = current_user.id if current_user else None

        db.commit()
        db.refresh(versao)

        return {
            "success": True,
            "message": "Versão publicada como baseline",
            "versao": {
                "id": versao.id,
                "nome": versao.nome,
                "tipo": versao.tipo,
                "status": versao.status,
                "data_publicacao": versao.data_publicacao.isoformat() if versao.data_publicacao else None
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao publicar versão: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/planejamento/versoes/{versao_id}")
async def deletar_versao(
    versao_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deleta uma versão de planejamento (não pode deletar versão ativa)
    """
    try:
        versao = db.query(PlanejamentoVersao).filter(
            PlanejamentoVersao.id == versao_id
        ).first()

        if not versao:
            raise HTTPException(status_code=404, detail="Versão não encontrada")

        if versao.is_ativo:
            raise HTTPException(status_code=400, detail="Não é possível deletar versão ativa")

        # Deletar todas as linhas orçamentárias desta versão primeiro
        db.query(LinhaOrcamentaria).filter(
            LinhaOrcamentaria.versao_id == versao_id
        ).delete()

        # Deletar a versão
        db.delete(versao)
        db.commit()

        return {
            "success": True,
            "message": f"Versão '{versao.nome}' deletada com sucesso"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao deletar versão: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/planejamento/versoes/{versao_id}")
async def renomear_versao(
    versao_id: int,
    request: Request,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Renomeia uma versão de planejamento
    """
    try:
        data = await request.json()
        novo_nome = data.get('nome')

        if not novo_nome:
            raise HTTPException(status_code=400, detail="Nome é obrigatório")

        versao = db.query(PlanejamentoVersao).filter(
            PlanejamentoVersao.id == versao_id
        ).first()

        if not versao:
            raise HTTPException(status_code=404, detail="Versão não encontrada")

        # Verificar nome duplicado no mesmo ano (excluindo a própria versão)
        nome_existente = db.query(PlanejamentoVersao).filter(
            PlanejamentoVersao.ano_referencia == versao.ano_referencia,
            PlanejamentoVersao.nome == novo_nome,
            PlanejamentoVersao.id != versao_id
        ).first()
        if nome_existente:
            raise HTTPException(
                status_code=409,
                detail=f"Já existe uma versão chamada '{novo_nome}' para o ano {versao.ano_referencia}. Escolha um nome diferente."
            )

        versao.nome = novo_nome
        db.commit()
        db.refresh(versao)

        return {
            "success": True,
            "message": f"Versão renomeada para '{novo_nome}'",
            "versao": {
                "id": versao.id,
                "nome": versao.nome,
                "ano_referencia": versao.ano_referencia,
                "tipo": versao.tipo,
                "status": versao.status
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao renomear versão: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/planejamento/versoes/{versao_id}/copiar")
async def copiar_versao(
    versao_id: int,
    request: Request,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Copia uma versão de planejamento e todos os seus itens
    """
    try:
        data = await request.json()
        novo_nome = data.get('nome')

        if not novo_nome:
            raise HTTPException(status_code=400, detail="Nome da nova versão é obrigatório")

        versao_origem = db.query(PlanejamentoVersao).filter(
            PlanejamentoVersao.id == versao_id
        ).first()

        if not versao_origem:
            raise HTTPException(status_code=404, detail="Versão não encontrada")

        # Verificar nome duplicado para a mesma empresa e ano
        nome_duplicado = db.query(PlanejamentoVersao).filter(
            PlanejamentoVersao.empresa_id == versao_origem.empresa_id,
            PlanejamentoVersao.ano_referencia == versao_origem.ano_referencia,
            PlanejamentoVersao.nome == novo_nome
        ).first()
        if nome_duplicado:
            raise HTTPException(
                status_code=409,
                detail=f"Já existe uma versão com o nome '{novo_nome}' para esta empresa e ano. Escolha um nome diferente."
            )

        # Criar nova versão como cópia mantendo o mesmo tipo da origem
        nova_versao = PlanejamentoVersao(
            empresa_id=versao_origem.empresa_id,
            nome=novo_nome,
            ano_referencia=versao_origem.ano_referencia,
            tipo=versao_origem.tipo,  # Mantém o tipo original (evita enum inválido no banco)
            status=StatusPlanejamentoEnum.rascunho,
            is_ativo=False,
            created_by=current_user.id if current_user else None
        )

        db.add(nova_versao)
        db.flush()  # Para obter o ID da nova versão

        # Copiar todas as linhas orçamentárias da versão origem
        linhas_origem = db.query(LinhaOrcamentaria).filter(
            LinhaOrcamentaria.versao_id == versao_id
        ).all()

        for linha in linhas_origem:
            nova_linha = LinhaOrcamentaria(
                versao_id=nova_versao.id,
                empresa_id=linha.empresa_id,
                ano=linha.ano,
                mes=linha.mes,
                categoria=linha.categoria,
                descricao=linha.descricao,
                valor_previsto=linha.valor_previsto,
                cliente_id=linha.cliente_id,
                projeto_id=linha.projeto_id,
                produto_servico_id=linha.produto_servico_id,
                centro_custo_id=linha.centro_custo_id,
                categoria_contabil_id=linha.categoria_contabil_id,
                categoria_gerencial_id=linha.categoria_gerencial_id,
                subcategoria_contabil_id=linha.subcategoria_contabil_id,
                subcategoria_gerencial_id=linha.subcategoria_gerencial_id,
                competencia_contabil_mes=linha.competencia_contabil_mes,
                competencia_contabil_ano=linha.competencia_contabil_ano,
                competencia_gerencial_mes=linha.competencia_gerencial_mes,
                competencia_gerencial_ano=linha.competencia_gerencial_ano,
                versao_publicacao_id=nova_versao.id
            )
            db.add(nova_linha)

        db.commit()
        db.refresh(nova_versao)

        # Contar itens copiados
        itens_copiados = len(linhas_origem)

        return {
            "success": True,
            "message": f"Versão '{versao_origem.nome}' copiada com {itens_copiados} itens",
            "versao": {
                "id": nova_versao.id,
                "nome": nova_versao.nome,
                "ano_referencia": nova_versao.ano_referencia,
                "tipo": nova_versao.tipo,
                "status": nova_versao.status,
                "itens_copiados": itens_copiados
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao copiar versão: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/planejamento/versoes/{versao_id}/itens")
async def listar_itens_versao(
    versao_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista todos os itens (linhas orçamentárias) de uma versão
    """
    try:
        versao = db.query(PlanejamentoVersao).filter(
            PlanejamentoVersao.id == versao_id
        ).first()

        if not versao:
            raise HTTPException(status_code=404, detail="Versão não encontrada")

        # Buscar linhas com JOINs para obter nomes relacionados
        linhas = db.query(
            LinhaOrcamentaria,
            Empresa.nome_fantasia.label('empresa_nome'),
            Cliente.nome.label('cliente_nome'),
            Projeto.nome.label('projeto_nome')
        ).outerjoin(
            Empresa, LinhaOrcamentaria.empresa_id == Empresa.id
        ).outerjoin(
            Cliente, LinhaOrcamentaria.cliente_id == Cliente.id
        ).outerjoin(
            Projeto, LinhaOrcamentaria.projeto_id == Projeto.id
        ).filter(
            LinhaOrcamentaria.versao_id == versao_id
        ).order_by(
            LinhaOrcamentaria.categoria,
            LinhaOrcamentaria.ano,
            LinhaOrcamentaria.mes
        ).all()

        itens = []
        for linha, empresa_nome, cliente_nome, projeto_nome in linhas:
            itens.append({
                "id": linha.id,
                "ano": linha.ano,
                "mes": linha.mes,
                "categoria": linha.categoria,
                "descricao": linha.descricao,
                "valor_previsto": float(linha.valor_previsto) if linha.valor_previsto else 0.0,
                "empresa_nome": empresa_nome,
                "cliente_nome": cliente_nome,
                "projeto_nome": projeto_nome
            })

        return {
            "success": True,
            "versao": {
                "id": versao.id,
                "nome": versao.nome,
                "ano_referencia": versao.ano_referencia,
                "status": versao.status
            },
            "itens": itens,
            "total_itens": len(itens)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao listar itens da versão: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/planejamento/versoes/{versao_id}/itens/{item_id}")
async def remover_item_versao(
    versao_id: int,
    item_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove um item específico de uma versão
    """
    try:
        # Verificar se a versão existe
        versao = db.query(PlanejamentoVersao).filter(
            PlanejamentoVersao.id == versao_id
        ).first()

        if not versao:
            raise HTTPException(status_code=404, detail="Versão não encontrada")

        # Buscar o item
        item = db.query(LinhaOrcamentaria).filter(
            LinhaOrcamentaria.id == item_id,
            LinhaOrcamentaria.versao_id == versao_id
        ).first()

        if not item:
            raise HTTPException(status_code=404, detail="Item não encontrado nesta versão")

        # Deletar o item
        db.delete(item)
        db.commit()

        return {
            "success": True,
            "message": f"Item '{item.descricao}' removido da versão"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao remover item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/planejamento/versoes/{versao_id}/completo")
async def deletar_versao_completo(
    versao_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deleta uma versão de planejamento E todos os seus itens (não pode deletar versão ativa)
    """
    try:
        versao = db.query(PlanejamentoVersao).filter(
            PlanejamentoVersao.id == versao_id
        ).first()

        if not versao:
            raise HTTPException(status_code=404, detail="Versão não encontrada")

        if versao.is_ativo:
            raise HTTPException(status_code=400, detail="Não é possível deletar versão ativa")

        # Contar itens antes de deletar
        total_itens = db.query(LinhaOrcamentaria).filter(
            LinhaOrcamentaria.versao_id == versao_id
        ).count()

        # Deletar todas as linhas orçamentárias desta versão primeiro
        db.query(LinhaOrcamentaria).filter(
            LinhaOrcamentaria.versao_id == versao_id
        ).delete()

        # Deletar a versão
        db.delete(versao)
        db.commit()

        return {
            "success": True,
            "message": f"Versão '{versao.nome}' e {total_itens} itens deletados com sucesso"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao deletar versão completa: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/planejamento/versoes/{versao_id}/toggle-ativo")
async def toggle_versao_ativa(
    versao_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ativa ou desativa uma versão manualmente.
    Se ativar, desativa outras versões do mesmo ano/empresa.
    """
    try:
        versao = db.query(PlanejamentoVersao).filter(
            PlanejamentoVersao.id == versao_id
        ).first()

        if not versao:
            raise HTTPException(status_code=404, detail="Versão não encontrada")

        # Se estiver ativando esta versão
        if not versao.is_ativo:
            # Desativar todas as outras versões do mesmo ano/empresa
            if versao.empresa_id:
                db.query(PlanejamentoVersao).filter(
                    PlanejamentoVersao.empresa_id == versao.empresa_id,
                    PlanejamentoVersao.ano_referencia == versao.ano_referencia,
                    PlanejamentoVersao.id != versao_id
                ).update({"is_ativo": False})
            else:
                # Se não tem empresa_id, desativar todas do mesmo ano
                db.query(PlanejamentoVersao).filter(
                    PlanejamentoVersao.ano_referencia == versao.ano_referencia,
                    PlanejamentoVersao.id != versao_id
                ).update({"is_ativo": False})
            
            versao.is_ativo = True
            mensagem = f"Versão '{versao.nome}' ativada com sucesso"
        else:
            # Desativando
            versao.is_ativo = False
            mensagem = f"Versão '{versao.nome}' desativada com sucesso"

        db.commit()
        db.refresh(versao)

        return {
            "success": True,
            "message": mensagem,
            "is_ativo": versao.is_ativo
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao alternar status ativo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/planejamento/versoes/{versao_id}/criar-revisao")
async def criar_revisao(
    versao_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    nome: Optional[str] = None
):
    """
    Cria uma nova revisão a partir de uma versão publicada
    """
    try:
        versao_origem = db.query(PlanejamentoVersao).filter(
            PlanejamentoVersao.id == versao_id
        ).first()

        if not versao_origem:
            raise HTTPException(status_code=404, detail="Versão não encontrada")

        if versao_origem.status != StatusPlanejamentoEnum.publicado:
            raise HTTPException(status_code=400, detail="Só é possível criar revisão de versão publicada")

        # Buscar última revisão para incrementar índice (pelo indice_revisao, independente do tipo)
        ultima_revisao = db.query(PlanejamentoVersao).filter(
            PlanejamentoVersao.empresa_id == versao_origem.empresa_id,
            PlanejamentoVersao.ano_referencia == versao_origem.ano_referencia,
            PlanejamentoVersao.indice_revisao.isnot(None)
        ).order_by(PlanejamentoVersao.indice_revisao.desc()).first()

        proximo_indice = (ultima_revisao.indice_revisao + 1) if ultima_revisao else 1

        # Criar nova versão como revisão (mantém tipo baseline compatível com o banco)
        nova_versao = PlanejamentoVersao(
            empresa_id=versao_origem.empresa_id,
            nome=nome or f"Revisão {proximo_indice} - {versao_origem.ano_referencia}",
            ano_referencia=versao_origem.ano_referencia,
            tipo=TipoVersaoEnum.baseline,
            indice_revisao=proximo_indice,
            status=StatusPlanejamentoEnum.rascunho,
            is_ativo=False,  # Rascunho não é ativo até ser publicado
            created_at=datetime.utcnow(),
            created_by=current_user.id if current_user else None
        )
        db.add(nova_versao)
        db.flush()

        # Copiar linhas da versão origem
        linhas_origem = db.query(LinhaOrcamentaria).filter(
            LinhaOrcamentaria.versao_id == versao_origem.id
        ).all()

        linhas_copiadas = 0
        for linha in linhas_origem:
            nova_linha = LinhaOrcamentaria(
                empresa_id=linha.empresa_id,
                versao_id=nova_versao.id,
                versao_publicacao_id=nova_versao.id,  # Carimbo: marca que foi criada/republicada nesta revisão
                ano=linha.ano,
                mes=linha.mes,
                cliente_id=linha.cliente_id,
                projeto_id=linha.projeto_id,
                produto_servico_id=linha.produto_servico_id,
                centro_custo_id=linha.centro_custo_id,
                conta_contabil_id=linha.conta_contabil_id,
                categoria=linha.categoria,
                descricao=linha.descricao,
                valor_previsto=linha.valor_previsto,
                moeda=linha.moeda,
                categoria_contabil_id=linha.categoria_contabil_id,
                categoria_gerencial_id=linha.categoria_gerencial_id,
                subcategoria_contabil_id=linha.subcategoria_contabil_id,
                subcategoria_gerencial_id=linha.subcategoria_gerencial_id,
                created_at=datetime.utcnow(),
                created_by=current_user.id if current_user else None
            )
            db.add(nova_linha)
            linhas_copiadas += 1

        db.commit()
        db.refresh(nova_versao)

        return {
            "success": True,
            "message": f"Revisão criada com {linhas_copiadas} linhas",
            "versao": {
                "id": nova_versao.id,
                "nome": nova_versao.nome,
                "tipo": nova_versao.tipo,
                "indice_revisao": nova_versao.indice_revisao,
                "status": nova_versao.status,
                "linhas_copiadas": linhas_copiadas
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao criar revisão: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/planejamento/linhas/replicar")
async def replicar_linhas(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    linha_id: int = Query(...),
    meses_replicar: int = Query(...),  # Quantos meses replicar
    incrementar_mes: bool = Query(True)  # Se deve incrementar o mês automaticamente
):
    """
    Replica uma linha orçamentária para os meses seguintes
    Exemplo: linha de setembro pode ser replicada por 12 meses
    """
    try:
        # Buscar linha original
        linha_original = db.query(LinhaOrcamentaria).filter(
            LinhaOrcamentaria.id == linha_id
        ).first()

        if not linha_original:
            raise HTTPException(status_code=404, detail="Linha não encontrada")

        if meses_replicar < 1 or meses_replicar > 60:
            raise HTTPException(status_code=400, detail="Número de meses deve estar entre 1 e 60")

        linhas_criadas = []
        mes_atual = linha_original.mes
        ano_atual = linha_original.ano

        # Nomes dos meses em português
        meses_nomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

        for i in range(1, meses_replicar + 1):
            if incrementar_mes:
                # Incrementar mês
                mes_atual += 1
                if mes_atual > 12:
                    mes_atual = 1
                    ano_atual += 1

            # Criar descrição com nome do mês
            nome_mes = meses_nomes[mes_atual - 1]
            descricao_com_mes = f"{linha_original.descricao} - {nome_mes}" if linha_original.descricao else nome_mes

            # Criar nova linha
            nova_linha = LinhaOrcamentaria(
                empresa_id=linha_original.empresa_id,
                versao_id=linha_original.versao_id,
                versao_publicacao_id=linha_original.versao_id,  # Carimbo: mesma versão
                ano=ano_atual,
                mes=mes_atual,
                cliente_id=linha_original.cliente_id,
                projeto_id=linha_original.projeto_id,
                produto_servico_id=linha_original.produto_servico_id,
                centro_custo_id=linha_original.centro_custo_id,
                conta_contabil_id=linha_original.conta_contabil_id,
                categoria=linha_original.categoria,
                descricao=descricao_com_mes,
                valor_previsto=linha_original.valor_previsto,
                moeda=linha_original.moeda,
                categoria_contabil_id=linha_original.categoria_contabil_id,
                categoria_gerencial_id=linha_original.categoria_gerencial_id,
                subcategoria_contabil_id=linha_original.subcategoria_contabil_id,
                subcategoria_gerencial_id=linha_original.subcategoria_gerencial_id,
                created_at=datetime.utcnow(),
                created_by=current_user.id if current_user else None
            )
            db.add(nova_linha)
            linhas_criadas.append({
                "mes": mes_atual,
                "ano": ano_atual,
                "valor": float(linha_original.valor_previsto)
            })

        db.commit()

        return {
            "success": True,
            "message": f"{len(linhas_criadas)} linhas replicadas",
            "linhas_criadas": linhas_criadas
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao replicar linhas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/planejamento/versoes/resumo")
async def listar_versoes_resumo(
    ano: Optional[int] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista resumo de todas as versões de planejamento.
    Pode filtrar por ano usando o parâmetro ?ano=2025
    """
    try:
        query = db.query(PlanejamentoVersao)
        
        if ano:
            query = query.filter(PlanejamentoVersao.ano_referencia == ano)
        
        versoes = query.order_by(
            PlanejamentoVersao.ano_referencia.desc(),
            PlanejamentoVersao.indice_revisao.desc(),
            PlanejamentoVersao.created_at.desc()
        ).all()

        resultado = []
        for v in versoes:
            # Contar linhas desta versão
            total_linhas = db.query(func.count(LinhaOrcamentaria.id)).filter(
                LinhaOrcamentaria.versao_id == v.id
            ).scalar()

            resultado.append({
                "id": v.id,
                "nome": v.nome,
                "ano_referencia": v.ano_referencia,
                "tipo": v.tipo.value if v.tipo else None,
                "indice_revisao": v.indice_revisao,
                "status": v.status.value if v.status else None,
                "is_ativo": v.is_ativo,
                "data_publicacao": v.data_publicacao.isoformat() if v.data_publicacao else None,
                "total_linhas": total_linhas,
                "created_at": v.created_at.isoformat() if v.created_at else None
            })

        # Identificar versão ativa
        versao_ativa = next((v for v in resultado if v["is_ativo"]), None)

        return {
            "versoes": resultado,
            "versao_ativa": versao_ativa,
            "total": len(resultado)
        }

    except Exception as e:
        print(f"❌ Erro ao listar resumo de versões: {e}")
        raise HTTPException(status_code=500, detail=str(e))