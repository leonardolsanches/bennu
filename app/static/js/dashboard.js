// Dashboard específico do Bennu Finance
class Dashboard {
    // Headers para forçar dados frescos do servidor (sem cache)
    static NO_CACHE_HEADERS = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };

    // Adiciona timestamp na URL para evitar cache do navegador
    static addCacheBuster(url) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}_t=${Date.now()}`;
    }

    constructor() {
        this.data = {
            receitas: 0,
            despesas: 0,
            transacoes: []
        };
        this.pagination = {
            currentPage: 1,
            itemsPerPage: 10,
            totalItems: 0,
            totalPages: 1
        };
        this.userEmpresaId = null;
        this.isLoading = false;
        // Período padrão: mês e ano correntes
        const now = new Date();
        this.currentMonth = now.getMonth() + 1; // 1-12
        this.currentYear = now.getFullYear();
        this.init();
    }

    async init() {
        try {
            const user = await this.checkAuth();
            if (!user) {
                console.log('Usuário não autenticado, redirecionando para login...');
                window.location.replace('/login');
                return;
            }

            this.userEmpresaId = user.empresa_id;
            console.log(`🔒 Usuário carregado: empresa_id=${this.userEmpresaId}`);

            // Definir mês e ano nos selects
            this.updatePeriodSelects();

            // Inicializar sistema de tabelas avançadas
            this.initAdvancedTable();

            // Carregar dados do período atual
            await Promise.all([
                this.loadSummaryData(),
                this.loadTransactionsData()
            ]);

            this.updateCards();
            this.loadRecentTransactions();
            this.setupForm();
            this.createChart();
            this.setupGlobalEventListeners();
        } catch (error) {
            console.error('Erro ao inicializar dashboard:', error);
            this.handleError(error);
        }
    }

    updatePeriodSelects() {
        const mesSelect = document.getElementById('mes-filter');
        const anoSelect = document.getElementById('ano-filter');

        if (mesSelect) mesSelect.value = this.currentMonth;
        if (anoSelect) anoSelect.value = this.currentYear;
    }

    async changePeriod() {
        const mesSelect = document.getElementById('mes-filter');
        const anoSelect = document.getElementById('ano-filter');

        this.currentMonth = parseInt(mesSelect.value);
        this.currentYear = parseInt(anoSelect.value);
        this.pagination.currentPage = 1; // Reset para primeira página

        await this.reloadData();
    }

    async previousMonth() {
        this.currentMonth--;
        if (this.currentMonth < 1) {
            this.currentMonth = 12;
            this.currentYear--;
        }
        this.updatePeriodSelects();
        this.pagination.currentPage = 1;
        await this.reloadData();
    }

    async nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 12) {
            this.currentMonth = 1;
            this.currentYear++;
        }
        this.updatePeriodSelects();
        this.pagination.currentPage = 1;
        await this.reloadData();
    }

    async reloadData() {
        this.isLoading = true;
        try {
            await Promise.all([
                this.loadSummaryData(),
                this.loadTransactionsData()
            ]);
            this.updateCards();
            this.loadRecentTransactions();
        } finally {
            this.isLoading = false;
        }
    }

    initAdvancedTable() {
        // Inicializar tabela avançada para transações recentes
        if (document.getElementById('recent-transactions-table')) {
            this.advancedTable = new AdvancedTable('#recent-transactions-table', {
                enableResize: true,
                enableSort: true,
                enableFilter: true,
                storageKey: 'dashboard-recent-transactions'
            });

            // 🔧 Override para usar apenas dados locais nos filtros
            this.advancedTable.populateFilterOptions = async function(container, field) {
                console.log(`🔍 [DASHBOARD] Populando filtro local para campo "${field}"`);

                // Usar apenas dados locais, sem chamadas ao servidor
                const uniqueValues = [...new Set(
                    this.data.map(row => {
                        const value = row[field] !== undefined ? row[field] : this.getFieldValue(row, field);
                        return value;
                    })
                    .filter(val => val !== null && val !== undefined && val !== '')
                )].sort();

                console.log(`📋 [DASHBOARD] Valores únicos para "${field}":`, uniqueValues);

                const currentFilter = this.filters[field] || [];

                container.innerHTML = uniqueValues.map(value => `
                    <div class="filter-option">
                        <input type="checkbox" value="${value}" ${currentFilter.includes(value) ? 'checked' : ''}>
                        <span>${this.formatValue ? this.formatValue(value) : value}</span>
                    </div>
                `).join('');

                console.log(`✅ [DASHBOARD] Filtro "${field}": ${uniqueValues.length} opções populadas dos dados locais`);
            };

            // ✅ CORREÇÃO: Sobrescrever renderTable para usar dados filtrados
            this.advancedTable.renderTable = () => {
                this.renderRecentTransactions(this.advancedTable.getFilteredData());
            };

            // 🔧 OTIMIZAÇÃO: Implementar lazy loading para filtros
            this.advancedTable.onFilterUpdate = async (filteredData) => {
                // Se filtros estão ativos e não temos todas as transações, carregar sob demanda
                if (this.advancedTable.hasActiveFilters() && !this.allTransactionsLoaded) {
                    console.log('🔄 Filtros detectados, carregando todas as transações...');
                    const allTransactions = await this.loadAllTransactionsIfNeeded();
                    this.advancedTable.setData(allTransactions);
                }
            };

            console.log('✅ Tabela avançada do dashboard inicializada com lazy loading e filtros locais');
        }
    }

    async checkAuth() {
        try {
            const response = await fetch(Dashboard.addCacheBuster('/api/auth/user'), {
                credentials: 'include',
                headers: Dashboard.NO_CACHE_HEADERS
            });
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            return null;
        }
    }

    async loadSummaryData() {
        try {
            // Obter tipo de data do filtro (competencia ou lancamento)
            const tipoDataFilter = document.getElementById('tipo-data-filter');
            const tipoData = tipoDataFilter ? tipoDataFilter.value : 'competencia';
            
            console.log(`🔄 Carregando summary para ${this.currentMonth}/${this.currentYear} (tipo: ${tipoData})...`);
            const url = Dashboard.addCacheBuster(`/api/transacoes/summary?mes=${this.currentMonth}&ano=${this.currentYear}&tipo_data=${tipoData}`);
            const summaryResponse = await fetch(url, {
                credentials: 'include',
                headers: Dashboard.NO_CACHE_HEADERS
            });

            if (summaryResponse.ok) {
                const summaryResult = await summaryResponse.json();
                console.log('📊 Dados brutos do summary:', summaryResult);

                // 🔧 CORREÇÃO: Preservar transacoes existentes para evitar race condition
                const existingTransacoes = this.data.transacoes;
                this.data = {
                    receitas: summaryResult.total_receitas || 0,
                    despesas: summaryResult.total_despesas || 0,
                    resultado: summaryResult.resultado || 0,
                    qtd_receitas: summaryResult.qtd_receitas || 0,
                    qtd_despesas: summaryResult.qtd_despesas || 0,
                    total_transacoes: summaryResult.qtd_transacoes || 0,
                    transacoes: existingTransacoes || [] // Preservar transações
                };
                console.log('✅ Dados processados para dashboard (TODAS as empresas):', this.data);
            } else {
                console.error('❌ Erro no summary:', summaryResponse.status, summaryResponse.statusText);
                // 🔧 CORREÇÃO: Preservar transacoes existentes mesmo em erro
                const existingTransacoes = this.data.transacoes;
                this.data = {
                    receitas: 0,
                    despesas: 0,
                    resultado: 0,
                    qtd_receitas: 0,
                    qtd_despesas: 0,
                    total_transacoes: 0,
                    transacoes: existingTransacoes || []
                };
            }
        } catch (error) {
            console.error('💥 Erro ao carregar summary:', error);
        }
    }

    async loadTransactionsData() {
        try {
            // Obter tipo de data do filtro (competencia ou lancamento)
            const tipoDataFilter = document.getElementById('tipo-data-filter');
            const tipoData = tipoDataFilter ? tipoDataFilter.value : 'competencia';
            
            console.log(`🔄 Carregando transações para ${this.currentMonth}/${this.currentYear} (tipo: ${tipoData})...`);

            // Garantir que sempre carregue 10 registros
            const limit = this.pagination.itemsPerPage || 10;
            const page = this.pagination.currentPage || 1;

            const transUrl = Dashboard.addCacheBuster(`/api/transacoes?page=${page}&limit=${limit}&mes=${this.currentMonth}&ano=${this.currentYear}&tipo_data=${tipoData}`);
            const pageResponse = await fetch(transUrl, {
                credentials: 'include',
                headers: Dashboard.NO_CACHE_HEADERS
            });

            // Processar transações da página atual
            if (pageResponse.ok) {
                const pageResult = await pageResponse.json();
                this.data.transacoes = Array.isArray(pageResult.transacoes) ? pageResult.transacoes : [];
                this.pagination.totalItems = pageResult.total || 0;
                this.pagination.totalPages = pageResult.pages || 1;
                this.pagination.currentPage = pageResult.page || 1;
                this.pagination.itemsPerPage = limit; // Garantir que o limite seja mantido
                console.log('✅ Transações da página carregadas:', this.data.transacoes.length, 'registros de', this.pagination.totalItems, 'total');
            } else {
                console.error('❌ Erro nas transações da página:', pageResponse.status);
                this.data.transacoes = [];
                this.pagination.totalItems = 0;
            }

            // 🔧 OTIMIZAÇÃO: Carregar todas as transações apenas quando necessário (lazy loading)
            this.allTransactions = [];
            this.allTransactionsLoaded = false;

        } catch (error) {
            console.error('💥 Erro ao carregar transações:', error);
            this.data.transacoes = [];
            this.allTransactions = [];
            this.pagination.totalItems = 0;
        }
    }

    // 🔧 OTIMIZAÇÃO: Carregar todas as transações sob demanda para filtros
    async loadAllTransactionsIfNeeded() {
        if (this.allTransactionsLoaded) {
            console.log('✅ Todas as transações já carregadas');
            return this.allTransactions;
        }

        try {
            console.log('🔄 Carregando todas as transações para filtros (lazy loading)...');
            const allUrl = Dashboard.addCacheBuster('/api/transacoes?limit=1000');
            const response = await fetch(allUrl, {
                credentials: 'include',
                headers: Dashboard.NO_CACHE_HEADERS
            });

            if (response.ok) {
                const result = await response.json();
                this.allTransactions = Array.isArray(result.transacoes) ? result.transacoes : [];
                this.allTransactionsLoaded = true;
                console.log('✅ Todas as transações carregadas (lazy):', this.allTransactions.length, 'registros');
                return this.allTransactions;
            } else {
                console.error('❌ Erro ao carregar todas as transações:', response.status);
                return [];
            }
        } catch (error) {
            console.error('💥 Erro ao carregar todas as transações:', error);
            return [];
        }
    }

    calculateTotals() {
        const thisMonth = new Date();
        thisMonth.setDate(1); // Primeiro dia do mês

        this.data.receitas = this.data.transacoes
            .filter(t => t.valor > 0 && new Date(t.data_transacao || t.data) >= thisMonth)
            .reduce((sum, t) => sum + Number(t.valor || 0), 0);

        this.data.despesas = this.data.transacoes
            .filter(t => t.valor < 0 && new Date(t.data_transacao || t.data) >= thisMonth)
            .reduce((sum, t) => sum + Math.abs(Number(t.valor || 0)), 0);
    }

    updateCards() {
        // Atualizar cards com dados reais da API (TODAS as empresas - configuração padrão)
        const receitasEl = document.getElementById('total-receitas');
        const despesasEl = document.getElementById('total-despesas');
        const saldoEl = document.getElementById('saldo-atual');

        if (receitasEl) {
            receitasEl.textContent = this.formatCurrency(this.data.receitas);
            console.log('✅ Receitas atualizadas:', this.formatCurrency(this.data.receitas));
        }
        if (despesasEl) {
            // Despesas já vêm como valores positivos do backend
            despesasEl.textContent = this.formatCurrency(this.data.despesas);
            console.log('✅ Despesas atualizadas:', this.formatCurrency(this.data.despesas));
        }
        if (saldoEl) {
            // Usar lucro_liquido da API que já está calculado corretamente
            const saldoFinal = this.data.lucro_liquido !== undefined ? this.data.lucro_liquido :
                              this.data.resultado !== undefined ? this.data.resultado :
                              (this.data.receitas - this.data.despesas);
            saldoEl.textContent = this.formatCurrency(saldoFinal);
            console.log('✅ Saldo atualizado:', this.formatCurrency(saldoFinal));
        }

        this.updateFooterPeriodo();

        const qtdReceitasEl = document.querySelector('.counter-receitas, #qtd-receitas');
        const qtdDespesasEl = document.querySelector('.counter-despesas, #qtd-despesas');
        const qtdTotalEl = document.querySelector('.counter-transacoes, #qtd-total');

        // Atualizar contador de receitas (mostrando período/total)
        if (qtdReceitasEl && this.data.qtd_receitas !== undefined) {
            const textoReceitas = this.data.total_receitas_geral !== undefined
                ? `${this.data.qtd_receitas} de ${this.data.total_receitas_geral} transações`
                : `${this.data.qtd_receitas} transações`;
            qtdReceitasEl.textContent = textoReceitas;
            console.log('✅ Contador receitas:', textoReceitas);
        }

        // Atualizar contador de despesas (mostrando período/total)
        if (qtdDespesasEl && this.data.qtd_despesas !== undefined) {
            const textoDespesas = this.data.total_despesas_geral !== undefined
                ? `${this.data.qtd_despesas} de ${this.data.total_despesas_geral} transações`
                : `${this.data.qtd_despesas} transações`;
            qtdDespesasEl.textContent = textoDespesas;
            console.log('✅ Contador despesas:', textoDespesas);
        }

        // Atualizar contador total (mostrando período/total)
        if (qtdTotalEl && this.data.total_transacoes !== undefined) {
            const textoTotal = this.data.total_transacoes_geral !== undefined
                ? `${this.data.total_transacoes} de ${this.data.total_transacoes_geral} transações`
                : `${this.data.total_transacoes} transações totais`;
            qtdTotalEl.textContent = textoTotal;
            console.log('✅ Contador total:', textoTotal);
        }

        // Atualizar contador de transações no cabeçalho da tabela
        const totalTransacoesCount = document.getElementById('total-transacoes-count');
        if (totalTransacoesCount) {
            totalTransacoesCount.textContent = this.pagination.totalItems;
        }

        // Atualizar também o texto "Total: X transações" da tabela
        const totalTransacoesText = document.querySelector('.table-header .text-gray-600');
        if (totalTransacoesText && totalTransacoesText.textContent.includes('Total:')) {
            totalTransacoesText.textContent = `Total: ${this.pagination.totalItems} transações`;
        }

        // Fallback para seletores antigos
        const elementos_contadores = [
            { selector: '#qtd-receitas', valor: this.data.qtd_receitas },
            { selector: '#qtd-despesas', valor: this.data.qtd_despesas },
            { selector: '#qtd-total', valor: this.data.qtd_transacoes },
            { selector: '.counter-transacoes', valor: this.data.qtd_transacoes }
        ];

        elementos_contadores.forEach(({ selector, valor }) => {
            const elemento = document.querySelector(selector);
            if (elemento && valor !== undefined) {
                elemento.textContent = valor;
            }
        });
    }

    loadRecentTransactions() {
        const tbody = document.getElementById('recent-transactions-tbody');
        if (!tbody) return;

        // Verificar se transacoes é um array válido
        if (!this.data.transacoes || !Array.isArray(this.data.transacoes) || this.data.transacoes.length === 0) {
            // Só mostrar "Nenhuma transação" se não estiver carregando
            if (!this.isLoading) {
                tbody.innerHTML = '<tr><td colspan="11" class="loading">Nenhuma transação encontrada</td></tr>';
            }
            this.updatePaginationControls();
            return;
        }

        // Usar apenas as transações da página atual (limitadas pelo backend)
        this.recentTransactions = this.data.transacoes
            .filter(t => t && (t.data_transacao || t.data_lancamento || t.data)) // Filtrar transações válidas
            .sort((a, b) => {
                const dateA = new Date(a.data_transacao || a.data_lancamento || a.data);
                const dateB = new Date(b.data_transacao || b.data_lancamento || b.data);
                return dateB - dateA;
            });

        // ✅ CORREÇÃO: Usar apenas transações da página atual para a tabela (respeitando paginação)
        if (this.advancedTable) {
            console.log(`✅ Passando ${this.recentTransactions.length} transações da página atual para AdvancedTable`);
            this.advancedTable.setData(this.recentTransactions);

            // Armazenar todas as transações globalmente para as opções de filtro
            if (this.allTransactions && this.allTransactions.length > 0) {
                window.dashboardAllTransactions = this.allTransactions;
                console.log(`✅ window.dashboardAllTransactions definido com ${this.allTransactions.length} registros`);
            } else {
                console.warn('⚠️ Não foi possível definir window.dashboardAllTransactions');
            }
        } else {
            this.renderRecentTransactions(this.recentTransactions);
        }

        // Atualizar controles de paginação
        this.updatePaginationControls();
    }

    updatePaginationControls() {
        // Atualizar informações de paginação
        const showingFrom = document.getElementById('showing-from');
        const showingTo = document.getElementById('showing-to');
        const totalRecords = document.getElementById('total-records');
        const currentPage = document.getElementById('current-page');
        const totalPages = document.getElementById('total-pages');

        if (showingFrom && showingTo && totalRecords) {
            const from = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage + 1;
            const to = Math.min(this.pagination.currentPage * this.pagination.itemsPerPage, this.pagination.totalItems);

            showingFrom.textContent = this.pagination.totalItems > 0 ? from : 0;
            showingTo.textContent = to;
            totalRecords.textContent = this.pagination.totalItems;
        }

        if (currentPage && totalPages) {
            currentPage.textContent = this.pagination.currentPage;
            totalPages.textContent = this.pagination.totalPages;
        }

        // Atualizar estado dos botões
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (prevBtn) {
            prevBtn.disabled = this.pagination.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.pagination.currentPage >= this.pagination.totalPages;
        }
    }

    renderRecentTransactions(transacoes) {
        const tbody = document.getElementById('recent-transactions-tbody');
        if (!tbody) {
            console.error('Elemento recent-transactions-tbody não encontrado');
            return;
        }

        if (!transacoes || transacoes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" class="loading">Nenhuma transação encontrada</td></tr>';
            return;
        }

        this.updateFooterPagina(transacoes);

        tbody.innerHTML = transacoes.map(transacao => {
            const valor = Number(transacao.valor || 0);
            const isReceita = transacao.tipo === 'receita';

            // ✅ BOTÕES SEMPRE HABILITADOS: Usuário pode editar qualquer transação independente da empresa
            const editButton = `<button class="btn-small btn-edit" data-action="edit" data-id="${transacao.id}" data-tipo="${transacao.tipo}" title="Editar transação">
                    ✎
               </button>`;

            const deleteButton = `<button class="btn-small btn-delete" data-action="delete" data-id="${transacao.id}" title="Excluir transação">
                    ✕
               </button>`;

            const _cMes = transacao.competencia_mes_contabil || transacao.competencia_mes;
            const _cAno = transacao.competencia_ano_contabil || transacao.competencia_ano;
            const competenciaContabil = _cMes && _cAno
                ? `${String(_cMes).padStart(2, '0')}/${_cAno}`
                : '-';

            const competenciaGerencial = transacao.competencia_mes_gerencial && transacao.competencia_ano_gerencial 
                ? `${String(transacao.competencia_mes_gerencial).padStart(2, '0')}/${transacao.competencia_ano_gerencial}`
                : '-';

            return `
            <tr data-id="${transacao.id}">
                <td>
                    <input type="checkbox" class="transaction-checkbox" value="${transacao.id}">
                </td>
                <td>${this.formatDate(transacao.data_lancamento || transacao.data_transacao || transacao.data)}</td>
                <td>${competenciaContabil}</td>
                <td>${competenciaGerencial}</td>
                <td>${transacao.descricao || transacao.nome || 'Sem descrição'}</td>
                <td>
                    <span class="badge ${isReceita ? 'badge-success' : 'badge-danger'}">
                        ${isReceita ? '▲ Receita' : '▼ Despesa'}
                    </span>
                </td>
                <td class="text-right ${isReceita ? 'text-success' : 'text-danger'}">
                    ${this.formatCurrency(Math.abs(valor))}
                </td>
                <td>${transacao.cliente_nome || '-'}</td>
                <td>${transacao.fornecedor_nome || '-'}</td>
                <td>${transacao.forma_pgto || '-'}</td>
                <td>
                    <span class="badge ${this.getStatusBadgeClass(transacao.status)}">
                        ${transacao.status || 'Pendente'}
                    </span>
                </td>
                <td class="action-buttons">
                    ${editButton}
                    ${deleteButton}
                </td>
            </tr>
            `;
        }).join('');

        // Configurar event listeners dos checkboxes
        this.setupCheckboxListeners();

        // Configurar menu de contexto (botão direito) em cada linha
        tbody.querySelectorAll('tr[data-id]').forEach(row => {
            row.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const transacaoId = row.dataset.id;
                const descricao = row.querySelector('td:nth-child(5)')?.textContent?.trim() || '';
                const fornecedor = row.querySelector('td:nth-child(9)')?.textContent?.trim() || '';
                const valor = row.querySelector('td:nth-child(7)')?.textContent?.trim() || '';
                const comp = row.querySelector('td:nth-child(3)')?.textContent?.trim() || '';
                abrirContextMenuTransacao(e.clientX, e.clientY, transacaoId, { descricao, fornecedor, valor, comp });
            });
        });
    }

    updateFooterPagina(transacoes) {
        const elRec  = document.getElementById('footer-pagina-receitas');
        const elDesp = document.getElementById('footer-pagina-despesas');
        const elSald = document.getElementById('footer-pagina-saldo');
        const elQtd  = document.getElementById('footer-pagina-qtd');
        if (!elRec) return;

        const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

        let somaReceitas = 0, somaDespesas = 0;
        (transacoes || []).forEach(t => {
            const v = Math.abs(Number(t.valor || 0));
            if (t.tipo === 'receita') somaReceitas += v;
            else somaDespesas += v;
        });
        const saldo = somaReceitas - somaDespesas;
        const n = (transacoes || []).length;

        elRec.textContent  = somaReceitas > 0 ? `↑ ${fmt(somaReceitas)}` : '';
        elDesp.textContent = somaDespesas > 0 ? `↓ ${fmt(somaDespesas)}` : '';

        if (somaReceitas > 0 || somaDespesas > 0) {
            elSald.textContent = fmt(Math.abs(saldo));
            elSald.style.color = saldo >= 0 ? '#059669' : '#dc2626';
        } else {
            elSald.textContent = '-';
            elSald.style.color = '#6b7280';
        }
        if (elQtd) elQtd.textContent = n > 0 ? `${n} reg. na página` : '';
    }

    updateFooterPeriodo() {
        const elRec  = document.getElementById('footer-periodo-receitas');
        const elDesp = document.getElementById('footer-periodo-despesas');
        const elSald = document.getElementById('footer-periodo-saldo');
        const elQtd  = document.getElementById('footer-periodo-qtd');
        if (!elRec) return;

        const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

        const receitas = Number(this.data.receitas || 0);
        const despesas = Number(this.data.despesas || 0);
        const saldo    = receitas - despesas;
        const total    = (this.data.qtd_receitas || 0) + (this.data.qtd_despesas || 0);

        elRec.textContent  = receitas > 0 ? `↑ ${fmt(receitas)}` : '';
        elDesp.textContent = despesas > 0 ? `↓ ${fmt(despesas)}` : '';

        if (receitas > 0 || despesas > 0) {
            elSald.textContent = fmt(Math.abs(saldo));
            elSald.style.color = saldo >= 0 ? '#059669' : '#dc2626';
        } else {
            elSald.textContent = '-';
            elSald.style.color = '#6b7280';
        }
        if (elQtd) elQtd.textContent = `${total} reg. no período`;
    }

    setupGlobalEventListeners() {
        // Event listener para "Selecionar Todos"
        const selectAllCheckbox = document.getElementById('select-all-dashboard');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.toggleAllCheckboxes(e.target.checked);
            });
        }

        // Event listener para deleção massiva
        const deleteButton = document.getElementById('delete-selected');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                this.deleteSelectedTransactions();
            });
        }

        // Event listeners para paginação
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.goToPage(this.pagination.currentPage - 1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.goToPage(this.pagination.currentPage + 1);
            });
        }

        // Event listeners para botões de ação nas tabelas - Compatibilidade Chrome 140+
        document.addEventListener('click', (e) => {
            const button = e.target.closest('[data-action]');
            if (button) {
                const action = button.dataset.action;
                const id = parseInt(button.dataset.id, 10);
                const tipo = button.dataset.tipo; // Capturar tipo do data-attribute

                if (action === 'edit') {
                    window.editarTransacao(id, tipo);
                } else if (action === 'delete') {
                    window.excluirTransacao(id);
                }
            }
        });
    }

    async goToPage(page) {
        if (page < 1 || page > this.pagination.totalPages) return;

        this.pagination.currentPage = page;

        // Usar reloadData que gerencia isLoading
        await this.reloadData();
    }

    setupCheckboxListeners() {
        const checkboxes = document.querySelectorAll('.transaction-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectionUI();
            });
        });
    }

    toggleAllCheckboxes(checked) {
        const checkboxes = document.querySelectorAll('.transaction-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const checkboxes = document.querySelectorAll('.transaction-checkbox');
        const checkedBoxes = document.querySelectorAll('.transaction-checkbox:checked');
        const selectAllCheckbox = document.getElementById('select-all-dashboard');
        const tableActions = document.querySelector('.table-actions');
        const selectedCount = document.getElementById('selected-count');

        // Atualizar checkbox "Selecionar Todos"
        if (selectAllCheckbox) {
            selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length;
            selectAllCheckbox.checked = checkedBoxes.length === checkboxes.length && checkboxes.length > 0;
        }

        // Mostrar/esconder ações em massa
        if (tableActions && selectedCount) {
            if (checkedBoxes.length > 0) {
                tableActions.style.display = 'block';
                selectedCount.textContent = `${checkedBoxes.length} item${checkedBoxes.length > 1 ? 'ns' : ''} selecionado${checkedBoxes.length > 1 ? 's' : ''}`;
            } else {
                tableActions.style.display = 'none';
            }
        }
    }

    async deleteSelectedTransactions() {
        const checkedBoxes = document.querySelectorAll('.transaction-checkbox:checked');
        const selectedIds = Array.from(checkedBoxes).map(checkbox => checkbox.value);

        if (selectedIds.length === 0) return;

        const confirmMessage = `Tem certeza que deseja excluir ${selectedIds.length} transação${selectedIds.length > 1 ? 'ões' : ''}?`;
        if (!confirm(confirmMessage)) return;

        try {
            // Deletar uma por uma (pode ser otimizado para delete em batch no futuro)
            for (const id of selectedIds) {
                await this.deleteTransaction(id);
            }

            // Usar reloadData que gerencia isLoading
            await this.reloadData();

            alert('Transações excluídas com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir transações:', error);
            alert('Erro ao excluir transações: ' + error.message);
        }
    }

    async deleteTransaction(id) {
        const response = await fetch(`/api/transacoes/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Erro ao excluir transação ${id}: ${response.status}`);
        }
    }

    sortRecentTransactions(column) {
        if (!this.recentTransactions || this.recentTransactions.length === 0) return;

        // Determinar direção da ordenação
        if (!this.recentSorting) {
            this.recentSorting = { column: column, direction: 'desc' };
        } else if (this.recentSorting.column === column) {
            this.recentSorting.direction = this.recentSorting.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.recentSorting = { column: column, direction: 'asc' };
        }

        // Ordenar transações
        this.recentTransactions.sort((a, b) => {
            let valueA, valueB;

            switch (column) {
                case 'data_lancamento':
                    valueA = new Date(a.data_transacao || a.data_lancamento || a.data);
                    valueB = new Date(b.data_transacao || b.data_lancamento || b.data);
                    break;
                case 'descricao':
                    valueA = (a.descricao || a.nome || '').toLowerCase();
                    valueB = (b.descricao || b.nome || '').toLowerCase();
                    break;
                case 'tipo':
                    valueA = a.tipo || '';
                    valueB = b.tipo || '';
                    break;
                case 'valor':
                    valueA = Number(a.valor || 0);
                    valueB = Number(b.valor || 0);
                    break;
                default:
                    return 0;
            }

            if (this.recentSorting.direction === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });

        // Atualizar indicadores visuais
        this.updateRecentSortIndicators();

        // Re-renderizar
        this.renderRecentTransactions(this.recentTransactions);
    }

    updateRecentSortIndicators() {
        // Limpar indicadores
        document.querySelectorAll('[id^="sort-recent-"]').forEach(el => {
            el.textContent = '';
        });

        // Adicionar indicador atual
        if (this.recentSorting) {
            const indicator = document.getElementById(`sort-recent-${this.recentSorting.column.replace('data_lancamento', 'data')}`);
            if (indicator) {
                indicator.textContent = this.recentSorting.direction === 'asc' ? ' ↑' : ' ↓';
            }
        }
    }

    setupForm() {
        const form = document.getElementById('form-nova-transacao');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.criarTransacao(new FormData(form));
        });
    }

    async criarTransacao(formData) {
        try {
            const data = {
                descricao: formData.get('descricao'),
                valor: parseFloat(formData.get('valor')),
                data_transacao: formData.get('data')
            };

            // Converter para negativo se for despesa
            if (formData.get('tipo') === 'despesa') {
                data.valor = -Math.abs(data.valor);
            }

            const response = await fetch('/api/transacoes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showNotification('Transação criada com sucesso!', 'success');
                this.fecharModal();

                // 🔧 CORREÇÃO: Substituir loadData() por funções otimizadas
                await Promise.all([
                    this.loadSummaryData(),
                    this.loadTransactionsData()
                ]);
                this.updateCards();
                this.loadRecentTransactions();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }

        } catch (error) {
            console.error('Erro ao criar transação:', error);
            this.showNotification('Erro ao criar transação', 'error');
        }
    }

    createChart() {
        const canvas = document.getElementById('fluxo-caixa-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Dados para o gráfico (últimos 30 dias)
        const dados = this.generateChartData();

        // Desenhar gráfico simples
        this.drawSimpleChart(ctx, dados);
    }

    generateChartData() {
        const days = 30;
        const data = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const ymd = date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');

            const dayTransactions = this.data.transacoes.filter(t => {
                const tDateStr = String(t.data_transacao || t.data_lancamento || t.data || '').substring(0, 10);
                return tDateStr === ymd;
            });

            const total = dayTransactions.reduce((sum, t) => sum + Number(t.valor || 0), 0);
            const dp = ymd.split('-');

            data.push({
                date: dp[2] + '/' + dp[1],
                value: total
            });
        }

        return data;
    }

    drawSimpleChart(ctx, data) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;

        // Limpar canvas
        ctx.clearRect(0, 0, width, height);

        // Configurar estilo
        ctx.font = '12px Arial';
        ctx.strokeStyle = '#e2e8f0';
        ctx.fillStyle = '#64748b';

        // Calcular valores max/min
        const values = data.map(d => d.value);
        const maxValue = Math.max(...values, 0);
        const minValue = Math.min(...values, 0);
        const range = maxValue - minValue || 1;

        // Desenhar eixos
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // Desenhar linha do gráfico
        if (data.length > 1) {
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2;
            ctx.beginPath();

            data.forEach((point, index) => {
                const x = padding + (index * (width - 2 * padding)) / (data.length - 1);
                const y = height - padding - ((point.value - minValue) * (height - 2 * padding)) / range;

                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                // Desenhar ponto
                ctx.fillStyle = '#2563eb';
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.fill();
            });

            ctx.stroke();
        }

        // Labels do eixo X (algumas datas)
        ctx.fillStyle = '#64748b';
        const labelInterval = Math.ceil(data.length / 6);
        data.forEach((point, index) => {
            if (index % labelInterval === 0) {
                const x = padding + (index * (width - 2 * padding)) / (data.length - 1);
                ctx.fillText(point.date, x - 15, height - 10);
            }
        });
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    }

    formatDate(date) {
        if (!date) return '';
        var str = String(date).substring(0, 10);
        var parts = str.split('-');
        if (parts.length === 3) {
            return parts[2] + '/' + parts[1] + '/' + parts[0];
        }
        return str;
    }

    showNotification(message, type = 'info') {
        // Usar a função global se disponível
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    fecharModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // Função para rolar a tabela horizontalmente para o final
    scrollTableToEnd(tableId = null) {
        let tableWrapper;
        if (tableId) {
            const table = document.getElementById(tableId);
            tableWrapper = table ? table.closest('.advanced-table-wrapper') : null;
        } else {
            tableWrapper = document.querySelector('.advanced-table-wrapper');
        }

        if (tableWrapper) {
            // Rolar para o final da tabela (máximo scroll horizontal)
            tableWrapper.scrollTo({
                left: tableWrapper.scrollWidth,
                behavior: 'smooth'
            });
            console.log('✅ Tabela rolada para o final');
        } else {
            console.warn('⚠️ Wrapper da tabela não encontrado');
        }
    }

    // Função para rolar a tabela horizontalmente para o início
    scrollTableToStart(tableId = null) {
        let tableWrapper;
        if (tableId) {
            const table = document.getElementById(tableId);
            tableWrapper = table ? table.closest('.advanced-table-wrapper') : null;
        } else {
            tableWrapper = document.querySelector('.advanced-table-wrapper');
        }

        if (tableWrapper) {
            // Rolar para o início da tabela (scroll horizontal = 0)
            tableWrapper.scrollTo({
                left: 0,
                behavior: 'smooth'
            });
            console.log('✅ Tabela rolada para o início');
        } else {
            console.warn('⚠️ Wrapper da tabela não encontrado');
        }
    }

    handleError(error) {
        console.error('Dashboard Error:', error);
        if (error.message && error.message.includes('401')) {
            window.location.replace('/login');
        }
    }

    getClienteFornecedor(transacao) {
        // Exibir cliente ou fornecedor baseado no tipo da transação
        if (transacao.tipo === 'receita') {
            // Para receitas, mostrar cliente
            if (transacao.cliente_id && transacao.cliente_nome) {
                return `${transacao.cliente_nome}`;
            }
            return 'Cliente não informado';
        } else {
            // Para despesas, mostrar fornecedor
            if (transacao.fornecedor_id && transacao.fornecedor_nome) {
                return `${transacao.fornecedor_nome}`;
            }
            return 'Fornecedor não informado';
        }
    }

    getStatusBadgeClass(status) {
        switch(status?.toLowerCase()) {
            case 'pago':
            case 'recebido':
                return 'badge-success';
            case 'pendente':
            case 'em_aberto':
                return 'badge-warning';
            case 'cancelado':
            case 'vencido':
                return 'badge-danger';
            default:
                return 'badge-secondary';
        }
    }
}

// Funções globais para ações das transações
window.editarTransacao = function(id) {
    // Redirecionar para página de edição em tela cheia
    window.location.href = `/transacoes/editar/${id}`;
};

// Função excluirTransacao agora está no arquivo compartilhado transaction-modal.js

// Função global para rolagem horizontal da tabela
window.scrollTableToEnd = function(tableId = null) {
    if (window.dashboard && typeof window.dashboard.scrollTableToEnd === 'function') {
        window.dashboard.scrollTableToEnd(tableId);
    } else {
        console.warn('⚠️ Dashboard não inicializado ou método não encontrado');
    }
};

window.scrollTableToStart = function(tableId = null) {
    if (window.dashboard && typeof window.dashboard.scrollTableToStart === 'function') {
        window.dashboard.scrollTableToStart(tableId);
    } else {
        console.warn('⚠️ Dashboard não inicializado ou método não encontrado');
    }
};

// Função global para exportar transações para Excel
window.exportarExcel = async function() {
    try {
        console.log('📊 Iniciando exportação para Excel...');

        // Mostrar loading no botão
        const btn = document.getElementById('export-excel-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ Gerando...';
        btn.disabled = true;

        // Fazer requisição para o endpoint de exportação
        const response = await fetch('/api/transacoes/export-excel', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        // Obter o blob do arquivo Excel
        const blob = await response.blob();

        // Obter nome do arquivo do header ou gerar um padrão
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'transacoes_bennu_finance.xlsx';
        if (contentDisposition) {
            const matches = /filename=([^;]+)/.exec(contentDisposition);
            if (matches) {
                filename = matches[1].replace(/"/g, '');
            }
        }

        // Criar URL para download
        const url = window.URL.createObjectURL(blob);

        // Criar link temporário para download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Limpar recursos
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log('✅ Excel exportado com sucesso:', filename);

        // Mostrar notificação de sucesso se disponível
        if (window.showNotification) {
            showNotification('Excel exportado com sucesso!', 'success');
        }

    } catch (error) {
        console.error('❌ Erro ao exportar Excel:', error);

        // Mostrar notificação de erro se disponível
        if (window.showNotification) {
            showNotification('Erro ao exportar Excel: ' + error.message, 'error');
        } else {
            alert('Erro ao exportar Excel: ' + error.message);
        }
    } finally {
        // Restaurar botão
        const btn = document.getElementById('export-excel-btn');
        if (btn) {
            btn.innerHTML = '📊 Excel';
            btn.disabled = false;
        }
    }
};

// Inicializar dashboard quando DOM estiver pronto (evitar múltiplas instâncias)
if (!window.dashboard) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Popular campo de ano com ano corrente + passados + 5 futuros
            if (window.populateYearSelect) {
                window.populateYearSelect('ano-filter', { includePlaceholder: false });
            }
            if (!window.dashboard) {
                window.dashboard = new Dashboard();
            }
        });
    } else {
        // Popular campo de ano com ano corrente + passados + 5 futuros
        if (window.populateYearSelect) {
            window.populateYearSelect('ano-filter', { includePlaceholder: false });
        }
        window.dashboard = new Dashboard();
    }
}

// ─── MENU DE CONTEXTO E DUPLICAÇÃO ─────────────────────────────────────────

let _ctxTransacaoId = null;
let _ctxTransacaoInfo = {};

function abrirContextMenuTransacao(x, y, transacaoId, info) {
    fecharContextMenu();
    _ctxTransacaoId = transacaoId;
    _ctxTransacaoInfo = info;

    const menu = document.getElementById('context-menu-transacao');
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    // Ajustar se sair da tela
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';

    document.getElementById('ctx-duplicar').onclick = () => {
        fecharContextMenu();
        abrirModalDuplicar(transacaoId, info);
    };
}

function fecharContextMenu() {
    const menu = document.getElementById('context-menu-transacao');
    if (menu) menu.style.display = 'none';
}

document.addEventListener('click', fecharContextMenu);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { fecharContextMenu(); fecharModalDuplicar(); } });

function _popularAnosDuplicar() {
    const anoAtual = new Date().getFullYear();
    ['dup-comp-ano-contabil', 'dup-comp-ano-gerencial'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = '';
        for (let a = anoAtual - 3; a <= anoAtual + 2; a++) {
            const opt = document.createElement('option');
            opt.value = a;
            opt.textContent = a;
            if (a === anoAtual) opt.selected = true;
            sel.appendChild(opt);
        }
    });
}

function abrirModalDuplicar(transacaoId, info) {
    _popularAnosDuplicar();

    // Pré-preencher com data de hoje
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dup-data-lancamento').value = hoje;

    // Pré-preencher mês/ano com o filtro atual da tela
    const mesFiltro = document.getElementById('mes-filter')?.value || new Date().getMonth() + 1;
    const anoFiltro = document.getElementById('ano-filter')?.value || new Date().getFullYear();
    document.getElementById('dup-comp-mes-contabil').value = mesFiltro;
    document.getElementById('dup-comp-ano-contabil').value = anoFiltro;
    document.getElementById('dup-comp-mes-gerencial').value = mesFiltro;
    document.getElementById('dup-comp-ano-gerencial').value = anoFiltro;

    // Informação do registro original
    const infoEl = document.getElementById('duplicar-info-original');
    infoEl.innerHTML = `
        <strong>Original:</strong> ${info.descricao || 'Sem descrição'}
        ${info.fornecedor && info.fornecedor !== '-' ? ` &bull; <strong>Forn.:</strong> ${info.fornecedor}` : ''}
        &bull; <strong>Valor:</strong> ${info.valor || '-'}
        &bull; <strong>Comp.:</strong> ${info.comp || '-'}
    `;

    const modal = document.getElementById('modal-duplicar-transacao');
    modal.style.display = 'flex';
    _ctxTransacaoId = transacaoId;
}

function fecharModalDuplicar() {
    const modal = document.getElementById('modal-duplicar-transacao');
    if (modal) modal.style.display = 'none';
}

async function confirmarDuplicar() {
    const id = _ctxTransacaoId;
    if (!id) return;

    const dataLancamento = document.getElementById('dup-data-lancamento').value;
    const mesCont = parseInt(document.getElementById('dup-comp-mes-contabil').value);
    const anoCont = parseInt(document.getElementById('dup-comp-ano-contabil').value);
    const mesGer = parseInt(document.getElementById('dup-comp-mes-gerencial').value);
    const anoGer = parseInt(document.getElementById('dup-comp-ano-gerencial').value);

    if (!dataLancamento) {
        alert('Informe a data de lançamento.');
        return;
    }

    const btn = document.querySelector('#modal-duplicar-transacao .btn-primary');
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Duplicando...';

    try {
        const response = await fetch(`/api/transacoes/${id}/duplicar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                data_lancamento: dataLancamento,
                competencia_mes_contabil: mesCont,
                competencia_ano_contabil: anoCont,
                competencia_mes_gerencial: mesGer,
                competencia_ano_gerencial: anoGer
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Erro ao duplicar');

        fecharModalDuplicar();
        alert(`✅ ${data.message}`);
        if (window.dashboard) window.dashboard.loadTransactionsData();

    } catch (err) {
        alert('Erro ao duplicar: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
}