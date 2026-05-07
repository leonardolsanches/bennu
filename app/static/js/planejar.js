// Estado global
let linhasOrcamentarias = [];
let empresas = [];
let versoes = [];
let versaoAtual = null;
let versaoSelecionada = null;
let filtrosAtivos = {
    empresa_id: null,
    mes: null,
    ano: null,
    versao_id: null
};

// Paginação e ordenação
const pagination = {
    receitas: { currentPage: 1, perPage: 10, totalItems: 0, totalPages: 1 },
    despesas: { currentPage: 1, perPage: 10, totalItems: 0, totalPages: 1 }
};

const sorting = {
    receitas: { column: 'mes', direction: 'asc' },
    despesas: { column: 'mes', direction: 'asc' }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📋 Inicializando página de planejamento orçamentário...');

    // Popular campo de ano com ano corrente + passados + 5 futuros
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    if (window.populateYearSelect) {
        window.populateYearSelect('filter-ano', { includePlaceholder: false });
    }
    document.getElementById('filter-ano').value = anoAtual;

    filtrosAtivos.ano = anoAtual;

    carregarEmpresas();
    configurarEventos();
    configurarEventosVersoes();
    inicializarTabelasAvancadas();

    // Carregar versões ANTES de carregar dados para garantir que os nomes apareçam corretamente
    await carregarVersoes();
    carregarDados();
});

async function carregarEmpresas() {
    try {
        const response = await fetch('/api/empresas');
        const data = await response.json();
        empresas = data.empresas || data || [];

        const selectEmpresa = document.getElementById('filter-empresa');
        selectEmpresa.innerHTML = '<option value="">Todas as empresas</option>';

        empresas.forEach(empresa => {
            const option = document.createElement('option');
            option.value = empresa.id;
            option.textContent = empresa.nome_fantasia;
            selectEmpresa.appendChild(option);
        });

        console.log('✅ Empresas carregadas:', empresas.length);
    } catch (error) {
        console.error('❌ Erro ao carregar empresas:', error);
    }
}

function inicializarTabelasAvancadas() {
    // Inicializar tabela de receitas
    if (document.getElementById('table-receitas-planejadas')) {
        window.advancedTableReceitas = new AdvancedTable('#table-receitas-planejadas', {
            enableResize: true,
            enableSort: true,
            enableFilter: true,
            storageKey: 'planejar-receitas'
        });

        // Override renderTable para renderizar com checkboxes e botões
        window.advancedTableReceitas.renderTable = function() {
            const tbody = document.getElementById('tbody-receitas');
            const dados = this.getFilteredData();

            // Atualizar paginação
            pagination.receitas.totalItems = dados.length;
            pagination.receitas.totalPages = Math.ceil(dados.length / pagination.receitas.perPage);

            // Paginar
            const start = (pagination.receitas.currentPage - 1) * pagination.receitas.perPage;
            const end = start + pagination.receitas.perPage;
            const dadosPagina = dados.slice(start, end);

            if (dadosPagina.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 40px;">
                            <p style="color: #6b7280;">Nenhuma receita encontrada</p>
                        </td>
                    </tr>
                `;
                atualizarControlesPaginacao('receitas');
                return;
            }

            tbody.innerHTML = dadosPagina.map(linha => `
                <tr>
                    <td>
                        <input type="checkbox" class="receitas-checkbox" value="${linha.id}" onchange="atualizarSelecao('receitas')">
                    </td>
                    <td>${linha.ano}/${String(linha.mes).padStart(2, '0')}</td>
                    <td>${linha.descricao || '-'}</td>
                    <td>${linha.cliente_nome || '-'}</td>
                    <td>${linha.projeto_nome || '-'}</td>
                    <td>${linha.versao_nome || '-'}</td>
                    <td><strong>${formatarMoeda(linha.valor_previsto)}</strong></td>
                    <td>
                        <div class="actions-cell">
                            <button class="btn-action btn-action-edit" onclick="editarLinha(${linha.id}, 'receita')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-action-delete" onclick="deletarLinha(${linha.id})" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            atualizarControlesPaginacao('receitas');
            atualizarSelecao('receitas');
        };

        console.log('✅ Tabela avançada de receitas inicializada');
    }

    // Inicializar tabela de despesas
    if (document.getElementById('table-despesas-planejadas')) {
        window.advancedTableDespesas = new AdvancedTable('#table-despesas-planejadas', {
            enableResize: true,
            enableSort: true,
            enableFilter: true,
            storageKey: 'planejar-despesas'
        });

        // Override renderTable para renderizar com checkboxes e botões
        window.advancedTableDespesas.renderTable = function() {
            const tbody = document.getElementById('tbody-despesas');
            const dados = this.getFilteredData();

            // Atualizar paginação
            pagination.despesas.totalItems = dados.length;
            pagination.despesas.totalPages = Math.ceil(dados.length / pagination.despesas.perPage);

            // Paginar
            const start = (pagination.despesas.currentPage - 1) * pagination.despesas.perPage;
            const end = start + pagination.despesas.perPage;
            const dadosPagina = dados.slice(start, end);

            if (dadosPagina.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 40px;">
                            <p style="color: #6b7280;">Nenhuma despesa encontrada</p>
                        </td>
                    </tr>
                `;
                atualizarControlesPaginacao('despesas');
                return;
            }

            tbody.innerHTML = dadosPagina.map(linha => `
                <tr>
                    <td>
                        <input type="checkbox" class="despesas-checkbox" value="${linha.id}" onchange="atualizarSelecao('despesas')">
                    </td>
                    <td>${linha.ano}/${String(linha.mes).padStart(2, '0')}</td>
                    <td>${linha.descricao || '-'}</td>
                    <td>${linha.fornecedor_id ? 'Fornecedor ID: ' + linha.fornecedor_id : '-'}</td>
                    <td>${linha.categoria_gerencial_id ? 'Cat. ID: ' + linha.categoria_gerencial_id : '-'}</td>
                    <td>${linha.versao_nome || '-'}</td>
                    <td><strong>${formatarMoeda(linha.valor_previsto)}</strong></td>
                    <td>
                        <div class="actions-cell">
                            <button class="btn-action btn-action-edit" onclick="editarLinha(${linha.id}, 'despesa')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-action-delete" onclick="deletarLinha(${linha.id})" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            atualizarControlesPaginacao('despesas');
            atualizarSelecao('despesas');
        };

        console.log('✅ Tabela avançada de despesas inicializada');
    }
}

function configurarEventos() {
    // Filtros
    document.getElementById('btn-filtrar').addEventListener('click', aplicarFiltros);

    // Abas
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            trocarAba(tab);
        });
    });

    // Paginação Receitas
    document.getElementById('receitas-prev-page').addEventListener('click', () => {
        if (pagination.receitas.currentPage > 1) {
            pagination.receitas.currentPage--;
            renderizarTabelaReceitas();
        }
    });

    document.getElementById('receitas-next-page').addEventListener('click', () => {
        if (pagination.receitas.currentPage < pagination.receitas.totalPages) {
            pagination.receitas.currentPage++;
            renderizarTabelaReceitas();
        }
    });

    // Paginação Despesas
    document.getElementById('despesas-prev-page').addEventListener('click', () => {
        if (pagination.despesas.currentPage > 1) {
            pagination.despesas.currentPage--;
            renderizarTabelaDespesas();
        }
    });

    document.getElementById('despesas-next-page').addEventListener('click', () => {
        if (pagination.despesas.currentPage < pagination.despesas.totalPages) {
            pagination.despesas.currentPage++;
            renderizarTabelaDespesas();
        }
    });
}

function aplicarFiltros() {
    filtrosAtivos.versao_id = document.getElementById('filter-versao').value || null;
    filtrosAtivos.empresa_id = document.getElementById('filter-empresa').value || null;
    filtrosAtivos.ano = parseInt(document.getElementById('filter-ano').value);

    // Resetar paginação
    pagination.receitas.currentPage = 1;
    pagination.despesas.currentPage = 1;

    carregarDados();
}

async function carregarDados() {
    try {
        const params = new URLSearchParams();
        params.append('ano', filtrosAtivos.ano);

        if (filtrosAtivos.empresa_id) {
            params.append('empresa_id', filtrosAtivos.empresa_id);
        }

        if (filtrosAtivos.versao_id) {
            params.append('versao_id', filtrosAtivos.versao_id);
        }

        const response = await fetch(`/api/planejamento/linhas?${params.toString()}`);
        const data = await response.json();

        linhasOrcamentarias = data.linhas || [];

        console.log('✅ Linhas orçamentárias carregadas:', linhasOrcamentarias.length);

        atualizarCards();
        renderizarTabelaReceitas();
        renderizarTabelaDespesas();

    } catch (error) {
        console.error('❌ Erro ao carregar linhas orçamentárias:', error);
    }
}

function atualizarCards() {
    // Mostrar TODAS as linhas do ano (sem filtro de mês) para sincronizar com tabelas
    const linhasAno = linhasOrcamentarias.filter(l => l.ano === filtrosAtivos.ano);

    const receitas = linhasAno.filter(l => l.categoria === 'receita');
    const despesas = linhasAno.filter(l => l.categoria === 'despesa');

    const totalReceitas = receitas.reduce((sum, l) => sum + parseFloat(l.valor_previsto), 0);
    const totalDespesas = despesas.reduce((sum, l) => sum + parseFloat(l.valor_previsto), 0);
    const saldo = totalReceitas - totalDespesas;

    document.getElementById('total-receitas-planejadas').textContent = formatarMoeda(totalReceitas);
    document.getElementById('total-despesas-planejadas').textContent = formatarMoeda(totalDespesas);
    document.getElementById('saldo-planejado').textContent = formatarMoeda(saldo);

    document.getElementById('count-receitas').textContent = `${receitas.length} lançamentos`;
    document.getElementById('count-despesas').textContent = `${despesas.length} lançamentos`;

    document.getElementById('counter-receitas').textContent = receitas.length;
    document.getElementById('counter-despesas').textContent = despesas.length;
}

function renderizarTabelaReceitas() {
    const tbody = document.getElementById('tbody-receitas');

    // Mostrar TODAS as receitas do ano (sem filtro de mês)
    const todasReceitas = linhasOrcamentarias.filter(l => 
        l.categoria === 'receita' && 
        l.ano === filtrosAtivos.ano
    );

    // Se já existe uma instância do AdvancedTable, usar ela
    if (window.advancedTableReceitas) {
        window.advancedTableReceitas.setData(todasReceitas);
        atualizarControlesPaginacao('receitas');
        return;
    }

    // Atualizar paginação
    pagination.receitas.totalItems = todasReceitas.length;
    pagination.receitas.totalPages = Math.ceil(todasReceitas.length / pagination.receitas.perPage);

    // Paginar
    const start = (pagination.receitas.currentPage - 1) * pagination.receitas.perPage;
    const end = start + pagination.receitas.perPage;
    const receitasPagina = todasReceitas.slice(start, end);

    if (receitasPagina.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <i class="fas fa-chart-line" style="font-size: 48px; color: #cbd5e0;"></i>
                    <p style="margin-top: 16px; color: #6b7280;">Nenhuma receita planejada para este período</p>
                </td>
            </tr>
        `;
        atualizarControlesPaginacao('receitas');
        return;
    }

    tbody.innerHTML = '';
    receitasPagina.forEach(linha => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <input type="checkbox" class="receitas-checkbox" value="${linha.id}" onchange="atualizarSelecao('receitas')" data-testid="checkbox-receita-${linha.id}">
            </td>
            <td>${linha.ano}/${String(linha.mes).padStart(2, '0')}</td>
            <td>${linha.descricao || '-'}</td>
            <td>${linha.cliente_nome || '-'}</td>
            <td>${linha.projeto_nome || '-'}</td>
            <td>${linha.versao_nome || '-'}</td>
            <td><strong>${formatarMoeda(linha.valor_previsto)}</strong></td>
            <td>
                <div class="actions-cell">
                    <button class="btn-action btn-action-edit" onclick="editarLinha(${linha.id}, 'receita')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-action-delete" onclick="deletarLinha(${linha.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    atualizarControlesPaginacao('receitas');
    atualizarSelecao('receitas');
}

function renderizarTabelaDespesas() {
    const tbody = document.getElementById('tbody-despesas');

    // Mostrar TODAS as despesas do ano (sem filtro de mês)
    const todasDespesas = linhasOrcamentarias.filter(l => 
        l.categoria === 'despesa' && 
        l.ano === filtrosAtivos.ano
    );

    // Se já existe uma instância do AdvancedTable, usar ela
    if (window.advancedTableDespesas) {
        window.advancedTableDespesas.setData(todasDespesas);
        atualizarControlesPaginacao('despesas');
        return;
    }

    // Atualizar paginação
    pagination.despesas.totalItems = todasDespesas.length;
    pagination.despesas.totalPages = Math.ceil(todasDespesas.length / pagination.despesas.perPage);

    // Paginar
    const start = (pagination.despesas.currentPage - 1) * pagination.despesas.perPage;
    const end = start + pagination.despesas.perPage;
    const despesasPagina = todasDespesas.slice(start, end);

    if (despesasPagina.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <i class="fas fa-chart-line" style="font-size: 48px; color: #cbd5e0;"></i>
                    <p style="margin-top: 16px; color: #6b7280;">Nenhuma despesa planejada para este período</p>
                </td>
            </tr>
        `;
        atualizarControlesPaginacao('despesas');
        return;
    }

    tbody.innerHTML = '';
    despesasPagina.forEach(linha => {
        const tr = document.createElement('tr');
        // Para despesas, continuamos mostrando fornecedor_id e categoria_gerencial_id pois não fazem parte do backend ainda
        tr.innerHTML = `
            <td>
                <input type="checkbox" class="despesas-checkbox" value="${linha.id}" onchange="atualizarSelecao('despesas')" data-testid="checkbox-despesa-${linha.id}">
            </td>
            <td>${linha.ano}/${String(linha.mes).padStart(2, '0')}</td>
            <td>${linha.descricao || '-'}</td>
            <td>${linha.fornecedor_id ? 'Fornecedor ID: ' + linha.fornecedor_id : '-'}</td>
            <td>${linha.categoria_gerencial_id ? 'Cat. ID: ' + linha.categoria_gerencial_id : '-'}</td>
            <td>${linha.versao_nome || '-'}</td>
            <td><strong>${formatarMoeda(linha.valor_previsto)}</strong></td>
            <td>
                <div class="actions-cell">
                    <button class="btn-action btn-action-edit" onclick="editarLinha(${linha.id}, 'despesa')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-action-delete" onclick="deletarLinha(${linha.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    atualizarControlesPaginacao('despesas');
    atualizarSelecao('despesas');
}

function atualizarControlesPaginacao(tipo) {
    const pag = pagination[tipo];
    const page = pag.currentPage;
    const pages = pag.totalPages;
    const totalItems = pag.totalItems;
    const perPage = pag.perPage;

    const from = totalItems > 0 ? (page - 1) * perPage + 1 : 0;
    const to = Math.min(page * perPage, totalItems);

    document.getElementById(`${tipo}-showing-from`).textContent = from;
    document.getElementById(`${tipo}-showing-to`).textContent = to;
    document.getElementById(`${tipo}-total-records`).textContent = totalItems;
    document.getElementById(`${tipo}-current-page`).textContent = page;
    document.getElementById(`${tipo}-total-pages`).textContent = pages;

    document.getElementById(`${tipo}-prev-page`).disabled = page <= 1;
    document.getElementById(`${tipo}-next-page`).disabled = page >= pages;
}

function trocarAba(tab) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById(`content-${tab}`).classList.add('active');
}

// Funções de edição
async function editarLinha(id, categoria) {
    console.log(`Editar linha ${id} (${categoria})`);
    if (categoria === 'receita') {
        window.location.href = `/planejar/editar-receita/${id}`;
    } else if (categoria === 'despesa') {
        window.location.href = `/planejar/editar-despesa/${id}`;
    }
}


async function deletarLinha(id) {
    if (!confirm('Tem certeza que deseja deletar esta linha orçamentária?')) {
        return;
    }

    try {
        const response = await fetch(`/api/planejamento/linhas/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Erro ao deletar');

        alert('Linha orçamentária deletada com sucesso!');
        carregarDados();
    } catch (error) {
        console.error('❌ Erro ao deletar:', error);
        alert('Erro ao deletar linha orçamentária');
    }
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor || 0);
}

function obterNomeVersao(linha) {
    if (!linha.versao_id) {
        return '-';
    }

    // Garantir comparação correta de tipos
    const versaoId = parseInt(linha.versao_id);
    const versao = versoes.find(v => parseInt(v.id) === versaoId);

    if (!versao) {
        return `ID ${linha.versao_id}`;
    }

    let badge = versao.nome;
    if (versao.is_ativo) {
        badge += ' ✓';
    }

    return badge;
}

// ========== GERENCIAMENTO DE VERSÕES ==========

async function carregarVersoes() {
    try {
        const response = await fetch('/api/planejamento/versoes/resumo');
        const data = await response.json();

        versoes = data.versoes || [];
        versaoAtual = data.versao_ativa;

        const select = document.getElementById('filter-versao');
        select.innerHTML = '<option value="">Versão Ativa</option>';

        versoes.forEach(v => {
            const option = document.createElement('option');
            option.value = v.id;
            option.dataset.ano = v.ano_referencia;
            let label = `${v.nome}`;
            if (v.is_ativo) label += ' (Ativa)';
            option.textContent = label;
            select.appendChild(option);
        });

        // Adicionar listener para sincronizar ano quando versão é selecionada
        select.removeEventListener('change', sincronizarAnoComVersao);
        select.addEventListener('change', sincronizarAnoComVersao);

        console.log('✅ Versões carregadas:', versoes.length);
    } catch (error) {
        console.error('❌ Erro ao carregar versões:', error);
    }
}

function sincronizarAnoComVersao(event) {
    const select = event.target;
    const selectedOption = select.options[select.selectedIndex];
    
    if (selectedOption && selectedOption.dataset.ano) {
        const ano = selectedOption.dataset.ano;
        const anoSelect = document.getElementById('filter-ano');
        
        if (anoSelect && ano) {
            anoSelect.value = ano;
            filtrosAtivos.ano = parseInt(ano);
            console.log('📅 Ano sincronizado com versão:', ano);
        }
    }
}

function configurarEventosVersoes() {
    document.getElementById('btn-gerenciar-versoes').addEventListener('click', () => {
        abrirModalVersoes();
    });

    document.getElementById('btn-criar-nova-versao').addEventListener('click', () => {
        fecharModalVersoes();
        abrirModalCriarVersao();
    });

    document.getElementById('form-criar-versao').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const ano = document.getElementById('versao-ano').value;
        const nome = document.getElementById('versao-nome').value.trim();
        const tipo = document.getElementById('versao-tipo').value;

        if (!nome) {
            alert('Por favor, informe o nome da versão.');
            return;
        }

        try {
            const response = await fetch('/api/planejamento/versoes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: nome,
                    ano: parseInt(ano),
                    tipo: tipo,
                    status: 'rascunho'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                alert(`Erro ao criar versão: ${error.detail || 'Erro desconhecido'}`);
                return;
            }

            const data = await response.json();
            alert(`Versão "${nome}" criada com sucesso para o ano ${ano}!`);

            fecharModalCriarVersao();
            document.getElementById('form-criar-versao').reset();

            await carregarVersoes();
            carregarDados();

        } catch (error) {
            console.error('Erro ao criar versão:', error);
            alert('Erro ao criar versão. Verifique o console.');
        }
    });
}

function abrirModalCriarVersao() {
    const modal = document.getElementById('modal-criar-versao');
    modal.style.display = 'block';
    
    // Popular campo de ano do modal se ainda não estiver populado
    const selectAnoModal = document.getElementById('versao-ano');
    if (selectAnoModal && selectAnoModal.options.length === 0 && window.populateYearSelect) {
        window.populateYearSelect('versao-ano', { includePlaceholder: false });
    }
    
    document.getElementById('versao-ano').value = filtrosAtivos.ano || new Date().getFullYear();
    document.getElementById('versao-nome').value = `Orçamento ${filtrosAtivos.ano || new Date().getFullYear()}`;
    document.getElementById('versao-tipo').value = 'baseline';
}

function fecharModalCriarVersao() {
    const modal = document.getElementById('modal-criar-versao');
    modal.style.display = 'none';
}

async function abrirModalVersoes() {
    const modal = document.getElementById('modal-versoes');
    modal.style.display = 'block';

    // Carregar versões novamente para ter dados frescos
    await carregarVersoesDetalhadas();
}

function fecharModalVersoes() {
    const modal = document.getElementById('modal-versoes');
    modal.style.display = 'none';
}

async function carregarVersoesDetalhadas() {
    try {
        const response = await fetch('/api/planejamento/versoes/resumo');
        const data = await response.json();

        const tbody = document.getElementById('tbody-versoes');

        if (!data.versoes || data.versoes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <p>Nenhuma versão encontrada</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';
        data.versoes.forEach(v => {
            const tr = document.createElement('tr');
            const isAtiva = v.is_ativo ? '✓' : '';
            const statusBadge = v.status === 'rascunho' ? 
                '<span style="color: #f59e0b;">Rascunho</span>' : 
                '<span style="color: #10b981;">Publicado</span>';

            // Construir botões de ação
            let acoes = '<div class="actions-cell" style="flex-wrap: wrap;">';

            // Botão publicar (apenas para rascunhos)
            if (v.status === 'rascunho') {
                acoes += `<button class="btn-action" onclick="publicarVersao(${v.id})" title="Publicar versão" data-testid="button-publicar-${v.id}" style="background: #10b981; color: white;">
                    <i class="fas fa-check"></i>
                </button>`;
            }

            // Botão ativar/desativar (apenas para versões publicadas)
            if (v.status === 'publicado') {
                const ativoIcon = v.is_ativo ? 'fa-toggle-on' : 'fa-toggle-off';
                const ativoTitle = v.is_ativo ? 'Desativar versão' : 'Ativar versão';
                const ativoColor = v.is_ativo ? '#10b981' : '#6b7280';
                acoes += `<button class="btn-action" onclick="toggleVersaoAtiva(${v.id})" title="${ativoTitle}" data-testid="button-toggle-ativo-${v.id}" style="background: ${ativoColor}; color: white;">
                    <i class="fas ${ativoIcon}"></i>
                </button>`;
            }

            // Botão renomear
            acoes += `<button class="btn-action btn-action-edit" onclick="abrirRenomearVersao(${v.id}, '${v.nome.replace(/'/g, "\\'")}')" title="Renomear versão" data-testid="button-renomear-${v.id}">
                <i class="fas fa-edit"></i>
            </button>`;

            // Botão copiar
            acoes += `<button class="btn-action" onclick="abrirCopiarVersao(${v.id}, '${v.nome.replace(/'/g, "\\'")}')" title="Copiar versão e itens" data-testid="button-copiar-${v.id}" style="background: #8b5cf6; color: white;">
                <i class="fas fa-copy"></i>
            </button>`;

            // Botão visualizar itens
            acoes += `<button class="btn-action" onclick="visualizarItensVersao(${v.id})" title="Visualizar itens" data-testid="button-visualizar-${v.id}" style="background: #6b7280; color: white;">
                <i class="fas fa-list"></i>
            </button>`;

            // Botões de deletar (apenas para versões não ativas)
            if (!v.is_ativo) {
                acoes += `<button class="btn-action btn-action-delete" onclick="deletarVersao(${v.id})" title="Deletar versão (sem itens)" data-testid="button-deletar-${v.id}">
                    <i class="fas fa-trash"></i>
                </button>`;

                acoes += `<button class="btn-action" onclick="deletarVersaoCompleto(${v.id})" title="Deletar versão + itens" data-testid="button-deletar-completo-${v.id}" style="background: #dc2626; color: white;">
                    <i class="fas fa-trash-alt"></i>
                </button>`;
            }

            acoes += '</div>';

            tr.innerHTML = `
                <td>${v.nome}</td>
                <td>${v.ano_referencia}</td>
                <td>${v.tipo}</td>
                <td>${statusBadge}</td>
                <td style="text-align: center; font-size: 18px;">${isAtiva}</td>
                <td style="text-align: center;">${v.total_linhas || 0}</td>
                <td>${acoes}</td>
            `;
            tbody.appendChild(tr);
        });

        console.log('✅ Versões detalhadas carregadas:', data.versoes.length);
    } catch (error) {
        console.error('❌ Erro ao carregar versões detalhadas:', error);
    }
}

async function publicarVersao(versaoId) {
    if (!confirm('Deseja publicar este rascunho como versão ativa? Isso desativará a versão ativa atual.')) {
        return;
    }

    try {
        const response = await fetch(`/api/planejamento/versoes/${versaoId}/publicar`, {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao publicar versão');
        }

        alert('Versão publicada com sucesso!');
        await carregarVersoesDetalhadas();
        await carregarVersoes(); // Atualizar select também
        carregarDados(); // Recarregar dados
    } catch (error) {
        console.error('❌ Erro ao publicar versão:', error);
        alert('Erro ao publicar versão: ' + error.message);
    }
}

async function deletarVersao(versaoId) {
    if (!confirm('Deseja realmente deletar esta versão? Esta ação não pode ser desfeita.')) {
        return;
    }

    try {
        const response = await fetch(`/api/planejamento/versoes/${versaoId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao deletar versão');
        }

        alert('✅ Versão deletada com sucesso!');
        await carregarVersoesDetalhadas();
        await carregarVersoes(); // Atualizar select também
        carregarDados(); // Recarregar dados
    } catch (error) {
        console.error('❌ Erro ao deletar versão:', error);
        alert('Erro ao deletar versão: ' + error.message);
    }
}

async function abrirRenomearVersao(versaoId, nomeAtual) {
    const novoNome = prompt('Digite o novo nome da versão:', nomeAtual);

    if (!novoNome || novoNome.trim() === '' || novoNome === nomeAtual) {
        return;
    }

    try {
        const response = await fetch(`/api/planejamento/versoes/${versaoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: novoNome.trim()
            })
        });

        if (!response.ok) {
            const error = await response.json();
            if (response.status === 409) {
                alert('⚠️ ' + (error.detail || 'Nome já existe. Escolha um nome diferente.'));
                return abrirRenomearVersao(versaoId, novoNome.trim());
            }
            throw new Error(error.detail || 'Erro ao renomear versão');
        }

        alert('✅ Versão renomeada com sucesso!');
        await carregarVersoesDetalhadas();
        await carregarVersoes();
    } catch (error) {
        console.error('❌ Erro ao renomear versão:', error);
        alert('Erro ao renomear versão: ' + error.message);
    }
}

async function abrirCopiarVersao(versaoId, nomeOriginal) {
    const novoNome = prompt('Digite o nome da nova versão (cópia):', nomeOriginal + ' - Cópia');

    if (!novoNome || novoNome.trim() === '') {
        return;
    }

    try {
        const response = await fetch(`/api/planejamento/versoes/${versaoId}/copiar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: novoNome.trim()
            })
        });

        if (!response.ok) {
            const error = await response.json();
            if (response.status === 409) {
                alert('⚠️ ' + (error.detail || 'Nome já existe. Escolha um nome diferente.'));
                return abrirCopiarVersao(versaoId, novoNome.trim());
            }
            throw new Error(error.detail || 'Erro ao copiar versão');
        }

        const data = await response.json();
        alert(`✅ ${data.message || 'Versão copiada com sucesso!'}`);
        await carregarVersoesDetalhadas();
        await carregarVersoes();
    } catch (error) {
        console.error('❌ Erro ao copiar versão:', error);
        alert('Erro ao copiar versão: ' + error.message);
    }
}

async function visualizarItensVersao(versaoId) {
    try {
        const response = await fetch(`/api/planejamento/versoes/${versaoId}/itens`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao carregar itens');
        }

        const data = await response.json();

        // Criar modal para exibir itens
        let modalHtml = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;" id="modal-itens-versao">
                <div style="background: white; padding: 24px; border-radius: 8px; max-width: 900px; max-height: 80vh; overflow-y: auto; width: 90%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3>${data.versao.nome} - ${data.total_itens} itens</h3>
                        <button onclick="fecharModalItensVersao()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                    </div>
                    <table class="data-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>Ano/Mês</th>
                                <th>Categoria</th>
                                <th>Descrição</th>
                                <th>Empresa</th>
                                <th>Cliente</th>
                                <th>Projeto</th>
                                <th>Valor</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (data.itens.length === 0) {
            modalHtml += '<tr><td colspan="8" style="text-align: center; padding: 20px;">Nenhum item encontrado</td></tr>';
        } else {
            data.itens.forEach(item => {
                const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_previsto);
                const categoria = item.categoria === 'receita' ? 
                    '<span style="color: #10b981;">Receita</span>' : 
                    '<span style="color: #dc2626;">Despesa</span>';

                modalHtml += `
                    <tr>
                        <td>${item.ano}/${item.mes}</td>
                        <td>${categoria}</td>
                        <td>${item.descricao || '-'}</td>
                        <td>${item.empresa_nome || '-'}</td>
                        <td>${item.cliente_nome || '-'}</td>
                        <td>${item.projeto_nome || '-'}</td>
                        <td style="text-align: right;">${valorFormatado}</td>
                        <td>
                            <div class="actions-cell">
                                <button class="btn-action btn-action-delete" onclick="removerItemVersao(${versaoId}, ${item.id})" title="Remover item">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        modalHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Adicionar modal ao body
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        document.body.appendChild(modalDiv);

    } catch (error) {
        console.error('❌ Erro ao visualizar itens:', error);
        alert('Erro ao visualizar itens: ' + error.message);
    }
}

function fecharModalItensVersao() {
    const modal = document.getElementById('modal-itens-versao');
    if (modal) {
        modal.parentElement.remove();
    }
}

async function removerItemVersao(versaoId, itemId) {
    if (!confirm('Deseja realmente remover este item da versão?')) {
        return;
    }

    try {
        const response = await fetch(`/api/planejamento/versoes/${versaoId}/itens/${itemId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao remover item');
        }

        alert('✅ Item removido com sucesso!');
        fecharModalItensVersao();
        await visualizarItensVersao(versaoId); // Reabrir modal com dados atualizados
        await carregarVersoesDetalhadas();
    } catch (error) {
        console.error('❌ Erro ao remover item:', error);
        alert('Erro ao remover item: ' + error.message);
    }
}

async function deletarVersaoCompleto(versaoId) {
    if (!confirm('⚠️ ATENÇÃO: Deseja realmente deletar esta versão E TODOS OS SEUS ITENS? Esta ação não pode ser desfeita!')) {
        return;
    }

    try {
        const response = await fetch(`/api/planejamento/versoes/${versaoId}/completo`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao deletar versão completa');
        }

        const data = await response.json();
        alert(`✅ ${data.message || 'Versão e itens deletados com sucesso!'}`);
        await carregarVersoesDetalhadas();
        await carregarVersoes();
        carregarDados();
    } catch (error) {
        console.error('❌ Erro ao deletar versão completa:', error);
        alert('Erro ao deletar versão completa: ' + error.message);
    }
}

// ========== SELEÇÃO MÚLTIPLA E DELEÇÃO ==========

function toggleSelectAll(tipo) {
    const selectAllCheckbox = document.getElementById(`${tipo}-select-all`);
    const checkboxes = document.querySelectorAll(`.${tipo}-checkbox`);

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });

    atualizarSelecao(tipo);
}

function atualizarSelecao(tipo) {
    const checkboxes = document.querySelectorAll(`.${tipo}-checkbox:checked`);
    const count = checkboxes.length;

    // Atualizar contador
    const countElement = document.getElementById(`${tipo}-count-selected`);
    if (countElement) {
        countElement.textContent = count;
    }

    // Mostrar/ocultar barra de ações
    const actionsBar = document.getElementById(`${tipo}-actions-bar`);
    if (actionsBar) {
        actionsBar.style.display = count > 0 ? 'block' : 'none';
    }

    // Atualizar estado do checkbox "selecionar todos"
    const selectAllCheckbox = document.getElementById(`${tipo}-select-all`);
    const allCheckboxes = document.querySelectorAll(`.${tipo}-checkbox`);
    if (selectAllCheckbox && allCheckboxes.length > 0) {
        selectAllCheckbox.checked = checkboxes.length === allCheckboxes.length;
        selectAllCheckbox.indeterminate = checkboxes.length > 0 && checkboxes.length < allCheckboxes.length;
    }
}

async function deletarLinhasSelecionadas(tipo) {
    const checkboxes = document.querySelectorAll(`.${tipo}-checkbox:checked`);
    const ids = Array.from(checkboxes).map(cb => cb.value);

    if (ids.length === 0) {
        alert('Nenhum item selecionado');
        return;
    }

    const categoria = tipo === 'receitas' ? 'receita' : 'despesa';
    const confirmMsg = `Tem certeza que deseja deletar ${ids.length} ${categoria}(s) selecionada(s)?`;

    if (!confirm(confirmMsg)) {
        return;
    }

    try {
        let sucessos = 0;
        let erros = 0;

        // Deletar em lote
        for (const id of ids) {
            try {
                const response = await fetch(`/api/planejamento/linhas/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    sucessos++;
                } else {
                    erros++;
                }
            } catch (error) {
                console.error(`Erro ao deletar linha ${id}:`, error);
                erros++;
            }
        }

        // Mostrar resultado
        if (erros === 0) {
            alert(`✅ ${sucessos} linha(s) deletada(s) com sucesso!`);
        } else {
            alert(`⚠️ ${sucessos} linha(s) deletada(s), ${erros} erro(s)`);
        }

        // Recarregar dados
        await carregarDados();

        // Limpar seleção
        const selectAllCheckbox = document.getElementById(`${tipo}-select-all`);
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }

    } catch (error) {
        console.error('❌ Erro ao deletar linhas:', error);
        alert('Erro ao deletar linhas selecionadas');
    }
}

async function toggleVersaoAtiva(versaoId) {
    try {
        const response = await fetch(`/api/planejamento/versoes/${versaoId}/toggle-ativo`, {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao alternar status ativo');
        }

        const data = await response.json();
        alert(data.message);

        // Recarregar tabela de versões e dados
        await carregarVersoesDetalhadas();
        await carregarVersoes();
        carregarDados();
    } catch (error) {
        console.error('❌ Erro ao alternar status ativo:', error);
        alert('Erro ao alternar status: ' + error.message);
    }
}

// Exportar funções para escopo global
window.fecharModalVersoes = fecharModalVersoes;
window.abrirModalCriarVersao = abrirModalCriarVersao;
window.fecharModalCriarVersao = fecharModalCriarVersao;
window.publicarVersao = publicarVersao;
window.deletarVersao = deletarVersao;
window.toggleVersaoAtiva = toggleVersaoAtiva;
window.toggleSelectAll = toggleSelectAll;
window.atualizarSelecao = atualizarSelecao;
window.deletarLinhasSelecionadas = deletarLinhasSelecionadas;

// Helper function to format currency, assuming it's available globally or imported
// If not, it should be defined here.
if (typeof formatarMoeda === 'undefined') {
    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor || 0);
    }
}