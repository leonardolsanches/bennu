// Nova Receita - JavaScript para controle do formulário

// Usar IIFE para evitar redeclaração
(function() {
if (window.NovaReceitaControllerDefined) {
    console.log('⚠️ NovaReceitaController já definido, ignorando redeclaração');
    return;
}
window.NovaReceitaControllerDefined = true;

class NovaReceitaController {
    constructor() {
        this.allProdutosServicos = [];
        this.editMode = false;
        this.transacaoId = null;
        const idInput = document.getElementById('transacao-id');
        if (idInput && idInput.value) {
            this.editMode = true;
            this.transacaoId = parseInt(idInput.value);
        }
        this.init();
    }

    async init() {
        console.log(`🚀 Inicializando Receita Controller (${this.editMode ? 'EDIÇÃO #' + this.transacaoId : 'CRIAÇÃO'})...`);

        try {
            if (!this.editMode) {
                console.log('🎯 1/4: Configurando valores padrão...');
                this.setDefaultValues();
            }

            console.log('🎯 2/4: Carregando opções dos selects...');
            await this.loadSelectOptions();

            console.log('🎯 3/4: Configurando event listeners...');
            this.setupEventListeners();

            if (this.editMode) {
                console.log('🎯 4/4: Carregando dados da transação para edição...');
                await this.loadTransactionData();
            }

            console.log('✅ Receita Controller inicializado com SUCESSO!');
        } catch (error) {
            console.error('❌ ERRO FATAL no Receita Controller:', error);
            this.showError('Erro ao inicializar formulário. Recarregue a página.');
        }
    }

    async loadTransactionData() {
        try {
            const response = await fetch(`/api/transacoes/${this.transacaoId}`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            const t = await response.json();
            console.log('✅ Dados da transação carregados:', t);

            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el && val !== null && val !== undefined && val !== '') {
                    if (el.tagName === 'SELECT') {
                        const exists = Array.from(el.options).some(o => o.value == val);
                        if (!exists) { console.warn(`⚠️ Valor ${val} não encontrado no select ${id}`); return; }
                    }
                    el.value = val;
                    if (el.tagName === 'SELECT') el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            };

            setVal('titulo', t.nome || t.descricao || '');
            setVal('descricao', t.descricao || '');
            const valorEl = document.getElementById('valor');
            if (valorEl && t.valor) {
                valorEl.value = this.formatCurrencyInput(Math.abs(t.valor));
            }
            if (t.data_lancamento) setVal('data_lancamento', t.data_lancamento);
            if (t.data_vencimento) setVal('data_vencimento', t.data_vencimento);
            if (t.data_recebimento) setVal('data_recebimento', t.data_recebimento);
            if (t.data_pagamento && !t.data_recebimento) setVal('data_recebimento', t.data_pagamento);
            const valorRecebidoEl = document.getElementById('valor_recebido');
            if (valorRecebidoEl && t.valor_recebido != null) {
                valorRecebidoEl.value = this.formatCurrencyInput(Math.abs(t.valor_recebido));
            }
            setVal('status', t.status || 'pendente');
            setVal('forma_recebimento', t.forma_pgto || t.forma_recebimento || '');

            if (t.competencia_ano && window.populateYearSelect) {
                window.populateYearSelect('ano', {
                    selectedYear: t.competencia_ano,
                    includePlaceholder: true,
                    startYear: Math.min(2020, t.competencia_ano)
                });
            }

            const anoContabil = t.competencia_ano_contabil || t.competencia_ano;
            const mesContabil = t.competencia_mes_contabil || t.competencia_mes;
            if (anoContabil && mesContabil) {
                setVal('competencia_contabil', `${anoContabil}-${String(mesContabil).padStart(2, '0')}`);
            }
            const anoGerencial = t.competencia_ano_gerencial || t.competencia_ano;
            const mesGerencial = t.competencia_mes_gerencial || t.competencia_mes;
            if (anoGerencial && mesGerencial) {
                setVal('competencia_gerencial', `${anoGerencial}-${String(mesGerencial).padStart(2, '0')}`);
            }

            setVal('empresa', t.empresa_id);
            setVal('cliente', t.cliente_id);
            setVal('produto_servico', t.produto_servico_id);

            if (t.categoria_contabil_id) {
                setVal('categoria_contabil', t.categoria_contabil_id);
                await this.loadSubcategories('subcategoria_contabil', t.categoria_contabil_id, 'contabil');
                setVal('subcategoria_contabil', t.subcategoria_contabil_id);
            }
            if (t.categoria_gerencial_id) {
                setVal('categoria_gerencial', t.categoria_gerencial_id);
                await this.loadSubcategories('subcategoria_gerencial', t.categoria_gerencial_id, 'gerencial');
                setVal('subcategoria_gerencial', t.subcategoria_gerencial_id);
            }
            setVal('centro_custo', t.centro_custo_id);

            setVal('numero_nota_fiscal', t.numero_nota_fiscal || '');
            setVal('link_nota_fiscal', t.link_nota_fiscal || '');
            setVal('numero_pedido_compra', t.numero_pedido_compra || '');
            setVal('link_pedido_compra', t.link_pedido_compra || '');

            console.log('✅ Formulário de edição preenchido com sucesso');
        } catch (error) {
            console.error('❌ Erro ao carregar dados da transação:', error);
            this.showError('Erro ao carregar dados da transação: ' + error.message);
        }
    }

    setDefaultValues() {
        // Data de lançamento padrão (hoje) - usando fuso horário local
        const now = new Date();
        const dataLancamento = document.getElementById('data_lancamento');
        if (dataLancamento) {
            // Formato: YYYY-MM-DD (usando fuso horário local, não UTC)
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const formattedToday = `${year}-${month}-${day}`;
            dataLancamento.value = formattedToday;
            console.log('📅 Data de lançamento configurada para:', formattedToday);
        }

        // Data de vencimento padrão (hoje) - usando fuso horário local
        const dataVencimento = document.getElementById('data_vencimento');
        if (dataVencimento) {
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const formattedToday = `${year}-${month}-${day}`;
            dataVencimento.value = formattedToday;
        }

        // Competência Contábil padrão (mês/ano atual)
        const competenciaContabil = document.getElementById('competencia_contabil');
        if (competenciaContabil) {
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            competenciaContabil.value = `${year}-${month}`;
        }

        // Competência Gerencial padrão (mês/ano atual)
        const competenciaGerencial = document.getElementById('competencia_gerencial');
        if (competenciaGerencial) {
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            competenciaGerencial.value = `${year}-${month}`;
        }

        // Status padrão
        const status = document.getElementById('status');
        if (status) {
            status.value = 'pendente';
        }

        // Forma de recebimento padrão
        const formaRecebimento = document.getElementById('forma_recebimento');
        if (formaRecebimento) {
            formaRecebimento.value = 'transferencia';
        }
    }

    async loadSelectOptions() {
        try {
            // Verificar autenticação antes de carregar dados
            console.log('🔐 Verificando autenticação...');
            const authResponse = await fetch('/api/auth/user', {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (!authResponse.ok) {
                console.error('🔒 Usuário não autenticado:', authResponse.status);
                this.showError('Usuário não autenticado. Redirecionando para login...');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return;
            }

            const userData = await authResponse.json();
            console.log('✅ Usuário autenticado:', userData);

            // Carregar empresas
            await this.loadOptions('empresa', '/api/empresas');

            // Carregar clientes
            await this.loadOptions('cliente', '/api/clientes');

            // Carregar produtos/serviços e armazenar para filtrar por cliente
            await this.loadProdutosServicos();

            // Carregar centros de custo
            await this.loadOptions('centro_custo', '/api/centros-custo');

            // Carregar categorias usando método específico
            await this.loadCategories();

        } catch (error) {
            console.error('❌ Erro ao carregar opções dos selects:', error);
            this.showError('Erro ao carregar dados do formulário');
        }
    }

    async loadOptions(selectId, endpoint) {
        const select = document.getElementById(selectId);
        if (!select) {
            console.log(`⏭️ Select #${selectId} não existe no DOM, pulando carregamento`);
            return;
        }

        console.log(`🔄 Carregando ${selectId} de ${endpoint}...`);
        try {
            const response = await fetch(endpoint, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            console.log(`🌐 Response ${selectId}: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                console.error(`❌ ERRO ao carregar ${selectId}: ${response.status} - ${response.statusText}`);
                if (response.status === 401) {
                    console.error('🔒 Usuário não autenticado - dados não carregados');
                    this.showError(`Erro de autenticação ao carregar ${selectId}. Faça login novamente.`);
                } else if (response.status === 404) {
                    console.error(`🔍 Endpoint ${endpoint} não encontrado`);
                } else {
                    console.error(`🚫 Erro HTTP ${response.status} ao carregar ${selectId}`);
                }
                return;
            }

            const data = await response.json();
            console.log(`📊 Dados recebidos para ${selectId}:`, data);

            // Limpar opções existentes (exceto o "Selecione...")
            const firstOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            if (firstOption) {
                select.appendChild(firstOption);
            } else {
                // Criar opção "Selecione..." se não existir
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Selecione...';
                select.appendChild(defaultOption);
            }

            // Adicionar novas opções
            const items = Array.isArray(data) ? data : (data.items || data.data || []);
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.nome || item.name || item.razao_social || `Item ${item.id}`;
                select.appendChild(option);
            });

            console.log(`✅ Carregadas ${items.length} opções para #${selectId}`);

        } catch (error) {
            console.error(`❌ ERRO FATAL ao carregar ${selectId}:`, error);
            this.showError(`Erro de conexão ao carregar ${selectId}: ${error.message}`);
        }
    }

    async loadProdutosServicos() {
        try {
            const response = await fetch('/api/produtos-servicos', {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                this.allProdutosServicos = Array.isArray(data) ? data : (data.items || data.data || []);
                console.log(`✅ ${this.allProdutosServicos.length} produtos/serviços carregados e armazenados`);
                
                // Inicialmente mostrar todos os produtos
                this.updateProdutosSelect(this.allProdutosServicos);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar produtos/serviços:', error);
        }
    }

    updateProdutosSelect(produtos) {
        const select = document.getElementById('produto_servico');
        if (!select) return;

        const valorAtual = select.value;
        select.innerHTML = '<option value="">Selecione...</option>';
        
        produtos.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.nome;
            if (p.id == valorAtual) option.selected = true;
            select.appendChild(option);
        });
    }

    filtrarProdutosPorCliente() {
        const clienteId = document.getElementById('cliente')?.value;
        
        if (!clienteId) {
            // Sem cliente selecionado, mostrar todos os produtos
            this.updateProdutosSelect(this.allProdutosServicos);
            return;
        }

        // Filtrar produtos que têm este cliente associado
        const produtosFiltrados = this.allProdutosServicos.filter(p => 
            p.clientes && p.clientes.length > 0 && 
            p.clientes.some(c => c === parseInt(clienteId) || c.id === parseInt(clienteId))
        );

        console.log(`🔍 Produtos filtrados para cliente ${clienteId}:`, produtosFiltrados.length);
        this.updateProdutosSelect(produtosFiltrados);
    }

    setupEventListeners() {
        // Toggle Categorização Gerencial
        const toggleGerencial = document.getElementById('incluir_pl_gerencial');
        if (toggleGerencial) {
            toggleGerencial.addEventListener('change', () => {
                this.toggleCategorization('gerencial', toggleGerencial.checked);
            });
        }

        // Toggle Categorização Contábil
        const toggleContabil = document.getElementById('incluir_pl_contabil');
        if (toggleContabil) {
            toggleContabil.addEventListener('change', () => {
                this.toggleCategorization('contabil', toggleContabil.checked);
            });
        }

        const dataRecebimento = document.getElementById('data_recebimento');
        if (dataRecebimento) {
            dataRecebimento.addEventListener('change', () => {
                const valorRecebidoEl = document.getElementById('valor_recebido');
                if (dataRecebimento.value && valorRecebidoEl && !valorRecebidoEl.value) {
                    const valorEl = document.getElementById('valor');
                    if (valorEl && valorEl.value) {
                        valorRecebidoEl.value = valorEl.value;
                    }
                }
            });
        }

        const valorRecebidoInput = document.getElementById('valor_recebido');
        if (valorRecebidoInput) {
            valorRecebidoInput.addEventListener('blur', () => {
                if (valorRecebidoInput.value) {
                    const parsed = this.parseCurrencyInput(valorRecebidoInput.value);
                    valorRecebidoInput.value = this.formatCurrencyInput(Math.abs(parsed));
                }
            });
            valorRecebidoInput.addEventListener('focus', () => {
                if (valorRecebidoInput.value) {
                    const parsed = this.parseCurrencyInput(valorRecebidoInput.value);
                    valorRecebidoInput.value = parsed ? Math.abs(parsed).toString() : '';
                }
            });
        }

        // Formulário principal
        const form = document.getElementById('nova-receita-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Event listener para filtrar produtos por cliente e carregar histórico
        const clienteSelect = document.getElementById('cliente');
        if (clienteSelect) {
            clienteSelect.addEventListener('change', () => {
                this.filtrarProdutosPorCliente();
                if (clienteSelect.value) {
                    this.loadClienteHistory(clienteSelect.value);
                }
            });
        }

        // Event listeners para cálculo de impostos em tempo real e sugestão inteligente
        const empresaSelect = document.getElementById('empresa');
        const valorInput = document.getElementById('valor');

        if (empresaSelect) {
            empresaSelect.addEventListener('change', () => {
                this.calcularImpostos();
                if (empresaSelect.value) {
                    this.loadHistoricoSugestao();
                }
            });
        }

        if (valorInput) {
            valorInput.addEventListener('input', () => this.calcularImpostos());
            valorInput.addEventListener('change', () => this.calcularImpostos());
        }

        // Máscara de moeda no campo valor
        this.setupCurrencyMask();

        // Categoria pai para subcategorias
        this.setupCategoryDependencies();
    }

    async calcularImpostos() {
        const empresaId = document.getElementById('empresa')?.value;
        const valor = this.parseCurrencyInput(document.getElementById('valor')?.value || '0');

        if (!empresaId || !valor || valor <= 0) {
            this.resetarImpostos();
            return;
        }

        try {
            const response = await fetch('/api/impostos/calcular-preview', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    empresa_id: parseInt(empresaId),
                    valor: valor
                })
            });

            if (!response.ok) {
                console.error('Erro ao calcular impostos:', response.status);
                return;
            }

            const data = await response.json();
            this.atualizarImpostosUI(data);

        } catch (error) {
            console.error('Erro ao calcular impostos:', error);
        }
    }

    atualizarImpostosUI(data) {
        const { impostos, aliquotas, valor_receita, empresa_nome } = data;

        // Atualizar alíquotas
        const aliquotaPis = document.getElementById('aliquota-pis');
        const aliquotaCofins = document.getElementById('aliquota-cofins');
        const aliquotaIss = document.getElementById('aliquota-iss');
        const aliquotaIrpj = document.getElementById('aliquota-irpj');
        const aliquotaCsll = document.getElementById('aliquota-csll');

        if (aliquotaPis) aliquotaPis.textContent = `${aliquotas.PIS.toFixed(2)}%`;
        if (aliquotaCofins) aliquotaCofins.textContent = `${aliquotas.COFINS.toFixed(2)}%`;
        if (aliquotaIss) aliquotaIss.textContent = `${aliquotas.ISS.toFixed(2)}%`;
        if (aliquotaIrpj) aliquotaIrpj.textContent = `${aliquotas.IRPJ.toFixed(2)}%`;
        if (aliquotaCsll) aliquotaCsll.textContent = `${aliquotas.CSLL.toFixed(2)}%`;

        // Atualizar valores dos impostos (IDs corretos do HTML)
        const valPis = document.getElementById('imposto-pis');
        const valCofins = document.getElementById('imposto-cofins');
        const valIss = document.getElementById('imposto-iss');
        const valIrpj = document.getElementById('imposto-irpj');
        const valCsll = document.getElementById('imposto-csll');

        if (valPis) valPis.textContent = this.formatarValor(impostos.pis).replace('R$', '').trim();
        if (valCofins) valCofins.textContent = this.formatarValor(impostos.cofins).replace('R$', '').trim();
        if (valIss) valIss.textContent = this.formatarValor(impostos.iss).replace('R$', '').trim();
        if (valIrpj) valIrpj.textContent = this.formatarValor(impostos.irpj).replace('R$', '').trim();
        if (valCsll) valCsll.textContent = this.formatarValor(impostos.csll).replace('R$', '').trim();

        // Atualizar resumo superior
        const valorBase = document.getElementById('imposto-valor-base');
        const totalDisplay = document.getElementById('imposto-total-display');
        const valorLiquido = document.getElementById('imposto-valor-liquido');
        const empresaNome = document.getElementById('imposto-empresa-nome');

        if (valorBase) valorBase.textContent = this.formatarValor(valor_receita);
        if (totalDisplay) totalDisplay.textContent = this.formatarValor(impostos.total);
        
        const receitaLiquida = valor_receita - impostos.total;
        if (valorLiquido) valorLiquido.textContent = this.formatarValor(receitaLiquida);
        if (empresaNome && empresa_nome) empresaNome.textContent = empresa_nome;
    }

    resetarImpostos() {
        const aliquotaPis = document.getElementById('aliquota-pis');
        const aliquotaCofins = document.getElementById('aliquota-cofins');
        const aliquotaIss = document.getElementById('aliquota-iss');
        const aliquotaIrpj = document.getElementById('aliquota-irpj');
        const aliquotaCsll = document.getElementById('aliquota-csll');

        if (aliquotaPis) aliquotaPis.textContent = '0,65%';
        if (aliquotaCofins) aliquotaCofins.textContent = '3,00%';
        if (aliquotaIss) aliquotaIss.textContent = '5,00%';
        if (aliquotaIrpj) aliquotaIrpj.textContent = '7,93%';
        if (aliquotaCsll) aliquotaCsll.textContent = '2,88%';

        // IDs corretos do HTML
        const valPis = document.getElementById('imposto-pis');
        const valCofins = document.getElementById('imposto-cofins');
        const valIss = document.getElementById('imposto-iss');
        const valIrpj = document.getElementById('imposto-irpj');
        const valCsll = document.getElementById('imposto-csll');
        const valorBase = document.getElementById('imposto-valor-base');
        const totalDisplay = document.getElementById('imposto-total-display');
        const valorLiquido = document.getElementById('imposto-valor-liquido');

        if (valPis) valPis.textContent = '0,00';
        if (valCofins) valCofins.textContent = '0,00';
        if (valIss) valIss.textContent = '0,00';
        if (valIrpj) valIrpj.textContent = '0,00';
        if (valCsll) valCsll.textContent = '0,00';
        if (valorBase) valorBase.textContent = 'R$ 0,00';
        if (totalDisplay) totalDisplay.textContent = 'R$ 0,00';
        if (valorLiquido) valorLiquido.textContent = 'R$ 0,00';
    }

    formatarValor(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor || 0);
    }

    formatCurrencyInput(value) {
        const num = typeof value === 'string' ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : value;
        if (isNaN(num) || num === 0) return '';
        const fixed = Math.abs(num).toFixed(2);
        const parts = fixed.split('.');
        const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return intPart + ',' + parts[1];
    }

    parseCurrencyInput(formatted) {
        if (!formatted) return 0;
        const str = String(formatted).trim();
        const hasComma = str.includes(',');
        const hasDot = str.includes('.');
        if (hasComma && hasDot) {
            return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
        }
        if (hasComma) {
            const commaPos = str.lastIndexOf(',');
            const afterComma = str.substring(commaPos + 1);
            if (afterComma.length <= 2) {
                return parseFloat(str.replace(/,/g, '.')) || 0;
            }
            return parseFloat(str.replace(/,/g, '')) || 0;
        }
        if (hasDot) {
            const dotPos = str.lastIndexOf('.');
            const afterDot = str.substring(dotPos + 1);
            if (afterDot.length <= 2) {
                return parseFloat(str) || 0;
            }
            return parseFloat(str.replace(/\./g, '')) || 0;
        }
        return parseFloat(str) || 0;
    }

    setupCurrencyMask() {
        const valorInput = document.getElementById('valor');
        if (!valorInput) return;

        valorInput.addEventListener('input', (e) => {
            let val = e.target.value;
            val = val.replace(/[^\d,\.]/g, '');
            e.target.value = val;
        });

        valorInput.addEventListener('blur', (e) => {
            const num = this.parseCurrencyInput(e.target.value);
            if (num > 0) {
                e.target.value = this.formatCurrencyInput(num);
            }
        });

        valorInput.addEventListener('focus', (e) => {
            const num = this.parseCurrencyInput(e.target.value);
            if (num > 0) {
                e.target.value = num.toString().replace('.', ',');
            }
        });
    }

    setupCategoryDependencies() {
        // Quando categoria gerencial muda, atualizar subcategorias e buscar sugestão
        const catGerencial = document.getElementById('categoria_gerencial');
        if (catGerencial) {
            catGerencial.addEventListener('change', () => {
                this.loadSubcategories('subcategoria_gerencial', catGerencial.value, 'gerencial');
                if (catGerencial.value) {
                    setTimeout(() => this.loadHistoricoSugestao(), 400);
                }
            });
        }

        // Quando categoria contábil muda, atualizar subcategorias e buscar sugestão
        const catContabil = document.getElementById('categoria_contabil');
        if (catContabil) {
            catContabil.addEventListener('change', () => {
                this.loadSubcategories('subcategoria_contabil', catContabil.value, 'contabil');
                if (catContabil.value) {
                    setTimeout(() => this.loadHistoricoSugestao(), 400);
                }
            });
        }

        // Quando centro de custo muda, buscar sugestão
        const centroCusto = document.getElementById('centro_custo');
        if (centroCusto) {
            centroCusto.addEventListener('change', () => {
                if (centroCusto.value) {
                    this.loadHistoricoSugestao();
                }
            });
        }
    }

    async loadSubcategories(subcategorySelectId, parentCategoryId, tipo) {
        const select = document.getElementById(subcategorySelectId);
        if (!select || !parentCategoryId) return;

        try {
            // Usar endpoints corretos com parâmetro pai_id
            const endpoint = tipo === 'gerencial' ? '/api/categorias-gerenciais' : '/api/categorias-contabeis';
            const response = await fetch(`${endpoint}?pai_id=${parentCategoryId}`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                const subcategorias = await response.json();

                // Limpar e recriar opções
                select.innerHTML = '<option value="">Selecione...</option>';

                const items = Array.isArray(subcategorias) ? subcategorias : (subcategorias.items || []);
                items.forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub.id;
                    option.textContent = sub.nome;
                    select.appendChild(option);
                });

                console.log(`✅ Carregadas ${items.length} subcategorias ${tipo} para categoria ${parentCategoryId}`);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar subcategorias:', error);
        }
    }

    toggleCategorization(tipo, show) {
        const container = document.getElementById(`categorization-${tipo}`);
        if (container) {
            container.style.display = show ? 'block' : 'none';
        }
    }

    async loadHistoricoSugestao() {
        try {
            const empresa = document.getElementById('empresa')?.value;
            const cliente = document.getElementById('cliente')?.value;
            const centroCusto = document.getElementById('centro_custo')?.value;
            const catGerencial = document.getElementById('categoria_gerencial')?.value;
            const catContabil = document.getElementById('categoria_contabil')?.value;

            let url = '/api/transacoes/historico-sugestao?tipo=receita';
            if (empresa) url += `&empresa_id=${empresa}`;
            if (cliente) url += `&cliente_id=${cliente}`;
            if (centroCusto) url += `&centro_custo_id=${centroCusto}`;
            if (catGerencial) url += `&categoria_gerencial_id=${catGerencial}`;
            if (catContabil) url += `&categoria_contabil_id=${catContabil}`;

            const response = await fetch(url, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.found && data.sugestao) {
                    console.log('📜 Sugestão inteligente encontrada:', data.sugestao);
                    await this.aplicarSugestao(data.sugestao);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao carregar sugestão:', error);
        }
    }

    async aplicarSugestao(sugestao, forcar = false) {
        const aplicarCampo = (id, value) => {
            const el = document.getElementById(id);
            if (!el || !value) return false;
            if (!forcar && el.value) return false;
            if (el.tagName === 'SELECT') {
                const existe = Array.from(el.options).some(o => o.value == value);
                if (!existe) return false;
            }
            el.value = value;
            return true;
        };

        aplicarCampo('descricao', sugestao.descricao);
        aplicarCampo('titulo', sugestao.descricao);
        aplicarCampo('centro_custo', sugestao.centro_custo_id);

        if (aplicarCampo('categoria_contabil', sugestao.categoria_contabil_id)) {
            await this.loadSubcategories('subcategoria_contabil', sugestao.categoria_contabil_id, 'contabil');
            aplicarCampo('subcategoria_contabil', sugestao.subcategoria_contabil_id);
        }

        if (aplicarCampo('categoria_gerencial', sugestao.categoria_gerencial_id)) {
            await this.loadSubcategories('subcategoria_gerencial', sugestao.categoria_gerencial_id, 'gerencial');
            aplicarCampo('subcategoria_gerencial', sugestao.subcategoria_gerencial_id);
        }

        aplicarCampo('conta_contabil', sugestao.conta_contabil_id);

        if (forcar) this.mostrarBadgePreenchimento();
        console.log(`✅ Sugestão aplicada (forcar=${forcar})`);
    }

    mostrarBadgePreenchimento() {
        const anterior = document.getElementById('badge-preenchimento-auto');
        if (anterior) anterior.remove();
        const badge = document.createElement('div');
        badge.id = 'badge-preenchimento-auto';
        badge.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#059669;color:#fff;padding:9px 16px;border-radius:7px;font-size:13px;z-index:9999;box-shadow:0 3px 10px rgba(0,0,0,0.18);display:flex;align-items:center;gap:7px;';
        badge.innerHTML = '<span style="font-size:15px;">✓</span> Pré-preenchido com dados do último lançamento';
        document.body.appendChild(badge);
        setTimeout(() => badge.remove(), 4000);
    }

    async loadClienteHistory(clienteId) {
        if (this.editMode) return;
        try {
            const empresa = document.getElementById('empresa')?.value;
            let url = `/api/transacoes/historico-sugestao?tipo=receita&cliente_id=${clienteId}`;
            if (empresa) url += `&empresa_id=${empresa}`;

            const response = await fetch(url, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.found && data.sugestao) {
                    console.log('📜 Histórico encontrado para cliente:', data.sugestao);
                    await this.aplicarSugestao(data.sugestao, true);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao carregar histórico do cliente:', error);
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            if (submitBtn.disabled) return;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Salvando...';
        }

        try {
            const formData = new FormData(e.target);
            const receitaData = {};

            for (const [key, value] of formData.entries()) {
                if (value !== '' && key !== 'id') {
                    receitaData[key] = value;
                }
            }

            receitaData.tipo = 'receita';
            receitaData.descricao = receitaData.titulo || receitaData.descricao || 'Receita';

            if (receitaData.valor) {
                receitaData.valor = Math.abs(this.parseCurrencyInput(receitaData.valor));
            }

            if (receitaData.data_recebimento) {
                receitaData.data_pagamento = receitaData.data_recebimento;
            }

            if (receitaData.valor_recebido) {
                receitaData.valor_recebido = Math.abs(this.parseCurrencyInput(receitaData.valor_recebido));
            } else {
                delete receitaData.valor_recebido;
            }

            const isEdit = this.editMode && this.transacaoId;
            const url = isEdit ? `/api/transacoes/${this.transacaoId}` : '/api/transacoes';
            const method = isEdit ? 'PUT' : 'POST';

            console.log(`💾 ${isEdit ? 'Atualizando' : 'Criando'} receita:`, receitaData);

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(receitaData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Receita salva com sucesso:', result);
                const msg = isEdit ? 'Receita atualizada com sucesso!' : 'Receita criada com sucesso!';
                this.showSuccess(msg);
                if (isEdit) {
                    setTimeout(() => window.history.back(), 1500);
                } else {
                    window.location.href = '/';
                }
            } else {
                let errorMsg = 'Erro ao salvar receita';
                try {
                    const errorData = await response.json();
                    console.error('❌ Erro na resposta:', errorData);
                    if (typeof errorData.detail === 'string') {
                        errorMsg = errorData.detail;
                    } else if (Array.isArray(errorData.detail)) {
                        errorMsg = errorData.detail.map(e => `${e.loc ? e.loc.join('.') : ''}: ${e.msg}`).join('; ');
                    }
                } catch (parseErr) {
                    console.error('❌ Erro ao parsear resposta:', parseErr);
                }
                this.showError(errorMsg);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = isEdit ? 'Salvar Alterações' : 'Salvar';
                }
            }

        } catch (error) {
            console.error('❌ Erro ao enviar formulário:', error);
            this.showError('Erro ao salvar receita: ' + error.message);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = this.editMode ? 'Salvar Alterações' : 'Salvar';
            }
        }
    }

    showSuccess(message) {
        // Usar sistema de notificação global se disponível
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    showError(message) {
        // Usar sistema de notificação global se disponível
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, 'error');
        } else {
            alert('Erro: ' + message);
        }
    }

    // Método para abrir modal usando sistema global
    openAddModal(modalType) {
        // Tratamento especial para subcategorias
        if (modalType === 'subcategoria_contabil' || modalType === 'subcategoria_gerencial') {
            const tipo = modalType === 'subcategoria_contabil' ? 'contabil' : 'gerencial';
            
            if (window.openModal) {
                window.onModalSuccess = (createdModalType, result) => {
                    console.log('🔄 Callback de sucesso do modal:', createdModalType, result);
                    this.refreshDropdownAfterCreate(modalType, result);
                };
                
                // Abrir modal de subcategorias com tipo pré-definido
                window.openModal('subcategorias', { tipo: tipo });
            }
            return;
        }
        
        // Mapear tipos para o sistema global
        const typeMap = {
            empresa: 'empresas',
            projeto: 'projetos',
            cliente: 'clientes',
            produto_servico: 'produtos-servicos',
            categoria_gerencial: 'categorias-gerenciais',
            categoria_contabil: 'categorias-contabeis'
        };

        const globalModalType = typeMap[modalType];
        if (!globalModalType) {
            console.error('❌ Tipo de modal não mapeado:', modalType);
            return;
        }

        // Usar sistema global de modais
        if (window.openModal) {
            // Registrar callback global para atualizar dropdown após criação
            window.onModalSuccess = (createdModalType, result) => {
                console.log('🔄 Callback de sucesso do modal:', createdModalType, result);
                this.refreshDropdownAfterCreate(modalType, result);
            };

            window.openModal(globalModalType);
        } else {
            console.error('❌ Sistema de modal global não disponível');
        }
    }

    // Callback para atualizar dropdown após criação bem-sucedida
    refreshDropdownAfterCreate(modalType, result) {
        console.log('✅ Atualizando dropdown após criação:', modalType, result);

        // Mapear tipo para o campo de dropdown correspondente
        const dropdownMap = {
            empresa: 'empresa',
            projeto: 'projeto',
            cliente: 'cliente',
            produto_servico: 'produto_servico',
            categoria_gerencial: 'categoria_gerencial',
            categoria_contabil: 'categoria_contabil'
        };

        const fieldId = dropdownMap[modalType];
        if (fieldId && result) {
            const select = document.getElementById(fieldId);
            if (select) {
                // Adicionar nova opção diretamente ao select
                const option = document.createElement('option');
                option.value = result.id;

                // Usar nome_fantasia ou nome para o texto da opção
                option.textContent = result.nome_fantasia || result.nome || result.razao_social || 'Nova Opção';
                option.selected = true;  // Selecionar automaticamente

                select.appendChild(option);

                console.log(`✅ Opção adicionada ao select ${fieldId}:`, {
                    id: result.id,
                    text: option.textContent
                });

                // Também recarregar para garantir sincronização completa
                const endpoint = this.getEndpointForModalType(modalType);
                if (endpoint) {
                    setTimeout(() => {
                        this.loadOptions(fieldId, endpoint);
                    }, 100);
                }
            }
        }
    }

    // Mapear tipo de modal para endpoint
    getEndpointForModalType(modalType) {
        const endpointMap = {
            empresa: '/api/empresas',
            projeto: '/api/projetos',
            cliente: '/api/clientes',
            produto_servico: '/api/produtos-servicos',
            categoria_gerencial: '/api/categorias-gerenciais',
            categoria_contabil: '/api/categorias-contabeis'
        };

        return endpointMap[modalType];
    }

    // Helper function to fetch data
    async fetchData(endpoint) {
        try {
            const response = await fetch(endpoint, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) {
                console.error(`Erro ao buscar dados de ${endpoint}: ${response.status}`);
                return [];
            }
            return await response.json();
        } catch (error) {
            console.error(`Erro de rede ao buscar dados de ${endpoint}:`, error);
            return [];
        }
    }

    // Helper function to populate a select element
    populateSelect(selectId, items) {
        const select = document.getElementById(selectId);
        if (!select) {
            console.warn(`⚠️ Select ${selectId} não encontrado`);
            return;
        }

        // Limpar opções existentes (exceto o "Selecione...")
        const firstOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        if (firstOption) {
            select.appendChild(firstOption);
        }

        // Adicionar novas opções
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.nome || item.name || `Item ${item.id}`;
            select.appendChild(option);
        });
        console.log(`✅ Populado select ${selectId} com ${items.length} itens.`);
    }

    // Method to load categories (now includes ensuring principals)
    async loadCategories() {
        const hasCatContabil = !!document.getElementById('categoria_contabil');
        const hasCatGerencial = !!document.getElementById('categoria_gerencial');

        if (!hasCatContabil && !hasCatGerencial) {
            console.log('⏭️ Nenhum select de categoria no DOM, pulando carregamento');
            return;
        }

        try {
            await fetch('/api/categorias-contabeis/ensure-principais', {
                method: 'POST',
                credentials: 'include'
            });

            if (hasCatContabil) {
                const allCatContabeis = await this.fetchData('/api/categorias-contabeis');
                const catContabeisPrincipais = allCatContabeis.filter(cat => cat.pai_id === null);
                this.populateSelect('categoria_contabil', catContabeisPrincipais);
            }

            if (hasCatGerencial) {
                const allCatGerenciais = await this.fetchData('/api/categorias-gerenciais');
                const catGerenciaisPrincipais = allCatGerenciais.filter(cat => cat.pai_id === null);
                this.populateSelect('categoria_gerencial', catGerenciaisPrincipais);
            }

            console.log('✅ Categorias carregadas');

        } catch (error) {
            console.error('❌ Erro ao carregar categorias:', error);
        }
    }
}

// Função global para cancelar formulário
window.cancelarFormulario = function() {
    if (confirm('Tem certeza que deseja cancelar? Todos os dados não salvos serão perdidos.')) {
        window.history.back();
    }
};

// Função global para toggle da aba de impostos
window.toggleImpostosTab = function() {
    const impostosSection = document.getElementById('impostos-section');
    const btnToggle = document.getElementById('btn-toggle-impostos');
    
    if (impostosSection && btnToggle) {
        // Verificar se está visível usando computed style
        const isVisible = window.getComputedStyle(impostosSection).display !== 'none';
        
        if (isVisible) {
            // Esconder impostos
            impostosSection.style.display = 'none';
            btnToggle.style.backgroundColor = 'transparent';
            btnToggle.style.color = '#6b7280';
        } else {
            // Mostrar impostos
            impostosSection.style.display = 'block';
            btnToggle.style.backgroundColor = '#e5e7eb';
            btnToggle.style.color = '#374151';
            
            // Calcular impostos ao abrir
            if (window.novaReceitaController) {
                window.novaReceitaController.calcularImpostos();
            }
        }
    }
};

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DEBUG: DOMContentLoaded disparado para Nova Receita');
    console.log('🔧 DEBUG: typeof NovaReceitaController:', typeof NovaReceitaController);
    console.log('🔧 DEBUG: window.novaReceitaController existe:', !!window.novaReceitaController);
    
    // Popular campo de ano com ano corrente + passados + 5 futuros
    if (window.populateYearSelect) {
        window.populateYearSelect('ano', { includePlaceholder: true });
    }
    
    // Proteção contra instanciação múltipla
    if (!window.novaReceitaController && typeof NovaReceitaController !== 'undefined') {
        console.log('✅ DEBUG: Criando nova instância do NovaReceitaController...');
        window.novaReceitaController = new NovaReceitaController();
        console.log('✅ DEBUG: NovaReceitaController criado com sucesso!');
    } else {
        console.error('❌ DEBUG: Não foi possível criar NovaReceitaController');
        console.error('❌ DEBUG: NovaReceitaController disponível:', typeof NovaReceitaController !== 'undefined');
        console.error('❌ DEBUG: window.novaReceitaController já existe:', !!window.novaReceitaController);
    }

    // Expor função openAddModal globalmente
    window.openAddModal = function(modalType) {
        console.log('🔧 DEBUG: openAddModal chamado com tipo:', modalType);
        if (window.novaReceitaController) {
            console.log('✅ DEBUG: Controller encontrado, delegando chamada...');
            return window.novaReceitaController.openAddModal(modalType);
        } else {
            console.error('❌ DEBUG: Controller não encontrado para openAddModal');
        }
    };
});

// Exportar para escopo global
window.NovaReceitaController = NovaReceitaController;

})(); // Fim do IIFE