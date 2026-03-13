/**
 * JavaScript para páginas de listagem com seleção múltipla
 */

// Utiliza função global escapeHtml definida em utils.js

// Variáveis globais (usar window para evitar conflitos)
if (typeof window.listagem === 'undefined') {
    window.listagem = {};
}

if (typeof window.listagem.currentPage === 'undefined') {
    window.listagem.currentPage = 1;
}
if (typeof window.listagem.itemsPerPage === 'undefined') {
    window.listagem.itemsPerPage = 10;
}
if (typeof window.listagem.totalItems === 'undefined') {
    window.listagem.totalItems = 0;
}
if (typeof window.listagem.allItems === 'undefined') {
    window.listagem.allItems = [];
}
if (typeof window.listagem.filteredItems === 'undefined') {
    window.listagem.filteredItems = [];
}
if (typeof window.listagem.selectedItems === 'undefined') {
    window.listagem.selectedItems = new Set();
}
if (typeof window.listagem.sortColumn === 'undefined') {
    window.listagem.sortColumn = '';
}
if (typeof window.listagem.sortDirection === 'undefined') {
    window.listagem.sortDirection = 'asc';
}

// Aliases para compatibilidade (usando window.listagem para evitar redeclaração)
if (typeof window.currentPageAlias === 'undefined') {
    window.currentPageAlias = () => window.listagem.currentPage;
    window.itemsPerPageAlias = () => window.listagem.itemsPerPage;
    window.totalItemsAlias = () => window.listagem.totalItems;
    window.allDataAlias = window.listagem.allItems;
    window.filteredDataAlias = window.listagem.filteredItems;
    window.totalPagesAlias = 1;
}

// Estado da paginação
// let currentPage = 1; // Removido devido à nova declaração com 'var'
// let totalPages = 1; // Removido, será calculado dinamicamente
// let totalItems = 0; // Removido devido à nova declaração com 'var'
// let itemsPerPage = 50; // Removido devido à nova declaração com 'var'
// let allData = []; // Renomeado para allItems para consistência
// let filteredData = []; // Renomeado para filteredItems para consistência

// Instância da tabela avançada
let advancedTable = null;

// Função para recarregar a lista (chamada após salvar registro no modal)
window.refreshCurrentList = async function() {
    console.log('🔄 Recarregando lista após operação...');
    await loadData();
    if (window.entityType === 'empresas') {
        await carregarImpostosPorEmpresa();
    }
};

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Sistema de listagem carregado');

    // Detectar tipo de entidade pela URL
    const path = window.location.pathname;
    if (path.includes('/listagem/')) {
        window.entityType = path.split('/listagem/')[1];
        console.log('🏷️ Tipo de entidade detectado:', window.entityType);

        // Configurar botão de novo cadastro se existir
        const btnNovo = document.getElementById('btn-novo');
        if (btnNovo && window.entityType) {
            btnNovo.onclick = () => {
                console.log('➕ Abrindo modal para novo:', window.entityType);
                window.currentModalType = window.entityType; // Definir currentModalType
                openModal(window.entityType);
            };
        }

        // Configuração específica para impostos
        if (window.entityType === 'impostos') {
            console.log('💰 Configurando página de impostos');
            setupImpostosPage();
        }

        // Configuração específica para empresas
        if (window.entityType === 'empresas') {
            console.log('🏢 Configurando página de empresas');
            (async () => {
                await carregarImpostosERelacionamentos();
                await setupEmpresasPage();
            })();
        }

        // Configuração específica para produtos/serviços
        if (window.entityType === 'produtos-servicos') {
            console.log('📦 Configurando página de produtos/serviços');
            setupProdutosServicosPage();
        }

        // Configuração específica para projetos
        if (window.entityType === 'projetos') {
            console.log('📁 Configurando página de projetos');
            setupProjetosPage();
        }
    }
});

// Função específica para configurar página de impostos
async function setupImpostosPage() {
    // Definir o tipo de modal globalmente
    window.currentModalType = 'impostos';

    // Carregar empresas e preencher opções do modal
    try {
        const response = await fetch('/api/empresas?limit=1000', { credentials: 'include' });
        if (response.ok) {
            const empresas = await response.json();
            const config = MODAL_CONFIGS['impostos'];
            if (config && config.fields) {
                const empresaField = config.fields.find(f => f.name === 'empresa_id');
                if (empresaField) {
                    empresaField.options = empresas.map(e => ({
                        value: e.id,
                        label: e.nome_fantasia || e.razao_social || `Empresa ${e.id}`
                    }));
                }
            }
        }
    } catch (error) {
        console.error('Erro ao carregar empresas para impostos:', error);
    }

    // Aguardar um pouco para garantir que a tabela foi carregada
    setTimeout(() => {
        // Reconfigurar todos os botões de edição na tabela
        const editButtons = document.querySelectorAll('.btn-edit');
        editButtons.forEach(button => {
            const recordId = button.closest('[data-record-id]')?.getAttribute('data-record-id');
            if (recordId) {
                button.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('✏️ Clique no botão de editar imposto ID:', recordId);
                    editRecord(parseInt(recordId));
                };
            }
        });

        console.log('✅ Configuração específica de impostos aplicada');
    }, 500);
}

// Função específica para configurar página de empresas
async function setupEmpresasPage() {
    // Definir o tipo de modal globalmente
    window.currentModalType = 'empresas';

    // Carregar impostos e preencher opções do modal
    try {
        const response = await fetch('/api/impostos?limit=1000', { credentials: 'include' });
        if (response.ok) {
            const impostos = await response.json();
            const config = MODAL_CONFIGS['empresas'];
            if (config && config.fields) {
                const impostosField = config.fields.find(f => f.name === 'impostos');
                if (impostosField) {
                    impostosField.options = impostos.map(imp => ({
                        value: imp.id,
                        label: `${imp.nome} (${imp.valor}${imp.tipo === 'percentual' ? '%' : 'R$'})`
                    }));
                }
            }
        }
    } catch (error) {
        console.error('Erro ao carregar impostos para empresas:', error);
    }

    console.log('✅ Configuração específica de empresas aplicada');
}

// Função específica para configurar página de produtos/serviços
async function setupProdutosServicosPage() {
    // Definir o tipo de modal globalmente
    window.currentModalType = 'produtos-servicos';

    // Carregar clientes e preencher opções do modal
    try {
        const response = await fetch('/api/clientes', { credentials: 'include' });
        if (response.ok) {
            const clientes = await response.json();
            console.log('✅ Clientes carregados para produtos/serviços:', clientes.length);

            // Atualizar configuração do modal
            if (window.MODAL_CONFIGS && window.MODAL_CONFIGS['produtos-servicos']) {
                const config = window.MODAL_CONFIGS['produtos-servicos'];
                const clientesField = config.fields.find(f => f.name === 'clientes');
                if (clientesField) {
                    clientesField.options = clientes.map(c => ({
                        value: c.id,
                        label: c.nome || `Cliente ${c.id}`
                    }));
                    console.log('✅ Opções de clientes atualizadas no modal de produtos/serviços');
                }
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar clientes para produtos/serviços:', error);
    }

    console.log('✅ Configuração específica de produtos/serviços aplicada');
}

// Função específica para configurar página de projetos
async function setupProjetosPage() {
    // Definir o tipo de modal globalmente
    window.currentModalType = 'projetos';

    // Carregar clientes e preencher opções do modal
    try {
        const response = await fetch('/api/clientes', { credentials: 'include' });
        if (response.ok) {
            const clientes = await response.json();
            console.log('✅ Clientes carregados para projetos:', clientes.length);

            // Atualizar configuração do modal
            if (window.MODAL_CONFIGS && window.MODAL_CONFIGS['projetos']) {
                const config = window.MODAL_CONFIGS['projetos'];
                const clientesField = config.fields.find(f => f.name === 'clientes');
                if (clientesField) {
                    clientesField.options = clientes.map(c => ({
                        value: c.id,
                        label: c.nome || `Cliente ${c.id}`
                    }));
                    console.log('✅ Opções de clientes atualizadas no modal de projetos');
                }
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar clientes para projetos:', error);
    }

    console.log('✅ Configuração específica de projetos aplicada');
}


// Carregar dados ao inicializar a página
document.addEventListener('DOMContentLoaded', function() {
    if (window.entityType && window.entityConfig) {
        initAdvancedTable();
        loadData();
    }
});

function initAdvancedTable() {
    // Configurar tabela avançada
    advancedTable = new AdvancedTable('#data-table', {
        enableResize: true,
        enableSort: true,
        enableFilter: true,
        storageKey: `listagem-${window.entityType}`
    });

    // Override específico para subcategorias - usar apenas dados locais
    if (window.entityType === 'subcategorias') {
        console.log('🔧 Aplicando override de filtros para subcategorias');

        advancedTable.populateFilterOptions = async function(container, field) {
            console.log(`🔍 [OVERRIDE] Populando filtro local para campo "${field}" em subcategorias`);

            // Usar apenas dados locais, sem chamadas ao servidor
            const uniqueValues = [...new Set(
                this.data.map(row => {
                    const value = row[field] !== undefined ? row[field] : this.getFieldValue(row, field);
                    return value;
                })
                .filter(val => val !== null && val !== undefined && val !== '')
            )].sort();

            console.log(`📋 Valores únicos encontrados para "${field}":`, uniqueValues);

            const currentFilter = this.filters[field] || [];

            container.innerHTML = uniqueValues.map(value => `
                <div class="filter-option">
                    <input type="checkbox" value="${value}" ${currentFilter.includes(value) ? 'checked' : ''}>
                    <span>${this.formatValue ? this.formatValue(value) : value}</span>
                </div>
            `).join('');

            console.log(`✅ Filtro "${field}": ${uniqueValues.length} opções únicas populadas dos dados locais`);
        };
    }

    // Sobrescrever método de renderização
    advancedTable.renderTable = function() {
        // Usar dados filtrados da tabela avançada
        window.listagem.filteredItems = this.getFilteredData();
        window.listagem.currentPage = 1; // Reset para primeira página após filtro
        updateTable();
        updatePagination(); // Recalcular paginação com dados filtrados
    };
}

async function loadData() {
    try {
        showLoading(true);
        // Adicionar timestamp e random para evitar cache agressivamente
        const timestamp = new Date().getTime();
        const randomId = Math.random().toString(36).substring(2, 15);
        const response = await fetch(`/api/${window.entityType}?limit=1000&_t=${timestamp}&_r=${randomId}&_cache_bust=${Date.now()}`, {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Erro ao carregar dados`);
        }

        window.listagem.allItems = await response.json();
        window.listagem.filteredItems = [...window.listagem.allItems];
        window.listagem.currentPage = 1; // Reset para primeira página

        // Atualizar tabela avançada com dados
        if (advancedTable) {
            advancedTable.setData(window.listagem.allItems);
        } else {
            updateTable();
            updatePagination();
        }

        showLoading(false);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showError('Erro ao carregar dados: ' + error.message);
        showLoading(false);
    }
}

function showLoading(show) {
    const loadingContainer = document.getElementById('loading-container');
    const tableContainer = document.getElementById('table-container');

    if (loadingContainer && tableContainer) {
        loadingContainer.style.display = show ? 'block' : 'none';
        tableContainer.style.display = show ? 'none' : 'block';
    }
}

// Cache de impostos e relacionamentos empresa-imposto
let impostosPorEmpresa = {};
let impostosMap = {};

// Carregar impostos e montar relacionamentos
async function carregarImpostosERelacionamentos() {
    try {
        const response = await fetch('/api/impostos?limit=1000', { credentials: 'include' });
        if (response.ok) {
            const impostos = await response.json();
            impostos.forEach(imp => {
                impostosMap[imp.id] = imp;
                if (!impostosPorEmpresa[imp.empresa_id]) {
                    impostosPorEmpresa[imp.empresa_id] = [];
                }
                impostosPorEmpresa[imp.empresa_id].push(imp);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar impostos:', error);
    }
}

// Formatar impostos para exibição na tabela
function formatarImpostosTabela(empresaId) {
    const impostos = impostosPorEmpresa[empresaId];
    if (!impostos || impostos.length === 0) {
        return '<span style="color: #9ca3af;">Nenhum</span>';
    }
    return impostos.map(imp =>
        `<span style="display: inline-block; margin-right: 8px; padding: 2px 6px; background: #eff6ff; border: 1px solid #93c5fd; border-radius: 4px; font-size: 12px;">
            ${imp.nome}: ${imp.valor}${imp.tipo === 'percentual' ? '%' : 'R$'}
        </span>`
    ).join('');
}

function updateTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    // Usar dados filtrados da tabela avançada se disponível
    const dataToUse = advancedTable ? advancedTable.getFilteredData() : window.listagem.filteredItems;

    const startIndex = (window.listagem.currentPage - 1) * window.listagem.itemsPerPage;
    const endIndex = startIndex + window.listagem.itemsPerPage;
    const pageData = dataToUse.slice(startIndex, endIndex);

    tbody.innerHTML = '';

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr class="loading"><td colspan="${window.entityConfig.table_fields.length + 3}">Nenhum registro encontrado</td></tr>`;
        return;
    }

    pageData.forEach(item => {
        const row = document.createElement('tr');
        row.setAttribute('data-record-id', item.id);
        row.innerHTML = `
            <td class="checkbox-cell">
                <input type="checkbox" class="item-checkbox" value="${item.id}" onchange="updateDeleteButton()">
            </td>
            ${window.entityConfig.table_fields.map(field => {
                let value = item[field.name] || '';
                let cellContent = '';

                if (field.type === 'boolean') {
                    const badgeClass = value ? 'badge-success' : 'badge-danger';
                    const badgeText = value ? 'Ativo' : 'Inativo';
                    cellContent = `<span class="badge ${badgeClass}">${badgeText}</span>`;
                } else if (field.type === 'select' && field.options) {
                    const option = field.options.find(opt => opt.value === value);
                    value = option ? option.label : value;
                    cellContent = escapeHtml(value);
                } else if (field.type === 'number' && value) {
                    // Para impostos (valor), não formatar como moeda
                    if (window.entityType === 'impostos' && field.name === 'valor') {
                        cellContent = escapeHtml(value);
                    } else {
                        value = parseFloat(value).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                        });
                        cellContent = escapeHtml(value);
                    }
                } else if (field.type === 'date' && value) {
                    var dp = String(value).substring(0, 10).split('-');
                    value = dp.length === 3 ? dp[2] + '/' + dp[1] + '/' + dp[0] : value;
                    cellContent = escapeHtml(value);
                } else {
                    cellContent = escapeHtml(value);
                }

                const safeTitle = escapeHtml(String(value));
                return `<td>${cellContent}</td>`;
            }).join('')}
            ${window.entityType === 'empresas' ? `<td>${formatarImpostosTabela(item.id)}</td>` : ''}
            <td class="actions-cell">
                <button class="action-btn edit btn-edit" onclick="editItem(${item.id})" title="Editar" data-testid="button-edit-${item.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteItem(${item.id})" title="Excluir" data-testid="button-delete-${item.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Atualizar paginação usando dados filtrados
    if (advancedTable) {
        window.listagem.filteredItems = dataToUse;
    }
}

function updatePagination() {
    // Usar dados filtrados da tabela avançada se disponível
    const dataToUse = advancedTable ? advancedTable.getFilteredData() : window.listagem.filteredItems;
    window.listagem.totalItems = dataToUse.length;
    const totalPages = Math.ceil(window.listagem.totalItems / window.listagem.itemsPerPage);

    const paginationInfo = document.getElementById('pagination-info');
    const pageInfo = document.getElementById('page-info');
    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');

    if (paginationInfo) {
        paginationInfo.textContent =
            `Mostrando ${Math.min((window.listagem.currentPage - 1) * window.listagem.itemsPerPage + 1, window.listagem.totalItems)}-${Math.min(window.listagem.currentPage * window.listagem.itemsPerPage, window.listagem.totalItems)} de ${window.listagem.totalItems} registros`;
    }

    if (pageInfo) {
        pageInfo.textContent = `Página ${window.listagem.currentPage} de ${totalPages}`;
    }

    if (prevPage) {
        prevPage.disabled = window.listagem.currentPage <= 1;
    }

    if (nextPage) {
        nextPage.disabled = window.listagem.currentPage >= totalPages;
    }
}

function previousPage() {
    if (window.listagem.currentPage > 1) {
        window.listagem.currentPage--;
        updateTable();
        updatePagination();
    }
}

function nextPage() {
    const totalPages = Math.ceil(window.listagem.totalItems / window.listagem.itemsPerPage);
    if (window.listagem.currentPage < totalPages) {
        window.listagem.currentPage++;
        updateTable();
        updatePagination();
    }
}

// filterTable() removida - agora usando apenas filtros da AdvancedTable

function selectAll() {
    console.log('✅ Selecionando todos os itens...');
    const checkboxes = document.querySelectorAll('.item-checkbox');
    console.log(`📋 Total de checkboxes encontrados: ${checkboxes.length}`);

    checkboxes.forEach(cb => {
        cb.checked = true;
    });

    updateSelectAllCheckbox();
    updateDeleteButton();

    const checkedCount = document.querySelectorAll('.item-checkbox:checked').length;
    console.log(`✅ ${checkedCount} itens selecionados`);
}

function deselectAll() {
    console.log('❌ Desmarcando todos os itens...');
    const checkboxes = document.querySelectorAll('.item-checkbox');
    console.log(`📋 Total de checkboxes encontrados: ${checkboxes.length}`);

    checkboxes.forEach(cb => {
        cb.checked = false;
    });

    updateSelectAllCheckbox();
    updateDeleteButton();

    console.log('✅ Todos os itens desmarcados');
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const checkboxes = document.querySelectorAll('.item-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
    updateDeleteButton();
}

function updateSelectAllCheckbox() {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    const checkedBoxes = document.querySelectorAll('.item-checkbox:checked');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');

    if (!selectAllCheckbox) return;

    if (checkedBoxes.length === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (checkedBoxes.length === checkboxes.length) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
    }
}

function updateDeleteButton() {
    const checkedBoxes = document.querySelectorAll('.item-checkbox:checked');
    const deleteButton = document.getElementById('delete-selected');

    console.log(`🔄 Atualizando botão de exclusão: ${checkedBoxes.length} itens selecionados`);

    if (deleteButton) {
        deleteButton.disabled = checkedBoxes.length === 0;
        console.log(`🔘 Botão de exclusão ${deleteButton.disabled ? 'desabilitado' : 'habilitado'}`);
    } else {
        console.warn('⚠️ Botão de exclusão não encontrado no DOM');
    }

    updateSelectAllCheckbox();
}

async function editItem(id) {
    // Abrir modal de edição usando a função global
    if (window.editRecord && typeof window.editRecord === 'function') {
        // Define o contexto para subcategorias se aplicável
        if (window.entityType === 'subcategorias') {
            window.currentModalType = 'subcategorias';
        }
        await window.editRecord(id);
    } else if (window.gerenciarSubcategoriasController && window.entityType === 'subcategorias') {
        // Usar controller especializado para subcategorias se disponível
        await window.gerenciarSubcategoriasController.editSubcategory(id);
    } else {
        // Fallback: buscar dados e abrir modal
        try {
            const response = await fetch(`/api/${window.entityType}/${id}`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                const record = await response.json();
                if (window.openModal) {
                    await window.openModal(window.entityType, record);
                } else {
                    showError('Sistema de modal não disponível');
                }
            } else {
                throw new Error('Registro não encontrado');
            }
        } catch (error) {
            console.error('Erro ao carregar registro para edição:', error);
            showError('Erro ao carregar registro para edição: ' + error.message);
        }
    }
}

async function deleteItem(id) {
    if (!confirm('Tem certeza que deseja excluir este item?')) {
        return;
    }

    try {
        const response = await fetch(`/api/${window.entityType}/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            showSuccess('Item excluído com sucesso!');
            // Forçar reload completo dos dados
            window.listagem.allItems = [];
            window.listagem.filteredItems = [];
            window.listagem.currentPage = 1;
            // Aguardar um breve delay antes de recarregar para garantir que a deleção foi processada
            setTimeout(async () => {
                await loadData();
            }, 200);
        } else {
            const error = await response.text();
            throw new Error(error || 'Erro ao excluir item');
        }
    } catch (error) {
        console.error('Erro ao excluir item:', error);
        showError('Erro ao excluir item: ' + error.message);
    }
}

async function deleteSelected() {
    const checkedBoxes = document.querySelectorAll('.item-checkbox:checked');
    const ids = Array.from(checkedBoxes).map(cb => parseInt(cb.value));

    console.log('🗑️ Tentando excluir IDs:', ids);

    if (ids.length === 0) {
        showError('Nenhum item selecionado');
        return;
    }

    if (!confirm(`Tem certeza que deseja excluir ${ids.length} item(s) selecionado(s)?`)) {
        return;
    }

    try {
        console.log(`📤 Enviando requisição DELETE para /api/${window.entityType}/bulk-delete`);

        const response = await fetch(`/api/${window.entityType}/bulk-delete`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ ids: ids })
        });

        console.log('📥 Resposta recebida:', response.status, response.statusText);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Resultado da exclusão:', result);
            showSuccess(result.message || `${ids.length} item(s) excluído(s) com sucesso!`);

            // Limpar seleção
            deselectAll();

            // Forçar reload completo dos dados
            window.listagem.allItems = [];
            window.listagem.filteredItems = [];
            window.listagem.currentPage = 1;

            setTimeout(async () => {
                await loadData();
            }, 200);
        } else {
            // Parse JSON error response from backend
            let errorMessage = 'Erro ao excluir itens';
            try {
                const errorData = await response.json();
                console.error('❌ Erro do servidor:', errorData);
                console.error('❌ Status da resposta:', response.status);
                errorMessage = errorData.detail || errorData.message || errorMessage;

                console.log('📢 Mensagem de erro original:', errorMessage);

                // Mensagens específicas para clientes
                if (window.entityType === 'clientes') {
                    if (errorMessage.includes('projetos')) {
                        errorMessage = '⚠️ NÃO É POSSÍVEL EXCLUIR ESTES CLIENTES\n\n' +
                                     'Motivo: Existem projetos associados a eles.\n\n' +
                                     'O que fazer:\n' +
                                     '1. Acesse a página de Projetos\n' +
                                     '2. Exclua ou reatribua os projetos destes clientes\n' +
                                     '3. Depois volte aqui para excluir os clientes';
                    } else if (errorMessage.includes('transações') || errorMessage.includes('transacoes')) {
                        errorMessage = '⚠️ NÃO É POSSÍVEL EXCLUIR ESTES CLIENTES\n\n' +
                                     'Motivo: Existem transações (receitas/despesas) associadas a eles.\n\n' +
                                     'O que fazer:\n' +
                                     '1. Acesse o Dashboard ou Contas a Receber/Pagar\n' +
                                     '2. Exclua as transações destes clientes\n' +
                                     '3. Depois volte aqui para excluir os clientes';
                    } else if (errorMessage.includes('dados relacionados')) {
                        errorMessage = '⚠️ NÃO É POSSÍVEL EXCLUIR ESTES CLIENTES\n\n' +
                                     'Motivo: Existem dados relacionados (projetos, transações, etc.)\n\n' +
                                     'O que fazer:\n' +
                                     'Remova todos os dados associados a estes clientes antes de excluí-los.';
                    }
                }

                console.log('📢 Mensagem de erro que será exibida:', errorMessage);
            } catch (parseError) {
                console.error('❌ Erro ao fazer parse do JSON de erro:', parseError);
                const textError = await response.text();
                console.error('❌ Resposta de erro (texto):', textError);
                errorMessage = textError || errorMessage;
            }

            // Garantir que a mensagem seja exibida
            console.error('❌ Lançando erro com mensagem:', errorMessage);
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('❌ Erro ao excluir itens:', error);
        showError(error.message || 'Erro ao excluir itens');
    }
}

function showSuccess(message) {
    console.log('✅ Exibindo mensagem de sucesso:', message);
    // Implementar notificação de sucesso
    if (window.app && window.app.showNotification) {
        window.app.showNotification(message, 'success');
    } else {
        alert('✅ SUCESSO\n\n' + message);
    }
}

function showError(message) {
    console.error('❌ Exibindo mensagem de erro:', message);
    // Implementar notificação de erro  
    if (window.app && window.app.showNotification) {
        window.app.showNotification(message, 'error');
    } else {
        alert('❌ ERRO\n\n' + message);
    }
}

// Função para editar registro
async function editRecord(recordId) {
    console.log('📝 Editando registro ID:', recordId, 'Tipo:', window.currentModalType);

    // Tratamento especial para subcategorias (funciona independente do modal context)
    if (window.currentModalType === 'subcategorias' || window.entityType === 'subcategorias') {
        return await editSubcategoria(recordId);
    }

    // Se não tiver currentModalType, tentar detectar pela página atual
    if (!window.currentModalType) {
        const path = window.location.pathname;
        if (path.includes('/listagem/')) {
            const entityType = path.split('/listagem/')[1];
            window.currentModalType = entityType;
            console.log('🔍 Detectado tipo de entidade:', entityType);
        }
    }

    if (!window.currentModalType) {
        console.error('❌ Tipo de modal não definido');
        return;
    }

    const config = window.MODAL_CONFIGS[window.currentModalType];
    if (!config) {
        console.error('❌ Configuração de modal não encontrada para:', window.currentModalType);
        return;
    }

    try {
        console.log('🔄 Buscando registro em:', `${config.endpoint}/${recordId}`);

        const response = await fetch(`${config.endpoint}/${recordId}`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            const record = await response.json();
            console.log('✅ Registro carregado para edição:', record);
            openModal(window.currentModalType, record);
        } else {
            console.error('❌ Erro ao buscar registro para edição. Status:', response.status);
            alert('Erro ao carregar registro para edição');
        }
    } catch (error) {
        console.error('❌ Erro ao editar registro:', error);
        alert('Erro de conexão ao editar registro');
    }
}

// Função para exportar cadastros para Excel
window.exportarCadastroExcel = async function() {
    try {
        console.log('📊 Iniciando exportação de cadastro para Excel...');
        
        // Mostrar loading no botão
        const btn = document.getElementById('export-excel-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ Gerando...';
        btn.disabled = true;
        
        // Obter todos os dados carregados
        const dados = window.listagem.allItems || [];
        
        if (dados.length === 0) {
            alert('Não há dados para exportar');
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }
        
        // Obter configuração de campos da tabela
        const config = window.entityConfig;
        const entityType = window.entityType;
        
        // Preparar dados para Excel
        const excelData = dados.map(item => {
            const row = {};
            
            // Usar campos da configuração se disponível
            if (config && config.table_fields) {
                config.table_fields.forEach(field => {
                    let valor = item[field.name];
                    
                    // Formatar valores especiais
                    if (valor === null || valor === undefined) {
                        valor = '';
                    } else if (typeof valor === 'boolean') {
                        valor = valor ? 'Sim' : 'Não';
                    }
                    
                    row[field.label] = valor;
                });
            } else {
                // Fallback: usar todas as propriedades do objeto
                Object.keys(item).forEach(key => {
                    if (key !== 'id' && !key.endsWith('_id')) {
                        let valor = item[key];
                        if (valor === null || valor === undefined) valor = '';
                        if (typeof valor === 'boolean') valor = valor ? 'Sim' : 'Não';
                        row[key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')] = valor;
                    }
                });
            }
            
            return row;
        });
        
        // Carregar SheetJS dinamicamente se não estiver carregado
        if (typeof XLSX === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        
        // Criar workbook e worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Ajustar largura das colunas
        const colWidths = [];
        if (excelData.length > 0) {
            Object.keys(excelData[0]).forEach((key, i) => {
                let maxLen = key.length;
                excelData.forEach(row => {
                    const val = String(row[key] || '');
                    if (val.length > maxLen) maxLen = val.length;
                });
                colWidths.push({ wch: Math.min(maxLen + 2, 50) });
            });
            ws['!cols'] = colWidths;
        }
        
        // Nome da aba e arquivo
        const titulo = config ? config.title : entityType;
        XLSX.utils.book_append_sheet(wb, ws, titulo.substring(0, 31));
        
        // Gerar arquivo
        const dataAtual = new Date().toISOString().split('T')[0];
        const nomeArquivo = `${entityType}_${dataAtual}.xlsx`;
        
        XLSX.writeFile(wb, nomeArquivo);
        
        console.log('✅ Excel exportado com sucesso:', nomeArquivo);
        
        if (window.showNotification) {
            showNotification('Excel exportado com sucesso!', 'success');
        }
        
    } catch (error) {
        console.error('❌ Erro ao exportar Excel:', error);
        alert('Erro ao exportar Excel: ' + error.message);
    } finally {
        // Restaurar botão
        const btn = document.getElementById('export-excel-btn');
        if (btn) {
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13.5L7 17h1.2l.6-1.5h1.6l.6 1.5h1.2l-1.5-3.5h-1.2zm.9 2.3l.5-1.3.5 1.3h-1zm4.1-2.3L12 17h1.2l.6-1.5h1.6l.6 1.5h1.2l-1.5-3.5h-1.2zm.9 2.3l.5-1.3.5 1.3h-1z"/>
            </svg> Excel`;
            btn.disabled = false;
        }
    }
};