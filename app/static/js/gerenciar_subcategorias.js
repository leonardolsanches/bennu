class GerenciarSubcategoriasController {
    constructor() {
        this.currentTab = 'contabeis';
        this.selectedItems = new Set();
        this.advancedTables = {
            contabeis: null,
            gerenciais: null
        };
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando Gerenciar Subcategorias Controller...');

        // Configurar event listeners primeiro
        this.setupEventListeners();

        // Inicializar tabelas avançadas
        this.initAdvancedTables();

        // Carregar dados iniciais
        await this.loadParentCategories();
        await this.loadSubcategories();

        console.log('✅ Gerenciar Subcategorias Controller inicializado');
    }

    initAdvancedTables() {
        // Inicializar tabela de subcategorias contábeis
        if (document.getElementById('table-subcategorias-contabeis')) {
            this.advancedTables.contabeis = new AdvancedTable('#table-subcategorias-contabeis', {
                enableResize: true,
                enableSort: true,
                enableFilter: true,
                storageKey: 'subcategorias-contabeis-table'
            });
            
            console.log('✅ Tabela avançada contábeis inicializada');
        }

        // Inicializar tabela de subcategorias gerenciais
        if (document.getElementById('table-subcategorias-gerenciais')) {
            this.advancedTables.gerenciais = new AdvancedTable('#table-subcategorias-gerenciais', {
                enableResize: true,
                enableSort: true,
                enableFilter: true,
                storageKey: 'subcategorias-gerenciais-table'
            });
            
            console.log('✅ Tabela avançada gerenciais inicializada');
        }
    }

    setupAdvancedTableOverrides(tipo) {
        const table = this.advancedTables[tipo];
        if (!table) {
            console.warn(`⚠️ Tabela ${tipo} não encontrada para aplicar overrides`);
            return;
        }

        console.log(`🔧 Aplicando overrides na tabela ${tipo}...`);

        // Sobrescrever método populateFilterOptions para usar APENAS dados locais
        table.populateFilterOptions = async (container, field) => {
            console.log(`🔍 [OVERRIDE] Populando filtro para campo "${field}" na tabela ${tipo}`);
            console.log(`📊 Dados disponíveis:`, table.data.length, 'registros');
            
            // Usar apenas dados locais, sem chamadas ao servidor
            const uniqueValues = [...new Set(
                table.data.map(row => {
                    // Acessar campo direto ou através do getFieldValue
                    const value = row[field] !== undefined ? row[field] : table.getFieldValue(row, field);
                    console.log(`  Campo "${field}" em registro ID ${row.id}:`, value);
                    return value;
                })
                .filter(val => val !== null && val !== undefined && val !== '')
            )].sort();

            console.log(`📋 Valores únicos encontrados para "${field}":`, uniqueValues);

            const currentFilter = table.filters[field] || [];

            container.innerHTML = uniqueValues.map(value => `
                <div class="filter-option">
                    <input type="checkbox" value="${value}" ${currentFilter.includes(value) ? 'checked' : ''}>
                    <span>${table.formatValue ? table.formatValue(value) : value}</span>
                </div>
            `).join('');

            console.log(`✅ Filtro "${field}": ${uniqueValues.length} opções únicas populadas nos dados locais`);
        };
        
        // Sobrescrever renderização
        const tipoSuffix = tipo === 'contabeis' ? 'contabil' : 'gerencial';
        table.renderTable = () => {
            // Aplicar filtros da AdvancedTable primeiro
            table.applyAllFilters();
            
            let filteredData = table.filteredData;
            
            // Aplicar filtro de categoria pai se selecionado
            const parentFilter = document.getElementById(`filter-categoria-pai-${tipoSuffix}`);
            if (parentFilter && parentFilter.value) {
                filteredData = filteredData.filter(item => 
                    item.pai_id != null && item.pai_id.toString() === parentFilter.value
                );
            }
            
            this.renderSubcategoriesTable(tipo, filteredData);
        };
        
        console.log(`✅ Overrides aplicados na tabela ${tipo}`);
    }

    setupEventListeners() {
        // Form de subcategoria
        const form = document.getElementById('subcategory-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Listener para campo Tipo no modal
        const tipoSelect = document.getElementById('subcategory-type');
        if (tipoSelect) {
            tipoSelect.addEventListener('change', async (e) => {
                const tipo = e.target.value;
                console.log('🔄 Tipo alterado para:', tipo);
                const categoriaPaiSelect = document.getElementById('categoria-pai');
                
                if (tipo && categoriaPaiSelect) {
                    console.log('🔄 Carregando categorias pai para tipo:', tipo);
                    categoriaPaiSelect.innerHTML = '<option value="">Carregando...</option>';
                    await this.loadParentCategoriesForModal(tipo);
                } else if (categoriaPaiSelect) {
                    // Resetar categoria pai se não há tipo selecionado
                    categoriaPaiSelect.innerHTML = '<option value="">Selecione o tipo primeiro...</option>';
                }
            });
            console.log('✅ Event listener do tipo configurado');
        } else {
            console.warn('⚠️ Select de tipo não encontrado durante setup de listeners');
        }

        // Filtros (campos de busca removidos - agora usando apenas AdvancedTable)

        const filterContabil = document.getElementById('filter-categoria-pai-contabil');
        if (filterContabil) {
            filterContabil.addEventListener('change', () => this.filterSubcategories());
        }

        const filterGerencial = document.getElementById('filter-categoria-pai-gerencial');
        if (filterGerencial) {
            filterGerencial.addEventListener('change', () => this.filterSubcategories());
        }

        // Select all checkboxes
        const selectAllContabeis = document.getElementById('select-all-contabeis');
        if (selectAllContabeis) {
            selectAllContabeis.addEventListener('change', (e) => this.handleSelectAll(e.target.checked));
        }

        const selectAllGerenciais = document.getElementById('select-all-gerenciais');
        if (selectAllGerenciais) {
            selectAllGerenciais.addEventListener('change', (e) => this.handleSelectAll(e.target.checked));
        }

        // Tabs
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.getAttribute('data-tab');
                if (tab) this.switchTab(tab);
            });
        });
    }

    switchTab(tab) {
        // Atualizar botões de tab
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
            btn.style.color = '#6b7280';
            btn.style.borderBottom = '2px solid transparent';
        });

        const activeBtn = document.querySelector(`[data-tab="${tab}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.style.color = '#3b82f6';
            activeBtn.style.borderBottom = '2px solid #3b82f6';
        }

        // Mostrar/ocultar conteúdo das tabs
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });

        const activeContent = document.getElementById(`tab-${tab}`);
        if (activeContent) {
            activeContent.style.display = 'block';
        }

        this.currentTab = tab;
        this.selectedItems.clear();
        this.updateBulkActions();
        
        // Reaplicar filtros na aba recém-ativa
        this.filterSubcategories();
    }

    async loadParentCategories() {
        try {
            // Carregar categorias contábeis principais
            const contabeis = await this.fetchData('/api/categorias-contabeis');
            const principaisContabeis = contabeis.filter(cat => cat.pai_id === null);
            this.populateSelect('filter-categoria-pai-contabil', principaisContabeis);

            // Carregar categorias gerenciais principais
            const gerenciais = await this.fetchData('/api/categorias-gerenciais');
            const principaisGerenciais = gerenciais.filter(cat => cat.pai_id === null);
            this.populateSelect('filter-categoria-pai-gerencial', principaisGerenciais);

            // Armazenar categorias para uso posterior
            this.categoriasContabeis = contabeis;
            this.categoriasGerenciais = gerenciais;

            console.log('✅ Categorias pai carregadas:', {
                contabeis: principaisContabeis.length,
                gerenciais: principaisGerenciais.length
            });
        } catch (error) {
            console.error('❌ Erro ao carregar categorias pai:', error);
        }
    }

    async loadSubcategories() {
        try {
            // Carregar subcategorias contábeis
            const contabeis = await this.fetchData('/api/categorias-contabeis');
            const subcategoriasContabeis = contabeis.filter(cat => cat.pai_id !== null);
            
            // Enriquecer dados ANTES de passar para tabela
            const enrichedContabeis = subcategoriasContabeis.map(sub => {
                const categoriaPai = contabeis.find(cat => cat.id === sub.pai_id);
                const nomeCategoriaPai = categoriaPai ? categoriaPai.nome : 'N/A';
                return {
                    ...sub,
                    categoria_pai_nome: nomeCategoriaPai,
                    tipo: 'Contábil'
                };
            });
            
            // Aplicar overrides ANTES de setar dados
            this.setupAdvancedTableOverrides('contabeis');
            
            // Passar dados enriquecidos para AdvancedTable
            if (this.advancedTables.contabeis) {
                this.advancedTables.contabeis.setData(enrichedContabeis);
            }
            
            this.renderSubcategories('contabeis', subcategoriasContabeis, contabeis);

            // Carregar subcategorias gerenciais
            const gerenciais = await this.fetchData('/api/categorias-gerenciais');
            const subcategoriasGerenciais = gerenciais.filter(cat => cat.pai_id !== null);
            
            // Enriquecer dados ANTES de passar para tabela
            const enrichedGerenciais = subcategoriasGerenciais.map(sub => {
                const categoriaPai = gerenciais.find(cat => cat.id === sub.pai_id);
                const nomeCategoriaPai = categoriaPai ? categoriaPai.nome : 'N/A';
                return {
                    ...sub,
                    categoria_pai_nome: nomeCategoriaPai,
                    tipo: 'Gerencial'
                };
            });
            
            // Aplicar overrides ANTES de setar dados
            this.setupAdvancedTableOverrides('gerenciais');
            
            // Passar dados enriquecidos para AdvancedTable
            if (this.advancedTables.gerenciais) {
                this.advancedTables.gerenciais.setData(enrichedGerenciais);
            }
            
            this.renderSubcategories('gerenciais', subcategoriasGerenciais, gerenciais);

            console.log('✅ Subcategorias carregadas e enriquecidas');
            
            // Reaplicar filtros após carregar dados
            this.filterSubcategories();
        } catch (error) {
            console.error('❌ Erro ao carregar subcategorias:', error);
            this.showError('Erro ao carregar dados: ' + error.message);
        }
    }

    renderSubcategories(tipo, subcategorias, todasCategorias) {
        const tbody = document.getElementById(`tbody-subcategorias-${tipo}`);
        if (!tbody) return;

        if (subcategorias.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">Nenhuma subcategoria encontrada</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = subcategorias.map(sub => {
            const categoriaPai = todasCategorias.find(cat => cat.id === sub.pai_id);
            const nomeCategoriaPai = categoriaPai ? categoriaPai.nome : 'N/A';
            const tipoDisplayName = tipo === 'contabeis' ? 'Contábil' : 'Gerencial';

            return `
                <tr data-id="${sub.id}" data-categoria-pai="${sub.pai_id}" data-tipo="${tipo}">
                    <td>
                        <input type="checkbox" class="row-checkbox" value="${sub.id}" 
                               onchange="window.gerenciarSubcategoriasController.handleRowSelection(this)">
                    </td>
                    <td><strong>${sub.nome}</strong></td>
                    <td>${nomeCategoriaPai}</td>
                    <td>
                        <span class="badge badge-info" style="background-color: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 4px; font-size: 11px;">
                            ${tipoDisplayName}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${sub.ativo ? 'active' : 'inactive'}">
                            ${sub.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                    </td>
                    <td>${sub.descricao || ''}</td>
                    <td class="actions-cell">
                        <button type="button" class="action-btn edit" onclick="window.gerenciarSubcategoriasController.editSubcategory(${sub.id}, '${tipo === 'contabeis' ? 'contabil' : 'gerencial'}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="action-btn delete" onclick="window.gerenciarSubcategoriasController.deleteSubcategory(${sub.id}, '${tipo === 'contabeis' ? 'contabil' : 'gerencial'}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderSubcategoriesTable(tipo, filteredData) {
        const tbody = document.getElementById(`tbody-subcategorias-${tipo}`);
        if (!tbody) return;

        if (filteredData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">Nenhuma subcategoria encontrada</td>
                </tr>
            `;
            return;
        }

        // Buscar todas as categorias para referência
        const todasCategorias = tipo === 'contabeis' ? this.categoriasContabeis : this.categoriasGerenciais;

        tbody.innerHTML = filteredData.map(sub => {
            const categoriaPai = todasCategorias.find(cat => cat.id === sub.pai_id);
            const nomeCategoriaPai = categoriaPai ? categoriaPai.nome : 'N/A';
            const tipoDisplayName = tipo === 'contabeis' ? 'Contábil' : 'Gerencial';

            return `
                <tr data-id="${sub.id}" data-categoria-pai="${sub.pai_id}" data-tipo="${tipo}">
                    <td>
                        <input type="checkbox" class="row-checkbox" value="${sub.id}" 
                               onchange="window.gerenciarSubcategoriasController.handleRowSelection(this)">
                    </td>
                    <td><strong>${sub.nome}</strong></td>
                    <td>${nomeCategoriaPai}</td>
                    <td>
                        <span class="badge badge-info" style="background-color: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 4px; font-size: 11px;">
                            ${tipoDisplayName}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${sub.ativo ? 'active' : 'inactive'}">
                            ${sub.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                    </td>
                    <td>${sub.descricao || ''}</td>
                    <td class="actions-cell">
                        <button type="button" class="action-btn edit" onclick="window.gerenciarSubcategoriasController.editSubcategory(${sub.id}, '${tipo === 'contabeis' ? 'contabil' : 'gerencial'}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="action-btn delete" onclick="window.gerenciarSubcategoriasController.deleteSubcategory(${sub.id}, '${tipo === 'contabeis' ? 'contabil' : 'gerencial'}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        try {
            const formData = new FormData(e.target);
            const subcategoryId = document.getElementById('subcategory-id').value;
            const isEdit = subcategoryId && subcategoryId.trim() !== '';

            const data = {
                nome: formData.get('nome'),
                descricao: formData.get('descricao'),
                pai_id: parseInt(formData.get('pai_id')) || null,
                ativo: document.getElementById('subcategory-ativo').checked
            };


            const tipo = document.getElementById('subcategory-type').value;
            const endpoint = tipo === 'contabil' ? '/api/categorias-contabeis' : '/api/categorias-gerenciais';

            let response;
            if (isEdit) {
                // Editar subcategoria existente
                response = await fetch(`${endpoint}/${subcategoryId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(data)
                });
            } else {
                // Criar nova subcategoria
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(data)
                });
            }

            if (response.ok) {
                this.closeSubcategoryModal();
                const message = isEdit ? 'Subcategoria atualizada com sucesso!' : 'Subcategoria criada com sucesso!';
                this.showSuccess(message);
                await this.loadSubcategories();
            } else {
                const errorData = await response.json();
                this.showError(errorData.detail || `Erro ao ${isEdit ? 'atualizar' : 'criar'} subcategoria`);
            }

        } catch (error) {
            console.error('❌ Erro ao salvar subcategoria:', error);
            this.showError('Erro ao salvar subcategoria');
        }
    }

    async editSubcategory(id, tipo) {
        try {
            console.log('📝 Editando subcategoria ID:', id, 'Tipo:', tipo);
            const endpoint = tipo === 'contabil' ? `/api/categorias-contabeis/${id}` : `/api/categorias-gerenciais/${id}`;
            console.log('🔍 Buscando em:', endpoint);
            
            const response = await fetch(endpoint, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                const subcategory = await response.json();
                console.log('✅ Subcategoria carregada:', subcategory);
                
                // Garantir que temos o tipo correto e o pai_id
                subcategory.tipo = tipo;
                
                // Garantir que pai_id está presente
                if (!subcategory.pai_id) {
                    console.warn('⚠️ Subcategoria sem pai_id:', subcategory);
                }
                
                await this.openSubcategoryModal(tipo, subcategory);
            } else {
                const errorText = await response.text();
                console.error('❌ Erro ao carregar subcategoria:', errorText);
                this.showError('Erro ao carregar dados da subcategoria');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar subcategoria:', error);
            this.showError('Erro ao carregar subcategoria');
        }
    }

    async deleteSubcategory(id, tipo) {
        if (!confirm('Tem certeza que deseja excluir esta subcategoria?')) return;

        try {
            console.log('🗑️ Excluindo subcategoria ID:', id, 'Tipo:', tipo);
            
            // Buscar a subcategoria primeiro para verificar se existe e obter dados
            const getEndpoint = tipo === 'contabil' ? `/api/categorias-contabeis/${id}` : `/api/categorias-gerenciais/${id}`;
            const getResponse = await fetch(getEndpoint, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (!getResponse.ok) {
                this.showError('Subcategoria não encontrada');
                return;
            }

            const subcategoria = await getResponse.json();
            
            // Verificar se é realmente uma subcategoria (tem pai_id)
            if (!subcategoria.pai_id) {
                this.showError('Esta é uma categoria principal, não pode ser excluída aqui');
                return;
            }

            // Agora fazer a exclusão
            const deleteEndpoint = tipo === 'contabil' ? `/api/categorias-contabeis/${id}` : `/api/categorias-gerenciais/${id}`;
            console.log('🔍 Deletando em:', deleteEndpoint);
            
            const response = await fetch(deleteEndpoint, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                this.showSuccess('Subcategoria excluída com sucesso!');
                await this.loadSubcategories();
            } else {
                const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
                console.error('❌ Erro ao excluir:', errorData);
                this.showError(errorData.detail || 'Erro ao excluir subcategoria');
            }
        } catch (error) {
            console.error('❌ Erro ao excluir subcategoria:', error);
            this.showError('Erro ao excluir subcategoria: ' + error.message);
        }
    }

    async openSubcategoryModal(tipo, subcategory = null) {
        const modal = document.getElementById('subcategory-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('subcategory-form');

        console.log('🔧 Abrindo modal de subcategoria. Tipo:', tipo, 'Subcategory:', subcategory);

        if (!modal || !title || !form) {
            console.error('❌ Elementos do modal não encontrados');
            return;
        }

        // Resetar formulário
        form.reset();

        // Configurar tipo no select
        const tipoSelect = document.getElementById('subcategory-type');
        
        if (tipoSelect) {
            tipoSelect.value = tipo;
            console.log('✅ Tipo selecionado no modal:', tipo);
            
            // Carregar categorias pai ANTES de preencher o formulário
            if (tipo) {
                console.log('🔄 Carregando categorias pai para tipo:', tipo);
                await this.loadParentCategoriesForModal(tipo);
            }
        } else {
            console.error('❌ Select de tipo não encontrado');
        }

        // Configurar dados do formulário DEPOIS de carregar categorias pai
        if (subcategory) {
            // Modo edição
            title.textContent = 'Editar Subcategoria';
            document.getElementById('subcategory-id').value = subcategory.id;
            document.getElementById('subcategory-nome').value = subcategory.nome || '';
            document.getElementById('subcategory-descricao').value = subcategory.descricao || '';
            document.getElementById('subcategory-ativo').checked = subcategory.ativo !== false;
            
            // Definir categoria pai
            const categoriaPaiSelect = document.getElementById('categoria-pai');
            if (categoriaPaiSelect && subcategory.pai_id) {
                categoriaPaiSelect.value = subcategory.pai_id;
                console.log('✅ Categoria pai selecionada para edição:', subcategory.pai_id);
            }
        } else {
            // Modo criação
            title.textContent = `Nova Subcategoria ${tipo === 'contabil' ? 'Contábil' : 'Gerencial'}`;
            document.getElementById('subcategory-id').value = '';
            document.getElementById('subcategory-ativo').checked = true;
        }

        modal.style.display = 'flex';
    }

    async loadParentCategoriesForModal(tipo) {
        try {
            console.log('🔄 Carregando categorias pai para tipo:', tipo);
            const endpoint = tipo === 'contabil' ? '/api/categorias-contabeis' : '/api/categorias-gerenciais';
            
            const select = document.getElementById('categoria-pai');
            if (!select) {
                console.error('❌ Select categoria-pai não encontrado');
                return;
            }

            // Limpar e mostrar carregando
            select.innerHTML = '<option value="">Carregando categorias...</option>';

            // Buscar categorias principais (sem pai_id)
            const response = await fetch(`${endpoint}?pai_id=`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const categorias = await response.json();
            console.log(`📊 Total de categorias pai ${tipo} encontradas:`, categorias.length);
            
            if (categorias.length === 0) {
                console.warn('⚠️ Nenhuma categoria pai encontrada para tipo:', tipo);
                
                // Se não há categorias principais, garantir que existam
                if (tipo === 'contabil') {
                    await this.ensureBasicCategories('contabil');
                    // Tentar novamente após criar categorias básicas
                    const retryResponse = await fetch(`${endpoint}?pai_id=`, {
                        credentials: 'include',
                        headers: { 'Accept': 'application/json' }
                    });
                    if (retryResponse.ok) {
                        const novasCategorias = await retryResponse.json();
                        if (novasCategorias.length > 0) {
                            this.populateParentSelect(select, novasCategorias);
                            console.log(`✅ ${novasCategorias.length} categorias pai criadas e carregadas`);
                            return;
                        }
                    }
                } else {
                    await this.ensureBasicCategories('gerencial');
                    // Tentar novamente após criar categorias básicas
                    const retryResponse = await fetch(`${endpoint}?pai_id=`, {
                        credentials: 'include',
                        headers: { 'Accept': 'application/json' }
                    });
                    if (retryResponse.ok) {
                        const novasCategorias = await retryResponse.json();
                        if (novasCategorias.length > 0) {
                            this.populateParentSelect(select, novasCategorias);
                            console.log(`✅ ${novasCategorias.length} categorias pai criadas e carregadas`);
                            return;
                        }
                    }
                }
                
                select.innerHTML = '<option value="">Nenhuma categoria pai disponível</option>';
                return;
            }

            this.populateParentSelect(select, categorias);
            console.log(`✅ ${categorias.length} categorias pai carregadas para modal tipo ${tipo}:`, categorias.map(c => c.nome));
            
        } catch (error) {
            console.error('❌ Erro ao carregar categorias pai para modal:', error);
            const select = document.getElementById('categoria-pai');
            if (select) {
                select.innerHTML = '<option value="">Erro ao carregar categorias</option>';
            }
            this.showError('Erro ao carregar categorias pai');
        }
    }

    populateParentSelect(select, categorias) {
        // Resetar com opção padrão
        select.innerHTML = '<option value="">Selecione uma categoria pai...</option>';

        // Adicionar todas as categorias principais ordenadas por nome
        categorias
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = `${cat.nome}${cat.codigo ? ` (${cat.codigo})` : ''}`;
                select.appendChild(option);
            });
    }

    async ensureBasicCategories(tipo) {
        try {
            console.log(`🔧 Garantindo categorias básicas para tipo: ${tipo}`);
            
            if (tipo === 'contabil') {
                // Garantir categorias contábeis básicas
                const response = await fetch('/api/categorias-contabeis/ensure-principais', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Categorias contábeis principais garantidas:', result.message);
                } else {
                    console.error('❌ Erro ao garantir categorias contábeis:', response.statusText);
                }
            } else {
                // Verificar se já existe alguma categoria gerencial principal
                const checkResponse = await fetch('/api/categorias-gerenciais?pai_id=', {
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                
                if (checkResponse.ok) {
                    const existingCategories = await checkResponse.json();
                    
                    if (existingCategories.length === 0) {
                        // Criar categoria gerencial básica
                        const createResponse = await fetch('/api/categorias-gerenciais', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                                nome: 'Categoria Gerencial Padrão',
                                codigo: 'GERL001',
                                descricao: 'Categoria gerencial criada automaticamente',
                                pai_id: null,
                                ativo: true
                            })
                        });
                        
                        if (createResponse.ok) {
                            const result = await createResponse.json();
                            console.log('✅ Categoria gerencial padrão criada:', result.nome);
                        } else {
                            console.error('❌ Erro ao criar categoria gerencial padrão');
                        }
                    } else {
                        console.log('ℹ️ Categorias gerenciais principais já existem');
                    }
                }
            }
        } catch (error) {
            console.error('❌ Erro ao garantir categorias básicas:', error);
        }
    }

    closeSubcategoryModal() {
        const modal = document.getElementById('subcategory-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    filterSubcategories() {
        // Agora integrado no pipeline AdvancedTable - só precisa re-renderizar
        const currentTable = this.advancedTables[this.currentTab];
        if (currentTable) {
            currentTable.renderTable();
        }
    }

    clearFilters(tipo) {
        // Limpar apenas filtro de categoria pai (busca é gerenciada pela AdvancedTable)
        // Corrigir mapeamento: contabeis -> contabil, gerenciais -> gerencial
        const filterSuffix = tipo === 'contabeis' ? 'contabil' : 'gerencial';
        const filterElement = document.getElementById(`filter-categoria-pai-${filterSuffix}`);
        if (filterElement) {
            filterElement.value = '';
        }
        this.filterSubcategories();
    }

    handleRowSelection(checkbox) {
        const id = parseInt(checkbox.value);
        if (checkbox.checked) {
            this.selectedItems.add(id);
        } else {
            this.selectedItems.delete(id);
        }

        this.updateBulkActions();
    }

    handleSelectAll(checked) {
        const checkboxes = document.querySelectorAll(`#tab-${this.currentTab} .row-checkbox`);
        checkboxes.forEach(cb => {
            cb.checked = checked;
            this.handleRowSelection(cb);
        });
    }

    updateBulkActions() {
        const bulkActions = document.querySelector('.bulk-actions');
        if (bulkActions) {
            bulkActions.style.display = this.selectedItems.size > 0 ? 'block' : 'none';
        }
    }

    async deleteSelectedSubcategories() {
        if (this.selectedItems.size === 0) return;

        if (!confirm(`Tem certeza que deseja excluir ${this.selectedItems.size} subcategoria(s)?`)) return;

        try {
            const endpoint = this.currentTab === 'contabeis' 
                ? '/api/categorias-contabeis/bulk-delete'
                : '/api/categorias-gerenciais/bulk-delete';

            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ids: Array.from(this.selectedItems) })
            });

            if (response.ok) {
                this.showSuccess('Subcategorias excluídas com sucesso!');
                this.selectedItems.clear();
                await this.loadSubcategories();
                this.updateBulkActions();
            } else {
                const errorData = await response.json();
                this.showError(errorData.detail || 'Erro ao excluir subcategorias');
            }
        } catch (error) {
            console.error('❌ Erro ao excluir subcategorias:', error);
            this.showError('Erro ao excluir subcategorias');
        }
    }

    async fetchData(endpoint) {
        const response = await fetch(endpoint, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }

    populateSelect(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Manter primeira opção
        const firstOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        if (firstOption) {
            select.appendChild(firstOption);
        }

        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.id;
            optionElement.textContent = option.nome;
            select.appendChild(optionElement);
        });
    }

    showSuccess(message) {
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, 'error');
        } else {
            alert('Erro: ' + message);
        }
    }
}

// Variáveis globais para o escopo do script
let currentSubcategoryType = 'contabil'; // Default type
let currentActiveTab = 'contabeis'; // Default active tab

// Função para abrir modal de adição de subcategoria
async function openAddSubcategoryModal(tipo) {
    console.log('🔧 openAddSubcategoryModal chamada com tipo:', tipo);
    
    const controller = window.gerenciarSubcategoriasController;
    if (controller) {
        controller.openSubcategoryModal(tipo);
    } else {
        console.error('❌ Controller gerenciarSubcategoriasController não encontrado');
        alert('Erro: Sistema não foi inicializado corretamente');
    }
}

// Função para abrir modal de edição de subcategoria
async function openEditSubcategoryModal(subcategoryId) {
    try {
        // Extrair tipo e ID real da subcategoria
        let tipo, realId;
        if (subcategoryId.toString().startsWith('contabil_')) {
            tipo = 'contabil';
            realId = subcategoryId.replace('contabil_', '');
        } else if (subcategoryId.toString().startsWith('gerencial_')) {
            tipo = 'gerencial';
            realId = subcategoryId.replace('gerencial_', '');
        } else {
            throw new Error('ID de subcategoria inválido');
        }

        currentSubcategoryType = tipo;

        // Buscar dados da subcategoria
        const endpoint = tipo === 'contabil' ? 'categorias-contabeis' : 'categorias-gerenciais';
        const response = await fetch(`/api/${endpoint}/${realId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar dados da subcategoria');
        }

        const subcategoria = await response.json();

        // Definir título do modal
        document.getElementById('modal-title').textContent = `Editar Subcategoria ${tipo === 'contabil' ? 'Contábil' : 'Gerencial'}`;

        // Carregar categorias pai primeiro
        await loadParentCategories(tipo);

        // Preencher formulário com dados da subcategoria
        document.getElementById('subcategory-id').value = realId;
        document.getElementById('subcategory-type').value = tipo;
        document.getElementById('subcategory-nome').value = subcategoria.nome || '';
        document.getElementById('subcategory-descricao').value = subcategoria.descricao || '';
        document.getElementById('categoria-pai').value = subcategoria.pai_id || '';
        document.getElementById('subcategory-ativo').checked = subcategoria.ativo !== false;

        // Mostrar modal
        document.getElementById('subcategory-modal').style.display = 'flex';

    } catch (error) {
        console.error('Erro ao carregar dados para edição:', error);
        showError('Erro ao carregar dados da subcategoria: ' + error.message);
    }
}

// Função para carregar categorias pai (usada pelo modal)
async function loadParentCategories(tipo) {
    const controller = window.gerenciarSubcategoriasController;
    if (controller) {
        await controller.loadParentCategoriesForModal(tipo);
    } else {
        console.error("Controller 'gerenciarSubcategoriasController' não encontrado.");
    }
}

// Função para fechar o modal de subcategoria
function closeSubcategoryModal() {
    const controller = window.gerenciarSubcategoriasController;
    if (controller) {
        controller.closeSubcategoryModal();
    } else {
        console.error("Controller 'gerenciarSubcategoriasController' não encontrado.");
    }
}

// Função para mostrar notificação de sucesso
function showSuccess(message) {
    const controller = window.gerenciarSubcategoriasController;
    if (controller) {
        controller.showSuccess(message);
    } else {
        alert(message);
    }
}

// Função para mostrar notificação de erro
function showError(message) {
    const controller = window.gerenciarSubcategoriasController;
    if (controller) {
        controller.showError(message);
    } else {
        alert('Erro: ' + message);
    }
}


// Funções globais para compatibilidade
window.openAddSubcategoryModal = async function(tipo) {
    currentActiveTab = tipo; // Atualiza a tab ativa
    await openAddSubcategoryModal(tipo);
}

window.switchTab = function(tipo) {
    if (window.gerenciarSubcategoriasController) {
        window.gerenciarSubcategoriasController.switchTab(tipo);
    }
}

window.closeSubcategoryModal = function() {
    if (window.gerenciarSubcategoriasController) {
        window.gerenciarSubcategoriasController.closeSubcategoryModal();
    }
}

window.clearFilters = function(tipo) {
    if (window.gerenciarSubcategoriasController) {
        window.gerenciarSubcategoriasController.clearFilters(tipo);
    }
}

window.deleteSelectedSubcategories = function() {
    if (window.gerenciarSubcategoriasController) {
        window.gerenciarSubcategoriasController.deleteSelectedSubcategories();
    }
}

// Função global para edição (chamada pelo listagem.js)
window.editItem = async function(id) {
    await openEditSubcategoryModal(id);
};

// Duplicatas removidas - funções já definidas acima

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    if (!window.gerenciarSubcategoriasController) {
        window.gerenciarSubcategoriasController = new GerenciarSubcategoriasController();
    }
});