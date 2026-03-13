/**
 * Sistema de Tabelas Avançadas - Bennu Finance
 * Funcionalidades: Colunas Redimensionáveis, Filtros nos Cabeçalhos, Ordenação
 */

class AdvancedTable {
    constructor(tableSelector, options = {}) {
        this.table = document.querySelector(tableSelector);
        if (!this.table) {
            console.error('Tabela não encontrada:', tableSelector);
            return;
        }

        this.options = {
            enableResize: true,
            enableSort: true,
            enableFilter: true,
            minColumnWidth: 80,
            defaultColumnWidth: 150,
            storageKey: `table-config-${tableSelector.replace(/[^a-zA-Z0-9]/g, '')}`,
            ...options
        };

        this.data = [];
        this.filteredData = [];
        this.filters = {};
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.columnConfigs = {};

        this.init();
    }

    init() {
        this.setupTable();
        this.loadColumnConfigs();
        if (this.options.enableResize) this.initResize();
        if (this.options.enableSort) this.initSort();
        if (this.options.enableFilter) this.initFilters();
        this.initGlobalEvents();
    }

    setupTable() {
        // Adicionar classes necessárias
        this.table.classList.add('advanced-table');

        // Criar wrapper se não existir
        if (!this.table.parentElement.classList.contains('advanced-table-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'advanced-table-wrapper';
            this.table.parentElement.insertBefore(wrapper, this.table);
            wrapper.appendChild(this.table);
        }

        // Criar container se não existir
        const wrapper = this.table.parentElement;
        if (!wrapper.parentElement.classList.contains('advanced-table-container')) {
            const container = document.createElement('div');
            container.className = 'advanced-table-container';
            wrapper.parentElement.insertBefore(container, wrapper);
            container.appendChild(wrapper);
        }
    }

    initResize() {
        const headers = this.table.querySelectorAll('th');
        headers.forEach((th, index) => {
            // Pular última coluna (ações) e checkbox
            if (index === 0 || index === headers.length - 1) return;

            const resizer = document.createElement('div');
            resizer.className = 'column-resizer';
            resizer.dataset.column = index;
            resizer.setAttribute('data-testid', `col-resizer-${index}`);
            th.appendChild(resizer);

            this.bindResizeEvents(resizer, th);
        });
    }

    bindResizeEvents(resizer, th) {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = th.offsetWidth;
            resizer.classList.add('resizing');

            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const width = startWidth + e.clientX - startX;
            const minWidth = this.options.minColumnWidth;

            if (width >= minWidth) {
                th.style.width = width + 'px';
                this.saveColumnWidth(th.cellIndex, width);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizer.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    initSort() {
        const headers = this.table.querySelectorAll('th');
        headers.forEach((th, index) => {
            // Pular checkbox e ações
            if (index === 0 || index === headers.length - 1) return;

            th.classList.add('sortable-header');

            // Adicionar indicador de ordenação
            const indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            th.appendChild(indicator);

            th.addEventListener('click', (e) => {
                // Evitar ordenação se clicou no resizer ou filtro
                if (e.target.classList.contains('column-resizer') ||
                    e.target.closest('.header-filter-container')) {
                    return;
                }

                this.sort(th.dataset.field || this.getFieldName(th), th);
            });
        });
    }

    initFilters() {
        const headers = this.table.querySelectorAll('th');
        headers.forEach((th, index) => {
            // Pular checkbox e ações
            if (index === 0 || index === headers.length - 1) return;

            const filterContainer = document.createElement('div');
            filterContainer.className = 'header-filter-container';

            const filterButton = document.createElement('div');
            filterButton.className = 'header-filter-button';
            filterButton.innerHTML = `
                <span class="filter-text">Todos</span>
                <span class="filter-icon">🔽</span>
            `;

            const dropdown = document.createElement('div');
            dropdown.className = 'header-filter-dropdown';
            dropdown.innerHTML = `
                <input type="text" class="filter-search" placeholder="Buscar...">
                <div class="filter-options"></div>
                <div class="filter-actions">
                    <button class="filter-action-btn" data-action="selectAll">Todos</button>
                    <button class="filter-action-btn" data-action="clear">Limpar</button>
                    <button class="filter-action-btn primary" data-action="apply">Aplicar</button>
                </div>
            `;

            filterContainer.appendChild(filterButton);
            filterContainer.appendChild(dropdown);
            th.appendChild(filterContainer);

            this.bindFilterEvents(filterContainer, th);
        });
    }

    bindFilterEvents(container, th) {
        const button = container.querySelector('.header-filter-button');
        const dropdown = container.querySelector('.header-filter-dropdown');
        const search = container.querySelector('.filter-search');
        const options = container.querySelector('.filter-options');
        const actions = container.querySelector('.filter-actions');

        const fieldName = th.dataset.field || this.getFieldName(th);

        // Toggle dropdown
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            this.closeAllDropdowns();
            dropdown.classList.toggle('show');
            if (dropdown.classList.contains('show')) {
                await this.populateFilterOptions(options, fieldName);
            }
        });

        // Busca no filtro
        search.addEventListener('input', () => {
            this.filterOptions(options, search.value);
        });

        // Ações do filtro
        actions.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;

            switch (action) {
                case 'selectAll':
                    this.selectAllOptions(options);
                    break;
                case 'clear':
                    this.clearOptions(options);
                    break;
                case 'apply':
                    this.applyFilter(fieldName, options, button);
                    dropdown.classList.remove('show');
                    break;
            }
        });
    }

    initGlobalEvents() {
        // Fechar dropdowns ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.header-filter-container')) {
                this.closeAllDropdowns();
            }
        });
    }

    // Métodos de dados
    setData(data) {
        this.data = data; // Garante que todos os dados sejam mantidos na propriedade 'data'
        this.filteredData = [...data];
        this.updateTable();
    }

    updateTable() {
        // Aplicar filtros
        this.applyAllFilters();

        // Aplicar ordenação
        if (this.sortColumn) {
            this.applySorting();
        }

        // Renderizar dados
        this.renderTable();
    }

    applyAllFilters() {
        // Aplica todos os filtros configurados aos dados originais.
        this.filteredData = this.data.filter(row => {
            return Object.keys(this.filters).every(field => {
                const filter = this.filters[field];
                if (!filter || filter.length === 0) return true;

                const value = this.getFieldValue(row, field);
                return filter.includes(value);
            });
        });
    }

    applySorting() {
        this.filteredData.sort((a, b) => {
            const aVal = this.getFieldValue(a, this.sortColumn);
            const bVal = this.getFieldValue(b, this.sortColumn);

            let result = 0;
            if (aVal < bVal) result = -1;
            else if (aVal > bVal) result = 1;

            return this.sortDirection === 'desc' ? -result : result;
        });
    }

    sort(field, headerElement) {
        // Toggle direction se mesma coluna
        if (this.sortColumn === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = field;
            this.sortDirection = 'asc';
        }

        // Atualizar indicadores visuais
        this.updateSortIndicators(headerElement);

        // Aplicar ordenação
        this.updateTable();
    }

    updateSortIndicators(activeHeader) {
        // Limpar todos os indicadores
        this.table.querySelectorAll('th').forEach(th => {
            th.classList.remove('sorted', 'asc', 'desc');
            const indicator = th.querySelector('.sort-indicator');
            if (indicator) {
                indicator.className = 'sort-indicator';
            }
        });

        // Marcar coluna ativa
        activeHeader.classList.add('sorted', this.sortDirection);
        const indicator = activeHeader.querySelector('.sort-indicator');
        if (indicator) {
            indicator.classList.add(this.sortDirection);
        }
    }

    async populateFilterOptions(container, field) {
        try {
            // 🚀 OTIMIZAÇÃO: Usar endpoint dedicado para buscar opções únicas
            console.log(`🔍 Carregando opções de filtro para coluna: ${field}`);

            const response = await fetch(`/api/transacoes/filter-options?column=${encodeURIComponent(field)}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            const uniqueValues = result.options || [];
            const currentFilter = this.filters[field] || [];

            container.innerHTML = uniqueValues.map(value => `
                <div class="filter-option">
                    <input type="checkbox" value="${value}" ${currentFilter.includes(value) ? 'checked' : ''}>
                    <span>${this.formatValue(value)}</span>
                </div>
            `).join('');

            console.log(`✅ Filtro ${field}: ${uniqueValues.length} opções carregadas do servidor`);

        } catch (error) {
            console.error('Erro ao carregar opções de filtro:', error);

            // Fallback: usar dados locais em caso de erro
            const uniqueValues = [...new Set(
                this.data.map(row => this.getFieldValue(row, field))
                         .filter(val => val !== null && val !== undefined && val !== '')
            )].sort();

            const currentFilter = this.filters[field] || [];

            container.innerHTML = uniqueValues.map(value => `
                <div class="filter-option">
                    <input type="checkbox" value="${value}" ${currentFilter.includes(value) ? 'checked' : ''}>
                    <span>${this.formatValue(value)}</span>
                </div>
            `).join('');

            console.log(`⚠️ Fallback: ${uniqueValues.length} opções dos dados locais`);
        }
    }

    filterOptions(container, searchTerm) {
        const options = container.querySelectorAll('.filter-option');
        options.forEach(option => {
            const text = option.querySelector('span').textContent.toLowerCase();
            const matches = text.includes(searchTerm.toLowerCase());
            option.style.display = matches ? 'flex' : 'none';
        });
    }

    selectAllOptions(container) {
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
    }

    clearOptions(container) {
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    }

    applyFilter(fieldName, container, button) {
        const selectedValues = [];
        const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');

        checkboxes.forEach(cb => {
            selectedValues.push(cb.value);
        });

        // Aplicar filtro
        this.filters[fieldName] = selectedValues;

        // 🔧 FIX: Usar updateTable() que aplica filtros E renderiza
        this.updateTable();

        // Atualizar visual do botão
        const buttonElement = container.parentNode.querySelector('.header-filter-button');
        const filterText = buttonElement.querySelector('.filter-text');

        if (selectedValues.length === 0) {
            filterText.textContent = 'Todos';
            buttonElement.classList.remove('has-filter');
        } else if (selectedValues.length === checkboxes.length) {
            filterText.textContent = 'Todos';
            buttonElement.classList.remove('has-filter');
        } else {
            filterText.textContent = `${selectedValues.length} selecionados`;
            buttonElement.classList.add('has-filter');
        }
    }

    closeAllDropdowns() {
        const dropdowns = this.table.querySelectorAll('.header-filter-dropdown');
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }

    // Métodos auxiliares
    getFieldName(th) {
        // Tentar extrair nome do campo do cabeçalho
        return th.textContent.toLowerCase().replace(/\s+/g, '_');
    }

    getFieldValue(row, field) {
        // Navegar através de objetos aninhados
        return field.split('.').reduce((obj, key) => obj?.[key], row) || '';
    }

    formatValue(value) {
        if (typeof value === 'number') {
            return value.toLocaleString('pt-BR');
        }
        if (value instanceof Date) {
            return value.toLocaleDateString('pt-BR');
        }
        return String(value);
    }

    renderTable() {
        // Este método deve ser sobrescrito pela implementação específica
        console.warn('renderTable deve ser implementado pela classe específica');
    }

    // Método auxiliar para criar botões de ação com edição
    createActionButtons(transacao) {
        const actionsHtml = `
            <div class="action-buttons" style="display: flex; gap: 8px; justify-content: center;">
                <button 
                    class="btn-icon btn-edit" 
                    data-action="edit"
                    data-id="${transacao.id}"
                    data-tipo="${transacao.tipo}"
                    title="Editar transação"
                    data-testid="btn-edit-${transacao.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button 
                    class="btn-icon btn-delete" 
                    data-action="delete"
                    data-id="${transacao.id}"
                    title="Excluir transação"
                    data-testid="btn-delete-${transacao.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        `;
        return actionsHtml;
    }

    // Persistência de configurações
    saveColumnWidth(columnIndex, width) {
        if (!this.columnConfigs[columnIndex]) {
            this.columnConfigs[columnIndex] = {};
        }
        this.columnConfigs[columnIndex].width = width;
        this.saveColumnConfigs();
    }

    loadColumnConfigs() {
        try {
            const saved = localStorage.getItem(this.options.storageKey);
            if (saved) {
                this.columnConfigs = JSON.parse(saved);
                this.applyColumnConfigs();
            }
        } catch (e) {
            console.warn('Erro ao carregar configurações de coluna:', e);
        }
    }

    saveColumnConfigs() {
        try {
            localStorage.setItem(this.options.storageKey, JSON.stringify(this.columnConfigs));
        } catch (e) {
            console.warn('Erro ao salvar configurações de coluna:', e);
        }
    }

    applyColumnConfigs() {
        const headers = this.table.querySelectorAll('th');
        headers.forEach((th, index) => {
            const config = this.columnConfigs[index];
            if (config?.width) {
                th.style.width = config.width + 'px';
            }
        });
    }

    // API pública
    refresh() {
        this.updateTable();
    }

    clearFilters() {
        this.filters = {};
        this.table.querySelectorAll('.header-filter-button').forEach(button => {
            button.classList.remove('has-filter');
            button.querySelector('.filter-text').textContent = 'Todos';
        });
        this.updateTable();
    }

    getFilteredData() {
        return this.filteredData;
    }

    hasActiveFilters() {
        // Verificar se há filtros ativos (com valores selecionados)
        return Object.keys(this.filters).some(key => {
            const filter = this.filters[key];
            return filter && filter.length > 0;
        });
    }

    destroy() {
        // Cleanup
        this.table.classList.remove('advanced-table');
        this.table.querySelectorAll('.column-resizer, .header-filter-container, .sort-indicator').forEach(el => {
            el.remove();
        });
    }
}

// Função de inicialização global
window.initAdvancedTable = function(selector, options) {
    return new AdvancedTable(selector, options);
};

// Export para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedTable;
}