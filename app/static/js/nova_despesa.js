// Nova Despesa - JavaScript para controle do formulário

// Usar IIFE para evitar redeclaração
(function() {
    // Se já foi definido, não redefinir
    if (window.NovaDespesaControllerDefined) {
        console.log('⚠️ NovaDespesaController já definido, ignorando redeclaração');
        return;
    }
    window.NovaDespesaControllerDefined = true;

class NovaDespesaController {
    constructor() {
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
        console.log(`🚀 Inicializando Despesa Controller (${this.editMode ? 'EDIÇÃO #' + this.transacaoId : 'CRIAÇÃO'})...`);

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

            console.log('✅ Despesa Controller inicializado com SUCESSO!');
        } catch (error) {
            console.error('❌ ERRO FATAL no Despesa Controller:', error);
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

            setVal('descricao', t.descricao || '');
            const valorEl = document.getElementById('valor');
            if (valorEl && t.valor) {
                valorEl.value = this.formatCurrencyInput(Math.abs(t.valor));
            }
            if (t.data_lancamento || t.data_emissao) setVal('data_emissao', t.data_lancamento || t.data_emissao);
            if (t.data_vencimento) setVal('data_vencimento', t.data_vencimento);
            if (t.data_pagamento) setVal('data_pagamento', t.data_pagamento);
            const valorPagoEl = document.getElementById('valor_pago');
            if (valorPagoEl && t.valor_pago != null) {
                valorPagoEl.value = this.formatCurrencyInput(Math.abs(t.valor_pago));
            }
            setVal('status', t.status || 'pendente');
            setVal('forma_pagamento', t.forma_pgto || t.forma_pagamento || '');

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
            setVal('fornecedor', t.fornecedor_id);

            // Se filho de desmembramento sem fornecedor, buscar do pai e sugerir
            if (!t.fornecedor_id && t.parent_id && t.tipo_filho === 'split') {
                try {
                    const paiRes = await fetch(`/api/transacoes/${t.parent_id}`, {
                        credentials: 'include',
                        headers: { 'Accept': 'application/json' }
                    });
                    if (paiRes.ok) {
                        const pai = await paiRes.json();
                        if (pai.fornecedor_id) {
                            setVal('fornecedor', pai.fornecedor_id);
                            const fornecedorEl = document.getElementById('fornecedor');
                            if (fornecedorEl) {
                                // Pegar o nome do fornecedor selecionado no select
                                const selectedOption = fornecedorEl.options[fornecedorEl.selectedIndex];
                                const nomeFornecedor = selectedOption && selectedOption.text !== 'Selecione...'
                                    ? selectedOption.text
                                    : `ID ${pai.fornecedor_id}`;
                                // Posicionar o hint no .form-field (pai do select-with-add), não dentro do flex row
                                const formField = fornecedorEl.closest('.form-field') || fornecedorEl.parentNode.parentNode;
                                // Remover hint anterior se existir
                                const existente = document.getElementById('fornecedor-sugestao-hint');
                                if (existente) existente.remove();
                                const hint = document.createElement('div');
                                hint.id = 'fornecedor-sugestao-hint';
                                hint.style.cssText = 'color:#92400e;background:#fef3c7;border:1px solid #f59e0b;border-radius:4px;padding:4px 8px;margin-top:4px;font-size:0.7rem;line-height:1.3;';
                                hint.innerHTML = `<i class="fas fa-info-circle" style="color:#d97706;margin-right:4px;"></i><strong>Sugestão do registro pai:</strong> ${nomeFornecedor} — confirme antes de salvar`;
                                formField.appendChild(hint);
                            }
                        }
                    }
                } catch (err) {
                    console.warn('⚠️ Não foi possível buscar fornecedor do pai:', err);
                }
            }

            setVal('cliente', t.cliente_id);
            setVal('centro_custo', t.centro_custo_id);

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

            const toggleGerencial = document.getElementById('incluir_pl_gerencial');
            const fieldsGerencial = document.getElementById('categorization-gerencial');
            if (toggleGerencial && fieldsGerencial) {
                const entraNoGerencial = t.entra_no_gerencial !== undefined ? t.entra_no_gerencial : true;
                toggleGerencial.checked = entraNoGerencial;
                fieldsGerencial.style.display = entraNoGerencial ? 'block' : 'none';
            }

            const toggleContabil = document.getElementById('incluir_pl_contabil');
            const fieldsContabil = document.getElementById('categorization-contabil');
            if (toggleContabil && fieldsContabil) {
                toggleContabil.checked = true;
                fieldsContabil.style.display = 'block';
            }

            setVal('numero_nota_fiscal', t.numero_nota_fiscal || '');
            setVal('link_nota_fiscal', t.link_nota_fiscal || '');
            setVal('link_comprovante', t.link_comprovante || '');

            const exibirCashControl = document.getElementById('exibir_no_cash_control');
            if (exibirCashControl) {
                exibirCashControl.checked = t.exibir_no_cash_control !== undefined ? t.exibir_no_cash_control : true;
            }

            console.log('✅ Formulário de edição preenchido com sucesso');
        } catch (error) {
            console.error('❌ Erro ao carregar dados da transação:', error);
            this.showError('Erro ao carregar dados da transação: ' + error.message);
        }
    }

    setDefaultValues() {
        // Data de emissão padrão (hoje)
        const now = new Date();
        const dataEmissao = document.getElementById('data_emissao');
        if (dataEmissao) {
            // Formato: YYYY-MM-DD (date input)
            const formattedDate = now.toISOString().slice(0, 10);
            dataEmissao.value = formattedDate;
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
    }

    configureCashControlToggle(userData) {
        const cashControlToggle = document.getElementById('exibir_no_cash_control');
        if (!cashControlToggle) return;

        // Verificar se é admin, Marcelo ou Carolina (por email ou nome)
        const isAdmin = userData.papel === 'admin';
        const isMarcelo = userData.email?.toLowerCase().includes('marcelo') || 
                          userData.name?.toLowerCase().includes('marcelo');
        const isCarolina = userData.email?.toLowerCase().includes('carolina') || 
                           userData.name?.toLowerCase().includes('carolina');

        if (isAdmin || isMarcelo || isCarolina) {
            cashControlToggle.disabled = false;
            console.log('✅ Cash Control toggle habilitado para:', userData.name || userData.email);
        } else {
            cashControlToggle.disabled = true;
            cashControlToggle.checked = true;
            console.log('🔒 Cash Control toggle desabilitado para:', userData.name || userData.email);
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

            // Verificar se o usuário pode alterar o toggle Cash Control
            // Apenas admin e Marcelo podem desmarcar
            this.configureCashControlToggle(userData);

            // Carregar empresas
            await this.loadOptions('empresa', '/api/empresas');

            // Carregar clientes
            await this.loadOptions('cliente', '/api/clientes');

            // Carregar fornecedores
            await this.loadOptions('fornecedor', '/api/fornecedores');

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

    setupEventListeners() {
        // Toggle Categorização Gerencial
        const toggleGerencial = document.getElementById('incluir_pl_gerencial');
        if (toggleGerencial) {
            toggleGerencial.addEventListener('change', () => {
                this.toggleCategorization('gerencial', toggleGerencial.checked);
            });
            // Sincronizar estado inicial
            this.toggleCategorization('gerencial', toggleGerencial.checked);
        }

        // Toggle Categorização Contábil
        const toggleContabil = document.getElementById('incluir_pl_contabil');
        if (toggleContabil) {
            toggleContabil.addEventListener('change', () => {
                this.toggleCategorization('contabil', toggleContabil.checked);
            });
            // Sincronizar estado inicial
            this.toggleCategorization('contabil', toggleContabil.checked);
        }

        const dataPagamento = document.getElementById('data_pagamento');
        if (dataPagamento) {
            dataPagamento.addEventListener('change', () => {
                const valorPagoEl = document.getElementById('valor_pago');
                if (dataPagamento.value && valorPagoEl && !valorPagoEl.value) {
                    const valorEl = document.getElementById('valor');
                    if (valorEl && valorEl.value) {
                        valorPagoEl.value = valorEl.value;
                    }
                }
            });
        }

        const valorPagoInput = document.getElementById('valor_pago');
        if (valorPagoInput) {
            valorPagoInput.addEventListener('blur', () => {
                if (valorPagoInput.value) {
                    const parsed = this.parseCurrencyInput(valorPagoInput.value);
                    valorPagoInput.value = this.formatCurrencyInput(Math.abs(parsed));
                }
            });
            valorPagoInput.addEventListener('focus', () => {
                if (valorPagoInput.value) {
                    const parsed = this.parseCurrencyInput(valorPagoInput.value);
                    valorPagoInput.value = parsed ? Math.abs(parsed).toString() : '';
                }
            });
        }

        // Formulário principal
        const form = document.getElementById('nova-despesa-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Modal usa sistema global de modals.js via onsubmit="submitForm(event)" no HTML

        // Máscara de moeda no campo valor
        this.setupCurrencyMask();

        // Categoria pai para subcategorias
        this.setupCategoryDependencies();

        // Toggle Retenção na Fonte
        this.setupRetencaoListeners();
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
        // Quando categoria gerencial muda, atualizar subcategorias
        const catGerencial = document.getElementById('categoria_gerencial');
        if (catGerencial) {
            catGerencial.addEventListener('change', () => {
                this.loadSubcategories('subcategoria_gerencial', catGerencial.value, 'gerencial');
            });
        }

        // Quando centro de custo muda, buscar sugestão de histórico
        const centroCusto = document.getElementById('centro_custo');
        if (centroCusto) {
            centroCusto.addEventListener('change', () => {
                if (centroCusto.value) {
                    this.loadHistoricoSugestao();
                }
            });
        }

        // Quando categoria contábil muda, atualizar subcategorias contábeis e buscar sugestão
        const catContabil = document.getElementById('categoria_contabil');
        if (catContabil) {
            catContabil.addEventListener('change', () => {
                this.loadSubcategories('subcategoria_contabil', catContabil.value, 'contabil');
                if (catContabil.value) {
                    this.loadHistoricoSugestao();
                }
            });
        }

        // Quando categoria gerencial muda, buscar sugestão
        const catGerencialListener = document.getElementById('categoria_gerencial');
        if (catGerencialListener) {
            const originalHandler = catGerencialListener.onchange;
            catGerencialListener.addEventListener('change', () => {
                if (catGerencialListener.value) {
                    setTimeout(() => this.loadHistoricoSugestao(), 400);
                }
            });
        }

        // Quando fornecedor muda, carregar histórico do último lançamento
        const fornecedor = document.getElementById('fornecedor');
        if (fornecedor) {
            fornecedor.addEventListener('change', () => {
                if (fornecedor.value) {
                    this.loadFornecedorHistory(fornecedor.value);
                }
            });
        }

        // Quando empresa muda, buscar sugestão baseada na seleção
        const empresa = document.getElementById('empresa');
        if (empresa) {
            empresa.addEventListener('change', () => {
                if (empresa.value) {
                    this.loadHistoricoSugestao();
                }
            });
        }
    }

    async loadHistoricoSugestao() {
        try {
            const empresa = document.getElementById('empresa')?.value;
            const fornecedor = document.getElementById('fornecedor')?.value;
            const centroCusto = document.getElementById('centro_custo')?.value;
            const catGerencial = document.getElementById('categoria_gerencial')?.value;
            const catContabil = document.getElementById('categoria_contabil')?.value;

            let url = '/api/transacoes/historico-sugestao?tipo=despesa';
            if (empresa) url += `&empresa_id=${empresa}`;
            if (fornecedor) url += `&fornecedor_id=${fornecedor}`;
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

    async loadFornecedorHistory(fornecedorId) {
        if (this.editMode) return;
        try {
            const empresa = document.getElementById('empresa')?.value;
            let url = `/api/transacoes/historico-sugestao?tipo=despesa&fornecedor_id=${fornecedorId}`;
            if (empresa) url += `&empresa_id=${empresa}`;

            const response = await fetch(url, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.found && data.sugestao) {
                    console.log('📜 Histórico encontrado para fornecedor:', data.sugestao);
                    await this.aplicarSugestao(data.sugestao, true);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao carregar histórico do fornecedor:', error);
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

    // =========================================================================
    // RETENÇÃO NA FONTE - Setup e Lógica (Múltiplos Impostos)
    // =========================================================================

    setupRetencaoListeners() {
        this.impostosAdicionados = [];
        this.impostoCounter = 0;

        const toggleRetencao = document.getElementById('tem_retencao');
        const retencaoFields = document.getElementById('retencao-fields');
        const btnAdicionar = document.getElementById('btn-adicionar-imposto');
        const valorInput = document.getElementById('valor');

        if (toggleRetencao && retencaoFields) {
            toggleRetencao.addEventListener('change', () => {
                retencaoFields.style.display = toggleRetencao.checked ? 'block' : 'none';
                if (toggleRetencao.checked && this.impostosAdicionados.length === 0) {
                    this.adicionarImposto();
                }
            });
        }

        if (btnAdicionar) {
            btnAdicionar.addEventListener('click', () => this.adicionarImposto());
        }

        if (valorInput) {
            valorInput.addEventListener('input', () => {
                if (document.getElementById('tem_retencao')?.checked) {
                    this.recalcularTodosImpostos();
                }
            });
        }
    }

    adicionarImposto() {
        const lista = document.getElementById('impostos-lista');
        if (!lista) return;

        const idx = this.impostoCounter++;
        const impostoItem = {
            idx,
            imposto_nome: '',
            valor_retido: 0
        };
        this.impostosAdicionados.push(impostoItem);

        const card = document.createElement('div');
        card.id = `imposto-card-${idx}`;
        card.className = 'imposto-card';
        card.style.cssText = 'padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; background: #f9fafb; position: relative;';

        card.innerHTML = `
            <button type="button" class="btn-remove-imposto" data-idx="${idx}" style="position: absolute; top: 8px; right: 8px; background: none; border: none; cursor: pointer; color: #dc2626; font-size: 18px;" title="Remover imposto">&times;</button>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-field">
                    <label class="form-label required">Imposto</label>
                    <select id="imposto-nome-${idx}" class="form-select imposto-nome-select" data-idx="${idx}">
                        <option value="">Selecione...</option>
                        <option value="ISS">ISS - Imposto Sobre Serviços</option>
                        <option value="IRRF">IRRF - Imposto de Renda Retido na Fonte</option>
                        <option value="PIS">PIS - Programa de Integração Social</option>
                        <option value="COFINS">COFINS - Contribuição para Financiamento da Seguridade Social</option>
                        <option value="CSLL">CSLL - Contribuição Social sobre o Lucro Líquido</option>
                        <option value="INSS">INSS - Instituto Nacional do Seguro Social</option>
                        <option value="IRPJ">IRPJ - Imposto de Renda Pessoa Jurídica</option>
                        <option value="OUTRO">Outro</option>
                    </select>
                </div>
                <div class="form-field">
                    <label class="form-label required">Valor Retido (R$)</label>
                    <div class="currency-input">
                        <span class="currency-symbol">R$</span>
                        <input type="number" id="valor-retido-${idx}" class="form-input currency valor-retido-input" data-idx="${idx}" step="0.01" min="0" placeholder="0,00">
                    </div>
                </div>
            </div>
            <div class="form-field imposto-outro-container" id="imposto-outro-container-${idx}" style="display: none; margin-top: 12px;">
                <label class="form-label">Nome do Imposto</label>
                <input type="text" id="imposto-outro-${idx}" class="form-input imposto-outro-input" data-idx="${idx}" placeholder="Digite o nome do imposto (opcional - padrão: OUTROS)..." style="text-transform: uppercase;">
            </div>
        `;

        lista.appendChild(card);

        card.querySelector('.btn-remove-imposto').addEventListener('click', () => this.removerImposto(idx));
        card.querySelector('.imposto-nome-select').addEventListener('change', (e) => this.onImpostoSelectChanged(idx, e.target));
        card.querySelector('.valor-retido-input').addEventListener('input', (e) => this.onValorRetidoChanged(idx, e.target));
        
        const outroInput = card.querySelector('.imposto-outro-input');
        if (outroInput) {
            outroInput.addEventListener('input', (e) => this.onImpostoOutroChanged(idx, e.target));
        }
    }

    removerImposto(idx) {
        const card = document.getElementById(`imposto-card-${idx}`);
        if (card) card.remove();

        this.impostosAdicionados = this.impostosAdicionados.filter(i => i.idx !== idx);
        this.updateRetencaoPreview();
    }

    onImpostoSelectChanged(idx, selectEl) {
        const item = this.impostosAdicionados.find(i => i.idx === idx);
        if (!item) return;
        
        const outroContainer = document.getElementById(`imposto-outro-container-${idx}`);
        
        if (selectEl.value === 'OUTRO') {
            if (outroContainer) outroContainer.style.display = 'block';
            item.imposto_nome = 'OUTROS';
        } else {
            if (outroContainer) outroContainer.style.display = 'none';
            item.imposto_nome = selectEl.value;
        }
        this.updateRetencaoPreview();
    }

    onImpostoOutroChanged(idx, inputEl) {
        const item = this.impostosAdicionados.find(i => i.idx === idx);
        if (!item) return;
        const nomeDigitado = inputEl.value.toUpperCase().trim();
        item.imposto_nome = nomeDigitado || 'OUTROS';
        this.updateRetencaoPreview();
    }

    onValorRetidoChanged(idx, inputEl) {
        const item = this.impostosAdicionados.find(i => i.idx === idx);
        if (!item) return;
        item.valor_retido = parseFloat(inputEl.value) || 0;
        this.updateRetencaoPreview();
    }

    recalcularTodosImpostos() {
        this.updateRetencaoPreview();
    }

    updateRetencaoPreview() {
        const previewContainer = document.getElementById('retencao-preview');
        const previewImpostosLista = document.getElementById('preview-impostos-lista');
        const previewValorBruto = document.getElementById('preview-valor-bruto');
        const previewTotalRetido = document.getElementById('preview-total-retido');
        const previewValorFornecedor = document.getElementById('preview-valor-fornecedor');

        const valorBruto = this.parseCurrencyInput(document.getElementById('valor')?.value || '0');
        const formatCurrency = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const impostosValidos = this.impostosAdicionados.filter(i => i.imposto_nome && i.imposto_nome.length > 0);
        
        if (impostosValidos.length === 0) {
            if (previewContainer) previewContainer.style.display = 'none';
            return;
        }

        if (previewContainer) previewContainer.style.display = 'block';
        if (previewValorBruto) previewValorBruto.textContent = formatCurrency(valorBruto);

        let totalRetido = 0;
        let listaHtml = '';

        impostosValidos.forEach((item, index) => {
            const valorRetidoInput = document.getElementById(`valor-retido-${item.idx}`);
            const valorRetido = parseFloat(valorRetidoInput?.value) || 0;
            item.valor_retido = valorRetido;
            totalRetido += valorRetido;

            listaHtml += `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #fcd34d;">
                    <span>${index + 1}. Retenção ${item.imposto_nome}</span>
                    <span style="color: #dc2626; font-weight: 500;">- ${formatCurrency(valorRetido)}</span>
                </div>
            `;
        });

        if (previewImpostosLista) previewImpostosLista.innerHTML = listaHtml;
        if (previewTotalRetido) previewTotalRetido.textContent = formatCurrency(totalRetido);
        if (previewValorFornecedor) previewValorFornecedor.textContent = formatCurrency(Math.max(0, valorBruto - totalRetido));
    }

    getImpostosParaEnvio() {
        return this.impostosAdicionados
            .filter(i => i.imposto_nome && i.imposto_nome.length > 0 && i.valor_retido > 0)
            .map(i => ({
                imposto_nome: i.imposto_nome,
                valor_retido: i.valor_retido
            }));
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
            const despesaData = {};

            for (const [key, value] of formData.entries()) {
                if (value !== '' && key !== 'id') {
                    despesaData[key] = value;
                }
            }

            despesaData.tipo = 'despesa';
            despesaData.descricao = despesaData.titulo || despesaData.descricao || 'Despesa';

            const cashControlToggle = document.getElementById('exibir_no_cash_control');
            despesaData.exibir_no_cash_control = cashControlToggle ? cashControlToggle.checked : true;

            const incluirGerencial = document.getElementById('incluir_pl_gerencial');
            despesaData.entra_no_gerencial = incluirGerencial ? incluirGerencial.checked : true;

            if (despesaData.valor) {
                despesaData.valor = -Math.abs(this.parseCurrencyInput(despesaData.valor));
            }

            if (despesaData.valor_pago) {
                despesaData.valor_pago = Math.abs(this.parseCurrencyInput(despesaData.valor_pago));
            } else {
                delete despesaData.valor_pago;
            }

            if (despesaData.data_emissao) {
                despesaData.data_lancamento = despesaData.data_emissao;
            }

            if (despesaData.forma_pagamento) {
                despesaData.forma_pagamento = mapFormaPagamento(despesaData.forma_pagamento);
            }

            const temRetencao = document.getElementById('tem_retencao')?.checked;
            if (temRetencao) {
                const impostos = this.getImpostosParaEnvio();
                if (impostos.length === 0) {
                    this.showError('Para aplicar retenção, selecione pelo menos um imposto com valor retido.');
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = this.editMode ? 'Salvar Alterações' : 'Salvar'; }
                    return;
                }
                despesaData.retencao = { impostos };
            }

            const isEdit = this.editMode && this.transacaoId;
            const url = isEdit ? `/api/transacoes/${this.transacaoId}` : '/api/transacoes';
            const method = isEdit ? 'PUT' : 'POST';

            console.log(`💾 ${isEdit ? 'Atualizando' : 'Criando'} despesa:`, despesaData);

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(despesaData)
            });

            if (response.ok) {
                let msgSucesso;
                if (isEdit) {
                    msgSucesso = 'Despesa atualizada com sucesso!';
                } else {
                    const numImpostos = temRetencao ? this.getImpostosParaEnvio().length : 0;
                    msgSucesso = temRetencao
                        ? `Despesa criada com sucesso! Foram gerados ${numImpostos + 1} registros: pagamento ao fornecedor e ${numImpostos} retenção(ões) de imposto.`
                        : 'Despesa criada com sucesso!';
                }
                this.showSuccess(msgSucesso);
                if (isEdit) {
                    setTimeout(() => window.history.back(), 1500);
                } else {
                    setTimeout(() => { window.location.href = '/'; }, temRetencao ? 2500 : 1500);
                }
            } else {
                let errorMsg = 'Erro ao salvar despesa';
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
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = isEdit ? 'Salvar Alterações' : 'Salvar'; }
            }

        } catch (error) {
            console.error('❌ Erro ao enviar formulário:', error);
            this.showError('Erro ao salvar despesa: ' + error.message);
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = this.editMode ? 'Salvar Alterações' : 'Salvar'; }
        }
    }

    // addOptionToSelect removido - usa sistema global de modals.js

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
        // Tratamento especial para subcategorias contábeis
        if (modalType === 'subcategoria_contabil') {
            if (window.openModal) {
                window.onModalSuccess = (createdModalType, result) => {
                    console.log('🔄 Callback subcategoria_contabil:', createdModalType, result);
                    const catSelect = document.getElementById('categoria_contabil_id');
                    const catId = catSelect ? catSelect.value : null;
                    if (catId) {
                        this.loadSubcategories('subcategoria_contabil', catId, 'contabil').then(() => {
                            const sub = document.getElementById('subcategoria_contabil');
                            if (sub && result && result.id) sub.value = result.id;
                        });
                    }
                };
                window.openModal('subcategorias', { tipo: 'contabil' });
            }
            return;
        }

        // Tratamento especial para subcategorias gerenciais
        if (modalType === 'subcategoria_gerencial') {
            if (window.openModal) {
                window.onModalSuccess = (createdModalType, result) => {
                    console.log('🔄 Callback de sucesso do modal:', createdModalType, result);
                    const catSelect = document.getElementById('categoria_gerencial_id');
                    const catId = catSelect ? catSelect.value : null;
                    if (catId) {
                        this.loadSubcategories('subcategoria_gerencial', catId, 'gerencial').then(() => {
                            const sub = document.getElementById('subcategoria_gerencial');
                            if (sub && result && result.id) sub.value = result.id;
                        });
                    }
                };
                
                // Abrir modal de subcategorias com tipo pré-definido
                window.openModal('subcategorias', { tipo: 'gerencial' });
            }
            return;
        }
        
        // Mapear tipos para o sistema global
        const typeMap = {
            empresa: 'empresas',
            cliente: 'clientes',
            fornecedor: 'fornecedores',
            centro_custo: 'centros-custo',
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
            empresa: 'empresa',  // ID real do select no HTML
            cliente: 'cliente',
            fornecedor: 'fornecedor_id',
            centro_custo: 'centro_custo',
            categoria_gerencial: 'categoria_gerencial_id',
            categoria_contabil: 'categoria_contabil_id'
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
            cliente: '/api/clientes',
            fornecedor: '/api/fornecedores',
            centro_custo: '/api/centros-custo',
            categoria_gerencial: '/api/categorias-gerenciais',
            categoria_contabil: '/api/categorias-contabeis'
        };

        return endpointMap[modalType];
    }

    // Método para buscar dados, usado internamente pela classe
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
            console.error(`Erro na requisição para ${endpoint}:`, error);
            return [];
        }
    }

    // Método para popular um select com opções
    populateSelect(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) {
            console.warn(`⚠️ Select ${selectId} não encontrado para popular`);
            return;
        }

        // Limpar opções existentes (exceto o "Selecione...")
        const firstOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        if (firstOption) {
            select.appendChild(firstOption);
        }

        // Adicionar novas opções
        const items = Array.isArray(options) ? options : (options.items || []);
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.nome || item.name || item.razao_social || `Item ${item.id}`;
            select.appendChild(option);
        });
        console.log(`✅ Populadas ${items.length} opções para ${selectId}`);
    }

    // Método atualizado para carregar categorias contábeis e gerenciais
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

// Exportar para escopo global
window.NovaDespesaController = NovaDespesaController;

})(); // Fim do IIFE

// 🔧 CORREÇÃO: Função para validar forma de pagamento
function mapFormaPagamento(formValue) {
    // Mapeamento completo de valores do formulário para enum válido
    const mapeamento = {
        'transferencia': 'transferencia',
        'transferencia_bancaria': 'transferencia',
        'cartao': 'cartao',
        'cartao_credito': 'cartao',
        'debito': 'debito',
        'cartao_debito': 'debito',
        'dinheiro': 'dinheiro',
        'pix': 'pix',
        'boleto': 'boleto',
        'cheque': 'outros',
        'outros': 'outros'
    };

    // Retornar valor mapeado ou 'outros' como fallback
    const valorMapeado = mapeamento[formValue] || 'outros';

    if (!mapeamento[formValue] && formValue) {
        console.warn(`⚠️ Valor de forma_pagamento não reconhecido: "${formValue}", usando "outros" como fallback`);
    }

    return valorMapeado;
}

// Função global para cancelar formulário
window.cancelarFormulario = function() {
    if (confirm('Tem certeza que deseja cancelar? Todos os dados não salvos serão perdidos.')) {
        window.history.back();
    }
};

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DEBUG: DOMContentLoaded disparado para Nova Despesa');
    console.log('🔧 DEBUG: window.NovaDespesaController existe:', !!window.NovaDespesaController);
    console.log('🔧 DEBUG: window.novaDespesaController existe:', !!window.novaDespesaController);

    // Popular campo de ano com ano corrente + passados + 5 futuros
    if (window.populateYearSelect) {
        window.populateYearSelect('ano', { includePlaceholder: true });
    }

    // Proteção contra instanciação múltipla
    if (!window.novaDespesaController && window.NovaDespesaController) {
        console.log('✅ DEBUG: Criando nova instância do NovaDespesaController...');
        window.novaDespesaController = new window.NovaDespesaController();
        console.log('✅ DEBUG: NovaDespesaController criado com sucesso!');
    } else if (window.novaDespesaController) {
        console.log('⚠️ DEBUG: novaDespesaController já existe, reutilizando');
    } else {
        console.error('❌ DEBUG: Não foi possível criar NovaDespesaController - classe não disponível');
    }

    // Expor função openAddModal globalmente
    window.openAddModal = function(modalType) {
        console.log('🔧 DEBUG: openAddModal chamado com tipo:', modalType);
        if (window.novaDespesaController) {
            console.log('✅ DEBUG: Controller encontrado, delegando chamada...');
            return window.novaDespesaController.openAddModal(modalType);
        } else {
            // Fallback: tentar abrir modal diretamente se o sistema global estiver disponível
            console.log('⚠️ DEBUG: Tentando fallback para openModal global...');
            if (window.openModal) {
                // Subcategorias contábeis e gerenciais precisam de tipo explícito
                if (modalType === 'subcategoria_contabil') {
                    window.openModal('subcategorias', { tipo: 'contabil' });
                    return;
                }
                if (modalType === 'subcategoria_gerencial') {
                    window.openModal('subcategorias', { tipo: 'gerencial' });
                    return;
                }
                const typeMap = {
                    empresa: 'empresas',
                    cliente: 'clientes',
                    fornecedor: 'fornecedores',
                    centro_custo: 'centros-custo',
                    categoria_gerencial: 'categorias-gerenciais',
                    categoria_contabil: 'categorias-contabeis'
                };
                const globalType = typeMap[modalType];
                if (globalType) {
                    window.openModal(globalType);
                    return;
                }
            }
            console.error('❌ DEBUG: Nenhum método de modal disponível para tipo:', modalType);
        }
    };
});