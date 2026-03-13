// Sistema de Categorização Moderno - Bennu Finance
console.log('🚀 ARQUIVO categorizar.js CARREGADO!');
let chartsInstance = {};
let selectedTransactionsReceitas = new Set();
let selectedTransactionsDespesas = new Set();
let allReceitas = [];
let allDespesas = [];
let filteredReceitas = [];
let filteredDespesas = [];
let currentTab = 'despesas';

// Tabelas avançadas
let despesasTable = null;
let receitasTable = null;

// Variáveis para controle de ordenação
let sortState = {
    despesas: { column: 'data_transacao', direction: 'desc' },
    receitas: { column: 'data_transacao', direction: 'desc' }
};

// Variáveis para filtros de coluna
let columnFilters = {
    despesas: {},
    receitas: {}
};
let currentColumnFilter = {
    column: null,
    tabType: null,
    position: { x: 0, y: 0 }
};

// Estado de paginação por aba
let pagination = {
    despesas: {
        currentPage: 1,
        perPage: 10,
        totalItems: 0,
        totalPages: 1
    },
    receitas: {
        currentPage: 1,
        perPage: 10,
        totalItems: 0,
        totalPages: 1
    }
};

// Configuração de cores para gráficos
const CHART_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280',
    '#14b8a6', '#a855f7', '#22c55e', '#a855f7', '#eab308',
    '#14b8a6', '#a855f7', '#22c55e', '#ec4899', '#6b7280'
];

// ✅ EVENT DELEGATION GLOBAL: Anexar event listeners ao document uma única vez
// Isso garante que funcionem mesmo após re-renderizações e navegação
document.addEventListener('change', (e) => {
    const target = e.target;
    
    // Despesas checkboxes
    if (target.id === 'select-all-despesas' || target.id === 'select-all-despesas-header') {
        selectAllPage('despesas', e);
    } else if (target.id === 'select-all-filtered-despesas') {
        selectAllFiltered('despesas');
    }
    
    // Receitas checkboxes
    else if (target.id === 'select-all-receitas' || target.id === 'select-all-receitas-header') {
        selectAllPage('receitas', e);
    } else if (target.id === 'select-all-filtered-receitas') {
        selectAllFiltered('receitas');
    }
});

document.addEventListener('click', (e) => {
    // Usar closest() para capturar cliques em elementos filhos (como SVG dentro de botões)
    
    // Botão "Categorizar Selecionados" - Despesas
    if (e.target.closest('#categorize-selected-despesas')) {
        e.preventDefault();
        e.stopPropagation();
        openCategorization('despesas');
        return;
    }
    
    // Botão "Categorizar Selecionados" - Receitas
    if (e.target.closest('#categorize-selected-receitas')) {
        e.preventDefault();
        e.stopPropagation();
        openCategorization('receitas');
        return;
    }
    
    // Botão "Desselecionar Todos" - Despesas
    if (e.target.closest('#deselect-all-despesas')) {
        deselectAll('despesas');
        return;
    }
    
    // Botão "Desselecionar Todos" - Receitas
    if (e.target.closest('#deselect-all-receitas')) {
        deselectAll('receitas');
        return;
    }
});

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎯 Carregando página de categorização moderna com abas...');
    console.log('🔧 DEBUG: Expondo funções globalmente...');

    // Popular campo de ano com ano corrente + passados + 5 futuros
    if (window.populateYearSelect) {
        window.populateYearSelect('filter-ano', { includeAllOption: true, selectedYear: null });
    }

    try {
        console.log('📁 Carregando dados iniciais...');
        console.log('🔄 Iniciando carregamento de dados em paralelo...');
        console.log('📊 Chamando loadSummaryCards()...');
        console.log('📊 Chamando loadAllTransactionsData()...');
        console.log('📊 Chamando loadFilters()...');

        // ✅ TESTE: Executar funções separadamente para identificar qual falha
        console.log('📊 1/3: Executando loadSummaryCards()...');
        await loadSummaryCards();
        console.log('✅ 1/3: loadSummaryCards() concluído');

        console.log('📊 2/3: Executando loadAllTransactionsData()...');
        await loadAllTransactionsData();
        console.log('✅ 2/3: loadAllTransactionsData() concluído');

        console.log('📊 3/3: Executando loadFilters()...');
        await loadFilters();
        console.log('✅ 3/3: loadFilters() concluído');

        console.log('✅ Dados iniciais carregados');

        // Verificar integridade dos dados e alertar sobre inconsistências
        console.log('🔍 Verificando integridade dos dados...');
        await checkDataIntegrity();
        console.log('✅ Verificação de integridade concluída');

        // Inicializar tabelas avançadas ANTES de chamar switchTab
        console.log('🔧 Inicializando tabelas avançadas...');
        initAdvancedTables();
        console.log('✅ Tabelas avançadas inicializadas');

        // Inicializar aba de despesas como ativa DEPOIS das tabelas
        console.log('🔄 Inicializando aba de despesas...');
        switchTab('despesas');
        console.log('✅ Aba de despesas inicializada');

        setupEventListeners();

        // Atualizar contador inicial com fallback
        if (typeof updateRecordCounts === 'function') {
            updateRecordCounts();
        }

        console.log('✅ Página de categorização carregada com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao carregar página:', error);
        showErrorMessage('Erro ao carregar dados da categorização.');
    }
});

// Função para inicializar tabelas avançadas
function initAdvancedTables() {
    console.log('🔧 Inicializando tabelas avançadas...');

    // Inicializar tabela de despesas
    if (document.getElementById('despesas-table')) {
        despesasTable = new AdvancedTable('#despesas-table', {
            enableResize: true,
            enableSort: true,
            enableFilter: true,
            storageKey: 'categorizar-despesas'
        });

        // 🔧 Override para usar apenas dados locais nos filtros
        despesasTable.populateFilterOptions = async function(container, field) {
            console.log(`🔍 [DESPESAS] Populando filtro local para campo "${field}"`);
            
            const uniqueValues = [...new Set(
                this.data.map(row => {
                    const value = row[field] !== undefined ? row[field] : this.getFieldValue(row, field);
                    return value;
                })
                .filter(val => val !== null && val !== undefined && val !== '')
            )].sort();

            console.log(`📋 [DESPESAS] Valores únicos para "${field}":`, uniqueValues);

            const currentFilter = this.filters[field] || [];

            container.innerHTML = uniqueValues.map(value => `
                <div class="filter-option">
                    <input type="checkbox" value="${value}" ${currentFilter.includes(value) ? 'checked' : ''}>
                    <span>${this.formatValue ? this.formatValue(value) : value}</span>
                </div>
            `).join('');

            console.log(`✅ [DESPESAS] Filtro "${field}": ${uniqueValues.length} opções populadas`);
        };

        // Sobrescrever renderização
        despesasTable.renderTable = () => {
            filteredDespesas = despesasTable.getFilteredData();
            renderDespesasTable();
        };

        console.log('✅ Tabela de despesas inicializada com filtros locais');
    }

    // Inicializar tabela de receitas
    if (document.getElementById('receitas-table')) {
        receitasTable = new AdvancedTable('#receitas-table', {
            enableResize: true,
            enableSort: true,
            enableFilter: true,
            storageKey: 'categorizar-receitas'
        });

        // 🔧 Override para usar apenas dados locais nos filtros
        receitasTable.populateFilterOptions = async function(container, field) {
            console.log(`🔍 [RECEITAS] Populando filtro local para campo "${field}"`);
            
            const uniqueValues = [...new Set(
                this.data.map(row => {
                    const value = row[field] !== undefined ? row[field] : this.getFieldValue(row, field);
                    return value;
                })
                .filter(val => val !== null && val !== undefined && val !== '')
            )].sort();

            console.log(`📋 [RECEITAS] Valores únicos para "${field}":`, uniqueValues);

            const currentFilter = this.filters[field] || [];

            container.innerHTML = uniqueValues.map(value => `
                <div class="filter-option">
                    <input type="checkbox" value="${value}" ${currentFilter.includes(value) ? 'checked' : ''}>
                    <span>${this.formatValue ? this.formatValue(value) : value}</span>
                </div>
            `).join('');

            console.log(`✅ [RECEITAS] Filtro "${field}": ${uniqueValues.length} opções populadas`);
        };

        // Sobrescrever renderização
        receitasTable.renderTable = () => {
            filteredReceitas = receitasTable.getFilteredData();
            renderReceitasTable();
        };

        console.log('✅ Tabela de receitas inicializada com filtros locais');
    }
}

// Função para alternar entre abas
async function switchTab(tabName) {
    currentTab = tabName;

    // Atualizar botões das abas
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Atualizar conteúdo das abas
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`content-${tabName}`).classList.add('active');

    // Atualizar tabelas
    document.querySelectorAll('.transactions-section').forEach(section => section.classList.remove('active'));
    document.getElementById(`table-${tabName}`).classList.add('active');

    // 🚀 PAGINAÇÃO: Mostrar/esconder controles de paginação corretos
    const paginationDespesas = document.getElementById('pagination-despesas');
    const paginationReceitas = document.getElementById('pagination-receitas');

    if (paginationDespesas && paginationReceitas) {
        if (tabName === 'despesas') {
            paginationDespesas.style.display = 'block';
            paginationReceitas.style.display = 'none';
        } else if (tabName === 'receitas') {
            paginationDespesas.style.display = 'none';
            paginationReceitas.style.display = 'block';
        }
    }

    // 🚀 PAGINAÇÃO: Resetar para página 1 ao trocar de aba
    if (tabName === 'despesas') {
        pagination.despesas.currentPage = 1;
    } else if (tabName === 'receitas') {
        pagination.receitas.currentPage = 1;
    }

    // Atualizar dados das tabelas avançadas se necessário
    if (tabName === 'despesas' && despesasTable && allDespesas.length > 0) {
        despesasTable.setData(allDespesas);
    } else if (tabName === 'receitas' && receitasTable && allReceitas.length > 0) {
        receitasTable.setData(allReceitas);
    }

    // Alternar filtros baseado na aba (layout inline usando data-filter-type)
    document.querySelectorAll('[data-filter-type="despesas"]').forEach(el => {
        el.style.display = tabName === 'despesas' ? 'inline-block' : 'none';
    });
    document.querySelectorAll('[data-filter-type="receitas"]').forEach(el => {
        el.style.display = tabName === 'receitas' ? 'inline-block' : 'none';
    });

    if (tabName === 'despesas') {
        // Limpar filtros específicos de receitas para evitar inconsistências
        const clienteFilter = document.getElementById('filter-cliente');
        const projetoFilter = document.getElementById('filter-projeto');
        const produtoFilter = document.getElementById('filter-produto-servico');
        if (clienteFilter) clienteFilter.value = '';
        if (projetoFilter) projetoFilter.value = '';
        if (produtoFilter) produtoFilter.value = '';

    } else if (tabName === 'receitas') {
        // Limpar filtros específicos de despesas para evitar inconsistências
        const despesasFiltersToReset = ['filter-categoria-contabil', 'filter-subcategoria-contabil', 'filter-categoria-gerencial', 'filter-subcategoria-gerencial', 'filter-centro-custo', 'filter-conta-contabil'];
        despesasFiltersToReset.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }

    // NÃO aplicar filtros automaticamente ao trocar de aba - apenas limpar
    // Os dados já foram carregados corretamente
    console.log('🔄 Aba trocada, dados já carregados sem filtros');

    // CRÍTICO: Renderizar a tabela após trocar de aba
    console.log('🔄 Renderizando tabela para aba:', tabName);
    renderTransactionsTableForTab(tabName);

    // Carregar dados específicos da aba
    loadChartsForTab(tabName);
    updateSelectionCountForTab(tabName);

    // ✅ CORREÇÃO: Usar dados filtrados para contadores, não dados completos
    const countDespesasElement = document.getElementById('counter-despesas');
    const countReceitasElement = document.getElementById('counter-receitas');

    if (countDespesasElement) {
        countDespesasElement.textContent = filteredDespesas.length;
    }
    if (countReceitasElement) {
        countReceitasElement.textContent = filteredReceitas.length;
    }

    // Atualizar contador de registros
    if (typeof updateRecordCounts === 'function') {
        updateRecordCounts();
    } else {
        // Fallback: atualizar contadores manualmente
        console.log('📊 Atualizando contadores manualmente...');
        const countDespesas = document.getElementById('count-despesas');
        const countReceitas = document.getElementById('count-receitas');

        if (countDespesas) {
            countDespesas.textContent = `(${filteredDespesas.length} registros)`;
            console.log(`✅ Count despesas atualizado: ${filteredDespesas.length}`);
        }

        if (countReceitas) {
            countReceitas.textContent = `(${filteredReceitas.length} registros)`;
            console.log(`✅ Count receitas atualizado: ${filteredReceitas.length}`);
        }

        // Atualizar também contadores das abas
        updateTabCounters();
    }

    console.log(`🔄 Alternando para aba: ${tabName} (filtros inconsistentes limpos)`);
}

// (Global function assignment moved to end of file)

// Verificar integridade dos dados (categorias órfãs/ocultas)
async function checkDataIntegrity() {
    try {
        const response = await fetch('/api/transacoes/data-integrity-check', {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.hidden_categories && data.hidden_categories.length > 0) {
            const hiddenCount = data.hidden_categories.length;
            const hiddenNames = data.hidden_categories.map(cat => cat.categoria_nome).join(', ');

            showVisibleWarning(
                `⚠️ ALERTA: ${hiddenCount} subcategoria(s) com transações não aparecem na listagem padrão: ${hiddenNames}. ` +
                `Isso pode causar inconsistências nos relatórios.`,
                'Ver Categorias',
                () => { window.open('/listagem/categorias-contabeis', '_blank'); }
            );

            console.warn('📊 Categorias ocultas detectadas:', data.hidden_categories);
        }

        if (data.orphan_categories && data.orphan_categories.length > 0) {
            const orphanCount = data.orphan_categories.length;
            showVisibleError(
                `🚨 ERRO: ${orphanCount} categoria(s) referenciadas em transações não existem mais no banco de dados!`,
                'Corrigir Agora',
                () => { window.open('/listagem/categorias-contabeis', '_blank'); }
            );

            console.error('💀 Categorias órfãs detectadas:', data.orphan_categories);
        }

        return data;
    } catch (error) {
        console.error('Erro ao verificar integridade dos dados:', error);
        return null;
    }
}

// ✅ Funções utilitárias necessárias
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

function formatDate(date) {
    if (!date) return '-';
    var parts = String(date).substring(0, 10).split('-');
    if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
    return date;
}

function showErrorMessage(message) {
    console.error('❌ ERRO:', message);

    // Usar notificação global se disponível
    if (window.app && window.app.showNotification) {
        window.app.showNotification(message, 'error');
    } else {
        // Fallback: criar notificação visual de erro
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 16px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
            z-index: 9999;
            font-size: 14px;
            max-width: 400px;
            border-left: 4px solid #a71e2a;
        `;

        // Adicionar ícone e mensagem
        notification.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="font-size: 18px;">❌</span>
                <div>
                    <div style="font-weight: 600; margin-bottom: 4px;">Erro</div>
                    <div>${message}</div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Remover após 8 segundos (mais tempo para erros)
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 8000);
    }
}

async function clearFilters() {
    console.log('🧹 Limpando TODOS os filtros da página de categorização');

    // Limpar TODOS os filtros específicos
    const filterIds = [
        'filter-tipo', 'filter-mes', 'filter-ano', 'filter-descricao',
        'filter-categoria-contabil', 'filter-subcategoria-contabil',
        'filter-categoria-gerencial', 'filter-subcategoria-gerencial', 
        'filter-centro-custo', 'filter-conta-contabil',
        'filter-cliente', 'filter-projeto', 'filter-produto-servico'
    ];

    filterIds.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.value = '';
            console.log(`✅ Filtro limpo: ${filterId}`);
        }
    });

    // Limpar inputs de texto adicionais
    const filterInputs = document.querySelectorAll('.filter-input');
    filterInputs.forEach(input => {
        if (input.type === 'text' || input.type === 'date') {
            input.value = '';
        }
    });

    // ✅ CRÍTICO: Limpar filtros de coluna também (conforme feedback do architect)
    if (typeof columnFilters !== 'undefined') {
        columnFilters[currentTab] = {};
        console.log('✅ Filtros de coluna limpos para aba:', currentTab);
    }

    // Remover classes active dos cards
    document.querySelectorAll('.clickable-card').forEach(card => {
        card.classList.remove('active-filter');
    });

    // Recarregar dados SEM FILTROS e re-renderizar
    console.log('🔄 Recarregando dados originais sem filtros...');
    await loadAllTransactionsData(); // Carregar sem parâmetros de filtro
    renderTransactionsTableForTab(currentTab);

    // ✅ CORREÇÃO: Limpar seleções ao limpar filtros
    selectedTransactionsDespesas.clear();
    selectedTransactionsReceitas.clear();

    // Atualizar contador de registros com verificação segura
    if (typeof updateRecordCounts === 'function') {
        updateRecordCounts();
    }

    // ✅ CORREÇÃO: Garantir que contadores das abas mostrem dados completos
    updateTabCounters();
}

// 🔧 FIX: Função para limpar apenas elementos de filtro (sem recarregar dados)
function clearFilterElements() {
    console.log('🧹 Limpando apenas elementos de filtro (preservando dados)');

    // Limpar TODOS os filtros específicos
    const filterIds = [
        'filter-tipo', 'filter-mes', 'filter-ano', 'filter-descricao',
        'filter-categoria-contabil', 'filter-subcategoria-contabil',
        'filter-categoria-gerencial', 'filter-subcategoria-gerencial', 
        'filter-centro-custo', 'filter-conta-contabil',
        'filter-cliente', 'filter-projeto', 'filter-produto-servico'
    ];

    filterIds.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.value = '';
            console.log(`✅ Elemento de filtro limpo: ${filterId}`);
        }
    });

    // Limpar inputs de texto adicionais
    const filterInputs = document.querySelectorAll('.filter-input');
    filterInputs.forEach(input => {
        if (input.type === 'text' || input.type === 'date') {
            input.value = '';
        }
    });

    // Remover classes active dos cards
    document.querySelectorAll('.clickable-card').forEach(card => {
        card.classList.remove('active-filter');
    });

    console.log('✅ Elementos de filtro limpos (dados preservados)');
}

function toggleFilters() {
    console.log('🔄 Toggling filters visibility');
    const filtersPanel = document.querySelector('.filters-panel');
    if (filtersPanel) {
        filtersPanel.classList.toggle('hidden');
        filtersPanel.classList.toggle('visible');
    }
}

function truncateText(text, maxLength = 50) {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Função updateRecordCounts removida - há uma versão correta no final do arquivo

// Carregar dados para cards de resumo separados por tipo
async function loadSummaryCards() {
    console.log('🟢 loadSummaryCards INICIADA');

    try {
        // ✅ Verificar autenticação antes de carregar dados
        const authCheck = await fetch('/api/auth/user', { credentials: 'include' });
        if (!authCheck.ok) {
            console.warn('🔐 Usuário não autenticado, redirecionando...');
            window.location.href = '/login';
            return;
        }

        console.log('📊 Fazendo fetch para categorization-summary...');
        const response = await fetch('/api/transacoes/categorization-summary', {
            credentials: 'include'
        });

        console.log('📊 Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📊 Summary data received:', data);

        // ✅ Função auxiliar para atualizar elemento de forma segura
        function safeUpdateElement(id, value, logPrefix = '') {
            try {
                const element = document.getElementById(id);
                if (!element) {
                    console.error(`❌ ${logPrefix} Elemento não encontrado: ${id}`);
                    return false;
                }
                element.textContent = value;
                console.log(`✅ ${logPrefix} Atualizado ${id}: ${value}`);
                return true;
            } catch (error) {
                console.error(`❌ ${logPrefix} Erro ao atualizar ${id}:`, error);
                return false;
            }
        }

        // Cards de Receitas
        console.log('📊 Iniciando atualização de receitas...');
        const totalReceitas = data.total_receitas || 0;
        const receitasCompletas = data.receitas_completas || 0;
        const receitasIncompletas = totalReceitas - receitasCompletas;
        const receitasCompletasPercent = totalReceitas > 0 ? ((receitasCompletas / totalReceitas) * 100) : 0;
        const receitasIncompletasPercent = totalReceitas > 0 ? ((receitasIncompletas / totalReceitas) * 100) : 0;

        console.log('📊 Dados calculados de receitas:', { totalReceitas, receitasCompletas, receitasIncompletas });

        safeUpdateElement('receitas-total', totalReceitas, 'RECEITA:');
        safeUpdateElement('receitas-valor', formatCurrency(data.valor_total_receitas || 0), 'RECEITA:');
        safeUpdateElement('receitas-completas', receitasCompletas, 'RECEITA:');
        safeUpdateElement('receitas-completas-percent', `${receitasCompletasPercent.toFixed(1)}%`, 'RECEITA:');
        safeUpdateElement('receitas-incompletas', receitasIncompletas, 'RECEITA:');
        safeUpdateElement('receitas-incompletas-percent', `${receitasIncompletasPercent.toFixed(1)}%`, 'RECEITA:');

        // Adicionar indicadores visuais para receitas pendentes
        const receitasPendentesCard = document.querySelector('[data-filter-type="receitas"][data-filter-status="pendentes"]');
        if (receitasPendentesCard) {
            if (receitasIncompletas > 0) {
                receitasPendentesCard.classList.add('has-pending');
                if (!receitasPendentesCard.querySelector('.pending-badge')) {
                    const badge = document.createElement('div');
                    badge.className = 'pending-badge';
                    badge.innerHTML = '⚠️ ' + receitasIncompletas;
                    badge.title = `${receitasIncompletas} receita${receitasIncompletas > 1 ? 's' : ''} pendente${receitasIncompletas > 1 ? 's' : ''} de categorização`;
                    receitasPendentesCard.appendChild(badge);
                } else {
                    receitasPendentesCard.querySelector('.pending-badge').innerHTML = '⚠️ ' + receitasIncompletas;
                }
            } else {
                receitasPendentesCard.classList.remove('has-pending');
                const existingBadge = receitasPendentesCard.querySelector('.pending-badge');
                if (existingBadge) existingBadge.remove();
            }
        }

        console.log('✅ Cards de receitas processados');

        // Cards de Despesas
        console.log('📊 Iniciando atualização de despesas...');
        const totalDespesas = data.total_despesas || 0;
        const despesasCompletas = data.despesas_completas || 0;
        const despesasIncompletas = totalDespesas - despesasCompletas;
        const despesasCompletasPercent = totalDespesas > 0 ? ((despesasCompletas / totalDespesas) * 100) : 0;
        const despesasIncompletasPercent = totalDespesas > 0 ? ((despesasIncompletas / totalDespesas) * 100) : 0;

        console.log('📊 Dados calculados de despesas:', { totalDespesas, despesasCompletas, despesasIncompletas });

        safeUpdateElement('despesas-total', totalDespesas, 'DESPESA:');
        safeUpdateElement('despesas-valor', formatCurrency(Math.abs(data.valor_total_despesas || 0)), 'DESPESA:');
        safeUpdateElement('despesas-completas', despesasCompletas, 'DESPESA:');
        safeUpdateElement('despesas-incompletas', despesasIncompletas, 'DESPESA:');
        safeUpdateElement('despesas-completas-percent', `${despesasCompletasPercent.toFixed(1)}%`, 'DESPESA:');
        safeUpdateElement('despesas-incompletas-percent', `${despesasIncompletasPercent.toFixed(1)}%`, 'DESPESA:');

        // Adicionar indicadores visuais para despesas pendentes
        const despesasPendentesCard = document.querySelector('[data-filter-type="despesas"][data-filter-status="pendentes"]');
        if (despesasPendentesCard) {
            if (despesasIncompletas > 0) {
                despesasPendentesCard.classList.add('has-pending');
                if (!despesasPendentesCard.querySelector('.pending-badge')) {
                    const badge = document.createElement('div');
                    badge.className = 'pending-badge';
                    badge.innerHTML = '⚠️ ' + despesasIncompletas;
                    badge.title = `${despesasIncompletas} despesa${despesasIncompletas > 1 ? 's' : ''} pendente${despesasIncompletas > 1 ? 's' : ''} de categorização`;
                    despesasPendentesCard.appendChild(badge);
                } else {
                    despesasPendentesCard.querySelector('.pending-badge').innerHTML = '⚠️ ' + despesasIncompletas;
                }
            } else {
                despesasPendentesCard.classList.remove('has-pending');
                const existingBadge = despesasPendentesCard.querySelector('.pending-badge');
                if (existingBadge) existingBadge.remove();
            }
        }

        console.log('📊 Cards atualizados:', { 
            receitas: { total: totalReceitas, completas: receitasCompletas }, 
            despesas: { total: totalDespesas, completas: despesasCompletas } 
        });

        console.log('🎉 loadSummaryCards concluído com SUCESSO!');

    } catch (error) {
        console.error('❌ Erro CRÍTICO ao carregar cards de resumo:', error);
        console.error('❌ Stack trace:', error.stack);

        // Mostrar mensagem de erro na interface
        const errorCards = document.querySelectorAll('.card-value');
        errorCards.forEach(card => {
            if (card.textContent === '-' || card.textContent === '') {
                card.textContent = 'ERRO';
                card.style.color = 'red';
            }
        });
    }
}

// Carregar dados de gráficos para a aba específica
async function loadChartsForTab(tabName) {
    console.log(`📊 loadChartsForTab called for tab: ${tabName}`);
    try {
        // ✅ CRÍTICO: Verificar autenticação antes de carregar dados
        const authCheck = await fetch('/api/auth/user', { credentials: 'include' });
        if (!authCheck.ok) {
            console.warn('🔐 Usuário não autenticado, redirecionando...');
            window.location.href = '/login';
            return;
        }

        console.log('📊 Making analytics fetch request...');
        const response = await fetch('/api/transacoes/analytics/categorization-charts', {
            credentials: 'include'
        });
        console.log('📊 Analytics response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📊 Analytics data received:', data);
        console.log('📊 Despesas data:', data.despesas);
        console.log('📊 Receitas data:', data.receitas);

        if (tabName === 'despesas') {
            console.log('📊 Renderizando 4 gráficos de despesas...');
            // Renderizar gráficos de despesas (4 gráficos)
            createPieChart('chart-categoria-gerencial', data.despesas.categoria_gerencial, 'Categorias Gerenciais');
            createPieChart('chart-subcategoria-gerencial', data.despesas.subcategoria_gerencial, 'Subcategorias Gerenciais');
            createPieChart('chart-centro-custo', data.despesas.centro_custo, 'Centros de Custo');
            createPieChart('chart-categoria-contabil', data.despesas.categoria_contabil, 'Categorias Contábeis');
            console.log('✅ Gráficos de despesas renderizados');
        } else if (tabName === 'receitas') {
            console.log('📊 Renderizando 3 gráficos de receitas...');
            // Renderizar apenas gráficos de receitas (3 gráficos)
            createPieChart('chart-projeto', data.receitas.projeto, 'Receitas por Projeto');
            createPieChart('chart-cliente', data.receitas.cliente, 'Receitas por Cliente');
            createPieChart('chart-produto-servico', data.receitas.produto_servico, 'Produtos/Serviços');
            console.log('✅ Gráficos de receitas renderizados');
        }

    } catch (error) {
        console.error('❌ Erro ao carregar gráficos:', error);
        console.error('❌ Stack:', error.stack);
    }
}

// Carregar todos os dados de transações
async function loadAllTransactionsData(despesasFilterType = null, receitasFilterType = null) {
    console.log('🚀 INÍCIO: loadAllTransactionsData chamada');
    try {
        // ✅ CRÍTICO: Verificar autenticação antes de carregar dados
        console.log('🔐 Verificando autenticação...');
        const authCheck = await fetch('/api/auth/user', { credentials: 'include' });
        console.log('🔐 Auth check response:', authCheck.status, authCheck.ok);
        if (!authCheck.ok) {
            console.warn('🔐 Usuário não autenticado, redirecionando...');
            window.location.href = '/login';
            return;
        }
        console.log('✅ Usuário autenticado, prosseguindo...');

        // Carregar despesas com filtro opcional
        let despesasUrl = '/api/transacoes/despesas-categorization';
        if (despesasFilterType) {
            despesasUrl += `?filter_type=${encodeURIComponent(despesasFilterType)}`;
        }

        console.log('📊 Fazendo fetch para despesas-categorization...');
        const responseDespesas = await fetch(despesasUrl, {
            credentials: 'include'
        });

        if (!responseDespesas.ok) {
            throw new Error(`HTTP ${responseDespesas.status}: ${responseDespesas.statusText}`);
        }
        allDespesas = await responseDespesas.json();
        filteredDespesas = [...allDespesas];

        console.log(`📊 Despesas carregadas:`, allDespesas.length, `registros`);
        console.log(`📊 DEBUG: Primeiros dados despesas:`, allDespesas.slice(0, 2));
        console.log(`📊 Filtro aplicado:`, despesasFilterType || 'nenhum');

        // Carregar receitas
        try {
            console.log('📊 Fazendo fetch para receitas-categorization...');
            const responseReceitas = await fetch('/api/transacoes/receitas-categorization', {
                credentials: 'include'
            });
            if (!responseReceitas.ok) {
                throw new Error(`HTTP ${responseReceitas.status}: ${responseReceitas.statusText}`);
            }
            allReceitas = await responseReceitas.json();
            console.log(`📊 Receitas carregadas:`, allReceitas.length, `registros`);
            console.log(`📊 DEBUG: Primeiros dados receitas:`, allReceitas.slice(0, 2));
        } catch (error) {
            console.error('❌ Erro ao carregar receitas:', error);
            allReceitas = [];
        }
        filteredReceitas = [...allReceitas];

        // ✅ CRÍTICO: Atualizar tabelas avançadas com dados
        console.log(`🔧 DEBUG: Atualizando tabelas - despesasTable:`, !!despesasTable, `receitasTable:`, !!receitasTable);

        if (despesasTable) {
            console.log(`🔧 Setando dados despesas:`, allDespesas.length, `registros`);
            despesasTable.setData(allDespesas);
            // ✅ CORREÇÃO: Remover redraw() - método não existe na AdvancedTable
            console.log(`✅ Despesas carregadas na tabela:`, allDespesas.length);
        } else {
            console.error(`❌ despesasTable não está definida!`);
        }

        if (receitasTable) {
            console.log(`🔧 Setando dados receitas:`, allReceitas.length, `registros`);
            receitasTable.setData(allReceitas);
            // ✅ CORREÇÃO: Remover redraw() - método não existe na AdvancedTable
            console.log(`✅ Receitas carregadas na tabela:`, allReceitas.length);
        } else {
            console.error(`❌ receitasTable não está definida!`);
        }

        // ✅ CRÍTICO: Re-renderizar tabela após carregar dados filtrados
        console.log(`🔄 Re-renderizando tabela da aba: ${currentTab}`);
        renderTransactionsTableForTab(currentTab);

        // Atualizar contadores nas abas
        updateTabCounters();

        // Atualizar contador de registros
        if (typeof updateRecordCounts === 'function') {
            updateRecordCounts();
        } else {
            // Fallback: atualizar contadores manualmente
            console.log('📊 Atualizando contadores manualmente...');
            const countDespesas = document.getElementById('count-despesas');
            const countReceitas = document.getElementById('count-receitas');

            if (countDespesas) {
                countDespesas.textContent = `(${filteredDespesas.length} registros)`;
                console.log(`✅ Count despesas atualizado: ${filteredDespesas.length}`);
            }

            if (countReceitas) {
                countReceitas.textContent = `(${filteredReceitas.length} registros)`;
                console.log(`✅ Count receitas atualizado: ${filteredReceitas.length}`);
            }
        }

        // Mostrar mensagem de sucesso no console
        const totalFiltered = currentTab === 'despesas' ? filteredDespesas.length : filteredReceitas.length;
        console.log(`✅ Filtro aplicado: ${totalFiltered} ${currentTab} encontradas`);

        // Usar notificação global se disponível
        if (window.app && window.app.showNotification) {
            window.app.showNotification(`${totalFiltered} ${currentTab} encontradas com o filtro aplicado.`, 'success');
        }

    } catch (error) {
        console.error('Erro ao carregar dados de transações:', error);
    }
}

// Criar gráfico de pizza com Chart.js
function createPieChart(canvasId, data, title) {
    console.log(`📊 createPieChart chamado: canvasId=${canvasId}, title=${title}, data=`, data);

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn(`❌ Canvas ${canvasId} não encontrado`);
        return;
    }
    console.log(`✅ Canvas ${canvasId} encontrado:`, canvas);

    // Destruir gráfico existente se houver
    if (chartsInstance[canvasId]) {
        chartsInstance[canvasId].destroy();
    }

    if (!data || data.length === 0) {
        // Mostrar mensagem de "sem dados"
        const container = canvas.closest('.chart-container');
        const legend = container.querySelector('.chart-legend');
        legend.innerHTML = '<p class="text-gray-500 text-center">Nenhum dado para exibir</p>';
        return;
    }

    const ctx = canvas.getContext('2d');

    // Preparar dados para o gráfico
    const labels = data.map(item => item.name);
    const values = data.map(item => item.count);
    const colors = CHART_COLORS.slice(0, data.length);

    chartsInstance[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Legenda customizada será criada abaixo
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function() {
                            return 'Clique para filtrar por esta categoria';
                        }
                    }
                }
            },
            onClick: function(event, elements, chart) {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const label = chart.data.labels[index];

                    // Aplicar filtro baseado no gráfico clicado
                    applyChartFilter(canvasId, label, data[index]);
                }
            }
        }
    });

    // Criar legenda customizada
    createCustomLegend(canvasId, data, colors);
}

// Criar legenda customizada com contadores - XSS-safe
function createCustomLegend(canvasId, data, colors) {
    const container = document.getElementById(canvasId).closest('.chart-container');
    const legend = container.querySelector('.chart-legend');

    // Limpar legenda anterior
    legend.innerHTML = '';

    data.forEach((item, index) => {
        const color = colors[index];
        const totalCount = data.reduce((sum, d) => sum + (d.count || 0), 0);
        const itemCount = item.count || 0;
        const percentage = totalCount > 0 ? ((itemCount / totalCount) * 100).toFixed(1) : 0;


        // Criar elementos DOM de forma segura
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.style.cssText = 'display: flex; align-items: center; margin-bottom: 2px; cursor: pointer; padding: 2px; border-radius: 3px; transition: background-color 0.2s; line-height: 1.1;';

        // ✅ CORREÇÃO: Adicionar evento de clique na legenda
        legendItem.addEventListener('click', () => {
            console.log(`🖱️ CLIQUE NA LEGENDA: ${canvasId} - ${item.name}`);
            applyChartFilter(canvasId, item.name, item);
        });

        // Efeito hover
        legendItem.addEventListener('mouseenter', () => {
            legendItem.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
        });
        legendItem.addEventListener('mouseleave', () => {
            legendItem.style.backgroundColor = 'transparent';
        });

        const colorSquare = document.createElement('span');
        colorSquare.style.cssText = `display: inline-block; width: 8px; height: 8px; background-color: ${color}; margin-right: 4px; border-radius: 2px; flex-shrink: 0;`;

        const textSpan = document.createElement('span');
        textSpan.style.fontSize = '0.55rem';

        const strongElement = document.createElement('strong');
        strongElement.textContent = item.name; // XSS-safe

        textSpan.appendChild(strongElement);
        textSpan.appendChild(document.createTextNode(`: ${itemCount} (${percentage}%)`));

        legendItem.appendChild(colorSquare);
        legendItem.appendChild(textSpan);
        legend.appendChild(legendItem);
    });
}

// Aplicar filtro baseado no clique do gráfico
async function applyChartFilter(canvasId, label, dataItem) {
    console.log(`🎯 CLIQUE NO GRÁFICO: ${canvasId} - Label: "${label}"`, dataItem);
    console.log(`🔍 DEBUG: Verificando tipo de gráfico...`);

    try {
        // 🔧 FIX: Limpar apenas elementos de filtro, NÃO recarregar dados
        clearFilterElements();

        console.log(`🔍 DEBUG: Testando condições - label="${label}", canvasId="${canvasId}"`);

        // ✅ CORREÇÃO PRINCIPAL: Filtrar diretamente nos dados locais ao invés de usar selects
        // Isso evita o problema de categorias de receitas não existirem nos selects de despesas

        if (currentTab === 'despesas') {
            console.log('🎯 Aplicando filtro local para DESPESAS');

            if (label === 'Sem Subcategoria Contábil' || (canvasId === 'chart-subcategoria-contabil' && label === 'Sem Subcategoria')) {
                console.log('🎯 Filtrando despesas por subcategoria contábil vazia (NULL)');
                filteredDespesas = allDespesas.filter(t => !t.subcategoria_contabil_nome || t.subcategoria_contabil_nome === null);
            } else if ((canvasId === 'chart-subcategoria-gerencial' && label === 'Sem Subcategoria') || label === 'Sem Subcategoria Gerencial') {
                console.log('🎯 Filtrando despesas por subcategoria gerencial vazia (NULL)');
                filteredDespesas = allDespesas.filter(t => !t.subcategoria_gerencial_nome || t.subcategoria_gerencial_nome === null);
            } else if (canvasId === 'chart-categoria-contabil') {
                console.log('🎯 Filtrando despesas por categoria contábil:', label);
                console.log('🔍 DEBUG CATEGORIA CONTÁBIL: Label recebido:', `"${label}"`);
                console.log('🔍 DEBUG CATEGORIA CONTÁBIL: allDespesas.length:', allDespesas.length);

                // Log das primeiras 3 transações para debug
                console.log('🔍 DEBUG CATEGORIA CONTÁBIL: Primeiros 3 registros categoria_contabil_nome:', 
                    allDespesas.slice(0, 3).map(t => t.categoria_contabil_nome));

                if (label === 'Sem Categoria Contábil' || label === 'Sem Categoria') {
                    filteredDespesas = allDespesas.filter(t => !t.categoria_contabil_nome || t.categoria_contabil_nome === null);
                } else {
                    const labelNormalized = label.trim().toLowerCase();
                    console.log('🔍 DEBUG CATEGORIA CONTÁBIL: Label normalizado:', `"${labelNormalized}"`);

                    filteredDespesas = allDespesas.filter(t => {
                        const categoriaName = (t.categoria_contabil_nome || '').trim().toLowerCase();
                        const matches = categoriaName === labelNormalized;

                        // Log apenas os primeiros 5 para não poluir o console
                        if (allDespesas.indexOf(t) < 5) {
                            console.log(`🔍 DEBUG CATEGORIA CONTÁBIL: Comparando "${categoriaName}" === "${labelNormalized}" = ${matches}`);
                        }

                        return matches;
                    });
                }

                console.log('🔍 DEBUG CATEGORIA CONTÁBIL: Resultado do filtro:', filteredDespesas.length, 'registros');
            } else if (canvasId === 'chart-categoria-gerencial') {
                console.log('🎯 Filtrando despesas por categoria gerencial:', label);
                console.log('🔍 DEBUG: Label recebido:', `"${label}"`);
                console.log('🔍 DEBUG: allDespesas.length:', allDespesas.length);

                // Primeiro, vamos ver os primeiros registros para entender os dados
                console.log('🔍 DEBUG: Primeiros 3 registros categoria_gerencial_nome:', 
                    allDespesas.slice(0, 3).map(t => t.categoria_gerencial_nome));

                if (label === 'Sem Categoria Gerencial' || label === 'Sem Categoria') {
                    filteredDespesas = allDespesas.filter(t => !t.categoria_gerencial_nome || t.categoria_gerencial_nome === null);
                } else {
                    const labelNormalized = label.trim().toLowerCase();
                    console.log('🔍 DEBUG: Label normalizado:', `"${labelNormalized}"`);

                    filteredDespesas = allDespesas.filter(t => {
                        const categoriaName = (t.categoria_gerencial_nome || '').trim().toLowerCase();
                        const matches = categoriaName === labelNormalized;

                        // Log apenas os primeiros 5 para não poluir o console
                        if (allDespesas.indexOf(t) < 5) {
                            console.log(`🔍 DEBUG: Comparando "${categoriaName}" === "${labelNormalized}" = ${matches}`);
                        }

                        return matches;
                    });
                }

                console.log('🔍 DEBUG: Resultado do filtro:', filteredDespesas.length, 'registros')
            } else if (canvasId === 'chart-subcategoria-contabil') {
                console.log('🎯 Filtrando despesas por subcategoria contábil específica:', label);
                filteredDespesas = allDespesas.filter(t => {
                    const subcategoriaName = (t.subcategoria_contabil_nome || '').trim().toLowerCase();
                    const labelNormalized = label.trim().toLowerCase();
                    return subcategoriaName === labelNormalized;
                });
            } else if (canvasId === 'chart-subcategoria-gerencial') {
                console.log('🎯 Filtrando despesas por subcategoria gerencial específica:', label);
                filteredDespesas = allDespesas.filter(t => {
                    const subcategoriaName = (t.subcategoria_gerencial_nome || '').trim().toLowerCase();
                    const labelNormalized = label.trim().toLowerCase();
                    return subcategoriaName === labelNormalized;
                });
            } else if (canvasId === 'chart-centro-custo') {
                console.log('🎯 Filtrando despesas por centro de custo:', label);
                if (label === 'Sem Centro de Custo' || label === 'Sem Centro') {
                    filteredDespesas = allDespesas.filter(t => !t.centro_custo_nome || t.centro_custo_nome === null);
                } else {
                    filteredDespesas = allDespesas.filter(t => {
                        const centroName = (t.centro_custo_nome || '').trim().toLowerCase();
                        const labelNormalized = label.trim().toLowerCase();
                        return centroName === labelNormalized;
                    });
                }
            } else if (canvasId === 'chart-conta-contabil') {
                console.log('🎯 Filtrando despesas por conta contábil:', label);
                if (label === 'Sem Conta Contábil' || label === 'Sem Conta') {
                    filteredDespesas = allDespesas.filter(t => !t.conta_contabil_nome || t.conta_contabil_nome === null);
                } else {
                    filteredDespesas = allDespesas.filter(t => {
                        const contaName = (t.conta_contabil_nome || '').trim().toLowerCase();
                        const labelNormalized = label.trim().toLowerCase();
                        return contaName === labelNormalized;
                    });
                }
            } else {
                console.warn('🔍 Canvas não reconhecido para despesas:', canvasId);
                return;
            }

            // Limpar seleções
            selectedTransactionsDespesas = new Set();

        } else if (currentTab === 'receitas') {
            console.log('🎯 Aplicando filtro local para RECEITAS');

            if (canvasId === 'chart-cliente') {
                console.log('🎯 Filtrando receitas por cliente:', label);
                if (label === 'Sem Cliente') {
                    filteredReceitas = allReceitas.filter(t => !t.cliente_nome || t.cliente_nome === null);
                } else {
                    filteredReceitas = allReceitas.filter(t => {
                        const clienteName = (t.cliente_nome || '').trim().toLowerCase();
                        const labelNormalized = label.trim().toLowerCase();
                        return clienteName === labelNormalized;
                    });
                }
            } else if (canvasId === 'chart-projeto') {
                console.log('🎯 Filtrando receitas por projeto:', label);
                if (label === 'Sem Projeto') {
                    filteredReceitas = allReceitas.filter(t => !t.projeto_nome || t.projeto_nome === null);
                } else {
                    filteredReceitas = allReceitas.filter(t => {
                        const projetoName = (t.projeto_nome || '').trim().toLowerCase();
                        const labelNormalized = label.trim().toLowerCase();
                        return projetoName === labelNormalized;
                    });
                }
            } else if (canvasId === 'chart-produto-servico') {
                console.log('🎯 Filtrando receitas por produto/serviço:', label);
                if (label === 'Sem Produto/Serviço') {
                    filteredReceitas = allReceitas.filter(t => !t.produto_servico_nome || t.produto_servico_nome === null);
                } else {
                    filteredReceitas = allReceitas.filter(t => {
                        const produtoName = (t.produto_servico_nome || '').trim().toLowerCase();
                        const labelNormalized = label.trim().toLowerCase();
                        return produtoName === labelNormalized;
                    });
                }
            } else {
                console.warn('🔍 Canvas não reconhecido para receitas:', canvasId);
                return;
            }

            // Limpar seleções
            selectedTransactionsReceitas = new Set();
        }

        // Log para debugging
        const totalFiltered = currentTab === 'despesas' ? filteredDespesas.length : filteredReceitas.length;
        console.info(`📊 Filtro de gráfico aplicado - Tab: ${currentTab}, Chart: ${canvasId}, Resultados: ${totalFiltered}`);

        // ✅ CRÍTICO: Sincronizar tabela avançada com dados filtrados
        console.log('🔧 DEBUG: Sincronizando tabela avançada...');
        console.log('🔧 DEBUG: currentTab:', currentTab);
        console.log('🔧 DEBUG: despesasTable existe:', !!despesasTable);
        console.log('🔧 DEBUG: filteredDespesas.length:', filteredDespesas.length);
        console.log('🔧 DEBUG: filteredReceitas.length:', filteredReceitas.length);

        // Garantir que as variáveis globais estejam atualizadas ANTES de sincronizar
        if (currentTab === 'despesas') {
            console.log('🔧 DEBUG: Atualizando variáveis globais para despesas...');
            // Forçar atualização das variáveis globais
            window.filteredDespesas = filteredDespesas;

            if (despesasTable) {
                console.log('🔧 DEBUG: Chamando despesasTable.setData() com', filteredDespesas.length, 'registros');
                despesasTable.setData(filteredDespesas);
                // ✅ CORREÇÃO: Remover redraw() - método não existe na AdvancedTable
                console.log('🔧 DEBUG: setData() concluído');
            }
        } else if (currentTab === 'receitas') {
            console.log('🔧 DEBUG: Atualizando variáveis globais para receitas...');
            // Forçar atualização das variáveis globais
            window.filteredReceitas = filteredReceitas;

            if (receitasTable) {
                console.log('🔧 DEBUG: Chamando receitasTable.setData() com', filteredReceitas.length, 'registros');
                receitasTable.setData(filteredReceitas);
                // ✅ CORREÇÃO: Remover redraw() - método não existe na AdvancedTable
                console.log('🔧 DEBUG: setData() concluído');
            }
        }

        // Atualizar UI - FORÇAR atualização direta da tabela
        console.log('🔧 DEBUG: Chamando renderTransactionsTableForTab...');
        renderTransactionsTableForTab(currentTab);
        console.log('🔧 DEBUG: Chamando updateSelectionCountForTab...');
        updateSelectionCountForTab(currentTab);
        console.log('🔧 DEBUG: Chamando updateRecordCounts...');
        updateRecordCounts();

        // ✅ CORREÇÃO ADICIONAL: Reset da paginação após filtrar
        if (currentTab === 'despesas') {
            pagination.despesas.currentPage = 1;
            pagination.despesas.totalItems = filteredDespesas.length;
            pagination.despesas.totalPages = Math.max(1, Math.ceil(filteredDespesas.length / pagination.despesas.perPage));
            updateDespesasPaginationControls();
        } else if (currentTab === 'receitas') {
            pagination.receitas.currentPage = 1;
            pagination.receitas.totalItems = filteredReceitas.length;
            pagination.receitas.totalPages = Math.max(1, Math.ceil(filteredReceitas.length / pagination.receitas.perPage));
            updateReceitasPaginationControls();
        }

        showSuccessMessage(`${totalFiltered} ${currentTab} encontradas para: ${label}`);
        console.log(`✅ Filtro aplicado com sucesso para: ${label}`);

    } catch (error) {
        console.error('❌ Erro ao aplicar filtro do gráfico:', error);
        showErrorMessage(`Erro ao filtrar por ${label}: ${error.message}`);
    }
}

// Aplicar filtro local para dados já carregados
function applyLocalFilter(canvasId, label) {
    console.log(`🔄 Aplicando filtro local: ${canvasId} - ${label}`);

    if (currentTab === 'despesas') {
        if (label === 'Sem Categoria Gerencial') {
            filteredDespesas = allDespesas.filter(t => !t.categoria_gerencial_nome || t.categoria_gerencial_nome === null);
        } else if (label === 'Sem Categoria Contábil') {
            filteredDespesas = allDespesas.filter(t => !t.categoria_contabil_nome || t.categoria_contabil_nome === null);
        } else if (label === 'Sem Centro de Custo') {
            filteredDespesas = allDespesas.filter(t => !t.centro_custo_nome || t.centro_custo_nome === null);
        }
        renderDespesasTable(filteredDespesas);
    } else if (currentTab === 'receitas') {
        if (label === 'Sem Cliente') {
            filteredReceitas = allReceitas.filter(t => !t.cliente_nome || t.cliente_nome === null);
        } else if (label === 'Sem Projeto') {
            filteredReceitas = allReceitas.filter(t => !t.projeto_nome || t.projeto_nome === null);
        } else if (label === 'Sem Produto/Serviço') {
            filteredReceitas = allReceitas.filter(t => !t.produto_servico_nome || t.produto_servico_nome === null);
        }
        renderReceitasTable(filteredReceitas);
    }

    updateRecordCounts();
}

// Aplicar filtro local por nome da categoria
function applyLocalFilterByName(label, tabType) {
    console.log(`🎯 Aplicando filtro local por nome: "${label}" na aba ${tabType}`);

    if (tabType === 'despesas') {
        // Filtrar por categoria gerencial
        const filteredByGerencial = allDespesas.filter(t => {
            const categoriaName = (t.categoria_gerencial_nome || '').trim().toLowerCase();
            const labelNormalized = label.trim().toLowerCase();
            return categoriaName === labelNormalized;
        });

        // Se não encontrou por gerencial, tentar por categoria contábil
        const filteredByContabil = allDespesas.filter(t => {
            const categoriaName = (t.categoria_contabil_nome || '').trim().toLowerCase();
            const labelNormalized = label.trim().toLowerCase();
            return categoriaName === labelNormalized;
        });

        // Usar o resultado que tiver mais registros
        if (filteredByGerencial.length > 0) {
            filteredDespesas = filteredByGerencial;
            console.log(`✅ Filtrado por categoria gerencial: ${filteredByGerencial.length} registros`);
        } else if (filteredByContabil.length > 0) {
            filteredDespesas = filteredByContabil;
            console.log(`✅ Filtrado por categoria contábil: ${filteredByContabil.length} registros`);
        } else {
            console.warn(`⚠️ Nenhuma transação encontrada para: ${label}`);
            filteredDespesas = [];
        }

        // Limpar seleções
        selectedTransactionsDespesas = new Set();
        renderDespesasTable();
        updateSelectionCountForTab('despesas');

    } else if (tabType === 'receitas') {
        // Filtrar receitas por cliente, projeto ou produto/serviço
        const filteredByCliente = allReceitas.filter(t => {
            const clienteName = (t.cliente_nome || '').trim().toLowerCase();
            const labelNormalized = label.trim().toLowerCase();
            return clienteName === labelNormalized;
        });

        const filteredByProjeto = allReceitas.filter(t => {
            const projetoName = (t.projeto_nome || '').trim().toLowerCase();
            const labelNormalized = label.trim().toLowerCase();
            return projetoName === labelNormalized;
        });

        // Usar o resultado que tiver mais registros
        if (filteredByCliente.length > 0) {
            filteredReceitas = filteredByCliente;
            console.log(`✅ Filtrado por cliente: ${filteredByCliente.length} registros`);
        } else if (filteredByProjeto.length > 0) {
            filteredReceitas = filteredByProjeto;
            console.log(`✅ Filtrado por projeto: ${filteredByProjeto.length} registros`);
        } else {
            console.warn(`⚠️ Nenhuma receita encontrada para: ${label}`);
            filteredReceitas = [];
        }

        // Limpar seleções
        selectedTransactionsReceitas = new Set();
        renderReceitasTable();
        updateSelectionCountForTab('receitas');
    }

    updateRecordCounts();
    showSuccessMessage(`${tabType === 'despesas' ? filteredDespesas.length : filteredReceitas.length} ${tabType} encontradas para: ${label}`);
}

// Definir valor no filtro e aplicar
function setFilterValue(filterId, label) {
    const filterSelect = document.getElementById(filterId);
    if (!filterSelect) return;

    // Procurar opção pelo texto (comparação mais flexível)
    const option = Array.from(filterSelect.options).find(opt => {
        const optText = opt.textContent.trim().toLowerCase();
        const labelText = label.trim().toLowerCase();
        return optText === labelText || optText.includes(labelText) || labelText.includes(optText);
    });

    if (option) {
        filterSelect.value = option.value;
        console.log(`✅ Valor do filtro definido: ${filterId} = ${option.value} (texto: "${option.textContent}")`);
    } else {
        console.warn(`❌ Opção não encontrada no filtro ${filterId}: "${label}"`);
        console.warn(`📋 Opções disponíveis:`, Array.from(filterSelect.options).map(opt => `"${opt.textContent.trim()}"`));

        // Tentar filtro local se não encontrar no select
        console.log(`🔄 Tentando filtro local para: ${label}`);
        applyLocalFilterByName(label, currentTab);
    }
}

// Carregar despesas com filtro específico via API
async function loadDespesasWithFilter(filterType) {
    console.log(`📊 Carregando despesas com filtro: ${filterType}`);

    try {
        const response = await fetch(`/api/transacoes/despesas-categorization?filter_type=${filterType}`, {
            credentials: 'include'
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        console.log(`📊 Dados filtrados recebidos:`, data.length, 'registros');

        filteredDespesas = data;
        renderDespesasTable(filteredDespesas);
        updateRecordCounts();

        showSuccessMessage(`${data.length} despesas encontradas com o filtro aplicado.`);

    } catch (error) {
        console.error('❌ Erro ao carregar despesas filtradas:', error);
        showErrorMessage('Erro ao aplicar filtro');
    }
}

// Limpar filtros exceto o especificado
function clearFiltersExcept(exceptFilterId) {
    const allFilterIds = [
        'filter-categoria-contabil', 'filter-subcategoria-contabil',
        'filter-categoria-gerencial', 'filter-subcategoria-gerencial', 
        'filter-centro-custo', 'filter-conta-contabil',
        'filter-cliente', 'filter-projeto', 'filter-produto-servico'
    ];

    allFilterIds.forEach(filterId => {
        if (filterId !== exceptFilterId) {
            const filterElement = document.getElementById(filterId);
            if (filterElement) {
                filterElement.value = '';
            }
        }
    });
}

// Carregar e configurar filtros
async function loadFilters() {
    try {
        // Carregar opções para os selects de filtro
        const [categorias, categoriasGerenciais, centros, contas, clientes, projetos, produtos] = await Promise.all([
            fetch('/api/categorias-contabeis', { credentials: 'include' }).then(r => r.json()).catch(() => []),
            fetch('/api/categorias-gerenciais', { credentials: 'include' }).then(r => r.json()).catch(() => []),
            fetch('/api/centros-custo', { credentials: 'include' }).then(r => r.json()).catch(() => []),
            fetch('/api/contas-contabeis', { credentials: 'include' }).then(r => r.json()).catch(() => []),
            fetch('/api/clientes', { credentials: 'include' }).then(r => r.json()).catch(() => []),
            fetch('/api/projetos', { credentials: 'include' }).then(r => r.json()).catch(() => []),
            fetch('/api/produtos-servicos', { credentials: 'include' }).then(r => r.json()).catch(() => [])
        ]);

        // Popular filtro de ano dinamicamente
        populateYearFilter('filter-ano');

        // Popular selects para despesas - categorias contábeis já vêm filtradas (apenas as 5 principais)
        const categoriasGerenciaisPai = categoriasGerenciais.filter(cat => cat.pai_id === null);

        populateSelect('filter-categoria-contabil', categorias, true); // true = incluir "Sem Categoria"
        populateSelect('filter-categoria-gerencial', categoriasGerenciaisPai, true);
        populateSelect('filter-centro-custo', centros, true);
        populateSelect('filter-conta-contabil', contas, true);

        // Popular selects para receitas
        populateSelect('filter-cliente', clientes, true); // true = incluir "Sem Cliente"
        populateSelect('filter-projeto', projetos, true); // true = incluir "Sem Projeto" 
        populateSelect('filter-produto-servico', produtos, true); // true = incluir "Sem Produto/Serviço"

        // Configurar listeners para subcategorias
        setupSubcategoryFilters();

        // Carregar subcategorias iniciais (sem categoria pai para mostrar todas)
        await Promise.all([
            loadSubcategoriesForFilter('filter-subcategoria-contabil', '', 'contabil'),
            loadSubcategoriesForFilter('filter-subcategoria-gerencial', '', 'gerencial')
        ]);

        // Configurar slider de valores
        setupValueSlider();

    } catch (error) {
        console.error('Erro ao carregar filtros:', error);
    }
}

// Popular filtro de ano com ano corrente, anos passados e futuros (+5 anos)
function populateYearFilter(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const currentYear = new Date().getFullYear();
    const startYear = 2020; // Ano mínimo para dados históricos
    const endYear = currentYear + 5; // 5 anos no futuro

    // Manter primeira opção "Todos"
    select.innerHTML = '<option value="">Todos</option>';

    // Adicionar anos do mais recente ao mais antigo
    for (let year = endYear; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year.toString();
        option.textContent = year.toString();
        select.appendChild(option);
    }

    // Selecionar o ano corrente por padrão
    select.value = currentYear.toString();
}

// Popular select com opções
function populateSelect(selectId, options, includeSemCategoria = false) {
    const select = document.getElementById(selectId);

    if (!select || !options) return;

    // Manter apenas a primeira opção (placeholder) se for "Manter atual" ou similar
    const firstOption = select.querySelector('option[value=""]');
    select.innerHTML = '';

    // Sempre adicionar opção "Manter atual" para modais de categorização
    if (selectId.startsWith('bulk-')) {
        const manterAtualOption = document.createElement('option');
        manterAtualOption.value = '';
        manterAtualOption.textContent = 'Manter atual';
        select.appendChild(manterAtualOption);
    } else if (firstOption) {
        // Para filtros, manter a opção original
        select.appendChild(firstOption);
    }

    // Adicionar opção "Sem..." se solicitado
    if (includeSemCategoria) {
        const semCategoriaOption = document.createElement('option');
        semCategoriaOption.value = 'sem_categoria';

        // Determinar texto baseado no ID do select
        let texto = 'Sem Categoria';
        if (selectId.includes('cliente')) texto = 'Sem Cliente';
        else if (selectId.includes('projeto')) texto = 'Sem Projeto';
        else if (selectId.includes('produto-servico')) texto = 'Sem Produto/Serviço';
        else if (selectId.includes('centro-custo')) texto = 'Sem Centro de Custo';
        else if (selectId.includes('conta-contabil')) texto = 'Sem Conta Contábil';

        semCategoriaOption.textContent = texto;
        select.appendChild(semCategoriaOption);
    }

    // Adicionar novas opções
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.id;
        optionElement.textContent = option.nome || option.name;
        select.appendChild(optionElement);
    });
}

// Configurar filtros de subcategorias
function setupSubcategoryFilters() {
    // Listener para categoria contábil -> subcategoria contábil
    const catContabil = document.getElementById('filter-categoria-contabil');
    if (catContabil) {
        catContabil.addEventListener('change', () => {
            loadSubcategoriesForFilter('filter-subcategoria-contabil', catContabil.value, 'contabil');
        });
    }

    // Listener para categoria gerencial -> subcategoria gerencial
    const catGerencial = document.getElementById('filter-categoria-gerencial');
    if (catGerencial) {
        catGerencial.addEventListener('change', () => {
            loadSubcategoriesForFilter('filter-subcategoria-gerencial', catGerencial.value, 'gerencial');
        });
    }
}

// Carregar subcategorias para filtros
async function loadSubcategoriesForFilter(selectId, parentCategoryId, tipo) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Resetar select
    select.innerHTML = '<option value="">Todas</option>';

    // Sempre adicionar opção "Sem Subcategoria" primeiro
    const semSubcategoriaOption = document.createElement('option');
    semSubcategoriaOption.value = 'sem_subcategoria';
    semSubcategoriaOption.textContent = 'Sem Subcategoria';
    select.appendChild(semSubcategoriaOption);

    // Se não há categoria pai, mostrar TODAS as subcategorias disponíveis
    // para permitir filtrar "Sem Subcategoria" independentemente
    if (!parentCategoryId || parentCategoryId === 'sem_categoria') {
        // Carregar todas as subcategorias para permitir filtrar por "Sem Subcategoria"
        try {
            const endpoint = tipo === 'contabil' ? '/api/categorias-contabeis' : '/api/categorias-gerenciais';
            const response = await fetch(endpoint, { credentials: 'include' });
            const allCategories = await response.json();

            // Filtrar apenas subcategorias (que têm pai_id)
            const subcategorias = allCategories.filter(cat => cat.pai_id !== null);

            subcategorias.forEach(subcat => {
                const option = document.createElement('option');
                option.value = subcat.id;
                option.textContent = subcat.nome;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar todas as subcategorias:', error);
        }
        return;
    }

    try {
        const endpoint = tipo === 'gerencial' ? '/api/categorias-gerenciais' : '/api/categorias-contabeis';
        const response = await fetch(`${endpoint}?pai_id=${parentCategoryId}`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            const subcategorias = await response.json();

            // Adicionar subcategorias (Sem Subcategoria já foi adicionado acima)
            const items = Array.isArray(subcategorias) ? subcategorias : (subcategorias.items || []);
            items.forEach(sub => {
                const option = document.createElement('option');
                option.value = sub.id;
                option.textContent = sub.nome;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar subcategorias:', error);
    }
}

// Configurar slider de faixa de valores
function setupValueSlider() {
    const minSlider = document.getElementById('filter-valor-min');
    const maxSlider = document.getElementById('filter-valor-max');
    const minDisplay = document.getElementById('valor-min-display');
    const maxDisplay = document.getElementById('valor-max-display');

    if (!minSlider || !maxSlider) return;

    function updateDisplays() {
        const minValue = parseInt(minSlider.value);
        const maxValue = parseInt(maxSlider.value);

        minDisplay.textContent = formatCurrency(minValue);
        maxDisplay.textContent = formatCurrency(maxValue);
    }

    minSlider.addEventListener('input', updateDisplays);
    maxSlider.addEventListener('input', updateDisplays);
    updateDisplays();
}

// Renderizar tabela para aba específica
function renderTransactionsTableForTab(tabName) {
    if (tabName === 'despesas') {
        renderDespesasTable();
    } else if (tabName === 'receitas') {
        renderReceitasTable();
    }
}

// Renderizar tabela de despesas
function renderDespesasTable() {
    console.log('🔍 renderDespesasTable() chamada');
    const tbody = document.getElementById('transactions-tbody-despesas');
    console.log('🔍 tbody encontrado:', tbody ? 'sim' : 'não');

    if (!tbody) {
        console.error('❌ Elemento tbody não encontrado! ID: transactions-tbody-despesas');
        return;
    }

    tbody.innerHTML = '';

    // 🚀 PAGINAÇÃO: Obter dados filtrados/ordenados da tabela avançada
    const allFilteredData = despesasTable ? despesasTable.getFilteredData() || filteredDespesas : filteredDespesas;

    // Atualizar estado da paginação
    pagination.despesas.totalItems = allFilteredData.length;
    pagination.despesas.totalPages = Math.max(1, Math.ceil(allFilteredData.length / pagination.despesas.perPage));

    // Garantir que currentPage está no range válido
    if (pagination.despesas.currentPage > pagination.despesas.totalPages) {
        pagination.despesas.currentPage = 1;
    }

    console.log('🔍 allFilteredData.length:', allFilteredData.length);
    console.log('🔍 Página atual:', pagination.despesas.currentPage, 'de', pagination.despesas.totalPages);

    // 🚀 PAGINAÇÃO: Calcular dados da página atual
    const startIndex = (pagination.despesas.currentPage - 1) * pagination.despesas.perPage;
    const endIndex = startIndex + pagination.despesas.perPage;
    const pageData = allFilteredData.slice(startIndex, endIndex);

    if (allFilteredData.length === 0) {
        console.log('⚠️ Nenhuma despesa para mostrar - inserindo linha vazia');
        tbody.innerHTML = '<tr><td colspan="11" class="text-center text-gray-500 py-8">Nenhuma despesa encontrada</td></tr>';
        updateDespesasPaginationControls();
        return;
    }

    console.log('✅ Renderizando', pageData.length, 'despesas da página', pagination.despesas.currentPage);

    pageData.forEach(transaction => {
        const row = document.createElement('tr');
        const isSelected = selectedTransactionsDespesas.has(transaction.id);
        if (isSelected) row.classList.add('selected');

        row.innerHTML = `
            <td>
                <input type="checkbox" ${isSelected ? 'checked' : ''} 
                       onchange="toggleDespesaSelection(${transaction.id})" />
            </td>
            <td>${formatDate(transaction.data_lancamento)}</td>
            <td title="${transaction.descricao}">${truncateText(transaction.descricao, 40)}</td>
            <td>${transaction.categoria_gerencial_nome || '<span class="text-red-500">Sem Categoria</span>'}</td>
            <td>${transaction.subcategoria_gerencial_nome || '<span class="text-gray-400">Sem Subcategoria</span>'}</td>
            <td>${transaction.centro_custo_nome || '<span class="text-red-500">Sem Centro</span>'}</td>
            <td>${transaction.categoria_contabil_nome || '<span class="text-red-500">Sem Categoria</span>'}</td>
            <td>
                ${getDespesaStatus(transaction)}
            </td>
            <td class="font-semibold text-red-600">
                ${formatCurrency(Math.abs(transaction.valor))}
            </td>
            <td>${transaction.fornecedor_nome || '-'}</td>
            <td class="actions-cell">
                <button class="btn-small btn-edit" data-action="edit" data-id="${transaction.id}" title="Editar transação">
                    ✎
                </button>
                <button class="btn-small btn-delete" data-action="delete" data-id="${transaction.id}" title="Excluir transação">
                    ✕
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });

    updateSelectionCountForTab('despesas');

    // 🚀 PAGINAÇÃO: Atualizar controles de paginação
    updateDespesasPaginationControls();
}

// Renderizar tabela de receitas
function renderReceitasTable() {
    const tbody = document.getElementById('transactions-tbody-receitas');
    if (!tbody) return;

    tbody.innerHTML = '';

    // 🚀 PAGINAÇÃO: Obter dados filtrados/ordenados da tabela avançada
    const allFilteredData = receitasTable ? receitasTable.getFilteredData() || filteredReceitas : filteredReceitas;

    // Atualizar estado da paginação
    pagination.receitas.totalItems = allFilteredData.length;
    pagination.receitas.totalPages = Math.max(1, Math.ceil(allFilteredData.length / pagination.receitas.perPage));

    // Garantir que currentPage está no range válido
    if (pagination.receitas.currentPage > pagination.receitas.totalPages) {
        pagination.receitas.currentPage = 1;
    }

    // 🚀 PAGINAÇÃO: Calcular dados da página atual
    const startIndex = (pagination.receitas.currentPage - 1) * pagination.receitas.perPage;
    const endIndex = startIndex + pagination.receitas.perPage;
    const pageData = allFilteredData.slice(startIndex, endIndex);

    if (allFilteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-gray-500 py-8">Nenhuma receita encontrada</td></tr>';
        updateReceitasPaginationControls();
        return;
    }

    pageData.forEach(transaction => {
        const row = document.createElement('tr');
        const isSelected = selectedTransactionsReceitas.has(transaction.id);
        if (isSelected) row.classList.add('selected');

        row.innerHTML = `
            <td>
                <input type="checkbox" ${isSelected ? 'checked' : ''} 
                       onchange="toggleReceitaSelection(${transaction.id})" />
            </td>
            <td>${formatDate(transaction.data_lancamento)}</td>
            <td title="${transaction.descricao}">${truncateText(transaction.descricao, 40)}</td>
            <td>${transaction.cliente_nome || '<span class="text-red-500">Sem Cliente</span>'}</td>
            <td>${transaction.projeto_nome || '<span class="text-red-500">Sem Projeto</span>'}</td>
            <td>${transaction.produto_servico_nome || '<span class="text-red-500">Sem Produto/Serviço</span>'}</td>
            <td>
                ${getReceitaStatus(transaction)}
            </td>
            <td class="font-semibold text-green-600">
                ${formatCurrency(Math.abs(transaction.valor))}
            </td>
            <td>${transaction.observacoes || '-'}</td>
            <td class="actions-cell">
                <button class="btn-small btn-edit" data-action="edit" data-id="${transaction.id}" title="Editar transação">
                    ✎
                </button>
                <button class="btn-small btn-delete" data-action="delete" data-id="${transaction.id}" title="Excluir transação">
                    ✕
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });

    updateSelectionCountForTab('receitas');

    // 🚀 PAGINAÇÃO: Atualizar controles de paginação
    updateReceitasPaginationControls();
}

// Toggle seleção de despesa
function toggleDespesaSelection(transactionId) {
    if (selectedTransactionsDespesas.has(transactionId)) {
        selectedTransactionsDespesas.delete(transactionId);
    } else {
        selectedTransactionsDespesas.add(transactionId);
    }
    updateSelectionCountForTab('despesas');
    renderDespesasTable();
}

// Toggle seleção de receita
function toggleReceitaSelection(transactionId) {
    if (selectedTransactionsReceitas.has(transactionId)) {
        selectedTransactionsReceitas.delete(transactionId);
    } else {
        selectedTransactionsReceitas.add(transactionId);
    }
    updateSelectionCountForTab('receitas');
    renderReceitasTable();
}

// Atualizar contador de selecionados para aba específica
function updateSelectionCountForTab(tabName) {
    const counter = document.getElementById(`selected-count-${tabName}`);
    if (counter) {
        if (tabName === 'despesas') {
            counter.textContent = selectedTransactionsDespesas.size;
        } else if (tabName === 'receitas') {
            counter.textContent = selectedTransactionsReceitas.size;
        }
    }
}

// Obter status de categorização para despesas
function getDespesaStatus(transaction) {
    const missing = [];

    // 4 atributos de categorização: Gerencial, Sub-Gerencial, Centro de Custo, Contábil
    if (transaction.categoria_gerencial_id == null) missing.push('Gerencial');
    if (transaction.subcategoria_gerencial_id == null) missing.push('Sub-Gerencial');
    if (transaction.centro_custo_id == null) missing.push('Centro');
    if (transaction.categoria_contabil_id == null) missing.push('Contábil');

    if (missing.length === 0) {
        return '<span class="badge badge-success">✅ Completa</span>';
    } else {
        return `<span class="badge badge-warning">⚠️ Faltam: ${missing.join(', ')}</span>`;
    }
}

// Obter status de categorização para receitas
function getReceitaStatus(transaction) {
    const missing = [];

    // ✅ CORREÇÃO FINAL: Alinhar 100% com lógica do backend - apenas NULL é ausente
    // Backend usa is_not(None), então 0 é considerado presente e válido
    if (transaction.cliente_id == null) missing.push('Cliente');
    if (transaction.projeto_id == null) missing.push('Projeto');
    if (transaction.produto_servico_id == null) missing.push('Produto/Serviço');

    if (missing.length === 0) {
        return '<span class="badge badge-success">✅ Completa</span>';
    } else {
        return `<span class="badge badge-warning">⚠️ Faltam: ${missing.join(', ')}</span>`;
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Filtros
    document.getElementById('apply-filters')?.addEventListener('click', applyFilters);
    document.getElementById('clear-filters')?.addEventListener('click', clearFilters);

    // Toggle de filtros
    document.querySelector('.filters-header')?.addEventListener('click', toggleFilters);

    // Modal de categorização - Compatibilidade Chrome 140+
    document.getElementById('categorization-modal-close')?.addEventListener('click', closeCategorization);
    document.getElementById('categorization-cancel-btn')?.addEventListener('click', closeCategorization);
    document.getElementById('categorization-save-btn')?.addEventListener('click', saveBulkCategorization);

    // Fechar modal ao clicar fora (melhor compatibilidade)
    document.getElementById('categorization-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'categorization-modal') {
            closeCategorization();
        }
    });

    // Tabs - Compatibilidade Chrome 140+ (remoção de onclick inline)
    document.getElementById('tab-despesas')?.addEventListener('click', () => switchTab('despesas'));
    document.getElementById('tab-receitas')?.addEventListener('click', () => switchTab('receitas'));

    // Summary cards - Event delegation para compatibilidade Chrome 140+
    document.querySelector('.summary-cards')?.addEventListener('click', (e) => {
        const card = e.target.closest('.clickable-card');
        if (card) {
            filterByCard(card);
        }
    });

    // Botões de ação nas tabelas - Event delegation para compatibilidade Chrome 140+
    document.addEventListener('click', (e) => {
        const button = e.target.closest('[data-action]');
        if (button) {
            const action = button.dataset.action;
            const id = parseInt(button.dataset.id, 10);

            if (action === 'edit') {
                window.editarTransacao(id);
            } else if (action === 'delete') {
                window.excluirTransacao(id);
            }
        }
    });
}

// Aplicar filtros
async function applyFilters() {
    console.log('🔍 Aplicando filtros...');

    const filters = {
        tipo: document.getElementById('filter-tipo')?.value || '',
        mes: document.getElementById('filter-mes')?.value || '',
        ano: document.getElementById('filter-ano')?.value || '',
        descricao: document.getElementById('filter-descricao')?.value || '',
        categoria_contabil: document.getElementById('filter-categoria-contabil')?.value || '',
        subcategoria_contabil: document.getElementById('filter-subcategoria-contabil')?.value || '',
        categoria_gerencial: document.getElementById('filter-categoria-gerencial')?.value || '',
        subcategoria_gerencial: document.getElementById('filter-subcategoria-gerencial')?.value || '',
        centro_custo: document.getElementById('filter-centro-custo')?.value || '',
        conta_contabil: document.getElementById('filter-conta-contabil')?.value || '',
        cliente: document.getElementById('filter-cliente')?.value || '',
        projeto: document.getElementById('filter-projeto')?.value || '',
        produto_servico: document.getElementById('filter-produto-servico')?.value || '',
        valor_min: parseInt(document.getElementById('filter-valor-min')?.value || 0),
        valor_max: parseInt(document.getElementById('filter-valor-max')?.value || 100000)
    };

    // Verificar se há filtros realmente aplicados
    const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
        if (key === 'valor_min' && value === 0) return false;
        if (key === 'valor_max' && value === 100000) return false;
        return value && value !== '' && value !== '0';
    });

    // Verificar se há filtros de coluna ativos
    const hasActiveColumnFilters = columnFilters[currentTab] && Object.keys(columnFilters[currentTab]).length > 0;

    console.log('🔍 Filtros de formulário ativos:', hasActiveFilters);
    console.log('🔍 Filtros de coluna ativos:', hasActiveColumnFilters);
    console.log('🔍 Filtros aplicados:', filters);

    // Se não há filtros ativos (nem formulário nem coluna), não aplicar filtros - manter dados originais
    if (!hasActiveFilters && !hasActiveColumnFilters) {
        console.log('✅ Nenhum filtro ativo - mantendo dados originais');
        filteredDespesas = [...allDespesas];
        filteredReceitas = [...allReceitas];
        renderTransactionsTableForTab(currentTab);
        updateRecordCounts();
        return; // NÃO mostrar mensagem de filtros aplicados quando não há filtros
    }

    // Se temos apenas filtros de coluna, não prosseguir com aplicação de filtros de formulário
    if (!hasActiveFilters && hasActiveColumnFilters) {
        console.log('✅ Apenas filtros de coluna ativos - não aplicar filtros de formulário');
        renderTransactionsTableForTab(currentTab);
        updateRecordCounts();
        showSuccessMessage('Filtros de coluna aplicados com sucesso.');
        return;
    }

    // Detectar se precisa fazer nova requisição ao backend 
    let despesasFilterType = null;
    let receitasFilterType = null;

    // Mapear filtros que requerem nova requisição para despesas
    if (filters.categoria_contabil === 'sem_categoria') {
        despesasFilterType = 'categoria_contabil_null';
    } else if (filters.categoria_gerencial === 'sem_categoria') {
        despesasFilterType = 'categoria_gerencial_null';
    } else if (filters.subcategoria_contabil === 'sem_subcategoria') {
        despesasFilterType = 'subcategoria_contabil_null';
    } else if (filters.subcategoria_gerencial === 'sem_subcategoria') {
        despesasFilterType = 'subcategoria_gerencial_null';
    } else if (filters.centro_custo === 'sem_categoria') {
        despesasFilterType = 'centro_custo_null';
    } else if (filters.conta_contabil === 'sem_categoria') {
        despesasFilterType = 'conta_contabil_null';
    }

    // Se precisar de nova requisição, recarregar dados
    if (despesasFilterType || receitasFilterType) {
        console.log(`🔄 Fazendo nova requisição: despesas=${despesasFilterType}, receitas=${receitasFilterType}`);
        await loadAllTransactionsData(despesasFilterType, receitasFilterType);

        // 🚀 CORREÇÃO: Se fizemos requisição com filtro no backend, não aplicar o mesmo filtro no frontend
        // Os dados já vêm filtrados do servidor
        if (despesasFilterType) {
            // Aplicar apenas filtros que NÃO foram aplicados no backend
            filteredDespesas = allDespesas.filter(transaction => {
                // Aplicar apenas filtros de descrição e valores (não aplicados no backend)
                if (filters.descricao && !transaction.descricao.toLowerCase().includes(filters.descricao.toLowerCase())) return false;

                const valor = Math.abs(transaction.valor);
                if (valor < filters.valor_min || valor > filters.valor_max) return false;

                return true;
            });
        } else {
            // Se não fizemos filtro no backend, aplicar filtros normais no frontend
            filteredDespesas = allDespesas.filter(transaction => {
                // Filtro de descrição
                if (filters.descricao && !transaction.descricao.toLowerCase().includes(filters.descricao.toLowerCase())) return false;

                // Filtro de categoria contábil (incluindo "Sem Categoria")
                if (filters.categoria_contabil) {
                    if (filters.categoria_contabil === 'sem_categoria') {
                        if (transaction.categoria_contabil_id != null) return false;
                    } else {
                        if (Number(transaction.categoria_contabil_id) != Number(filters.categoria_contabil)) return false;
                    }
                }

                // Filtro de centro de custo (incluindo "Sem Categoria")
                if (filters.centro_custo) {
                    if (filters.centro_custo === 'sem_categoria') {
                        if (transaction.centro_custo_id != null) return false;
                    } else {
                        if (Number(transaction.centro_custo_id) != Number(filters.centro_custo)) return false;
                    }
                }

                // Filtro de conta contábil (incluindo "Sem Categoria")
                if (filters.conta_contabil) {
                    if (filters.conta_contabil === 'sem_categoria') {
                        if (transaction.conta_contabil_id != null) return false;
                    } else {
                        if (Number(transaction.conta_contabil_id) != Number(filters.conta_contabil)) return false;
                    }
                }

                // Filtro de subcategoria contábil
                if (filters.subcategoria_contabil) {
                    if (filters.subcategoria_contabil === 'sem_subcategoria') {
                        if (transaction.subcategoria_contabil_id != null) return false;
                    } else {
                        if (Number(transaction.subcategoria_contabil_id) != Number(filters.subcategoria_contabil)) return false;
                    }
                }

                // Filtro de categoria gerencial
                if (filters.categoria_gerencial) {
                    if (filters.categoria_gerencial === 'sem_categoria') {
                        if (transaction.categoria_gerencial_id != null) return false;
                    } else {
                        if (Number(transaction.categoria_gerencial_id) != Number(filters.categoria_gerencial)) return false;
                    }
                }

                // Filtro de subcategoria gerencial
                if (filters.subcategoria_gerencial) {
                    if (filters.subcategoria_gerencial === 'sem_subcategoria') {
                        const isSemSubcategoria = transaction.subcategoria_gerencial_id == null;
                        if (!isSemSubcategoria) return false;
                    } else {
                        if (Number(transaction.subcategoria_gerencial_id) != Number(filters.subcategoria_gerencial)) return false;
                    }
                }

                const valor = Math.abs(transaction.valor);
                if (valor < filters.valor_min || valor > filters.valor_max) return false;

                return true;
            });
        }
    } else {
        // Caso normal: aplicar filtros nas despesas sem nova requisição
        filteredDespesas = allDespesas.filter(transaction => {
            // Filtro de descrição
            if (filters.descricao && !transaction.descricao.toLowerCase().includes(filters.descricao.toLowerCase())) return false;

            // Filtro de categoria contábil (incluindo "Sem Categoria")
            if (filters.categoria_contabil) {
                if (filters.categoria_contabil === 'sem_categoria') {
                    if (transaction.categoria_contabil_id != null) return false;
                } else {
                    if (Number(transaction.categoria_contabil_id) != Number(filters.categoria_contabil)) return false;
                }
            }

            // Filtro de categoria gerencial
            if (filters.categoria_gerencial) {
                if (filters.categoria_gerencial === 'sem_categoria') {
                    if (transaction.categoria_gerencial_id != null) return false;
                } else {
                    if (Number(transaction.categoria_gerencial_id) != Number(filters.categoria_gerencial)) return false;
                }
            }

            // Filtro de centro de custo (incluindo "Sem Categoria")
            if (filters.centro_custo) {
                if (filters.centro_custo === 'sem_categoria') {
                    if (transaction.centro_custo_id != null) return false;
                } else {
                    if (Number(transaction.centro_custo_id) != Number(filters.centro_custo)) return false;
                }
            }

            // Filtro de conta contábil (incluindo "Sem Categoria")
            if (filters.conta_contabil) {
                if (filters.conta_contabil === 'sem_categoria') {
                    if (transaction.conta_contabil_id != null) return false;
                } else {
                    if (Number(transaction.conta_contabil_id) != Number(filters.conta_contabil)) return false;
                }
            }

            // Filtro de subcategoria contábil
            if (filters.subcategoria_contabil) {
                if (filters.subcategoria_contabil === 'sem_subcategoria') {
                    if (transaction.subcategoria_contabil_id != null) return false;
                } else {
                    if (Number(transaction.subcategoria_contabil_id) != Number(filters.subcategoria_contabil)) return false;
                }
            }

            // Filtro de subcategoria gerencial
            if (filters.subcategoria_gerencial) {
                if (filters.subcategoria_gerencial === 'sem_subcategoria') {
                    const isSemSubcategoria = transaction.subcategoria_gerencial_id == null;
                    if (!isSemSubcategoria) return false;
                } else {
                    if (Number(transaction.subcategoria_gerencial_id) != Number(filters.subcategoria_gerencial)) return false;
                }
            }

            const valor = Math.abs(transaction.valor);
            if (valor < filters.valor_min || valor > filters.valor_max) return false;

            return true;
        });
    }

    // Aplicar filtros nas receitas
    filteredReceitas = allReceitas.filter(transaction => {
        if (filters.descricao && !transaction.descricao.toLowerCase().includes(filters.descricao.toLowerCase())) return false;

        // Filtro de cliente (incluindo "Sem Cliente")
        if (filters.cliente) {
            if (filters.cliente === 'sem_categoria') {
                if (transaction.cliente_id != null && Number(transaction.cliente_id) !== 0) return false;
            } else {
                if (Number(transaction.cliente_id) != Number(filters.cliente)) return false;
            }
        }

        // Filtro de projeto (incluindo "Sem Projeto")
        if (filters.projeto) {
            if (filters.projeto === 'sem_categoria') {
                if (transaction.projeto_id != null && Number(transaction.projeto_id) !== 0) return false;
            } else {
                if (Number(transaction.projeto_id) != Number(filters.projeto)) return false;
            }
        }

        // Filtro de produto/serviço (incluindo "Sem Produto/Serviço")
        if (filters.produto_servico) {
            if (filters.produto_servico === 'sem_categoria') {
                if (transaction.produto_servico_id != null && Number(transaction.produto_servico_id) !== 0) return false;
            } else {
                if (Number(transaction.produto_servico_id) != Number(filters.produto_servico)) return false;
            }
        }

        // 🚀 CORREÇÃO: Aplicar filtros de categorias gerenciais também nas receitas
        // Isso permite filtrar receitas que têm categoria_gerencial_id preenchida
        if (filters.categoria_gerencial) {
            if (filters.categoria_gerencial === 'sem_categoria') {
                if (transaction.categoria_gerencial_id != null && Number(transaction.categoria_gerencial_id) !== 0) return false;
            } else {
                if (Number(transaction.categoria_gerencial_id) != Number(filters.categoria_gerencial)) return false;
            }
        }

        // Filtro de subcategoria gerencial para receitas também
        if (filters.subcategoria_gerencial) {
            if (filters.subcategoria_gerencial === 'sem_subcategoria') {
                if (transaction.subcategoria_gerencial_id != null && Number(transaction.subcategoria_gerencial_id) !== 0) return false;
            } else {
                if (Number(transaction.subcategoria_gerencial_id) != Number(filters.subcategoria_gerencial)) return false;
            }
        }

        // Filtro de categoria contábil para receitas também (caso tenham)
        if (filters.categoria_contabil) {
            if (filters.categoria_contabil === 'sem_categoria') {
                if (transaction.categoria_contabil_id != null && Number(transaction.categoria_contabil_id) !== 0) return false;
            } else {
                if (Number(transaction.categoria_contabil_id) != Number(filters.categoria_contabil)) return false;
            }
        }

        // Filtro de subcategoria contábil para receitas também
        if (filters.subcategoria_contabil) {
            if (filters.subcategoria_contabil === 'sem_subcategoria') {
                if (transaction.subcategoria_contabil_id != null && Number(transaction.subcategoria_contabil_id) !== 0) return false;
            } else {
                if (Number(transaction.subcategoria_contabil_id) != Number(filters.subcategoria_contabil)) return false;
            }
        }

        const valor = Math.abs(transaction.valor);
        if (valor < filters.valor_min || valor > filters.valor_max) return false;

        return true;
    });

    // Renderizar tabela da aba atual
    renderTransactionsTableForTab(currentTab);

    // Atualizar contadores de registros
    updateRecordCounts();

    const totalFiltered = currentTab === 'despesas' ? filteredDespesas.length : filteredReceitas.length;
    showSuccessMessage(`${totalFiltered} ${currentTab} encontradas com os filtros aplicados.`);
}

// Filtrar por card clicável
function filterByCard(cardElement) {
    const filterType = cardElement.getAttribute('data-filter-type');  // 'receitas' ou 'despesas'
    const filterStatus = cardElement.getAttribute('data-filter-status'); // 'categorizadas' ou 'pendentes'

    console.log(`🎯 filterByCard INICIADO: tipo=${filterType}, status=${filterStatus}`);
    console.log(`🎯 Dados disponíveis: allDespesas.length=${allDespesas?.length}, allReceitas.length=${allReceitas?.length}`);

    // Remover classe active de todos os cards
    document.querySelectorAll('.clickable-card').forEach(card => {
        card.classList.remove('active-filter');
    });

    // Adicionar classe active ao card clicado
    cardElement.classList.add('active-filter');

    // Mudar para a aba correta se necessário
    if (currentTab !== filterType) {
        switchTab(filterType);
    }

    // Limpar filtros existentes
    clearFilters();

    // Aplicar filtro baseado no status
    let filteredData = [];

    if (filterType === 'despesas') {
        filteredData = allDespesas.filter(transaction => {
            if (filterStatus === 'categorizadas') {
                // ✅ ALINHADO COM BACKEND: Despesa categorizada = todos os campos != null (0 é válido)
                return transaction.categoria_contabil_id != null && 
                       transaction.subcategoria_contabil_id != null &&
                       transaction.categoria_gerencial_id != null && 
                       transaction.subcategoria_gerencial_id != null &&
                       transaction.centro_custo_id != null && 
                       transaction.conta_contabil_id != null;
            } else if (filterStatus === 'pendentes') {
                // ✅ ALINHADO COM BACKEND: Despesa pendente = pelo menos um campo == null
                return transaction.categoria_contabil_id == null || 
                       transaction.subcategoria_contabil_id == null ||
                       transaction.categoria_gerencial_id == null || 
                       transaction.subcategoria_gerencial_id == null ||
                       transaction.centro_custo_id == null || 
                       transaction.conta_contabil_id == null;
            }
            return true;
        });
        filteredDespesas = filteredData;
    } else if (filterType === 'receitas') {
        filteredData = allReceitas.filter(transaction => {
            if (filterStatus === 'categorizadas') {
                // ✅ ALINHADO COM BACKEND: Receita categorizada = todos os campos != null (0 é válido)
                return transaction.cliente_id != null && 
                       transaction.projeto_id != null && 
                       transaction.produto_servico_id != null;
            } else if (filterStatus === 'pendentes') {
                // ✅ ALINHADO COM BACKEND: Receita pendente = pelo menos um campo == null
                return transaction.cliente_id == null || 
                       transaction.projeto_id == null || 
                       transaction.produto_servico_id == null;
            }
            return true;
        });
        filteredReceitas = filteredData;
    }

    // 🔍 LOG RESULTADOS DO FILTRO
    console.log(`🎯 filteredData.length: ${filteredData.length}`);
    console.log(`🎯 Amostras dos primeiros 3 filtrados:`, filteredData.slice(0, 3).map(t => ({
        id: t.id,
        categoria_contabil_id: t.categoria_contabil_id,
        subcategoria_contabil_id: t.subcategoria_contabil_id,
        categoria_gerencial_id: t.categoria_gerencial_id,
        subcategoria_gerencial_id: t.subcategoria_gerencial_id,
        centro_custo_id: t.centro_custo_id,
        conta_contabil_id: t.conta_contabil_id
    })));

    // Atualizar tabela e contadores
    updateTable();
    updateRecordCounts();

    const totalFiltered = filteredData.length;
    const statusText = filterStatus === 'categorizadas' ? 'categorizadas' : 'pendentes';

    console.log(`🎯 filterByCard CONCLUÍDO: ${totalFiltered} ${filterType} ${statusText} encontradas`);
    showSuccessMessage(`${totalFiltered} ${filterType} ${statusText} encontradas.`);
}

// Função para ordenar tabelas
function sortTable(column, tabType) {
    const currentSort = sortState[tabType];

    // Se clicar na mesma coluna, inverte a direção
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // Nova coluna, começar com ascendente
        currentSort.column = column;
        currentSort.direction = 'asc';
    }

    // Limpar indicadores anteriores
    document.querySelectorAll(`#sort-${currentSort.column}-${tabType === currentSort.column ? 'despesas' : 'receitas'} .sort-indicator`).forEach(indicator => {
        indicator.textContent = '';
    });
    document.querySelectorAll(`.sort-indicator`).forEach(indicator => {
        if (indicator.id.includes(tabType)) {
            indicator.textContent = '';
        }
    });

    // Definir indicador atual
    const indicator = document.getElementById(`sort-${column}-${tabType}`);
    if (indicator) {
        indicator.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
    }

    // Função auxiliar para obter valor de comparação
    function getSortValue(transaction, column) {
        switch (column) {
            case 'data_transacao':
                return new Date(transaction.data_transacao);
            case 'valor':
                return Math.abs(transaction.valor);
            case 'descricao':
                return (transaction.descricao || '').toLowerCase();
            case 'categoria_contabil':
                return (transaction.categoria_contabil_nome || '').toLowerCase();
            case 'subcategoria_contabil':
                return (transaction.subcategoria_contabil_nome || '').toLowerCase();
            case 'categoria_gerencial':
                return (transaction.categoria_gerencial_nome || '').toLowerCase();
            case 'subcategoria_gerencial':
                return (transaction.subcategoria_gerencial_nome || '').toLowerCase();
            case 'centro_custo':
                return (transaction.centro_custo_nome || '').toLowerCase();
            case 'conta_contabil':
                return (transaction.conta_contabil_nome || '').toLowerCase();
            case 'fornecedor':
                return (transaction.fornecedor_nome || '').toLowerCase();
            case 'cliente':
                return (transaction.cliente_nome || '').toLowerCase();
            case 'projeto':
                return (transaction.projeto_nome || '').toLowerCase();
            case 'produto_servico':
                return (transaction.produto_servico_nome || '').toLowerCase();
            case 'status':
                // Ordenar por status categorizado/pendente
                if (tabType === 'despesas') {
                    // ✅ ALINHADO COM BACKEND: Usar mesma lógica que filtros (apenas null é ausente)
                    const categorizado = transaction.categoria_contabil_id != null && 
                                       transaction.subcategoria_contabil_id != null &&
                                       transaction.categoria_gerencial_id != null && 
                                       transaction.subcategoria_gerencial_id != null &&
                                       transaction.centro_custo_id != null && 
                                       transaction.conta_contabil_id != null;
                    return categorizado ? 'a_categorizado' : 'b_pendente';
                } else {
                    // ✅ ALINHADO COM BACKEND: Usar mesma lógica que filtros (apenas null é ausente)
                    const categorizado = transaction.cliente_id != null && 
                                       transaction.projeto_id != null && 
                                       transaction.produto_servico_id != null;
                    return categorizado ? 'a_categorizado' : 'b_pendente';
                }
            default:
                return '';
        }
    }

    // Ordenar os dados filtrados
    const dataToSort = tabType === 'despesas' ? filteredDespesas : filteredReceitas;

    dataToSort.sort((a, b) => {
        const aValue = getSortValue(a, column);
        const bValue = getSortValue(b, column);

        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;

        return currentSort.direction === 'asc' ? comparison : -comparison;
    });

    // ✅ CRÍTICO: Sincronizar tabela avançada com dados ordenados
    if (tabType === 'despesas' && despesasTable) {
        despesasTable.setData(filteredDespesas);
        // ✅ CORREÇÃO: Não chamar redraw() - método não existe na AdvancedTable
    } else if (tabType === 'receitas' && receitasTable) {
        receitasTable.setData(filteredReceitas);
        // ✅ CORREÇÃO: Não chamar redraw() - método não existe na AdvancedTable
    }

    // Atualizar tabela
    updateTable();

    showSuccessMessage(`Tabela ordenada por ${column} (${currentSort.direction === 'asc' ? 'crescente' : 'decrescente'}).`);
}

// Funções para filtros de coluna estilo Excel

// Abrir filtro de coluna
function openColumnFilter(event, column, tabType) {
    event.stopPropagation();

    const dropdown = document.getElementById('column-filter-dropdown');
    currentColumnFilter = {
        column: column,
        tabType: tabType,
        position: { x: event.clientX, y: event.clientY }
    };

    // 🔧 FIX: Posicionar dropdown corretamente considerando scroll da página
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    dropdown.style.left = `${event.clientX + scrollX - 100}px`;
    dropdown.style.top = `${event.clientY + scrollY + 10}px`;
    dropdown.style.display = 'block';

    // Carregar opções da coluna
    loadColumnOptions(column, tabType);
}

// Carregar opções únicas de uma coluna
function loadColumnOptions(column, tabType) {
    const data = tabType === 'despesas' ? allDespesas : allReceitas;
    const uniqueValues = new Set();

    data.forEach(transaction => {
        let value = getColumnDisplayValue(transaction, column, tabType);
        if (value && value.trim() !== '') {
            uniqueValues.add(value);
        }
    });

    // Adicionar "Vazio" se existirem registros vazios
    const hasEmpty = data.some(transaction => {
        let value = getColumnDisplayValue(transaction, column, tabType);
        return !value || value.trim() === '';
    });

    if (hasEmpty) {
        uniqueValues.add('(Vazio)');
    }

    const sortedValues = Array.from(uniqueValues).sort();
    const container = document.getElementById('filter-options');
    const currentFilters = columnFilters[tabType][column] || [];

    container.innerHTML = '';

    // Adicionar opção "Selecionar Todos"
    const selectAllDiv = document.createElement('div');
    selectAllDiv.className = 'filter-option';
    selectAllDiv.innerHTML = `
        <input type="checkbox" id="select-all-filter" ${currentFilters.length === 0 ? 'checked' : ''}>
        <label for="select-all-filter"><strong>Selecionar Todos</strong></label>
    `;
    selectAllDiv.onclick = toggleSelectAll;
    container.appendChild(selectAllDiv);

    // Adicionar opções individuais
    sortedValues.forEach((value, index) => {
        const isChecked = currentFilters.length === 0 || currentFilters.includes(value);
        const optionDiv = document.createElement('div');
        optionDiv.className = 'filter-option';

        // 🔧 FIX: Usar índice para ID válido e armazenar valor em data-value
        const safeId = `filter-option-${index}`;
        optionDiv.innerHTML = `
            <input type="checkbox" id="${safeId}" data-value="${value}" ${isChecked ? 'checked' : ''}>
            <label for="${safeId}">${value}</label>
        `;
        optionDiv.onclick = (e) => {
            if (e.target.type !== 'checkbox') {
                const checkbox = optionDiv.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                updateSelectAllState();
            }
        };
        container.appendChild(optionDiv);
    });

    // Configurar pesquisa
    const searchInput = document.getElementById('filter-search');
    searchInput.value = '';
    searchInput.oninput = filterOptionsSearch;
}

// Obter valor de exibição para uma coluna
function getColumnDisplayValue(transaction, column, tabType) {
    switch (column) {
        case 'descricao':
            return transaction.descricao || '';
        case 'categoria_contabil':
            return transaction.categoria_contabil_nome || '';
        case 'status':
            if (tabType === 'despesas') {
                // ✅ ALINHADO COM BACKEND: Usar mesma lógica que filtros (apenas null é ausente)
                const categorizado = transaction.categoria_contabil_id != null && 
                                  transaction.subcategoria_contabil_id != null &&
                                  transaction.categoria_gerencial_id != null && 
                                  transaction.subcategoria_gerencial_id != null &&
                                  transaction.centro_custo_id != null && 
                                  transaction.conta_contabil_id != null;
                return categorizado ? 'Categorizado' : 'Pendente';
            } else {
                // ✅ ALINHADO COM BACKEND: Usar mesma lógica que filtros (apenas null é ausente)  
                const categorizado = transaction.cliente_id != null && 
                                  transaction.projeto_id != null && 
                                  transaction.produto_servico_id != null;
                return categorizado ? 'Categorizado' : 'Pendente';
            }
        case 'valor':
            return `R$ ${Math.abs(transaction.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        case 'cliente':
            return transaction.cliente_nome || '';
        case 'projeto':
            return transaction.projeto_nome || '';
        case 'produto_servico':
            return transaction.produto_servico_nome || '';
        default:
            return '';
    }
}

// Alternar seleção de todos
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('select-all-filter');
    const allOptions = document.querySelectorAll('#filter-options .filter-option input[type="checkbox"]:not(#select-all-filter)');

    allOptions.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

// Atualizar estado do "Selecionar Todos"
function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('select-all-filter');
    const allOptions = document.querySelectorAll('#filter-options .filter-option input[type="checkbox"]:not(#select-all-filter)');
    const checkedOptions = document.querySelectorAll('#filter-options .filter-option input[type="checkbox"]:not(#select-all-filter):checked');

    selectAllCheckbox.checked = checkedOptions.length === allOptions.length;
    selectAllCheckbox.indeterminate = checkedOptions.length > 0 && checkedOptions.length < allOptions.length;
}

// Pesquisar nas opções de filtro
function filterOptionsSearch() {
    const searchTerm = document.getElementById('filter-search').value.toLowerCase();
    const options = document.querySelectorAll('#filter-options .filter-option:not(:first-child)');

    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(searchTerm) ? 'flex' : 'none';
    });
}

// Aplicar filtro de coluna
function applyColumnFilter() {
    const { column, tabType } = currentColumnFilter;
    const checkedOptions = [];
    const selectAllChecked = document.getElementById('select-all-filter').checked;

    if (!selectAllChecked) {
        document.querySelectorAll('#filter-options .filter-option input[type="checkbox"]:not(#select-all-filter):checked')
            .forEach(checkbox => {
                // 🔧 FIX: Usar data-value ao invés de tentar extrair do ID
                const value = checkbox.getAttribute('data-value');
                if (value) {
                    checkedOptions.push(value);
                }
            });

        columnFilters[tabType][column] = checkedOptions;
    } else {
        // Se "Selecionar Todos" está marcado, remover filtro
        delete columnFilters[tabType][column];
    }

    // Aplicar filtros
    applyAllFilters();
    closeColumnFilter();
}

// Limpar filtro de coluna
function clearColumnFilter() {
    const { column, tabType } = currentColumnFilter;
    delete columnFilters[tabType][column];

    // Marcar todos como selecionados
    document.getElementById('select-all-filter').checked = true;
    document.querySelectorAll('#filter-options .filter-option input[type="checkbox"]:not(#select-all-filter)')
        .forEach(checkbox => checkbox.checked = true);
}

// Fechar filtro de coluna
function closeColumnFilter() {
    document.getElementById('column-filter-dropdown').style.display = 'none';
    currentColumnFilter = { column: null, tabType: null, position: { x: 0, y: 0 } };
}

// Aplicar todos os filtros (incluindo filtros de coluna)
async function applyAllFilters() {
    // Começar com todos os dados
    let dataToFilter = currentTab === 'despesas' ? [...allDespesas] : [...allReceitas];

    // Aplicar filtros de coluna primeiro
    const activeFilters = columnFilters[currentTab];
    if (activeFilters) {
        Object.keys(activeFilters).forEach(column => {
            const filterValues = activeFilters[column];
            if (filterValues && filterValues.length > 0) {
                dataToFilter = dataToFilter.filter(transaction => {
                    const displayValue = getColumnDisplayValue(transaction, column, currentTab);
                    const actualValue = displayValue || '(Vazio)';
                    return filterValues.includes(actualValue);
                });
            }
        });
    }

    // Aplicar à variável global temporariamente
    if (currentTab === 'despesas') {
        filteredDespesas = dataToFilter;
    } else {
        filteredReceitas = dataToFilter;
    }

    // Aplicar filtros normais também
    await applyFilters();
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('column-filter-dropdown');
    
    // ✅ CORREÇÃO: Não fechar se clicou em filtros do AdvancedTable
    const isAdvancedTableFilter = event.target.closest('.header-filter-container') || 
                                  event.target.closest('.header-filter-dropdown');
    
    if (dropdown && !dropdown.contains(event.target) && 
        !event.target.classList.contains('header-filter') && 
        !isAdvancedTableFilter) {
        closeColumnFilter();
    }
});

// Funções para ações da tabela

// Função global para editar transação (compatível com dashboard)
window.editarTransacao = function(id) {
    // Redirecionar para página de edição em tela cheia
    window.location.href = `/transacoes/editar/${id}`;
};


// Toggle seção de filtros
function toggleFilters() {
    const content = document.querySelector('.filters-content');
    const header = document.querySelector('.filters-header h3');

    if (content.style.display === 'none') {
        content.style.display = 'block';
        header.textContent = '▼ Filtros Detalhados';
    } else {
        content.style.display = 'none';
        header.textContent = '▶ Filtros Detalhados';
    }
}

// Seleção múltipla por aba - APENAS PÁGINA ATUAL
function selectAllPage(tabName, e) {
    console.log('🔧 DEBUG: selectAllPage chamado para tab:', tabName);

    // Obter referências dos checkboxes
    const headerCheckbox = document.getElementById(`select-all-${tabName}-header`);
    const controlCheckbox = document.getElementById(`select-all-${tabName}`);

    // Detectar origem e sincronizar
    const fromHeader = e?.target?.id?.includes('-header');
    const isChecked = e?.target?.checked ?? (fromHeader ? headerCheckbox?.checked : controlCheckbox?.checked);

    console.log('🔧 DEBUG: isChecked:', isChecked, 'fromHeader:', fromHeader);

    // Sincronizar ambos os checkboxes
    if (headerCheckbox && controlCheckbox) {
        if (fromHeader) {
            controlCheckbox.checked = isChecked;
        } else {
            headerCheckbox.checked = isChecked;
        }
    }

    // ✅ CORREÇÃO: Obter dados da aba atual de forma consistente
    const tabData = tabName === 'despesas' ? 
        (despesasTable ? despesasTable.getFilteredData() || filteredDespesas : filteredDespesas) :
        (receitasTable ? receitasTable.getFilteredData() || filteredReceitas : filteredReceitas);

    const pageState = pagination[tabName];
    const selectedSet = tabName === 'despesas' ? selectedTransactionsDespesas : selectedTransactionsReceitas;

    // ✅ CORREÇÃO: Calcular dados da página atual usando paginação correta
    if (pageState) {
        const start = (pageState.currentPage - 1) * pageState.perPage;
        const end = start + pageState.perPage;
        const pageData = tabData.slice(start, end);

        console.log('🔧 DEBUG: Página atual:', pageState.currentPage);
        console.log('🔧 DEBUG: Total filtrado:', tabData.length);
        console.log('🔧 DEBUG: Dados da página:', pageData.length, 'registros (índices', start, 'a', end - 1, ')');

        // Selecionar/deselecionar apenas os registros da página atual
        pageData.forEach(transaction => {
            if (isChecked) {
                selectedSet.add(transaction.id);
                console.log('✅ DEBUG: Selecionado ID:', transaction.id);
            } else {
                selectedSet.delete(transaction.id);
                console.log('❌ DEBUG: Desselecionado ID:', transaction.id);
            }
        });

        console.log('🔧 DEBUG: Total selecionado após operação:', selectedSet.size);
    } else {
        console.error('❌ DEBUG: Estado de paginação não encontrado para', tabName);
        // Fallback: usar todos os dados filtrados (comportamento antigo)
        tabData.forEach(transaction => {
            if (isChecked) {
                selectedSet.add(transaction.id);
            } else {
                selectedSet.delete(transaction.id);
            }
        });
    }

    renderTransactionsTableForTab(tabName);
}

function selectAllFiltered(tabName) {
    const isChecked = document.getElementById(`select-all-filtered-${tabName}`).checked;
    const transactions = tabName === 'despesas' ? filteredDespesas : filteredReceitas;
    const selectedSet = tabName === 'despesas' ? selectedTransactionsDespesas : selectedTransactionsReceitas;

    transactions.forEach(transaction => {
        if (isChecked) {
            selectedSet.add(transaction.id);
        } else {
            selectedSet.delete(transaction.id);
        }
    });

    renderTransactionsTableForTab(tabName);
}

function deselectAll(tabName) {
    const selectedSet = tabName === 'despesas' ? selectedTransactionsDespesas : selectedTransactionsReceitas;
    selectedSet.clear();

    // Sincronizar todos os checkboxes
    const selectAllMain = document.getElementById(`select-all-${tabName}`);
    if (selectAllMain) selectAllMain.checked = false;

    const selectAllHeader = document.getElementById(`select-all-${tabName}-header`);
    if (selectAllHeader) selectAllHeader.checked = false;

    const selectAllFiltered = document.getElementById(`select-all-filtered-${tabName}`);
    if (selectAllFiltered) selectAllFiltered.checked = false;

    renderTransactionsTableForTab(tabName);
}

// Abrir modal de categorização
function openCategorization(tabName) {
    const selectedSet = tabName === 'despesas' ? selectedTransactionsDespesas : selectedTransactionsReceitas;

    if (selectedSet.size === 0) {
        showErrorMessage(`Selecione pelo menos uma ${tabName.slice(0, -1)} para categorizar.`);
        return;
    }

    // Armazenar tipo atual para o modal
    const modal = document.getElementById('categorization-modal');
    
    if (!modal) {
        console.error('❌ Modal não encontrado!');
        return;
    }
    
    modal.setAttribute('data-tab', tabName);

    // Popular selects do modal baseado no tipo
    loadCategoriesForModal(tabName);
    
    // Usar 'flex' em vez de 'block' porque .modal usa display: flex no CSS
    modal.style.display = 'flex';
}

// ✅ CORREÇÃO: Resetar todos os campos do modal para "Manter atual"
function resetModalFields() {
    console.log('🔧 DEBUG: resetModalFields() executando...');

    const modalFields = [
        'bulk-categoria-gerencial',
        'bulk-subcategoria-gerencial',
        'bulk-centro-custo',
        'bulk-categoria-contabil',
        'bulk-cliente',
        'bulk-projeto',
        'bulk-produto-servico'
    ];

    modalFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            // Limpar o campo e resetar para primeira opção (Manter atual)
            field.value = '';
            field.selectedIndex = 0;
            console.log(`✅ Campo ${fieldId} resetado para "Manter atual"`);
        }
    });

    console.log('✅ resetModalFields() concluído');
}

// ✅ CORREÇÃO: Inicializar subcategorias vazias (apenas "Manter atual")
function initializeEmptySubcategories() {
    console.log('🔧 DEBUG: initializeEmptySubcategories() executando...');

    // Resetar subcategoria gerencial  
    const subGerencial = document.getElementById('bulk-subcategoria-gerencial');
    if (subGerencial) {
        subGerencial.innerHTML = '<option value="">Manter atual</option>';
        console.log('✅ Subcategoria gerencial inicializada com apenas "Manter atual"');
    }

    console.log('✅ initializeEmptySubcategories() concluído');
}

// Carregar categorias para o modal baseado no tipo
async function loadCategoriesForModal(tabName) {
    try {
        // ✅ CORREÇÃO: Resetar todos os campos para "Manter atual" antes de carregar
        resetModalFields();

        if (tabName === 'despesas') {
            const [categorias, categoriasGerenciais, centros] = await Promise.all([
                fetch('/api/categorias-contabeis', { credentials: 'include' }).then(r => r.json()).catch(() => []),
                fetch('/api/categorias-gerenciais', { credentials: 'include' }).then(r => r.json()).catch(() => []),
                fetch('/api/centros-custo', { credentials: 'include' }).then(r => r.json()).catch(() => [])
            ]);

            populateSelect('bulk-categoria-gerencial', categoriasGerenciais.filter(cat => cat.pai_id === null));
            populateSelect('bulk-centro-custo', centros);
            populateSelect('bulk-categoria-contabil', categorias);

            // ✅ CORREÇÃO: Inicializar subcategorias vazias (apenas "Manter atual")
            initializeEmptySubcategories();

            // Configurar listeners para subcategorias no modal
            setupModalSubcategoryFilters();

            // Mostrar campos relevantes para despesas
            document.getElementById('modal-despesas-fields').style.display = 'block';
            document.getElementById('modal-receitas-fields').style.display = 'none';

        } else if (tabName === 'receitas') {
            const [clientes, projetos, produtos] = await Promise.all([
                fetch('/api/clientes', { credentials: 'include' }).then(r => r.json()).catch(() => []),
                fetch('/api/projetos', { credentials: 'include' }).then(r => r.json()).catch(() => []),
                fetch('/api/produtos-servicos', { credentials: 'include' }).then(r => r.json()).catch(() => [])
            ]);

            populateSelect('bulk-cliente', clientes);
            populateSelect('bulk-projeto', projetos);
            populateSelect('bulk-produto-servico', produtos);

            // Mostrar campos relevantes para receitas
            document.getElementById('modal-despesas-fields').style.display = 'none';
            document.getElementById('modal-receitas-fields').style.display = 'block';
        }

    } catch (error) {
        console.error('Erro ao carregar categorias para modal:', error);
    }
}

// Fechar modal de categorização - Compatível com todas as versões Chrome
function closeCategorization() {
    try {
        const modal = document.getElementById('categorization-modal');
        if (modal) {
            // Usar múltiplas abordagens para garantir compatibilidade
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
            modal.setAttribute('aria-hidden', 'true');

            // Limpar seleções e estado
            if (modalListenersController) {
                modalListenersController.abort();
                modalListenersController = null;
            }

            // Remover atributo data-tab
            modal.removeAttribute('data-tab');

            console.log('✅ Modal de categorização fechado com sucesso');
        }
    } catch (error) {
        console.error('❌ Erro ao fechar modal de categorização:', error);
        // Fallback - forçar fechamento
        const modal = document.getElementById('categorization-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Salvar categorização em massa
async function saveBulkCategorization() {
    const modalTabName = document.getElementById('categorization-modal').getAttribute('data-tab');
    const tabName = modalTabName || currentTab; // Fallback para currentTab se data-tab não estiver definido
    const selectedSet = tabName === 'despesas' ? selectedTransactionsDespesas : selectedTransactionsReceitas;

    if (selectedSet.size === 0) {
        showErrorMessage(`Nenhuma ${tabName.slice(0, -1)} selecionada.`);
        return;
    }

    const updates = {};

    if (tabName === 'despesas') {
        const categoriaGerencial = document.getElementById('bulk-categoria-gerencial').value;
        const subcategoriaGerencial = document.getElementById('bulk-subcategoria-gerencial').value;
        const centroCusto = document.getElementById('bulk-centro-custo').value;
        const categoriaContabil = document.getElementById('bulk-categoria-contabil').value;

        // Tratar tokens especiais antes de parseInt
        if (categoriaGerencial) {
            updates.categoria_gerencial_id = categoriaGerencial === 'sem_categoria' ? null : parseInt(categoriaGerencial);
        }
        if (subcategoriaGerencial) {
            updates.subcategoria_gerencial_id = subcategoriaGerencial === 'sem_subcategoria' ? null : parseInt(subcategoriaGerencial);
        }
        if (centroCusto) {
            updates.centro_custo_id = centroCusto === 'sem_categoria' ? null : parseInt(centroCusto);
        }
        if (categoriaContabil) {
            updates.categoria_contabil_id = categoriaContabil === 'sem_categoria' ? null : parseInt(categoriaContabil);
        }

    } else if (tabName === 'receitas') {
        const cliente = document.getElementById('bulk-cliente').value;
        const projeto = document.getElementById('bulk-projeto').value;
        const produtoServico = document.getElementById('bulk-produto-servico').value;

        if (cliente) updates.cliente_id = parseInt(cliente);
        if (projeto) updates.projeto_id = parseInt(projeto);
        if (produtoServico) updates.produto_servico_id = parseInt(produtoServico);
    }

    if (Object.keys(updates).length === 0) {
        showErrorMessage('Selecione pelo menos um campo para atualizar.');
        return;
    }

    showLoadingOverlay();

    try {
        const payload = {
            transaction_ids: Array.from(selectedSet),
            tipo: tabName.slice(0, -1), // Remove 's' do final
            updates: updates
        };

        console.log('🚀 Enviando payload para categorização em massa:', payload);
        console.log('🔍 DEBUG: IDs selecionados:', Array.from(selectedSet));
        console.log('🔍 DEBUG: Tipo de transação:', tabName.slice(0, -1));
        console.log('🔍 DEBUG: Updates:', updates);

        // Criar AbortController para timeout (compatibilidade Chrome 140+)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
            const response = await fetch('/api/transacoes/bulk-categorization', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

        console.log('📊 Response status:', response.status, response.statusText);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Resultado da categorização:', result);
            showSuccessMessage(`${result.updated_count} ${tabName} categorizadas com sucesso!`);

            // Recarregar dados
            await Promise.all([
                loadSummaryCards(),
                loadAllTransactionsData()
            ]);

            // Recarregar gráficos e tabela da aba atual
            loadChartsForTab(tabName);
            renderTransactionsTableForTab(tabName);

            closeCategorization();
            deselectAll(tabName);
        } else {
            const errorText = await response.text();
            console.error('❌ Erro HTTP:', response.status, response.statusText);
            console.error('❌ Resposta do servidor:', errorText);

            let errorMessage = 'Erro ao salvar categorização';
            try {
                const errorObj = JSON.parse(errorText);
                errorMessage = errorObj.detail || errorObj.message || errorText;
            } catch (parseError) {
                errorMessage = errorText || `HTTP ${response.status}`;
            }

            throw new Error(errorMessage);
        }

        } catch (innerError) {
            // Erro interno do fetch
            clearTimeout(timeoutId);
            throw innerError;
        }

    } catch (error) {
        console.error('❌ Erro completo ao salvar categorização:', error);
        console.error('❌ Stack trace:', error.stack);

        let errorMessage = 'Erro ao salvar categorização';

        // Tratar diferentes tipos de erro para compatibilidade Chrome 140+
        if (error.name === 'AbortError') {
            errorMessage = 'Operação cancelada por timeout (30s). Tente novamente.';
        } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (error.name === 'SyntaxError') {
            errorMessage = 'Erro na resposta do servidor. Tente novamente.';
        } else if (error.message) {
            errorMessage = 'Erro ao salvar categorização: ' + error.message;
        } else if (typeof error === 'string') {
            errorMessage = 'Erro ao salvar categorização: ' + error;
        } else {
            errorMessage = 'Erro desconhecido. Tente novamente ou contate o suporte.';
        }

        showErrorMessage(errorMessage);
    } finally {
        hideLoadingOverlay();
    }
}

// Configurar listeners para subcategorias no modal
// ✅ CORREÇÃO: Configurar listeners de subcategorias evitando duplicação
let modalListenersController = null; // Controller global para gerenciar listeners do modal

function setupModalSubcategoryFilters() {
    console.log('🔧 DEBUG: setupModalSubcategoryFilters() executando...');

    // Cancelar listeners anteriores se existirem
    if (modalListenersController) {
        modalListenersController.abort();
        console.log('✅ Listeners anteriores cancelados');
    }

    // Criar novo controller
    modalListenersController = new AbortController();
    const signal = modalListenersController.signal;

    // Configurar listener para categoria gerencial -> subcategoria gerencial
    const modalCatGerencial = document.getElementById('bulk-categoria-gerencial');
    if (modalCatGerencial) {
        modalCatGerencial.addEventListener('change', () => {
            console.log(`🔄 Categoria gerencial alterada: ${modalCatGerencial.value}`);
            loadSubcategoriesForModal('bulk-subcategoria-gerencial', modalCatGerencial.value, 'gerencial');
        }, { signal });
        console.log('✅ Listener categoria gerencial configurado');
    }

    console.log('✅ setupModalSubcategoryFilters() concluído');
}

// Carregar subcategorias para modal
async function loadSubcategoriesForModal(selectId, parentCategoryId, tipo) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Resetar select
    select.innerHTML = '<option value="">Manter atual</option>';

    // Sempre adicionar opção "Sem Subcategoria" primeiro
    const semSubcategoriaOption = document.createElement('option');
    semSubcategoriaOption.value = 'sem_subcategoria';
    semSubcategoriaOption.textContent = 'Sem Subcategoria';
    select.appendChild(semSubcategoriaOption);

    if (!parentCategoryId || parentCategoryId === 'sem_categoria') {
        // Se não há categoria pai, só mostrar "Manter atual" e "Sem Subcategoria"
        return;
    }

    try {
        const endpoint = tipo === 'gerencial' ? '/api/categorias-gerenciais' : '/api/categorias-contabeis';
        const response = await fetch(`${endpoint}?pai_id=${parentCategoryId}`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            const subcategorias = await response.json();

            // Adicionar subcategorias (Sem Subcategoria já foi adicionado acima)
            const items = Array.isArray(subcategorias) ? subcategorias : (subcategorias.items || []);
            items.forEach(sub => {
                const option = document.createElement('option');
                option.value = sub.id;
                option.textContent = sub.nome;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar subcategorias no modal:', error);
    }
}

// Atualizar contadores de registros
function updateRecordCounts() {
    const countDespesas = document.getElementById('count-despesas');
    const countReceitas = document.getElementById('count-receitas');

    if (countDespesas) {
        countDespesas.textContent = `(${filteredDespesas.length} registros)`;
    }

    if (countReceitas) {
        countReceitas.textContent = `(${filteredReceitas.length} registros)`;
    }
}

// Função para atualizar os contadores das abas (ex: Despesas (123))
function updateTabCounters() {
    const despesasTabCounter = document.getElementById('counter-despesas');
    const receitasTabCounter = document.getElementById('counter-receitas');

    if (despesasTabCounter) {
        despesasTabCounter.textContent = filteredDespesas.length;
    }
    if (receitasTabCounter) {
        receitasTabCounter.textContent = filteredReceitas.length;
    }
}

// Utilitários
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    var parts = String(dateString).substring(0, 10).split('-');
    if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
    return dateString;
}

function truncateText(text, maxLength) {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function showLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showSuccessMessage(message) {
    console.log('✅ ' + message);

    // Usar notificação global se disponível
    if (window.app && window.app.showNotification) {
        window.app.showNotification(message, 'success');
    } else {
        // Fallback: criar notificação visual simples
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            z-index: 9999;
            font-size: 14px;
            max-width: 300px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remover após 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

function showErrorMessage(message) {
    console.error('❌ ' + message);
}

function showWarningMessage(message) {
    console.warn('⚠️ ' + message);
}

function showVisibleWarning(message, actionText, actionCallback) {
    console.warn('⚠️ ' + message);
    createVisibleAlert('warning', message, actionText, actionCallback);
}

function showVisibleError(message, actionText, actionCallback) {
    console.error('❌ ' + message);
    createVisibleAlert('error', message, actionText, actionCallback);
}

function createVisibleAlert(type, message, actionText, actionCallback) {
    // Remover alertas anteriores
    const existingAlerts = document.querySelectorAll('.integrity-alert');
    existingAlerts.forEach(alert => alert.remove());

    // Criar container do alerta
    const alertDiv = document.createElement('div');
    alertDiv.className = `integrity-alert alert-${type}`;
    alertDiv.setAttribute('data-testid', `status-${type}`);

    // Estilo do alerta
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        ${type === 'error' ? 
            'background: #fee; border-left: 4px solid #dc3545; color: #721c24;' : 
            'background: #fff3cd; border-left: 4px solid #ffc107; color: #856404;'
        }
    `;

    // Conteúdo do alerta
    alertDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 8px;">
                    ${type === 'error' ? '🚨 Problema de Integridade' : '⚠️ Inconsistência Detectada'}
                </div>
                <div style="margin-bottom: 12px;">${message}</div>
                ${actionText ? `
                    <button class="alert-action-btn" style="
                        background: ${type === 'error' ? '#dc3545' : '#ffc107'};
                        color: ${type === 'error' ? 'white' : '#856404'};
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        text-transform: uppercase;
                    ">${actionText}</button>
                ` : ''}
            </div>
            <button class="alert-close-btn" style="
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: ${type === 'error' ? '#721c24' : '#856404'};
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">×</button>
        </div>
    `;

    // Event listeners
    const actionBtn = alertDiv.querySelector('.alert-action-btn');
    if (actionBtn && actionCallback) {
        actionBtn.addEventListener('click', actionCallback);
    }

    const closeBtn = alertDiv.querySelector('.alert-close-btn');
    closeBtn.addEventListener('click', () => alertDiv.remove());

    // Auto-remove após 15 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 15000);

    // Adicionar ao DOM
    document.body.appendChild(alertDiv);
}

// Adicionar badge styles no CSS se não existirem
const style = document.createElement('style');
style.textContent = `
    .badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
        white-space: nowrap;
    }
    .badge-receita { background: #dcfce7; color: #166534; }
    .badge-despesa { background: #fef2f2; color: #991b1b; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #92400e; }
`;
document.head.appendChild(style);

// Função para atualizar a tabela (despesas)
function updateDespesasTable() {
    renderDespesasTable();
}

// Função para atualizar a tabela (receitas)
function updateReceitasTable() {
    renderReceitasTable();
}

// Função para atualizar contadores de seleção
function updateSelectionCounters() {
    updateSelectionCountForTab('despesas');
    updateSelectionCountForTab('receitas');
}

// Função genérica para atualizar a tabela
function updateTable() {
    renderTransactionsTableForTab(currentTab);
}

// Função para mostrar toast (exemplo simples)
function showToast(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Aqui você pode implementar uma UI mais elaborada para exibir toasts
}

// Processar dados para o gráfico de categoria contábil (Exemplo de onde o problema pode estar)
function processDespesasChartData(despesas) {
    // Processar dados para o gráfico com debug
    const categoryCounts = {};

    despesas.forEach((despesa, index) => {
        const categoria = despesa.categoria_contabil_nome || 'Sem Categoria';
        categoryCounts[categoria] = (categoryCounts[categoria] || 0) + 1;

    });


    // Converter para formato do ECharts
    const data = Object.entries(categoryCounts).map(([name, value]) => ({
        name,
        value
    }));

    // Ordenar por valor decrescente
    data.sort((a, b) => b.value - a.value);

    return data;
}


// NOTA: createPieChart está definida na linha ~895, não duplicar aqui

// Funções para rolagem das tabelas específicas
function scrollTableToStart(tableId) {
    const table = document.getElementById(tableId);
    if (table) {
        const tableWrapper = table.closest('.advanced-table-wrapper');
        if (tableWrapper) {
            tableWrapper.scrollTo({
                left: 0,
                behavior: 'smooth'
            });
            console.log(`✅ Tabela ${tableId} rolada para o início`);
        }
    }
}

function scrollTableToEnd(tableId) {
    const table = document.getElementById(tableId);
    if (table) {
        const tableWrapper = table.closest('.advanced-table-wrapper');
        if (tableWrapper) {
            tableWrapper.scrollTo({
                left: tableWrapper.scrollWidth,
                behavior: 'smooth'
            });
            console.log(`✅ Tabela ${tableId} rolada para o final`);
        }
    }
}

// Global assignments moved to very end of file after all function definitions

// 🚀 PAGINAÇÃO: Funções de controle de paginação

// Atualizar controles de paginação para despesas
function updateDespesasPaginationControls() {
    const showingFrom = document.getElementById('despesas-showing-from');
    const showingTo = document.getElementById('despesas-showing-to');
    const totalRecords = document.getElementById('despesas-total-records');
    const currentPage = document.getElementById('despesas-current-page');
    const totalPages = document.getElementById('despesas-total-pages');

    const { currentPage: page, perPage, totalItems, totalPages: pages } = pagination.despesas;

    if (showingFrom && showingTo && totalRecords) {
        const from = totalItems > 0 ? (page - 1) * perPage + 1 : 0;
        const to = Math.min(page * perPage, totalItems);

        showingFrom.textContent = from;
        showingTo.textContent = to;
        totalRecords.textContent = totalItems;
    }

    if (currentPage && totalPages) {
        currentPage.textContent = page;
        totalPages.textContent = pages;
    }

    // Atualizar estado dos botões
    const prevBtn = document.getElementById('despesas-prev-page');
    const nextBtn = document.getElementById('despesas-next-page');

    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= pages;
}

// Atualizar controles de paginação para receitas
function updateReceitasPaginationControls() {
    const showingFrom = document.getElementById('receitas-showing-from');
    const showingTo = document.getElementById('receitas-showing-to');
    const totalRecords = document.getElementById('receitas-total-records');
    const currentPage = document.getElementById('receitas-current-page');
    const totalPages = document.getElementById('receitas-total-pages');

    const { currentPage: page, perPage, totalItems, totalPages: pages } = pagination.receitas;

    if (showingFrom && showingTo && totalRecords) {
        const from = totalItems > 0 ? (page - 1) * perPage + 1 : 0;
        const to = Math.min(page * perPage, totalItems);

        showingFrom.textContent = from;
        showingTo.textContent = to;
        totalRecords.textContent = totalItems;
    }

    if (currentPage && totalPages) {
        currentPage.textContent = page;
        totalPages.textContent = pages;
    }

    // Atualizar estado dos botões
    const prevBtn = document.getElementById('receitas-prev-page');
    const nextBtn = document.getElementById('receitas-next-page');

    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= pages;
}

// Navegação de paginação para despesas
function goToDespesasPage(pageNum) {
    pagination.despesas.currentPage = Math.max(1, Math.min(pageNum, pagination.despesas.totalPages));
    renderDespesasTable();
}

function despesasPreviousPage() {
    if (pagination.despesas.currentPage > 1) {
        pagination.despesas.currentPage--;
        renderDespesasTable();
    }
}

function despesasNextPage() {
    if (pagination.despesas.currentPage < pagination.despesas.totalPages) {
        pagination.despesas.currentPage++;
        renderDespesasTable();
    }
}

// Navegação de paginação para receitas
function goToReceitasPage(pageNum) {
    pagination.receitas.currentPage = Math.max(1, Math.min(pageNum, pagination.receitas.totalPages));
    renderReceitasTable();
}

function receitasPreviousPage() {
    if (pagination.receitas.currentPage > 1) {
        pagination.receitas.currentPage--;
        renderReceitasTable();
    }
}

function receitasNextPage() {
    if (pagination.receitas.currentPage < pagination.receitas.totalPages) {
        pagination.receitas.currentPage++;
        renderReceitasTable();
    }
}

// 🚀 CORREÇÃO FINAL: Expor apenas as funções que realmente existem
window.switchTab = switchTab;
window.loadChartsForTab = loadChartsForTab;
window.scrollTableToStart = scrollTableToStart;
window.scrollTableToEnd = scrollTableToEnd;
window.filterByCard = filterByCard;

// 🚀 PAGINAÇÃO: Expor funções de paginação
window.despesasPreviousPage = despesasPreviousPage;
window.despesasNextPage = despesasNextPage;
window.receitasPreviousPage = receitasPreviousPage;
window.receitasNextPage = receitasNextPage;

// Exportar funções globais para serem acessíveis (se necessário para outras partes do código)
window.updateRecordCounts = updateRecordCounts;
window.updateTabCounters = updateTabCounters;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.loadAllTransactionsData = loadAllTransactionsData;
window.updateDespesasTable = updateDespesasTable;
window.updateReceitasTable = updateReceitasTable;
window.updateSelectionCounters = updateSelectionCounters;
window.updateTable = updateTable;
window.showToast = showToast;
window.editarTransacao = window.editarTransacao; // Garantir que a função global exista
window.excluirTransacao = function(id) { // Adicionar placeholder para excluirTransacao se não existir
    console.warn(`Função excluirTransacao(${id}) chamada, mas não definida.`);
    showErrorMessage('Funcionalidade de exclusão não implementada.');
};