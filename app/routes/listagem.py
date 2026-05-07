"""
Rotas para páginas de listagem com seleção múltipla
"""
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.oauth import get_current_user
import json

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

# Configurações das entidades para as páginas de listagem
LISTAGEM_CONFIGS = {
    'empresas': {
        'title': '🏢 Gerenciar Empresas',
        'singular_name': 'Empresa',
        'table_fields': [
            {'name': 'nome', 'label': 'Nome Fantasia', 'type': 'text'},
            {'name': 'cnpj', 'label': 'CNPJ/Razão Social', 'type': 'text'},
            {'name': 'ativo', 'label': 'Ativo', 'type': 'boolean'}
        ]
    },
    'clientes': {
        'title': '👥 Gerenciar Clientes',
        'singular_name': 'Cliente',
        'table_fields': [
            {'name': 'nome', 'label': 'Nome', 'type': 'text'},
            {'name': 'documento', 'label': 'CPF/CNPJ', 'type': 'text'},
            {'name': 'status', 'label': 'Status', 'type': 'select', 'options': [
                {'value': 'ativo', 'label': 'Ativo'},
                {'value': 'inativo', 'label': 'Inativo'}
            ]}
        ]
    },
    'fornecedores': {
        'title': '🚚 Gerenciar Fornecedores', 
        'singular_name': 'Fornecedor',
        'table_fields': [
            {'name': 'nome', 'label': 'Nome', 'type': 'text'},
            {'name': 'documento', 'label': 'CPF/CNPJ', 'type': 'text'},
            {'name': 'tipo_pessoa', 'label': 'Tipo', 'type': 'select', 'options': [
                {'value': 'fisica', 'label': 'Pessoa Física'},
                {'value': 'juridica', 'label': 'Pessoa Jurídica'}
            ]},
            {'name': 'email', 'label': 'E-mail', 'type': 'text'},
            {'name': 'telefone', 'label': 'Telefone', 'type': 'text'},
            {'name': 'ativo', 'label': 'Ativo', 'type': 'boolean'}
        ]
    },
    'projetos': {
        'title': '📁 Gerenciar Projetos',
        'singular_name': 'Projeto', 
        'table_fields': [
            {'name': 'nome', 'label': 'Nome do Projeto', 'type': 'text'},
            {'name': 'clientes_nomes', 'label': 'Clientes Associados', 'type': 'text'},
            {'name': 'ativo', 'label': 'Ativo', 'type': 'boolean'}
        ]
    },
    'produtos-servicos': {
        'title': '📦 Gerenciar Serviços',
        'singular_name': 'Serviço',
        'table_fields': [
            {'name': 'nome', 'label': 'Nome', 'type': 'text'},
            {'name': 'clientes_nomes', 'label': 'Clientes Associados', 'type': 'text'},
            {'name': 'ativo', 'label': 'Ativo', 'type': 'boolean'}
        ]
    },
    'categorias-contabeis': {
        'title': '📋 Gerenciar Categorias Contábeis',
        'singular_name': 'Categoria Contábil',
        'table_fields': [
            {'name': 'nome', 'label': 'Nome', 'type': 'text'},
            {'name': 'codigo', 'label': 'Código', 'type': 'text'},
            {'name': 'descricao', 'label': 'Descrição', 'type': 'text'},
            {'name': 'ativo', 'label': 'Ativo', 'type': 'boolean'}
        ]
    },
    'categorias-gerenciais': {
        'title': '📊 Gerenciar Categorias Gerenciais',
        'singular_name': 'Categoria Gerencial', 
        'table_fields': [
            {'name': 'nome', 'label': 'Nome', 'type': 'text'},
            {'name': 'codigo', 'label': 'Código', 'type': 'text'},
            {'name': 'descricao', 'label': 'Descrição', 'type': 'text'},
            {'name': 'ativo', 'label': 'Ativo', 'type': 'boolean'}
        ]
    },
    'centros-custo': {
        'title': '🎯 Gerenciar Centros de Custo',
        'singular_name': 'Centro de Custo',
        'table_fields': [
            {'name': 'nome', 'label': 'Nome', 'type': 'text'},
            {'name': 'codigo', 'label': 'Código', 'type': 'text'}, 
            {'name': 'ativo', 'label': 'Ativo', 'type': 'boolean'}
        ]
    },
    'contas-bancarias': {
        'title': '🏦 Gerenciar Contas Bancárias',
        'singular_name': 'Conta Bancária',
        'table_fields': [
            {'name': 'nome', 'label': 'Nome', 'type': 'text'},
            {'name': 'banco', 'label': 'Banco', 'type': 'text'},
            {'name': 'agencia', 'label': 'Agência', 'type': 'text'},
            {'name': 'conta', 'label': 'Conta', 'type': 'text'},
            {'name': 'tipo', 'label': 'Tipo', 'type': 'text'},
            {'name': 'ativo', 'label': 'Ativo', 'type': 'boolean'}
        ]
    },
    'impostos': {
        'title': '📊 Gerenciar Impostos',
        'singular_name': 'Imposto',
        'table_fields': [
            {'name': 'empresa_nome', 'label': 'Empresa', 'type': 'text'},
            {'name': 'nome', 'label': 'Nome', 'type': 'text'},
            {'name': 'valor', 'label': 'Alíquota (%)', 'type': 'number'},
            {'name': 'tipo', 'label': 'Tipo', 'type': 'select', 'options': [
                {'value': 'percentual', 'label': 'Percentual'},
                {'value': 'fixo', 'label': 'Valor Fixo'}
            ]},
            {'name': 'ativo', 'label': 'Ativo', 'type': 'boolean'}
        ]
    },
    'cartoes-credito': {
        'title': '💳 Gerenciar Cartões de Crédito',
        'singular_name': 'Cartão de Crédito',
        'table_fields': [
            {'name': 'nome', 'label': 'Nome', 'type': 'text'},
            {'name': 'numero_final', 'label': 'Final do Cartão', 'type': 'text'},
            {'name': 'bandeira', 'label': 'Bandeira', 'type': 'text'},
            {'name': 'limite', 'label': 'Limite', 'type': 'number'},
            {'name': 'ativo', 'label': 'Ativo', 'type': 'boolean'}
        ]
    },
    'subcategorias': {
        'title': '📂 Gerenciar Subcategorias',
        'singular_name': 'Subcategoria',
        'table_fields': [
            {'name': 'nome', 'label': 'Nome', 'type': 'text'},
            {'name': 'codigo', 'label': 'Código', 'type': 'text'},
            {'name': 'tipo', 'label': 'Tipo', 'type': 'select', 'options': [
                {'value': 'contabil', 'label': 'Contábil'},
                {'value': 'gerencial', 'label': 'Gerencial'}
            ]},
            {'name': 'categoria_pai', 'label': 'Categoria Pai', 'type': 'text'},
            {'name': 'ativo', 'label': 'Ativo', 'type': 'boolean'}
        ]
    }
}

@router.get("/listagem/{entity_type}")
async def listagem_page(
    entity_type: str,
    request: Request,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Página de listagem para entidades auxiliares"""

    # Verificar se a entidade é válida
    if entity_type not in LISTAGEM_CONFIGS:
        raise HTTPException(status_code=404, detail="Entidade não encontrada")

    config = LISTAGEM_CONFIGS[entity_type]
    config_json = json.dumps(config)
    
    # Cache-buster para forçar reload de JavaScript
    import time
    cache_bust = int(time.time())

    return templates.TemplateResponse(request, "listagem.html", {
        "entity_type": entity_type,
        "config": config,
        "config_json": config_json,
        "cache_bust": cache_bust
    })

@router.get("/editar-receita/{transacao_id}", response_class=HTMLResponse)
async def editar_receita(request: Request, transacao_id: int, current_user = Depends(get_current_user)):
    """Página de edição de receita - usa template unificado"""
    return templates.TemplateResponse(request, "nova_receita.html", {
        "transacao_id": transacao_id
    })

@router.get("/editar-despesa/{transacao_id}", response_class=HTMLResponse)
async def editar_despesa(request: Request, transacao_id: int, current_user = Depends(get_current_user)):
    """Página de edição de despesa - usa template unificado"""
    return templates.TemplateResponse(request, "nova_despesa.html", {
        "transacao_id": transacao_id
    })