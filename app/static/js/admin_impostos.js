let impostosSelecionados = [];
let todosImpostos = [];

// Headers para forçar dados frescos do servidor (sem cache)
const NO_CACHE_HEADERS = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
};

// Adiciona timestamp na URL para evitar cache do navegador
function addCacheBuster(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_t=${Date.now()}`;
}

// Carregar dados iniciais
document.addEventListener('DOMContentLoaded', function() {
    carregarEmpresas();
    carregarProdutosServicos();
    carregarImpostos();
});

// Carregar empresas
async function carregarEmpresas() {
    try {
        const response = await fetch(addCacheBuster('/api/empresas'), {headers: NO_CACHE_HEADERS});
        const empresas = await response.json();
        
        const selects = ['filtro-empresa', 'imposto-empresa'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const isFilter = selectId.startsWith('filtro');
                if (!isFilter) select.innerHTML = '<option value="">Selecione...</option>';
                
                empresas.forEach(empresa => {
                    const option = document.createElement('option');
                    option.value = empresa.id;
                    option.textContent = empresa.nome_fantasia || empresa.razao_social;
                    select.appendChild(option);
                });
            }
        });
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
    }
}

// Carregar produtos/serviços
async function carregarProdutosServicos() {
    try {
        const response = await fetch(addCacheBuster('/api/produtos-servicos'), {headers: NO_CACHE_HEADERS});
        const produtos = await response.json();
        
        const select = document.getElementById('imposto-produto');
        select.innerHTML = '<option value="">Imposto geral da empresa</option>';
        
        produtos.forEach(produto => {
            const option = document.createElement('option');
            option.value = produto.id;
            option.textContent = produto.nome;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar produtos/serviços:', error);
    }
}

// Carregar impostos
async function carregarImpostos() {
    try {
        const response = await fetch(addCacheBuster('/api/impostos'), {headers: NO_CACHE_HEADERS});
        todosImpostos = await response.json();
        
        aplicarFiltros();
    } catch (error) {
        console.error('Erro ao carregar impostos:', error);
        mostrarErro('Erro ao carregar impostos');
    }
}

// Aplicar filtros
function aplicarFiltros() {
    const filtroEmpresa = document.getElementById('filtro-empresa').value;
    const filtroTipo = document.getElementById('filtro-tipo').value;
    const filtroAtivo = document.getElementById('filtro-ativo').value;
    
    let impostosFiltrados = todosImpostos;
    
    if (filtroEmpresa) {
        impostosFiltrados = impostosFiltrados.filter(i => i.empresa_id == filtroEmpresa);
    }
    
    if (filtroTipo) {
        impostosFiltrados = impostosFiltrados.filter(i => i.tipo === filtroTipo);
    }
    
    if (filtroAtivo) {
        const ativo = filtroAtivo === 'true';
        impostosFiltrados = impostosFiltrados.filter(i => i.ativo === ativo);
    }
    
    renderizarTabela(impostosFiltrados);
}

// Renderizar tabela
function renderizarTabela(impostos) {
    const tbody = document.getElementById('lista-impostos');
    
    if (!impostos || impostos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">Nenhum imposto encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = impostos.map(imposto => `
        <tr>
            <td><input type="checkbox" value="${imposto.id}" onchange="atualizarSelecao()" data-testid="checkbox-imposto-${imposto.id}"></td>
            <td>${imposto.nome}</td>
            <td>${imposto.empresa_nome || '-'}</td>
            <td>${imposto.produto_servico_nome || 'Geral'}</td>
            <td style="text-align: right;">${Number(imposto.valor).toFixed(2)}%</td>
            <td>${imposto.tipo ? `<span class="badge badge-${getTipoCor(imposto.tipo)}">${imposto.tipo.toUpperCase()}</span>` : '-'}</td>
            <td>${imposto.ativo ? '<span class="badge badge-success">ATIVO</span>' : '<span class="badge badge-secondary">INATIVO</span>'}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn-action btn-action-edit" onclick="editarImposto(${imposto.id})" data-testid="button-editar-${imposto.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-action-delete" onclick="excluirImposto(${imposto.id})" data-testid="button-excluir-${imposto.id}" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getTipoCor(tipo) {
    const cores = {
        'federal': 'primary',
        'estadual': 'info',
        'municipal': 'warning'
    };
    return cores[tipo] || 'secondary';
}

// Seleção em massa
function selecionarTodos(checkbox) {
    const checkboxes = document.querySelectorAll('#lista-impostos input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
    atualizarSelecao();
}

function atualizarSelecao() {
    const checkboxes = document.querySelectorAll('#lista-impostos input[type="checkbox"]:checked');
    impostosSelecionados = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    const acoesDiv = document.getElementById('acoes-massa');
    const countSpan = document.getElementById('count-selecionados');
    
    if (impostosSelecionados.length > 0) {
        acoesDiv.style.display = 'block';
        countSpan.textContent = `${impostosSelecionados.length} ${impostosSelecionados.length === 1 ? 'item selecionado' : 'itens selecionados'}`;
    } else {
        acoesDiv.style.display = 'none';
    }
}

// Novo imposto
function novoImposto() {
    document.getElementById('modal-title').textContent = 'Novo Imposto';
    document.getElementById('form-imposto').reset();
    document.getElementById('imposto-id').value = '';
    document.getElementById('imposto-ativo').checked = true;
    document.getElementById('modal-imposto').style.display = 'flex';
}

// Editar imposto
async function editarImposto(id) {
    try {
        const response = await fetch(addCacheBuster(`/api/impostos/${id}`), {headers: NO_CACHE_HEADERS});
        const imposto = await response.json();
        
        document.getElementById('modal-title').textContent = 'Editar Imposto';
        document.getElementById('imposto-id').value = imposto.id;
        document.getElementById('imposto-empresa').value = imposto.empresa_id;
        document.getElementById('imposto-produto').value = imposto.produto_servico_id || '';
        document.getElementById('imposto-nome').value = imposto.nome;
        document.getElementById('imposto-valor').value = imposto.valor;
        document.getElementById('imposto-tipo').value = imposto.tipo || '';
        document.getElementById('imposto-ativo').checked = imposto.ativo;
        
        document.getElementById('modal-imposto').style.display = 'flex';
    } catch (error) {
        console.error('Erro ao carregar imposto:', error);
        mostrarErro('Erro ao carregar imposto');
    }
}

// Salvar imposto
async function salvarImposto() {
    const id = document.getElementById('imposto-id').value;
    const dados = {
        empresa_id: parseInt(document.getElementById('imposto-empresa').value),
        produto_servico_id: document.getElementById('imposto-produto').value ? parseInt(document.getElementById('imposto-produto').value) : null,
        nome: document.getElementById('imposto-nome').value,
        valor: parseFloat(document.getElementById('imposto-valor').value),
        tipo: document.getElementById('imposto-tipo').value || null,
        ativo: document.getElementById('imposto-ativo').checked
    };
    
    try {
        const url = id ? `/api/impostos/${id}` : '/api/impostos';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(dados)
        });
        
        if (response.ok) {
            fecharModal();
            carregarImpostos();
            mostrarSucesso(id ? 'Imposto atualizado com sucesso!' : 'Imposto criado com sucesso!');
        } else {
            throw new Error('Erro ao salvar imposto');
        }
    } catch (error) {
        console.error('Erro ao salvar:', error);
        mostrarErro('Erro ao salvar imposto');
    }
}

// Excluir imposto
async function excluirImposto(id) {
    if (!confirm('Deseja realmente excluir este imposto?')) return;
    
    try {
        const response = await fetch(`/api/impostos/${id}`, {method: 'DELETE'});
        if (response.ok) {
            carregarImpostos();
            mostrarSucesso('Imposto excluído com sucesso!');
        } else {
            throw new Error('Erro ao excluir');
        }
    } catch (error) {
        console.error('Erro ao excluir:', error);
        mostrarErro('Erro ao excluir imposto');
    }
}

// Excluir selecionados
async function excluirSelecionados() {
    if (impostosSelecionados.length === 0) return;
    if (!confirm(`Deseja realmente excluir ${impostosSelecionados.length} imposto(s)?`)) return;
    
    try {
        const response = await fetch('/api/impostos/bulk-delete', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ids: impostosSelecionados})
        });
        
        if (response.ok) {
            impostosSelecionados = [];
            carregarImpostos();
            mostrarSucesso('Impostos excluídos com sucesso!');
        } else {
            throw new Error('Erro ao excluir');
        }
    } catch (error) {
        console.error('Erro ao excluir:', error);
        mostrarErro('Erro ao excluir impostos');
    }
}

function fecharModal() {
    document.getElementById('modal-imposto').style.display = 'none';
}

function mostrarSucesso(msg) {
    alert(msg);
}

function mostrarErro(msg) {
    alert(msg);
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('modal-imposto');
    if (event.target === modal) {
        fecharModal();
    }
}
