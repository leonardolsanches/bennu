"""
Rotas administrativas para backup, restore e limpeza do banco de dados
ATENÇÃO: Operações críticas - usar com cuidado!
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Form
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from app.database import get_db, engine
from app.auth.oauth import get_current_user
from app.models import *
from app.models.auditoria import TipoAcao
import json
import io
from datetime import datetime
from typing import List, Dict, Any

router = APIRouter()

# Mapeamento de modelos SQLAlchemy para backup/restore
MODELS_CADASTRO = [
    ('users', User),
    ('empresas', Empresa),
    ('clientes', Cliente),
    ('fornecedores', Fornecedor),
    ('categorias_contabeis', CategoriaContabil),
    ('categorias_gerenciais', CategoriaGerencial),
    ('centros_custo', CentroCusto),
    ('projetos', Projeto),
    ('produtos_servicos', ProdutoServico),
    ('contas_contabeis', ContaContabil),
    ('contas_bancarias', ContaBancaria),
    ('impostos', Imposto),
    ('cartoes_credito', CartaoCredito),
]

MODELS_TRANSACIONAIS = [
    ('transacoes_financeiras', TransacaoFinanceira),
    ('planejamento_versoes', PlanejamentoVersao),
    ('linhas_orcamentarias', LinhaOrcamentaria),
    ('desmembramento_transacoes', DesmembramentoTransacao),
    ('desmembramento_itens', DesmembramentoItem),
]

MODELS_AUDITORIA = [
    ('logs_acesso', LogAcesso),
    ('logs_acao', LogAcao),
    ('sessoes_usuario', SessaoUsuario),
    ('metricas_uso', MetricaUso),
]

ALL_MODELS = MODELS_CADASTRO + MODELS_TRANSACIONAIS + MODELS_AUDITORIA

# Tabelas de auditoria/telemetria: específicas de cada ambiente, não devem ser
# importadas em restore cross-environment (Render → AWS, etc.)
TABELAS_SKIP_IMPORT = {table_name for table_name, _ in MODELS_AUDITORIA}

# Ordem de deleção FK-safe para limpeza completa do destino (folha → raiz)
# Garante que FK constraints não bloqueiam a deleção de dados
TABELAS_LIMPAR_ORDEM = [
    # ── Detalhes / joins leaf ────────────────────────────────────────────────
    "transacao_impostos_detalhes", "transacao_impostos", "transacao_mensalizacao",
    "transacao_categoria_contabil", "transacao_categoria_gerencial",
    "linhaorc_impostos_detalhes", "linhaorc_impostos", "linhaorc_mensalizacao",
    "linhaorc_categoria_contabil", "linhaorc_categoria_gerencial",
    "desmembramentos_itens", "desmembramentos_transacoes",
    "transacoes_cartao", "faturas_cartao",
    "cartao_usuarios",
    "projecoes_pl", "pl_map",
    # ── Transacionais ────────────────────────────────────────────────────────
    "linhas_orcamentarias", "planejamento_versoes",
    "transacoes_financeiras",
    # ── Cadastro dependente ───────────────────────────────────────────────────
    "projeto_clientes", "produto_servico_clientes",
    "contatos_clientes", "contatos_fornecedores",
    "projetos",
    "regras_impostos_itens", "regras_impostos",
    "impostos", "cartoes_credito",
    "contas_bancarias", "contas_contabeis",
    "centros_custo",
    "categorias_contabeis", "categorias_gerenciais",
    "produtos_servicos",
    "fornecedores", "clientes",
    "empresa_cnpjs",
    # ── Auditoria / sessão ────────────────────────────────────────────────────
    "logs_acoes", "logs_acesso", "sessoes_usuario", "metricas_uso",
    # ── Root ─────────────────────────────────────────────────────────────────
    "users", "empresas",
]

# Tabelas com PK serial que precisam ter a sequence ajustada após import
# (evita UniqueViolation ao inserir novos registros após importar IDs explícitos)
TABELAS_SERIAL_ID = [
    "users", "empresas", "clientes", "fornecedores", "empresa_cnpjs",
    "categorias_contabeis", "categorias_gerenciais", "centros_custo",
    "projetos", "projeto_classificacoes", "projeto_clientes",
    "produtos_servicos", "produto_servico_clientes",
    "contas_contabeis", "contas_bancarias", "impostos",
    "cartoes_credito", "cartao_usuarios",
    "regras_impostos", "regras_impostos_itens",
    "planejamento_versoes", "linhas_orcamentarias",
    "linhaorc_mensalizacao", "linhaorc_impostos", "linhaorc_impostos_detalhes",
    "transacoes_financeiras", "transacao_mensalizacao",
    "transacao_impostos", "transacao_impostos_detalhes",
    "desmembramentos_transacoes", "desmembramentos_itens",
    "faturas_cartao", "transacoes_cartao",
    "pl_map", "projecoes_pl",
    "logs_acesso", "logs_acoes", "sessoes_usuario", "metricas_uso",
    "contatos_clientes", "contatos_fornecedores",
]

# Mapa de dependências entre tabelas (Foreign Keys)
# Formato: {"tabela_filha": ["tabela_pai1", "tabela_pai2", ...]}
TABLE_DEPENDENCIES = {
    # ===== CADASTROS DEPENDEM DE EMPRESAS =====
    "users": ["empresas"],
    "clientes": ["empresas"],
    "fornecedores": ["empresas"],
    "categorias_contabeis": ["empresas"],
    "categorias_gerenciais": ["empresas"],
    "centros_custo": ["empresas"],
    "produtos_servicos": ["empresas"],
    "contas_contabeis": ["empresas"],
    "contas_bancarias": ["empresas"],
    "cartoes_credito": ["empresas"],
    "planejamento_versoes": ["empresas"],
    "projetos": ["empresas", "clientes"],
    
    "empresa_cnpjs": ["empresas"],
    
    "contatos_clientes": ["clientes"],
    "contatos_fornecedores": ["fornecedores"],
    
    "impostos": ["empresas", "produtos_servicos"],
    "regras_impostos": ["empresas"],
    "regras_impostos_itens": ["regras_impostos", "impostos"],
    
    "transacoes_financeiras": [
        "empresas", "clientes", "fornecedores",
        "categorias_contabeis", "categorias_gerenciais",
        "centros_custo", "projetos", "produtos_servicos",
        "contas_contabeis", "linhas_orcamentarias"
    ],
    
    "transacao_categoria_contabil": ["transacoes_financeiras", "categorias_contabeis"],
    "transacao_categoria_gerencial": ["transacoes_financeiras", "categorias_gerenciais"],
    "transacao_impostos": ["transacoes_financeiras", "regras_impostos"],
    "transacao_impostos_detalhes": ["transacao_impostos", "impostos"],
    "transacao_mensalizacao": ["transacoes_financeiras"],
    
    "cartao_usuarios": ["cartoes_credito", "users"],
    "faturas_cartao": ["cartoes_credito", "empresas", "users"],
    "transacoes_cartao": [
        "faturas_cartao", "empresas",
        "categorias_contabeis", "categorias_gerenciais",
        "centros_custo", "contas_contabeis"
    ],
    
    "linhas_orcamentarias": [
        "planejamento_versoes", "empresas", "clientes", "projetos",
        "produtos_servicos", "centros_custo",
        "categorias_contabeis", "categorias_gerenciais", "contas_contabeis", "users"
    ],
    "linhaorc_categoria_contabil": ["linhas_orcamentarias", "categorias_contabeis"],
    "linhaorc_categoria_gerencial": ["linhas_orcamentarias", "categorias_gerenciais"],
    "linhaorc_impostos": ["linhas_orcamentarias", "regras_impostos"],
    "linhaorc_impostos_detalhes": ["linhaorc_impostos", "impostos"],
    "linhaorc_mensalizacao": ["linhas_orcamentarias"],
    
    "desmembramentos_transacoes": ["transacoes_financeiras", "users", "empresas"],
    "desmembramentos_itens": [
        "desmembramentos_transacoes", "transacoes_financeiras",
        "categorias_contabeis",
        "centros_custo", "clientes", "produtos_servicos", "projetos"
    ],
    
    "pl_map": [
        "categorias_contabeis", "categorias_gerenciais",
        "centros_custo", "clientes", "contas_contabeis", "produtos_servicos"
    ],
    "projecoes_pl": ["empresas", "users"],
    
    "projeto_classificacoes": ["empresas"],
    
    "logs_acesso": ["users"],
    "logs_acao": ["users", "sessoes_usuario"],
    "sessoes_usuario": ["users"],
    "metricas_uso": ["users"],
}

CASCADE_CHILDREN = {
    "transacoes_financeiras": [
        "transacao_categoria_contabil",
        "transacao_categoria_gerencial",
        "transacao_impostos_detalhes",
        "transacao_impostos",
        "transacao_mensalizacao",
        "desmembramentos_itens",
        "desmembramentos_transacoes",
    ],
    "linhas_orcamentarias": [
        "linhaorc_impostos_detalhes",
        "linhaorc_impostos",
        "linhaorc_categoria_contabil",
        "linhaorc_categoria_gerencial",
        "linhaorc_mensalizacao",
    ],
    "planejamento_versoes": [
        "linhas_orcamentarias",
    ],
    "cartoes_credito": [
        "transacoes_cartao",
        "faturas_cartao",
        "cartao_usuarios",
    ],
    "empresas": [
        "empresa_cnpjs",
    ],
    "clientes": [
        "contatos_clientes",
    ],
    "fornecedores": [
        "contatos_fornecedores",
    ],
    "regras_impostos": [
        "regras_impostos_itens",
    ],
    "transacao_impostos": [
        "transacao_impostos_detalhes",
    ],
    "linhaorc_impostos": [
        "linhaorc_impostos_detalhes",
    ],
    "desmembramentos_transacoes": [
        "desmembramentos_itens",
    ],
    "faturas_cartao": [
        "transacoes_cartao",
    ],
}

SELF_REFERENCING_TABLES = ["transacoes_financeiras", "linhas_orcamentarias"]

# Grupos de negócio para interface
TABLE_GROUPS = {
    "transacoes": {
        "nome": "Dados Transacionais",
        "descricao": "Transações financeiras, categorizações, impostos, desmembramentos, faturas e cartão",
        "cor": "blue",
        "tabelas": [
            "transacoes_financeiras",
            "transacao_categoria_contabil", "transacao_categoria_gerencial",
            "transacao_impostos", "transacao_impostos_detalhes",
            "transacao_mensalizacao",
            "desmembramentos_transacoes", "desmembramentos_itens",
            "faturas_cartao", "transacoes_cartao"
        ],
        "aviso": "⚠️ Limpar transações remove TODOS os lançamentos financeiros!"
    },
    "planejamento": {
        "nome": "Planejamento Orçamentário",
        "descricao": "Versões de planejamento, linhas orçamentárias, categorizações e impostos",
        "cor": "purple",
        "tabelas": [
            "planejamento_versoes", "linhas_orcamentarias",
            "linhaorc_categoria_contabil", "linhaorc_categoria_gerencial",
            "linhaorc_impostos", "linhaorc_impostos_detalhes",
            "linhaorc_mensalizacao"
        ],
        "aviso": "⚠️ Limpar planejamento remove TODOS os orçamentos e previsões!"
    },
    "cadastros_base": {
        "nome": "Cadastros Base",
        "descricao": "Empresas, clientes, fornecedores, produtos, projetos, contatos",
        "cor": "green",
        "tabelas": [
            "empresas", "empresa_cnpjs",
            "clientes", "contatos_clientes",
            "fornecedores", "contatos_fornecedores",
            "produtos_servicos", "projetos", "projeto_classificacoes"
        ],
        "aviso": "🚨 ATENÇÃO: Cadastros são referenciados por transações e planejamento!"
    },
    "config_contabeis": {
        "nome": "Configurações Contábeis",
        "descricao": "Categorias, centros de custo, contas, impostos, cartões",
        "cor": "yellow",
        "tabelas": [
            "categorias_contabeis", "categorias_gerenciais",
            "centros_custo", "contas_contabeis", "contas_bancarias",
            "impostos", "cartoes_credito", "cartao_usuarios"
        ],
        "aviso": "🚨 ATENÇÃO: Configurações são referenciadas por transações!"
    },
    "sistema": {
        "nome": "Auditoria e Sistema",
        "descricao": "Usuários, logs, sessões, métricas",
        "cor": "gray",
        "tabelas": ["users", "logs_acesso", "logs_acao", "sessoes_usuario", "metricas_uso"],
        "aviso": "🔒 Recomendado manter usuários e logs para auditoria"
    }
}

# Presets seguros de limpeza
CLEANUP_PRESETS = {
    "somente_transacoes": {
        "nome": "Somente Transações",
        "descricao": "Limpa transações financeiras realizadas com categorizações, impostos e desmembramentos. Preserva cadastros e planejamento.",
        "tabelas": [
            "transacoes_financeiras",
            "transacao_categoria_contabil", "transacao_categoria_gerencial",
            "transacao_impostos", "transacao_impostos_detalhes",
            "transacao_mensalizacao",
            "desmembramentos_transacoes", "desmembramentos_itens",
        ],
        "seguro": True
    },
    "transacoes_e_planejamento": {
        "nome": "Transações + Planejamento",
        "descricao": "Limpa TODAS as receitas/despesas (realizadas e planejadas) com categorizações, impostos e desmembramentos. Preserva cadastros.",
        "tabelas": [
            "transacoes_financeiras",
            "transacao_categoria_contabil", "transacao_categoria_gerencial",
            "transacao_impostos", "transacao_impostos_detalhes",
            "transacao_mensalizacao",
            "desmembramentos_transacoes", "desmembramentos_itens",
            "planejamento_versoes", "linhas_orcamentarias",
            "linhaorc_categoria_contabil", "linhaorc_categoria_gerencial",
            "linhaorc_impostos", "linhaorc_impostos_detalhes",
            "linhaorc_mensalizacao",
        ],
        "seguro": True
    },
    "planejamento": {
        "nome": "Planejamento Orçamentário",
        "descricao": "Limpa planejamento e linhas orçamentárias com categorizações e impostos. Preserva transações e cadastros.",
        "tabelas": [
            "planejamento_versoes", "linhas_orcamentarias",
            "linhaorc_categoria_contabil", "linhaorc_categoria_gerencial",
            "linhaorc_impostos", "linhaorc_impostos_detalhes",
            "linhaorc_mensalizacao",
        ],
        "seguro": True
    },
    "reset_completo": {
        "nome": "Reset Completo (Exceto Usuários)",
        "descricao": "Limpa TUDO exceto usuários. Remove transações, planejamento, cadastros e configurações.",
        "tabelas": [
            "transacao_impostos_detalhes", "transacao_impostos",
            "transacao_categoria_contabil", "transacao_categoria_gerencial",
            "transacao_mensalizacao",
            "desmembramentos_itens", "desmembramentos_transacoes",
            "transacoes_financeiras",
            "linhaorc_impostos_detalhes", "linhaorc_impostos",
            "linhaorc_categoria_contabil", "linhaorc_categoria_gerencial",
            "linhaorc_mensalizacao",
            "linhas_orcamentarias", "planejamento_versoes",
            "impostos", "cartoes_credito", "contas_bancarias", "contas_contabeis",
            "centros_custo", "categorias_gerenciais", "categorias_contabeis",
            "projetos", "produtos_servicos", "fornecedores", "clientes"
        ],
        "seguro": False,
        "aviso": "🚨 OPERAÇÃO DESTRUTIVA! Remove praticamente todos os dados!"
    }
}


def get_table_count(db: Session, table_name: str) -> int:
    """
    Helper para buscar contagem de registros de uma tabela.
    Usa raw SQL para tabelas sem modelo SQLAlchemy.
    """
    try:
        result = db.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
        return result.scalar() or 0
    except Exception as e:
        print(f"⚠️ Erro ao contar {table_name}: {e}")
        return 0


@router.get("/admin/cleanup/groups")
async def get_cleanup_groups(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna grupos de tabelas, presets e informações de dependências
    """
    try:
        table_counts = {}
        model_table_names = {model_name for model_name, _ in ALL_MODELS}
        
        for table_name, model in ALL_MODELS:
            try:
                count = db.query(model).count()
                table_counts[table_name] = count
                real_tablename = getattr(model, '__tablename__', None)
                if real_tablename and real_tablename != table_name:
                    table_counts[real_tablename] = count
            except Exception as e:
                print(f"Erro ao contar {table_name} via ORM: {e}")
                table_counts[table_name] = 0

        # Buscar contagem de registros para tabelas SEM modelo (via raw SQL)
        # Lista de tabelas adicionadas manualmente aos grupos
        manual_tables = [
            "empresa_cnpjs", "contatos_clientes", "contatos_fornecedores",
            "projeto_classificacoes", "cartao_usuarios", "faturas_cartao", "transacoes_cartao",
            "transacao_categoria_contabil", "transacao_categoria_gerencial",
            "transacao_impostos", "transacao_impostos_detalhes", "transacao_mensalizacao",
            "linhaorc_categoria_contabil", "linhaorc_categoria_gerencial",
            "linhaorc_impostos", "linhaorc_impostos_detalhes", "linhaorc_mensalizacao",
        ]
        
        for table_name in manual_tables:
            if table_name not in model_table_names:
                table_counts[table_name] = get_table_count(db, table_name)

        # Montar resposta com grupos enriquecidos
        grupos_enriquecidos = {}
        for grupo_id, grupo_info in TABLE_GROUPS.items():
            tabelas_com_contagem = []
            for tabela in grupo_info["tabelas"]:
                tabelas_com_contagem.append({
                    "nome": tabela,
                    "registros": table_counts.get(tabela, 0),
                    "descricao": TABLE_DESCRIPTIONS.get(tabela, "")
                })

            grupos_enriquecidos[grupo_id] = {
                **grupo_info,
                "tabelas": tabelas_com_contagem
            }

        return {
            "grupos": grupos_enriquecidos,
            "presets": CLEANUP_PRESETS,
            "dependencias": TABLE_DEPENDENCIES
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao carregar grupos: {str(e)}")


def compute_dependency_closure(tabelas_selecionadas: List[str]) -> tuple[set[str], set[str]]:
    """
    Expande a seleção de tabelas incluindo automaticamente FILHOS em cascata (downward traversal).
    
    Quando uma tabela é selecionada para deleção, todas as tabelas auxiliares/filhas que a
    REFERENCIAM via FK devem ser deletadas PRIMEIRO. Esta função usa CASCADE_CHILDREN para
    encontrar essas tabelas automaticamente.
    
    NÃO adiciona tabelas PAIS (cadastros/master data) - apenas filhos auxiliares.
    
    Retorna:
        - tabelas_expandidas: conjunto completo incluindo filhos automáticos
        - tabelas_auto_adicionadas: conjunto de tabelas adicionadas automaticamente
    """
    tabelas_expandidas = set(tabelas_selecionadas)
    tabelas_iniciais = set(tabelas_selecionadas)
    
    mudou = True
    iteracoes = 0
    max_iteracoes = 10
    
    while mudou and iteracoes < max_iteracoes:
        mudou = False
        iteracoes += 1
        
        for tabela in list(tabelas_expandidas):
            if tabela in CASCADE_CHILDREN:
                for filho in CASCADE_CHILDREN[tabela]:
                    if filho not in tabelas_expandidas:
                        tabelas_expandidas.add(filho)
                        mudou = True
    
    tabelas_auto_adicionadas = tabelas_expandidas - tabelas_iniciais
    
    return tabelas_expandidas, tabelas_auto_adicionadas


@router.post("/admin/cleanup/validate")
async def validate_cleanup_selection(
    tabelas_selecionadas: List[str],
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Valida seleção de tabelas para limpeza e retorna avisos de dependências.
    Automaticamente inclui tabelas técnicas/junção para garantir integridade FK.
    """
    try:
        tabelas_expandidas, tabelas_auto_adicionadas = compute_dependency_closure(tabelas_selecionadas)
        
        tabelas_para_validar = list(tabelas_expandidas)
        avisos = []
        erros = []
        dependencias_quebradas = []
        
        if tabelas_auto_adicionadas:
            tabelas_auto_list = sorted(list(tabelas_auto_adicionadas))
            avisos.append(f"🔧 Tabelas filhas incluídas automaticamente ({len(tabelas_auto_list)}): {', '.join(tabelas_auto_list)}")

        for tabela in tabelas_para_validar:
            tabelas_dependentes = []
            for tabela_filha, pais in TABLE_DEPENDENCIES.items():
                if tabela in pais and tabela_filha not in tabelas_para_validar:
                    tabelas_dependentes.append(tabela_filha)

            if tabelas_dependentes:
                dependencias_quebradas.append({
                    "tabela": tabela,
                    "dependentes": tabelas_dependentes,
                    "mensagem": f"Tabela '{tabela}' é referenciada por: {', '.join(tabelas_dependentes)}"
                })

        is_safe = len(dependencias_quebradas) == 0

        if not is_safe:
            erros.append("⚠️ ATENÇÃO: Existem tabelas que referenciam as selecionadas!")
            erros.append("Inclua as tabelas dependentes ou elas terão registros órfãos.")

        return {
            "seguro": is_safe,
            "avisos": avisos,
            "erros": erros,
            "dependencias_quebradas": dependencias_quebradas,
            "total_tabelas": len(tabelas_selecionadas),
            "total_expandido": len(tabelas_para_validar),
            "tabelas_auto_adicionadas": sorted(list(tabelas_auto_adicionadas))
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao validar seleção: {str(e)}")


TABLE_DESCRIPTIONS = {
    "users": "Usuários do sistema com perfis e permissões",
    "empresas": "Empresas cadastradas no sistema",
    "empresa_cnpjs": "CNPJs vinculados às empresas",
    "clientes": "Clientes cadastrados",
    "contatos_clientes": "Contatos dos clientes (telefone, e-mail)",
    "fornecedores": "Fornecedores cadastrados",
    "contatos_fornecedores": "Contatos dos fornecedores",
    "categorias_contabeis": "Categorias e subcategorias contábeis (Plano de Contas)",
    "categorias_gerenciais": "Categorias e subcategorias gerenciais",
    "centros_custo": "Centros de custo/responsabilidade",
    "projetos": "Projetos vinculados a empresas/clientes",
    "projeto_classificacoes": "Classificações de projetos",
    "produtos_servicos": "Catálogo de produtos e serviços",
    "contas_contabeis": "Plano de contas contábeis",
    "contas_bancarias": "Contas bancárias das empresas",
    "impostos": "Tributos configurados (ISS, IRRF, PIS, COFINS, etc.)",
    "regras_impostos": "Regras de retenção de impostos",
    "regras_impostos_itens": "Itens detalhados das regras de impostos",
    "cartoes_credito": "Cartões de crédito cadastrados",
    "cartao_usuarios": "Usuários vinculados a cartões",
    "transacoes_financeiras": "Receitas e despesas REALIZADAS (lançamentos financeiros)",
    "transacao_categoria_contabil": "Categorização contábil das transações realizadas",
    "transacao_categoria_gerencial": "Categorização gerencial das transações realizadas",
    "transacao_impostos": "Impostos retidos nas transações realizadas",
    "transacao_impostos_detalhes": "Detalhamento dos impostos retidos",
    "transacao_mensalizacao": "Distribuição mensal das transações realizadas",
    "desmembramentos_transacoes": "Cabeçalhos de desmembramento de transações",
    "desmembramentos_itens": "Itens dos desmembramentos de transações",
    "desmembramento_transacoes": "Cabeçalhos de desmembramento de transações",
    "desmembramento_itens": "Itens dos desmembramentos de transações",
    "faturas_cartao": "Faturas de cartão de crédito",
    "transacoes_cartao": "Lançamentos em cartão de crédito",
    "planejamento_versoes": "Versões de orçamento/planejamento (Rascunho, Ativa, etc.)",
    "linhas_orcamentarias": "Receitas e despesas PLANEJADAS (linhas do orçamento)",
    "linhaorc_categoria_contabil": "Categorização contábil das linhas planejadas",
    "linhaorc_categoria_gerencial": "Categorização gerencial das linhas planejadas",
    "linhaorc_impostos": "Impostos previstos nas linhas planejadas",
    "linhaorc_impostos_detalhes": "Detalhamento dos impostos previstos",
    "linhaorc_mensalizacao": "Distribuição mensal das linhas planejadas",
    "pl_map": "Mapeamento de categorias para P&L (DRE)",
    "projecoes_pl": "Projeções de P&L (DRE)",
    "logs_acesso": "Registros de login/acesso ao sistema",
    "logs_acao": "Auditoria de ações (criar, editar, excluir)",
    "sessoes_usuario": "Sessões ativas dos usuários",
    "metricas_uso": "Métricas de utilização do sistema",
    "config": "Configurações gerais do sistema",
}


@router.get("/admin/backup/tables")
async def get_tables_info(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista todas as tabelas do banco com contagem de registros
    """
    try:
        tables_info = []

        for table_name, model in ALL_MODELS:
            try:
                count = db.query(model).count()

                categoria = "Cadastro"
                if (table_name, model) in MODELS_TRANSACIONAIS:
                    categoria = "Transacional"
                elif (table_name, model) in MODELS_AUDITORIA:
                    categoria = "Auditoria"

                tables_info.append({
                    "nome": table_name,
                    "registros": count,
                    "categoria": categoria,
                    "pode_limpar": count > 0,
                    "descricao": TABLE_DESCRIPTIONS.get(table_name, "")
                })
            except Exception as e:
                print(f"Erro ao contar {table_name}: {e}")
                tables_info.append({
                    "nome": table_name,
                    "registros": 0,
                    "categoria": "Desconhecida",
                    "pode_limpar": False,
                    "erro": str(e),
                    "descricao": TABLE_DESCRIPTIONS.get(table_name, "")
                })

        return {
            "tabelas": tables_info,
            "total_tabelas": len(tables_info)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar tabelas: {str(e)}")


@router.get("/admin/backup/export")
async def export_backup(
    tipo: str = "completo",  # completo, cadastro, transacional
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exporta dados do banco em formato JSON
    """
    try:
        backup_data = {
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "tipo": tipo,
                "usuario": current_user.email if hasattr(current_user, 'email') else "unknown",
                "versao": "1.0"
            },
            "data": {}
        }

        # Selecionar modelos baseado no tipo
        if tipo == "cadastro":
            models_to_export = MODELS_CADASTRO
        elif tipo == "transacional":
            models_to_export = MODELS_TRANSACIONAIS
        else:  # completo
            models_to_export = ALL_MODELS

        total_records = 0

        # Exportar dados de cada tabela
        for table_name, model in models_to_export:
            try:
                records = db.query(model).all()
                backup_data["data"][table_name] = []

                for record in records:
                    # Converter objeto SQLAlchemy para dict
                    record_dict = {}
                    for column in inspect(model).columns:
                        value = getattr(record, column.name)
                        # Converter tipos especiais para JSON
                        if isinstance(value, datetime):
                            value = value.isoformat()
                        elif isinstance(value, (int, float, str, bool, type(None))):
                            value = value
                        else:
                            value = str(value)
                        record_dict[column.name] = value

                    backup_data["data"][table_name].append(record_dict)

                total_records += len(records)
                print(f"✅ Exportado {len(records)} registros de {table_name}")

            except Exception as e:
                print(f"❌ Erro ao exportar {table_name}: {e}")
                backup_data["data"][table_name] = {"erro": str(e)}

        # Registrar ação de auditoria (antes de retornar o arquivo)
        log = LogAcao(
            user_id=current_user.id,
            acao=TipoAcao.EXPORT,
            entidade="backup_sistema",
            descricao=f"Exportação de backup {tipo}",
            dados_depois=json.dumps({
                "tipo_backup": tipo,
                "total_registros": total_records,
                "tabelas_exportadas": len(models_to_export)
            })
        )
        db.add(log)
        db.commit()

        # Converter para JSON
        json_str = json.dumps(backup_data, ensure_ascii=False, indent=2)

        # Criar arquivo para download
        filename = f"backup_{tipo}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        return StreamingResponse(
            io.BytesIO(json_str.encode('utf-8')),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao exportar backup: {str(e)}")


@router.post("/admin/backup/import")
async def import_backup(
    file: UploadFile = File(...),
    limpar_destino: bool = Form(False),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Importa dados de um arquivo de backup JSON.

    limpar_destino=True → Modo Migração Completa:
        Apaga TODOS os dados do destino (ordem FK-safe) antes de inserir.
        Ideal para migração entre ambientes (ex: Render → AWS).
        As sequences são resetadas automaticamente ao final.

    limpar_destino=False (padrão) → Modo Incremental:
        UPSERT (atualiza se o ID já existe, insere se não existe).
        Ideal para restaurar backups no mesmo ambiente.
    """
    try:
        content = await file.read()
        backup_data = json.loads(content.decode('utf-8'))

        if "metadata" not in backup_data or "data" not in backup_data:
            raise HTTPException(status_code=400, detail="Formato de backup inválido")

        resultado = {
            "sucesso": [],
            "erros": [],
            "registros_importados": 0,
            "modo": "migracao_completa" if limpar_destino else "incremental",
        }

        # ── FASE 0 (Modo Migração Completa): limpar destino em ordem FK-safe ──
        if limpar_destino:
            print("🧹 Modo Migração Completa: limpando dados do destino...")
            try:
                # Desabilitar verificações de FK temporariamente para deleção segura
                db.execute(text("SET session_replication_role = 'replica'"))

                # Zerar self-references antes de deletar (pai_id, parent_id)
                for t in ["categorias_contabeis", "categorias_gerenciais",
                          "linhas_orcamentarias", "transacoes_financeiras"]:
                    try:
                        db.execute(text(f"UPDATE {t} SET parent_id = NULL WHERE parent_id IS NOT NULL"))
                    except Exception:
                        pass
                try:
                    db.execute(text("UPDATE transacoes_financeiras SET linha_orcamentaria_id = NULL "
                                    "WHERE linha_orcamentaria_id IS NOT NULL"))
                except Exception:
                    pass

                for tabela in TABELAS_LIMPAR_ORDEM:
                    try:
                        db.execute(text(f"DELETE FROM {tabela}"))
                        print(f"   🗑️  {tabela} limpa")
                    except Exception as e_del:
                        print(f"   ⚠️  Não foi possível limpar {tabela}: {e_del}")

                # Reabilitar FK checks
                db.execute(text("SET session_replication_role = DEFAULT"))
                db.commit()
                print("✅ Destino limpo. Iniciando inserção...")
                resultado["sucesso"].append("limpeza_destino: concluída")
            except Exception as e:
                db.rollback()
                raise HTTPException(status_code=500,
                                    detail=f"Erro ao limpar destino: {str(e)}")

        # ── FASE 1: inserir dados do backup ───────────────────────────────────
        for table_name, model in ALL_MODELS:
            # Pular tabelas de auditoria/telemetria — específicas de cada ambiente
            if table_name in TABELAS_SKIP_IMPORT:
                resultado["sucesso"].append(f"{table_name}: ignorado (telemetria de ambiente)")
                continue

            if table_name not in backup_data["data"]:
                continue

            table_data = backup_data["data"][table_name]

            if isinstance(table_data, dict) and "erro" in table_data:
                resultado["erros"].append(f"{table_name}: {table_data['erro']}")
                continue

            records_imported = 0
            try:
                for record_dict in table_data:
                    new_record = model(**record_dict)
                    # Modo Migração: INSERT direto (tabela já limpa, sem conflito)
                    # Modo Incremental: UPSERT (mantém dados existentes)
                    if limpar_destino:
                        db.add(new_record)
                    else:
                        db.merge(new_record)
                    records_imported += 1

                resultado["sucesso"].append(f"{table_name}: {records_imported} registros")
                resultado["registros_importados"] += records_imported
                print(f"✅ {table_name}: {records_imported} registros preparados")

            except Exception as e:
                db.rollback()
                raise HTTPException(status_code=500,
                                    detail=f"Erro ao importar {table_name}: {str(e)}")

        # ── COMMIT 1: persiste todos os registros com seus IDs originais ──────
        db.commit()
        print(f"✅ Dados importados ({resultado['registros_importados']} registros).")

        # ── COMMIT 2: ajustar sequences ────────────────────────────────────────
        # setval(MAX(id), true) → próximo nextval = MAX(id)+1, sem UniqueViolation.
        # NÃO inserimos LogAcao aqui — AuditoriaMiddleware já cobre este POST.
        for tabela in TABELAS_SERIAL_ID:
            try:
                db.execute(text(
                    f"SELECT setval(pg_get_serial_sequence('{tabela}', 'id'), "
                    f"COALESCE((SELECT MAX(id) FROM {tabela}), 1), true)"
                ))
            except Exception:
                pass
        db.commit()
        print("✅ Sequences ajustadas. Importação concluída com sucesso.")

        return resultado

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Arquivo JSON inválido")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao importar backup: {str(e)}")


@router.delete("/admin/cleanup/table/{table_name}")
async def cleanup_table(
    table_name: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Limpa (deleta todos os registros) de uma tabela específica
    ATENÇÃO: Operação irreversível!
    """
    try:
        # Buscar modelo correspondente
        model = None
        for tname, tmodel in ALL_MODELS:
            if tname == table_name:
                model = tmodel
                break

        if not model:
            raise HTTPException(status_code=404, detail=f"Tabela '{table_name}' não encontrada")

        # Contar registros antes
        count_before = db.query(model).count()

        # Deletar todos os registros e registrar auditoria na mesma transação
        db.query(model).delete()

        # Registrar ação de auditoria (mesma transação)
        log = LogAcao(
            user_id=current_user.id,
            acao=TipoAcao.DELETE,
            entidade=table_name,
            descricao=f"Limpeza da tabela {table_name}",
            dados_antes=json.dumps({
                "registros_antes": count_before
            }),
            dados_depois=json.dumps({
                "registros_removidos": count_before
            })
        )
        db.add(log)

        # Commit único para operação + auditoria
        db.commit()

        print(f"🗑️ Tabela {table_name} limpa: {count_before} registros removidos")

        return {
            "tabela": table_name,
            "registros_removidos": count_before,
            "sucesso": True,
            "mensagem": f"{count_before} registros removidos de {table_name}"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao limpar tabela: {str(e)}")


@router.post("/admin/cleanup/all")
async def cleanup_all_tables(
    confirmar: bool = False,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Limpa TODAS as tabelas do banco
    ATENÇÃO: Operação EXTREMAMENTE PERIGOSA!
    Requer confirmação explícita
    """
    if not confirmar:
        raise HTTPException(
            status_code=400,
            detail="Operação requer confirmação explícita. Adicione '?confirmar=true'"
        )

    try:
        resultado = {
            "tabelas_limpas": [],
            "erros": [],
            "total_registros_removidos": 0
        }

        # Limpar em ordem reversa para respeitar FKs, em UMA ÚNICA TRANSAÇÃO
        for table_name, model in reversed(ALL_MODELS):
            try:
                count = db.query(model).count()
                db.query(model).delete()
                # NÃO commit aqui - acumular tudo na mesma transação

                resultado["tabelas_limpas"].append({
                    "tabela": table_name,
                    "registros": count
                })
                resultado["total_registros_removidos"] += count

                print(f"🗑️ Preparado para limpar {table_name}: {count} registros")

            except Exception as e:
                # Erro em qualquer tabela = rollback de TUDO
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Erro ao limpar {table_name}: {str(e)}")

        # Registrar ação de auditoria na MESMA transação
        log = LogAcao(
            user_id=current_user.id,
            acao=TipoAcao.DELETE,
            entidade="todas_as_tabelas",
            descricao="Limpeza completa do banco de dados",
            dados_depois=json.dumps({
                "total_registros_removidos": resultado["total_registros_removidos"],
                "tabelas_limpas": len(resultado["tabelas_limpas"]),
                "erros": len(resultado["erros"])
            })
        )
        db.add(log)

        # Commit ÚNICO para todas as limpezas + log de auditoria
        db.commit()
        print(f"✅ Limpeza completa: {resultado['total_registros_removidos']} registros removidos de {len(resultado['tabelas_limpas'])} tabelas")

        return resultado

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao limpar banco: {str(e)}")


@router.post("/admin/cleanup/execute")
async def execute_cleanup(
    request: Request,
    confirmar: bool = False,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executa limpeza de tabelas selecionadas respeitando dependências FK.
    
    PROCESSO:
    1. Expande seleção para incluir dependências (upward closure)
    2. Computa ordem de deleção (topological sort respeitando FKs)
    3. Deleta em paralelo tabelas sem dependência entre elas
    4. Registra auditoria
    """
    if not confirmar:
        raise HTTPException(status_code=400, detail="Operação requer confirmação. Adicione '?confirmar=true'")
    
    try:
        body = await request.json()
        tabelas_selecionadas = body.get('tabelas_selecionadas', [])
    except Exception as e:
        print(f"❌ Erro ao parsear JSON: {str(e)}")
        raise HTTPException(status_code=400, detail=f"JSON inválido: {str(e)}")
    
    if not tabelas_selecionadas:
        raise HTTPException(status_code=400, detail="Nenhuma tabela selecionada")
    
    try:
        tabelas_expandidas, tabelas_auto_adicionadas = compute_dependency_closure(tabelas_selecionadas)
        tabelas_para_limpar = list(tabelas_expandidas)
        
        ordem_delecao = []
        tabelas_pendentes = set(tabelas_para_limpar)
        visitadas = set()
        
        def adicionar_com_dependentes(tabela):
            if tabela in visitadas:
                return
            visitadas.add(tabela)
            
            for tabela_filha, pais in TABLE_DEPENDENCIES.items():
                if tabela in pais and tabela_filha in tabelas_pendentes and tabela_filha not in visitadas:
                    adicionar_com_dependentes(tabela_filha)
            
            ordem_delecao.append(tabela)
        
        for tabela in list(tabelas_pendentes):
            adicionar_com_dependentes(tabela)
        
        resultado = {
            "tabelas_limpas": [],
            "erros": [],
            "total_registros_removidos": 0,
            "tabelas_expandidas": list(tabelas_expandidas),
            "tabelas_auto_adicionadas": list(tabelas_auto_adicionadas)
        }
        
        TABLE_NAME_MAP = {
            "desmembramento_transacoes": "desmembramentos_transacoes",
            "desmembramento_itens": "desmembramentos_itens",
        }
        
        for table_name in ordem_delecao:
            savepoint = None
            try:
                savepoint = db.begin_nested()
                
                db_table_name = TABLE_NAME_MAP.get(table_name, table_name)
                
                if db_table_name in SELF_REFERENCING_TABLES:
                    db.execute(text(f"UPDATE {db_table_name} SET parent_id = NULL WHERE parent_id IS NOT NULL"))
                
                if db_table_name == "transacoes_financeiras":
                    db.execute(text("UPDATE transacoes_financeiras SET linha_orcamentaria_id = NULL WHERE linha_orcamentaria_id IS NOT NULL"))
                
                count_result = db.execute(text(f"SELECT COUNT(*) FROM {db_table_name}"))
                count = count_result.scalar() or 0
                
                db.execute(text(f"DELETE FROM {db_table_name}"))
                
                if savepoint:
                    savepoint.commit()
                
                resultado["tabelas_limpas"].append({
                    "tabela": table_name,
                    "registros": count
                })
                resultado["total_registros_removidos"] += count
                print(f"✅ Deletado {db_table_name}: {count} registros")
                
            except Exception as e:
                if savepoint:
                    try:
                        savepoint.rollback()
                    except:
                        pass
                
                error_msg = str(e)
                if 'InFailedSqlTransaction' in error_msg:
                    print(f"⚠️ Transação falhou para {table_name}, resetando...")
                    try:
                        db.rollback()
                        db.begin()
                    except:
                        pass
                
                resultado["erros"].append({
                    "tabela": table_name,
                    "erro": error_msg[:200]
                })
                print(f"❌ Erro ao limpar {table_name}: {error_msg[:100]}")
        
        # Registrar ação de auditoria na mesma transação
        log = LogAcao(
            user_id=current_user.id,
            acao=TipoAcao.DELETE,
            entidade="limpeza_selecionada",
            descricao=f"Limpeza selecionada: {len(tabelas_selecionadas)} tabelas do usuário",
            dados_antes=json.dumps({
                "tabelas_selecionadas": list(tabelas_selecionadas),
                "tabelas_expandidas": list(tabelas_expandidas)
            }),
            dados_depois=json.dumps({
                "total_registros_removidos": resultado["total_registros_removidos"],
                "tabelas_limpas": len(resultado["tabelas_limpas"]),
                "ordem_delecao": ordem_delecao
            })
        )
        db.add(log)
        
        # Commit único para todas as operações + auditoria
        db.commit()
        print(f"✅ Limpeza selecionada: {resultado['total_registros_removidos']} registros removidos de {len(resultado['tabelas_limpas'])} tabelas")
        
        return resultado
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao executar limpeza: {str(e)}")


@router.post("/admin/empresa/{empresa_id}")
def deletar_empresa_preservando_mestres(
    empresa_id: int,
    confirmar: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete uma empresa preservando dados mestres/auxiliares compartilhados.
    
    COMPORTAMENTO:
    - Dados MESTRES (categorias, produtos, clientes, fornecedores, contas, projetos, cartões):
      empresa_id → NULL (ficam disponíveis para outras empresas)
    - Dados TRANSACIONAIS (transações, planejamento, desmembramentos, faturas):
      Deletados em cascata junto com a empresa
    - Tabelas específicas (empresa_cnpjs, impostos empresa):
      Deletadas junto com a empresa
      
    NOTA: Este endpoint usa o serviço centralizado EmpresaService.
    """
    from app.services.empresas import EmpresaService
    
    # Chamar o serviço centralizado de deleção
    return EmpresaService.delete_empresa_with_preservation(
        empresa_id=empresa_id,
        db=db,
        current_user=current_user,
        confirmar=confirmar
    )


@router.post("/admin/cleanup/reset-database")
def reset_database_complete(
    confirmar: bool = False,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ⚠️ LIMPEZA COMPLETA DO BANCO DE DADOS (Exceto Usuários)
    
    Deleta PERMANENTEMENTE todos os dados persistentes respeitando Foreign Keys.
    Mantém apenas a tabela 'users' intacta.
    
    ORDEM DE DELEÇÃO (Filhos → Pais):
    1. Transações e detalhes
    2. Planejamento
    3. Desmembramentos
    4. Dados mestres
    5. Empresas e configuração
    6. Auditoria e logs
    """
    if not confirmar:
        raise HTTPException(status_code=400, detail="Operação requer confirmação. Adicione '?confirmar=true'")
    
    print("🔴 INICIANDO LIMPEZA COMPLETA DO BANCO DE DADOS...")
    
    try:
        # Script SQL com ordem correta de FKs
        sql_script = """
        DELETE FROM transacao_impostos_detalhes;
        DELETE FROM transacao_impostos;
        DELETE FROM transacao_mensalizacao;
        DELETE FROM transacao_categoria_contabil;
        DELETE FROM transacao_categoria_gerencial;
        DELETE FROM desmembramentos_itens;
        DELETE FROM desmembramentos_transacoes;
        DELETE FROM transacoes_cartao;
        UPDATE transacoes_financeiras SET parent_id = NULL WHERE parent_id IS NOT NULL;
        UPDATE transacoes_financeiras SET linha_orcamentaria_id = NULL WHERE linha_orcamentaria_id IS NOT NULL;
        DELETE FROM transacoes_financeiras;
        DELETE FROM entradas_financeiras;
        DELETE FROM saidas_financeiras;
        DELETE FROM linhaorc_impostos_detalhes;
        DELETE FROM linhaorc_impostos;
        DELETE FROM linhaorc_mensalizacao;
        DELETE FROM linhaorc_categoria_contabil;
        DELETE FROM linhaorc_categoria_gerencial;
        UPDATE linhas_orcamentarias SET parent_id = NULL WHERE parent_id IS NOT NULL;
        DELETE FROM linhas_orcamentarias;
        DELETE FROM planejamento_versoes;
        DELETE FROM faturas_cartao;
        DELETE FROM cartao_usuarios;
        DELETE FROM projeto_classificacoes;
        DELETE FROM regras_impostos_itens;
        DELETE FROM regras_impostos;
        DELETE FROM impostos;
        DELETE FROM cartoes_credito;
        DELETE FROM contas_bancarias;
        DELETE FROM contas_contabeis;
        DELETE FROM centros_custo;
        DELETE FROM projetos;
        DELETE FROM produtos_servicos;
        DELETE FROM categorias_gerenciais;
        DELETE FROM categorias_contabeis;
        DELETE FROM contatos_fornecedores;
        DELETE FROM fornecedores;
        DELETE FROM contatos_clientes;
        DELETE FROM pl_map;
        DELETE FROM clientes;
        DELETE FROM empresa_cnpjs;
        DELETE FROM empresas;
        DELETE FROM logs_acoes;
        DELETE FROM logs_acesso;
        DELETE FROM metricas_uso;
        DELETE FROM sessoes_usuario;
        DELETE FROM config;
        """
        
        # Executar cada comando separadamente para melhor tratamento de erro
        tabelas_deletadas = []
        total_registros = 0
        
        comandos = [cmd.strip() for cmd in sql_script.split(';') if cmd.strip()]
        
        for i, comando in enumerate(comandos, 1):
            tabela_nome = f"Tabela {i}"
            try:
                tabela_nome = comando.split()[-1] if len(comando.split()) > 0 else f"Tabela {i}"
                resultado = db.execute(text(comando))
                registros_deletados = resultado.rowcount if hasattr(resultado, 'rowcount') and resultado.rowcount else 0
                
                tabelas_deletadas.append({
                    "tabela": tabela_nome,
                    "registros": registros_deletados
                })
                
                if registros_deletados > 0:
                    print(f"  🗑️ {tabela_nome}: {registros_deletados} registros")
                    total_registros += registros_deletados
                else:
                    print(f"  ⚪ {tabela_nome}: vazia")
                    
            except Exception as e:
                print(f"  ⚠️ Erro ao deletar {tabela_nome}: {str(e)}")
        
        # Registrar ação de auditoria
        log = LogAcao(
            user_id=current_user.id,
            acao=TipoAcao.DELETE,
            entidade="reset_database",
            descricao="Limpeza completa do banco de dados (exceto usuários) via reset script",
            dados_depois=json.dumps({
                "total_registros_deletados": total_registros,
                "tabelas_processadas": len(tabelas_deletadas),
                "timestamp": datetime.now().isoformat()
            })
        )
        db.add(log)
        db.commit()
        
        print(f"✅ LIMPEZA CONCLUÍDA: {total_registros} registros deletados de {len(tabelas_deletadas)} tabelas")
        
        return {
            "status": "sucesso",
            "mensagem": "Banco de dados limpo com sucesso",
            "total_registros_deletados": total_registros,
            "tabelas_processadas": len(tabelas_deletadas),
            "tabelas_deletadas": tabelas_deletadas
        }
        
    except Exception as e:
        db.rollback()
        print(f"❌ ERRO NA LIMPEZA: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao limpar banco de dados: {str(e)}"
        )