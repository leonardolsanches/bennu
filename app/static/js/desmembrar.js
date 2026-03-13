class DesmembramentoManager {
    constructor() {
        this.transacaoSelecionada = null;
        this.clientes = [];
        this.categoriasContabeis = [];
        this.categoriasGerenciais = [];
        this.subcategoriasContabeis = {};
        this.subcategoriasGerenciais = {};
        this.centrosCusto = [];
        this.projetos = [];
        this.produtosServicos = [];
        this.empresas = [];
        this.itens = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 0;
        this.filters = {
            tipo: '',
            tipoData: 'competencia',
            mesAno: '',
            busca: ''
        };
        this.advancedTable = null;
        this.allTransactions = [];
    }

    async init() {
        await this.carregarAuxiliares();
        await this.carregarEmpresas();
        
        // Definir filtro padrão: mês e ano atual por competência
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        this.filters.mesAno = `${ano}-${mes}`;
        this.filters.tipoData = 'competencia';
        
        // Atualizar campos do formulário com os valores padrão
        document.getElementById('filter-mes-ano').value = this.filters.mesAno;
        document.getElementById('filter-tipo-data').value = this.filters.tipoData;
        
        await this.carregarTransacoes();
        this.setupEventListeners();
        this.initAdvancedTable();
    }

    initAdvancedTable() {
        if (typeof AdvancedTable !== 'undefined') {
            this.advancedTable = new AdvancedTable('#desmembramento-table', {
                enableResize: true,
                enableSort: true,
                enableFilter: true,
                minColumnWidth: 80,
                storageKey: 'desmembramento-table-config'
            });
            
            // Sobrescrever renderTable para usar nossa lógica customizada
            this.advancedTable.renderTable = () => {
                this.renderizarTabela(this.advancedTable.filteredData);
            };
        }
    }

    async carregarEmpresas() {
        try {
            const response = await fetch('/api/empresas');
            this.empresas = await response.json();
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
        }
    }

    async carregarAuxiliares() {
        try {
            const [clientesRes, contabRes, gerencialRes, ccRes, projetosRes, produtosRes] = await Promise.all([
                fetch('/api/clientes'),
                fetch('/api/categorias-contabeis'),
                fetch('/api/categorias-gerenciais'),
                fetch('/api/centros-custo'),
                fetch('/api/projetos'),
                fetch('/api/produtos-servicos')
            ]);

            this.clientes = await clientesRes.json();
            this.categoriasContabeis = await contabRes.json();
            this.categoriasGerenciais = await gerencialRes.json();
            this.centrosCusto = await ccRes.json();
            this.projetos = await projetosRes.json();
            this.produtosServicos = await produtosRes.json();
        } catch (error) {
            console.error('Erro ao carregar auxiliares:', error);
        }
    }

    async carregarSubcategorias(categoriaId, tipo) {
        try {
            const endpoint = tipo === 'contabil' ? '/api/categorias-contabeis' : '/api/categorias-gerenciais';
            const response = await fetch(`${endpoint}?pai_id=${categoriaId}`);
            const subcategorias = await response.json();
            
            if (tipo === 'contabil') {
                this.subcategoriasContabeis[categoriaId] = subcategorias;
            } else {
                this.subcategoriasGerenciais[categoriaId] = subcategorias;
            }
            
            return subcategorias;
        } catch (error) {
            console.error(`Erro ao carregar subcategorias ${tipo}:`, error);
            return [];
        }
    }

    setupEventListeners() {
        // Filtros
        document.getElementById('btn-filtrar').addEventListener('click', () => {
            this.aplicarFiltros();
        });

        // Enter no campo de busca
        document.getElementById('filter-busca').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.aplicarFiltros();
            }
        });

        // Adicionar item
        document.getElementById('btn-add-item').addEventListener('click', () => {
            this.adicionarItem();
        });

        // Salvar desmembramento
        document.getElementById('btn-salvar').addEventListener('click', () => {
            this.salvarDesmembramento();
        });

        // Opções de divisão integradas
        document.getElementById('metodo-divisao').addEventListener('change', (e) => {
            this.alterarMetodoDivisao(e.target.value);
        });

        document.getElementById('btn-aplicar-divisao').addEventListener('click', () => {
            this.aplicarDivisaoAutomatica();
        });

        // Ordenação da tabela
        this.setupTableSorting();
    }

    setupTableSorting() {
        const table = document.querySelector('#transacoes-table-container table');
        if (!table) return;

        const headers = table.querySelectorAll('thead th');
        headers.forEach((header, index) => {
            // Pular a coluna de ação (primeira) e última coluna
            if (index === 0 || index === headers.length - 1) return;

            header.style.cursor = 'pointer';
            header.style.userSelect = 'none';
            
            // Adicionar indicador de ordenação
            const indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            indicator.style.marginLeft = '8px';
            indicator.style.fontSize = '12px';
            indicator.style.opacity = '0.5';
            header.appendChild(indicator);

            header.addEventListener('click', () => {
                this.sortTable(index, header);
            });
        });
    }

    sortTable(columnIndex, headerElement) {
        const table = document.querySelector('#transacoes-table-container table');
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        // Determinar direção da ordenação
        const currentDirection = headerElement.dataset.sortDirection || 'asc';
        const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
        headerElement.dataset.sortDirection = newDirection;

        // Limpar indicadores de outros headers
        table.querySelectorAll('thead th').forEach(th => {
            const indicator = th.querySelector('.sort-indicator');
            if (indicator && th !== headerElement) {
                indicator.textContent = '';
                th.dataset.sortDirection = '';
            }
        });

        // Atualizar indicador do header atual
        const indicator = headerElement.querySelector('.sort-indicator');
        if (indicator) {
            indicator.textContent = newDirection === 'asc' ? '↑' : '↓';
            indicator.style.opacity = '1';
        }

        // Ordenar linhas
        rows.sort((a, b) => {
            const aCell = a.cells[columnIndex];
            const bCell = b.cells[columnIndex];
            
            let aValue = aCell.textContent.trim();
            let bValue = bCell.textContent.trim();

            // Remover badges HTML para comparação
            if (aCell.querySelector('.badge')) {
                aValue = aCell.querySelector('.badge').textContent.trim();
            }
            if (bCell.querySelector('.badge')) {
                bValue = bCell.querySelector('.badge').textContent.trim();
            }

            // Tentar converter para número (para valores monetários)
            const aNum = parseFloat(aValue.replace(/[^\d.-]/g, ''));
            const bNum = parseFloat(bValue.replace(/[^\d.-]/g, ''));

            if (!isNaN(aNum) && !isNaN(bNum)) {
                return newDirection === 'asc' ? aNum - bNum : bNum - aNum;
            }

            // Tentar converter para data
            const aDate = new Date(aValue);
            const bDate = new Date(bValue);
            if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
                return newDirection === 'asc' ? aDate - bDate : bDate - aDate;
            }

            // Ordenação alfabética
            return newDirection === 'asc' 
                ? aValue.localeCompare(bValue, 'pt-BR')
                : bValue.localeCompare(aValue, 'pt-BR');
        });

        // Re-inserir linhas ordenadas
        rows.forEach(row => tbody.appendChild(row));
    }

    aplicarFiltros() {
        this.filters.tipo = document.getElementById('filter-tipo').value;
        this.filters.tipoData = document.getElementById('filter-tipo-data').value;
        this.filters.mesAno = document.getElementById('filter-mes-ano').value;
        this.filters.busca = document.getElementById('filter-busca').value;
        this.currentPage = 1;
        this.carregarTransacoes();
    }

    async carregarTransacoes() {
        const loadingState = document.getElementById('loading-state');
        const tableContainer = document.getElementById('transacoes-table-container');
        const emptyState = document.getElementById('empty-state');

        loadingState.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        emptyState.classList.add('hidden');

        try {
            // Construir URL com filtros (limit=10 para melhor performance)
            let url = `/api/transacoes?page=${this.currentPage}&limit=${this.pageSize}`;
            
            if (this.filters.tipo) {
                url += `&tipo=${this.filters.tipo}`;
            }

            // Adicionar tipo de data para filtro (competência ou lançamento)
            if (this.filters.tipoData) {
                url += `&tipo_data=${this.filters.tipoData}`;
            }

            if (this.filters.mesAno) {
                const [ano, mes] = this.filters.mesAno.split('-');
                url += `&ano=${ano}&mes=${mes}`;
            }

            if (this.filters.busca) {
                url += `&busca=${encodeURIComponent(this.filters.busca)}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            // A API pode retornar diferentes formatos
            const transacoes = data.items || data.transacoes || data;
            const total = data.total || transacoes.length;

            // Processar transações e adicionar status de desmembramento
            const processadas = await this.processarTransacoes(Array.isArray(transacoes) ? transacoes : []);
            this.allTransactions = processadas;

            if (processadas.length === 0) {
                loadingState.classList.add('hidden');
                emptyState.classList.remove('hidden');
                return;
            }

            // Se AdvancedTable está disponível, usar ele
            if (this.advancedTable) {
                this.advancedTable.setData(processadas);
            } else {
                this.renderizarTabela(processadas);
            }
            
            this.renderizarPaginacao(total);

            loadingState.classList.add('hidden');
            tableContainer.classList.remove('hidden');

        } catch (error) {
            console.error('Erro ao carregar transações:', error);
            loadingState.classList.add('hidden');
            emptyState.classList.remove('hidden');
        }
    }

    async processarTransacoes(transacoes) {
        const processadas = [];
        
        for (const t of transacoes) {
            // Determinar status de desmembramento
            let statusDesmembramento = 'Não Desmembrado';
            let statusClass = 'badge-nao-desmembrado';
            
            // Verificar se é uma transação desmembrada (PAI)
            if (t.entra_no_gerencial === false && !t.parent_id) {
                statusDesmembramento = 'Já Desmembrado';
                statusClass = 'badge-desmembrado';
            }
            // Verificar se é filho de desmembramento
            else if (t.parent_id && t.tipo_filho === 'split') {
                statusDesmembramento = 'Desmembramento de';
                statusClass = 'badge-filho-desmembramento';
            }
            
            processadas.push({
                ...t,
                status_desmembramento: statusDesmembramento,
                status_desmembramento_class: statusClass
            });
        }
        
        return processadas;
    }

    renderizarTabela(transacoes) {
        const tbody = document.getElementById('transacoes-tbody');
        tbody.innerHTML = '';

        transacoes.forEach(t => {
            const empresaNome = this.empresas.find(e => e.id === t.empresa_id)?.nome || 'N/A';
            const valor = Math.abs(parseFloat(t.valor));
            const valorFormatado = valor.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });

            const tipoBadge = t.tipo === 'receita' 
                ? '<span class="badge badge-receita">Receita</span>'
                : '<span class="badge badge-despesa">Despesa</span>';

            const statusBadge = t.status === 'pago'
                ? '<span class="badge badge-pago">Pago</span>'
                : '<span class="badge badge-pendente">Pendente</span>';

            // Badge de status de desmembramento
            const statusDesmembramentoBadge = `<span class="badge ${t.status_desmembramento_class}">${t.status_desmembramento}</span>`;

            // Formatar data de lançamento
            const dataLancamento = t.data_lancamento || t.data_transacao || t.data;
            const dataLancamentoFormatada = dataLancamento ? (function(d) { var p = d.substring(0,10).split('-'); return p.length===3 ? p[2]+'/'+p[1]+'/'+p[0] : d; })(dataLancamento) : 'N/A';
            
            // Formatar competência (MM/AAAA)
            const compMes = t.competencia_mes || t.competencia_mes_contabil;
            const compAno = t.competencia_ano || t.competencia_ano_contabil;
            const competenciaFormatada = compMes && compAno 
                ? `${String(compMes).padStart(2, '0')}/${compAno}` 
                : 'N/A';

            const clienteFornecedor = t.cliente_fornecedor || 'N/A';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="text-align: center; width: 100px;">
                    <button class="btn btn-primary btn-sm" onclick="desmembramentoManager.selecionarTransacao(${t.id})" data-testid="button-desmembrar-${t.id}" title="Desmembrar">
                        <i class="fas fa-cut"></i> Desmembrar
                    </button>
                </td>
                <td style="text-align: center;">${statusDesmembramentoBadge}</td>
                <td>${empresaNome}</td>
                <td style="text-align: center;">${dataLancamentoFormatada}</td>
                <td style="text-align: center;">${competenciaFormatada}</td>
                <td>${tipoBadge}</td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.descricao}">${t.descricao}</td>
                <td>${clienteFornecedor}</td>
                <td style="text-align: right; font-weight: 600;">${valorFormatado}</td>
                <td style="text-align: center;">${statusBadge}</td>
            `;
            tbody.appendChild(row);
        });
    }

    renderizarPaginacao(total) {
        this.totalPages = Math.ceil(total / this.pageSize);
        const container = document.getElementById('pagination-controls');
        
        // Atualizar info de paginação
        const paginationInfo = document.getElementById('pagination-info');
        const inicio = (this.currentPage - 1) * this.pageSize + 1;
        const fim = Math.min(this.currentPage * this.pageSize, total);
        paginationInfo.textContent = `${inicio}-${fim} de ${total} registros`;
        
        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        
        // Botão Primeiro
        if (this.currentPage > 2) {
            html += `<button class="btn btn-outline btn-sm" onclick="desmembramentoManager.irParaPagina(1)" title="Primeira página">
                <i class="fas fa-angle-double-left"></i>
            </button>`;
        }
        
        // Botão Anterior
        if (this.currentPage > 1) {
            html += `<button class="btn btn-outline btn-sm" onclick="desmembramentoManager.irParaPagina(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Anterior
            </button>`;
        }

        // Números de página
        const maxButtons = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(this.totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === this.currentPage;
            html += `<button class="btn ${isActive ? 'btn-primary' : 'btn-outline'} btn-sm" 
                onclick="desmembramentoManager.irParaPagina(${i})" ${isActive ? 'disabled' : ''}>
                ${i}
            </button>`;
        }

        // Botão Próximo
        if (this.currentPage < this.totalPages) {
            html += `<button class="btn btn-outline btn-sm" onclick="desmembramentoManager.irParaPagina(${this.currentPage + 1})">
                Próximo <i class="fas fa-chevron-right"></i>
            </button>`;
        }
        
        // Botão Último
        if (this.currentPage < this.totalPages - 1) {
            html += `<button class="btn btn-outline btn-sm" onclick="desmembramentoManager.irParaPagina(${this.totalPages})" title="Última página">
                <i class="fas fa-angle-double-right"></i>
            </button>`;
        }

        container.innerHTML = html;
    }

    irParaPagina(page) {
        this.currentPage = page;
        this.carregarTransacoes();
    }

    async selecionarTransacao(id) {
        try {
            const response = await fetch(`/api/transacoes/${id}`);
            this.transacaoSelecionada = await response.json();

            // Mostrar informações da transação
            const valor = Math.abs(parseFloat(this.transacaoSelecionada.valor));
            document.getElementById('info-descricao').textContent = this.transacaoSelecionada.descricao;
            document.getElementById('info-valor').textContent = valor.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
            document.getElementById('info-tipo').textContent = this.transacaoSelecionada.tipo === 'receita' ? 'Receita' : 'Despesa';
            document.getElementById('info-competencia').textContent = `${this.transacaoSelecionada.competencia_mes}/${this.transacaoSelecionada.competencia_ano}`;

            // Atualizar totalizador
            document.getElementById('total-origem').textContent = valor.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });

            // Limpar itens anteriores
            this.itens = [];
            document.getElementById('itens-container').innerHTML = '';

            // Adicionar primeiro item automaticamente
            this.adicionarItem();

            // Mostrar formulário
            document.getElementById('desmembramento-form').classList.remove('hidden');

            // Scroll até o formulário
            document.getElementById('desmembramento-form').scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error('Erro ao carregar transação:', error);
            this.mostrarAlerta('Erro ao carregar transação', 'danger');
        }
    }

    adicionarItem() {
        if (!this.transacaoSelecionada) return;

        const itemId = Date.now();
        const itemNum = this.itens.length + 1;
        
        this.itens.push({
            id: itemId,
            valor: 0,
            cliente_id: null,
            categoria_contabil_id: null,
            subcategoria_contabil_id: null,
            categoria_gerencial_id: null,
            subcategoria_gerencial_id: null,
            centro_custo_id: null,
            projeto_id: null,
            produto_servico_id: null,
            competencia_mes: this.transacaoSelecionada.competencia_mes,
            competencia_ano: this.transacaoSelecionada.competencia_ano,
            descricao: ''
        });

        // Usar renderizarItem para manter consistência
        this.renderizarItem(
            itemId,
            itemNum,
            '',
            0,
            this.transacaoSelecionada.competencia_mes,
            this.transacaoSelecionada.competencia_ano
        );
        
        this.atualizarTotalizador();
    }

    removerItem(itemId) {
        this.itens = this.itens.filter(i => i.id !== itemId);
        document.getElementById(`item-${itemId}`).remove();
        
        // Renumerar itens
        const container = document.getElementById('itens-container');
        const items = container.querySelectorAll('.item-desmembramento');
        items.forEach((item, index) => {
            item.querySelector('.item-number').textContent = `Item ${index + 1}`;
        });

        this.atualizarTotalizador();
    }

    atualizarItem(itemId, campo, valor) {
        const item = this.itens.find(i => i.id === itemId);
        if (item) {
            item[campo] = valor;
            
            // Se cliente mudou, atualizar produtos disponíveis
            if (campo === 'cliente_id') {
                this.atualizarProdutosPorCliente(itemId);
            }
            
            this.atualizarTotalizador();
        }
    }

    atualizarProdutosPorCliente(itemId) {
        const item = this.itens.find(i => i.id === itemId);
        if (!item || !item.cliente_id) return;

        // Filtrar produtos que têm este cliente associado
        const produtosFiltrados = this.produtosServicos.filter(p => 
            p.clientes && p.clientes.length > 0 && 
            p.clientes.some(c => c.id == item.cliente_id || c == item.cliente_id)
        );

        // Atualizar o select de produtos deste item
        const selectProdutos = document.querySelector(`#item-${itemId} select[data-testid*="select-produto-servico"]`);
        if (selectProdutos) {
            const valorAtual = selectProdutos.value;
            selectProdutos.innerHTML = `
                <option value="">Selecione...</option>
                ${produtosFiltrados.map(p => `<option value="${p.id}" ${p.id == valorAtual ? 'selected' : ''}>${p.nome}</option>`).join('')}
            `;
        }
    }

    atualizarTotalizador() {
        const valorOriginal = Math.abs(parseFloat(this.transacaoSelecionada.valor));
        const totalItens = this.itens.reduce((sum, item) => sum + parseFloat(item.valor || 0), 0);
        const diferenca = valorOriginal - totalItens;

        document.getElementById('total-itens').textContent = totalItens.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });

        document.getElementById('total-diferenca').textContent = diferenca.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });

        // Mudar cor da diferença
        const diferencaEl = document.getElementById('total-diferenca');
        if (Math.abs(diferenca) < 0.01) {
            diferencaEl.style.color = '#10b981'; // Verde
        } else {
            diferencaEl.style.color = '#ef4444'; // Vermelho
        }
    }

    async salvarDesmembramento() {
        if (!this.transacaoSelecionada) return;

        // Validações
        if (this.itens.length < 2) {
            this.mostrarAlerta('É necessário pelo menos 2 itens para desmembrar', 'warning');
            return;
        }

        const valorOriginal = Math.abs(parseFloat(this.transacaoSelecionada.valor));
        const totalItens = this.itens.reduce((sum, item) => sum + parseFloat(item.valor || 0), 0);
        const diferenca = Math.abs(valorOriginal - totalItens);

        if (diferenca >= 0.01) {
            this.mostrarAlerta('A soma dos itens deve ser igual ao valor original', 'warning');
            return;
        }

        try {
            const observacoes = document.getElementById('observacoes').value;

            const payload = {
                transacao_origem_id: this.transacaoSelecionada.id,
                itens: this.itens.map(item => ({
                    valor: parseFloat(item.valor),
                    cliente_id: item.cliente_id ? parseInt(item.cliente_id) : null,
                    categoria_contabil_id: item.categoria_contabil_id ? parseInt(item.categoria_contabil_id) : null,
                    subcategoria_contabil_id: item.subcategoria_contabil_id ? parseInt(item.subcategoria_contabil_id) : null,
                    categoria_gerencial_id: item.categoria_gerencial_id ? parseInt(item.categoria_gerencial_id) : null,
                    subcategoria_gerencial_id: item.subcategoria_gerencial_id ? parseInt(item.subcategoria_gerencial_id) : null,
                    centro_custo_id: item.centro_custo_id ? parseInt(item.centro_custo_id) : null,
                    projeto_id: item.projeto_id ? parseInt(item.projeto_id) : null,
                    produto_servico_id: item.produto_servico_id ? parseInt(item.produto_servico_id) : null,
                    competencia_mes: parseInt(item.competencia_mes),
                    competencia_ano: parseInt(item.competencia_ano),
                    descricao: item.descricao || ''
                })),
                observacoes: observacoes
            };

            const response = await fetch('/api/desmembramento/criar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                this.mostrarAlerta('Desmembramento realizado com sucesso!', 'success');
                
                // Fechar formulário
                this.transacaoSelecionada = null;
                this.itens = [];
                document.getElementById('desmembramento-form').classList.add('hidden');
                document.getElementById('observacoes').value = '';
                document.getElementById('itens-container').innerHTML = '';
                
                // Recarregar tabela
                await this.carregarTransacoes();
                
                // Scroll para o topo e voltar para lista
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const error = await response.json();
                this.mostrarAlerta(error.detail || 'Erro ao salvar desmembramento', 'danger');
            }

        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.mostrarAlerta('Erro ao salvar desmembramento', 'danger');
        }
    }

    cancelarDesmembramento() {
        // Limpar transação selecionada
        this.transacaoSelecionada = null;
        
        // Limpar itens
        this.itens = [];
        document.getElementById('itens-container').innerHTML = '';
        
        // Limpar observações
        document.getElementById('observacoes').value = '';
        
        // Esconder formulário
        document.getElementById('desmembramento-form').classList.add('hidden');
        
        // Scroll para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    mostrarAlerta(mensagem, tipo = 'info') {
        const container = document.getElementById('alert-container');
        const alertId = Date.now();
        
        const alertHtml = `
            <div id="alert-${alertId}" class="alert alert-${tipo}" style="margin-bottom: 16px; padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span>${mensagem}</span>
                <button onclick="document.getElementById('alert-${alertId}').remove()" style="background: none; border: none; cursor: pointer; font-size: 18px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', alertHtml);
        
        setTimeout(() => {
            const alert = document.getElementById(`alert-${alertId}`);
            if (alert) alert.remove();
        }, 5000);
    }

    // ============ DESMEMBRAMENTO AUTOMÁTICO INTEGRADO ============
    
    alterarMetodoDivisao(metodo) {
        const opcoesParcelas = document.getElementById('opcoes-parcelas');
        const btnAplicar = document.getElementById('btn-aplicar-divisao');
        
        if (metodo === 'manual') {
            opcoesParcelas.style.display = 'none';
            btnAplicar.style.display = 'none';
        } else if (metodo === 'igual') {
            opcoesParcelas.style.display = 'none';
            btnAplicar.style.display = 'block';
        } else if (metodo === 'parcelas') {
            opcoesParcelas.style.display = 'block';
            btnAplicar.style.display = 'block';
        }
    }

    aplicarDivisaoAutomatica() {
        if (!this.transacaoSelecionada) {
            this.mostrarAlerta('Nenhuma transação selecionada', 'warning');
            return;
        }

        const metodo = document.getElementById('metodo-divisao').value;
        const valorTotal = Math.abs(parseFloat(this.transacaoSelecionada.valor));
        const textoBase = this.transacaoSelecionada.descricao || this.transacaoSelecionada.titulo_breve || 'Sem descrição';

        // Limpar itens anteriores
        this.itens = [];
        document.getElementById('itens-container').innerHTML = '';

        if (metodo === 'igual') {
            // Dividir igualmente em 2 itens
            const numParcelas = 2;
            const valorParcela = Math.floor((valorTotal / numParcelas) * 100) / 100;
            let somaParcelas = 0;

            for (let i = 1; i <= numParcelas; i++) {
                const itemId = Date.now() + i;
                
                // Ajustar última parcela para garantir soma exata
                let valorItem = valorParcela;
                if (i === numParcelas) {
                    valorItem = valorTotal - somaParcelas;
                }
                somaParcelas += valorItem;

                // Criar item
                this.itens.push({
                    id: itemId,
                    valor: valorItem.toFixed(2),
                    cliente_id: this.transacaoSelecionada.cliente_id || null,
                    categoria_contabil_id: this.transacaoSelecionada.categoria_contabil_id || null,
                    subcategoria_contabil_id: this.transacaoSelecionada.subcategoria_contabil_id || null,
                    categoria_gerencial_id: this.transacaoSelecionada.categoria_gerencial_id || null,
                    subcategoria_gerencial_id: this.transacaoSelecionada.subcategoria_gerencial_id || null,
                    centro_custo_id: this.transacaoSelecionada.centro_custo_id || null,
                    projeto_id: this.transacaoSelecionada.projeto_id || null,
                    produto_servico_id: this.transacaoSelecionada.produto_servico_id || null,
                    competencia_mes: this.transacaoSelecionada.competencia_mes,
                    competencia_ano: this.transacaoSelecionada.competencia_ano,
                    descricao: `${textoBase} - Parte ${i}`
                });

                // Renderizar item no DOM
                this.renderizarItem(itemId, i, `${textoBase} - Parte ${i}`, valorItem, 
                    this.transacaoSelecionada.competencia_mes, this.transacaoSelecionada.competencia_ano);
            }

            this.mostrarAlerta('Valor dividido em 2 partes iguais!', 'success');

        } else if (metodo === 'parcelas') {
            // Dividir em N parcelas com opções
            const numParcelas = parseInt(document.getElementById('num-parcelas').value) || 3;
            const formato = document.getElementById('formato-descricao').value;
            const incrementarMes = document.getElementById('incrementar-mes').checked;
            const valorParcela = Math.floor((valorTotal / numParcelas) * 100) / 100;
            let somaParcelas = 0;

            for (let i = 1; i <= numParcelas; i++) {
                const itemId = Date.now() + i;
                
                // Calcular competência
                let mes = this.transacaoSelecionada.competencia_mes;
                let ano = this.transacaoSelecionada.competencia_ano;
                
                if (incrementarMes) {
                    mes = mes + i - 1;
                    while (mes > 12) {
                        mes -= 12;
                        ano += 1;
                    }
                }

                // Gerar descrição
                let descricao = textoBase;
                if (formato === 'parcela') {
                    descricao = `${textoBase} - Parcela ${i}/${numParcelas}`;
                } else if (formato === 'mes') {
                    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    descricao = `${textoBase} - ${meses[mes - 1]}`;
                }

                // Ajustar última parcela para garantir soma exata
                let valorItem = valorParcela;
                if (i === numParcelas) {
                    valorItem = valorTotal - somaParcelas;
                }
                somaParcelas += valorItem;

                // Criar item
                this.itens.push({
                    id: itemId,
                    valor: valorItem.toFixed(2),
                    cliente_id: this.transacaoSelecionada.cliente_id || null,
                    categoria_contabil_id: this.transacaoSelecionada.categoria_contabil_id || null,
                    subcategoria_contabil_id: this.transacaoSelecionada.subcategoria_contabil_id || null,
                    categoria_gerencial_id: this.transacaoSelecionada.categoria_gerencial_id || null,
                    subcategoria_gerencial_id: this.transacaoSelecionada.subcategoria_gerencial_id || null,
                    centro_custo_id: this.transacaoSelecionada.centro_custo_id || null,
                    projeto_id: this.transacaoSelecionada.projeto_id || null,
                    produto_servico_id: this.transacaoSelecionada.produto_servico_id || null,
                    competencia_mes: mes,
                    competencia_ano: ano,
                    descricao: descricao
                });

                // Renderizar item no DOM
                this.renderizarItem(itemId, i, descricao, valorItem, mes, ano);
            }

            this.mostrarAlerta(`${numParcelas} parcelas criadas com sucesso!`, 'success');
        }

        // Atualizar totalizador
        this.atualizarTotalizador();
    }

    renderizarItem(itemId, itemNum, descricao, valor, mes, ano) {
        const container = document.getElementById('itens-container');
        const item = this.itens.find(i => i.id === itemId);
        const isReceita = this.transacaoSelecionada && this.transacaoSelecionada.tipo === 'receita';
        
        // Filtrar produtos pelo cliente do item (se houver)
        const produtosFiltrados = item && item.cliente_id 
            ? this.produtosServicos.filter(p => 
                p.clientes && p.clientes.length > 0 && 
                p.clientes.some(c => c.id == item.cliente_id || c == item.cliente_id)
              )
            : this.produtosServicos;
        
        const itemHtml = `
            <div class="item-desmembramento" id="item-${itemId}" data-testid="item-desmembramento-${itemNum}">
                <div class="item-header">
                    <span class="item-number">Item ${itemNum}</span>
                    <button type="button" class="btn-remove-item" onclick="desmembramentoManager.removerItem(${itemId})" data-testid="button-remove-item-${itemNum}">
                        <i class="fas fa-trash"></i> Remover
                    </button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div class="form-group">
                        <label>Valor</label>
                        <input type="number" class="form-control" step="0.01" value="${valor.toFixed(2)}"
                            onchange="desmembramentoManager.atualizarItem(${itemId}, 'valor', this.value)"
                            data-testid="input-valor-item-${itemNum}">
                    </div>
                    <div class="form-group">
                        <label>Cliente/Fornecedor</label>
                        <select class="form-control" 
                            onchange="desmembramentoManager.atualizarItem(${itemId}, 'cliente_id', this.value); desmembramentoManager.atualizarProdutosPorCliente(${itemId});" 
                            data-testid="select-cliente-item-${itemNum}">
                            <option value="">Selecione...</option>
                            ${this.clientes.map(c => `<option value="${c.id}" ${c.id == item.cliente_id ? 'selected' : ''}>${c.nome}</option>`).join('')}
                        </select>
                    </div>
                    
                    ${!isReceita ? `
                    <div class="form-group">
                        <label>Categoria Contábil</label>
                        <select class="form-control" id="cat-contabil-${itemId}" onchange="desmembramentoManager.onCategoriaChange(${itemId}, 'contabil', this.value)" data-testid="select-categoria-contabil-item-${itemNum}">
                            <option value="">Selecione...</option>
                            ${this.categoriasContabeis.map(c => `<option value="${c.id}" ${c.id == item.categoria_contabil_id ? 'selected' : ''}>${c.nome}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Subcategoria Contábil</label>
                        <select class="form-control" id="subcat-contabil-${itemId}" onchange="desmembramentoManager.atualizarItem(${itemId}, 'subcategoria_contabil_id', this.value)" data-testid="select-subcategoria-contabil-item-${itemNum}">
                            <option value="">Selecione...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Categoria Gerencial</label>
                        <select class="form-control" id="cat-gerencial-${itemId}" onchange="desmembramentoManager.onCategoriaChange(${itemId}, 'gerencial', this.value)" data-testid="select-categoria-gerencial-item-${itemNum}">
                            <option value="">Selecione...</option>
                            ${this.categoriasGerenciais.map(c => `<option value="${c.id}" ${c.id == item.categoria_gerencial_id ? 'selected' : ''}>${c.nome}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Subcategoria Gerencial</label>
                        <select class="form-control" id="subcat-gerencial-${itemId}" onchange="desmembramentoManager.atualizarItem(${itemId}, 'subcategoria_gerencial_id', this.value)" data-testid="select-subcategoria-gerencial-item-${itemNum}">
                            <option value="">Selecione...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Centro de Custo</label>
                        <select class="form-control" onchange="desmembramentoManager.atualizarItem(${itemId}, 'centro_custo_id', this.value)" data-testid="select-centro-custo-item-${itemNum}">
                            <option value="">Selecione...</option>
                            ${this.centrosCusto.map(c => `<option value="${c.id}" ${c.id == item.centro_custo_id ? 'selected' : ''}>${c.nome}</option>`).join('')}
                        </select>
                    </div>
                    ` : ''}
                    
                    <div class="form-group">
                        <label>Projeto</label>
                        <select class="form-control" onchange="desmembramentoManager.atualizarItem(${itemId}, 'projeto_id', this.value)" data-testid="select-projeto-item-${itemNum}">
                            <option value="">Selecione...</option>
                            ${this.projetos.map(p => `<option value="${p.id}" ${p.id == item.projeto_id ? 'selected' : ''}>${p.nome}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Produto/Serviço</label>
                        <select class="form-control" onchange="desmembramentoManager.atualizarItem(${itemId}, 'produto_servico_id', this.value)" data-testid="select-produto-servico-item-${itemNum}">
                            <option value="">Selecione...</option>
                            ${produtosFiltrados.map(p => `<option value="${p.id}" ${p.id == item.produto_servico_id ? 'selected' : ''}>${p.nome}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Competência (Mês/Ano)</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <select class="form-control" onchange="desmembramentoManager.atualizarItem(${itemId}, 'competencia_mes', this.value)" data-testid="select-mes-item-${itemNum}">
                                ${Array.from({length: 12}, (_, i) => {
                                    const m = i + 1;
                                    const selected = m === mes ? 'selected' : '';
                                    return `<option value="${m}" ${selected}>${m}</option>`;
                                }).join('')}
                            </select>
                            <input type="number" class="form-control" value="${ano}" 
                                onchange="desmembramentoManager.atualizarItem(${itemId}, 'competencia_ano', this.value)"
                                data-testid="input-ano-item-${itemNum}">
                        </div>
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Descrição</label>
                        <input type="text" class="form-control" value="${descricao}" 
                            onchange="desmembramentoManager.atualizarItem(${itemId}, 'descricao', this.value)"
                            data-testid="input-descricao-item-${itemNum}">
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', itemHtml);
        
        // Carregar subcategorias se categoria já estiver selecionada
        if (!isReceita && item.categoria_contabil_id) {
            this.onCategoriaChange(itemId, 'contabil', item.categoria_contabil_id);
        }
        if (!isReceita && item.categoria_gerencial_id) {
            this.onCategoriaChange(itemId, 'gerencial', item.categoria_gerencial_id);
        }
    }

    async onCategoriaChange(itemId, tipo, categoriaId) {
        this.atualizarItem(itemId, `categoria_${tipo}_id`, categoriaId);
        
        // Limpar subcategoria
        this.atualizarItem(itemId, `subcategoria_${tipo}_id`, null);
        
        const selectSubcat = document.getElementById(`subcat-${tipo}-${itemId}`);
        if (selectSubcat) {
            selectSubcat.innerHTML = '<option value="">Selecione...</option>';
            
            if (categoriaId) {
                const subcategorias = await this.carregarSubcategorias(categoriaId, tipo);
                subcategorias.forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub.id;
                    option.textContent = sub.nome;
                    selectSubcat.appendChild(option);
                });
            }
        }
    }
}

// Inicializar
const desmembramentoManager = new DesmembramentoManager();
document.addEventListener('DOMContentLoaded', () => {
    desmembramentoManager.init();
});

// Exportar para uso global
window.desmembramentoManager = desmembramentoManager;
