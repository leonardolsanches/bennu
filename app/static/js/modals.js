// Bennu Finance - Sistema de Modais para Cadastros Auxiliares

// Configurações dos modais (verificar se já existe para evitar conflitos)
if (typeof window.MODAL_CONFIGS === 'undefined') {
    window.MODAL_CONFIGS = {
    'empresas': {
        title: 'Cadastro de Empresas',
        endpoint: '/api/empresas',
        fields: [
            { name: 'nome_fantasia', label: 'Nome Fantasia', type: 'text', required: true },
            { name: 'razao_social', label: 'Razão Social', type: 'text' },
            { name: 'impostos', label: 'Impostos Associados', type: 'multiselect', options: [] },
            { name: 'ativo', label: 'Ativo', type: 'checkbox', defaultValue: true }
        ]
    },
    'clientes': {
        title: 'Cadastro de Clientes',
        endpoint: '/api/clientes',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'documento', label: 'CPF/CNPJ', type: 'text' },
            { name: 'status', label: 'Status', type: 'select', options: [
                { value: 'ativo', label: 'Ativo' },
                { value: 'inativo', label: 'Inativo' }
            ], defaultValue: 'ativo' }
        ]
    },
    'fornecedores': {
        title: 'Cadastro de Fornecedores',
        endpoint: '/api/fornecedores',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'documento', label: 'CPF/CNPJ', type: 'text' },
            { name: 'tipo_pessoa', label: 'Tipo de Pessoa', type: 'select', options: [
                { value: 'fisica', label: 'Pessoa Física' },
                { value: 'juridica', label: 'Pessoa Jurídica' }
            ] },
            { name: 'email', label: 'E-mail', type: 'email' },
            { name: 'telefone', label: 'Telefone', type: 'tel' },
            { name: 'endereco', label: 'Endereço', type: 'text' },
            { name: 'observacoes', label: 'Observações', type: 'textarea' },
            { name: 'ativo', label: 'Ativo', type: 'checkbox', defaultValue: true }
        ]
    },
    'projetos': {
        title: 'Cadastro de Projetos',
        endpoint: '/api/projetos',
        fields: [
            { name: 'nome', label: 'Nome do Projeto', type: 'text', required: true },
            { name: 'clientes', label: 'Clientes Associados', type: 'multiselect', options: [], required: true },
            { name: 'ativo', label: 'Ativo', type: 'checkbox', defaultValue: true }
        ]
    },
    'produtos-servicos': {
        title: 'Cadastro de Serviços',
        endpoint: '/api/produtos-servicos',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'clientes', label: 'Clientes Associados', type: 'multiselect', options: [], required: true },
            { name: 'ativo', label: 'Ativo', type: 'checkbox', defaultValue: true }
        ]
    },
    'categorias-contabeis': {
        title: 'Cadastro de Categorias Contábeis',
        endpoint: '/api/categorias-contabeis',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'descricao', label: 'Descrição', type: 'textarea' },
            { name: 'ativo', label: 'Ativo', type: 'checkbox', defaultValue: true }
        ]
    },
    'categorias-gerenciais': {
        title: 'Cadastro de Categorias Gerenciais',
        endpoint: '/api/categorias-gerenciais',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'descricao', label: 'Descrição', type: 'textarea' },
            { name: 'ativo', label: 'Ativo', type: 'checkbox', defaultValue: true }
        ]
    },
    'contas-contabeis': {
        title: 'Cadastro de Contas Contábeis',
        endpoint: '/api/contas-contabeis',
        fields: [
            { name: 'codigo', label: 'Código', type: 'text', required: true },
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'tipo', label: 'Tipo', type: 'select', options: [
                { value: 'ativo', label: 'Ativo' },
                { value: 'passivo', label: 'Passivo' },
                { value: 'receita', label: 'Receita' },
                { value: 'despesa', label: 'Despesa' }
            ] },
            { name: 'nivel', label: 'Nível', type: 'number' },
            { name: 'aceita_lancamento', label: 'Aceita Lançamento', type: 'checkbox', defaultValue: true },
            { name: 'ativo', label: 'Ativo', type: 'checkbox', defaultValue: true }
        ]
    },
    'centros-custo': {
        title: 'Cadastro de Centros de Custo',
        endpoint: '/api/centros-custo',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'ativo', label: 'Ativo', type: 'checkbox', defaultValue: true }
        ]
    },
    'contas-bancarias': {
        title: 'Cadastro de Contas Bancárias',
        endpoint: '/api/contas-bancarias',
        fields: [
            { name: 'banco', label: 'Banco', type: 'text', required: true },
            { name: 'codigo_banco', label: 'Código do Banco', type: 'text' },
            { name: 'agencia', label: 'Agência', type: 'text', required: true },
            { name: 'conta', label: 'Conta', type: 'text', required: true },
            { name: 'digito', label: 'Dígito', type: 'text' },
            { name: 'tipo', label: 'Tipo', type: 'select', options: [
                { value: 'corrente', label: 'Conta Corrente' },
                { value: 'poupanca', label: 'Poupança' }
            ] },
            { name: 'saldo_inicial', label: 'Saldo Inicial', type: 'number', step: '0.01' },
            { name: 'ativa', label: 'Ativa', type: 'checkbox', defaultValue: true }
        ]
    },
    'impostos': {
        title: 'Cadastro de Impostos',
        endpoint: '/api/impostos',
        fields: [
            { name: 'empresa_id', label: 'Empresa', type: 'select', options: [], required: true },
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'tipo', label: 'Tipo de Cálculo', type: 'select', options: [
                { value: 'percentual', label: 'Percentual (%)' },
                { value: 'fixo', label: 'Valor Fixo (R$)' }
            ], required: true },
            { name: 'valor', label: 'Valor', type: 'text', inputMode: 'decimal', required: true },
            { name: 'ativo', label: 'Ativo', type: 'checkbox', defaultValue: true }
        ]
    },
    'cartoes-credito': {
        title: 'Cadastro de Cartões de Crédito',
        endpoint: '/api/cartoes-credito',
        fields: [
            { name: 'nome', label: 'Nome/Descrição', type: 'text', required: true },
            { name: 'bandeira', label: 'Bandeira', type: 'select', options: [
                { value: 'visa', label: 'Visa' },
                { value: 'mastercard', label: 'Mastercard' },
                { value: 'elo', label: 'Elo' },
                { value: 'american-express', label: 'American Express' }
            ] },
            { name: 'banco', label: 'Banco', type: 'text' },
            { name: 'limite', label: 'Limite', type: 'number', step: '0.01' },
            { name: 'dia_vencimento', label: 'Dia do Vencimento', type: 'number', min: '1', max: '31' },
            { name: 'dia_fechamento', label: 'Dia do Fechamento', type: 'number', min: '1', max: '31' },
            { name: 'ultimos_4_digitos', label: 'Últimos 4 Dígitos', type: 'text', maxlength: '4' },
            { name: 'ativo', label: 'Ativo', type: 'checkbox', defaultValue: true }
        ]
    },
    'subcategorias': {
        title: 'Cadastro de Subcategorias',
        endpoint: '/api/subcategorias',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'tipo', label: 'Tipo', type: 'select', options: [
                { value: 'contabil', label: 'Contábil' },
                { value: 'gerencial', label: 'Gerencial' }
            ], required: true },
            { name: 'pai_id', label: 'Categoria Pai', type: 'select', options: [], required: true },
            { name: 'descricao', label: 'Descrição', type: 'textarea' },
            { name: 'ativo', label: 'Ativo', type: 'checkbox', defaultValue: true }
        ]
    }
};
}

// Variáveis globais
if (typeof window.currentModalType === 'undefined') {
    window.currentModalType = null;
}
if (typeof window.currentModalData === 'undefined') {
    window.currentModalData = null;
}

// Função para abrir modal
async function openModal(type, data = null) {
    console.log('🚀 Abrindo modal tipo:', type, 'com dados:', data);

    window.currentModalType = type;
    window.currentModalData = data;

    const config = window.MODAL_CONFIGS[type];
    if (!config) {
        console.error('❌ Tipo de modal não encontrado:', type);
        alert(`Erro: Configuração não encontrada para ${type}`);
        return;
    }

    console.log('📋 Configuração do modal encontrada:', config);

    // Verificar se elementos do modal existem
    const modalTitle = document.getElementById('modal-title');
    const formFields = document.getElementById('form-fields');
    const overlay = document.getElementById('modal-overlay');

    if (!modalTitle || !formFields || !overlay) {
        console.error('❌ Elementos do modal não encontrados no DOM');
        alert('Erro: Elementos do modal não encontrados');
        return;
    }

    // Atualizar título
    modalTitle.textContent = config.title;

    // Container principal do modal
    formFields.innerHTML = '<div class="loading">🔄 Carregando...</div>';

    // Mostrar modal enquanto carrega
    overlay.classList.add('show');

    try {
        // Recarregar clientes para multiselect se for projeto ou produto/serviço
        if (type === 'projetos' || type === 'produtos-servicos') {
            try {
                const response = await fetch('/api/clientes', { credentials: 'include' });
                if (response.ok) {
                    const clientes = await response.json();
                    const clientesField = config.fields.find(f => f.name === 'clientes');
                    if (clientesField) {
                        clientesField.options = clientes.map(c => ({
                            value: c.id,
                            label: c.nome || `Cliente ${c.id}`
                        }));
                        console.log(`✅ ${clientes.length} clientes carregados para ${type}`);
                    }
                }
            } catch (error) {
                console.error('❌ Erro ao carregar clientes:', error);
            }
        }

        // Se for subcategorias e tiver tipo definido nos dados, carregar opções de pai ANTES de gerar campos
        if (type === 'subcategorias' && data && data.tipo) {
            const paiField = config.fields.find(f => f.name === 'pai_id');
            if (paiField) {
                try {
                    const endpoint = data.tipo === 'contabil' ? '/api/categorias-contabeis' : '/api/categorias-gerenciais';
                    const response = await fetch(endpoint, { credentials: 'include' });
                    if (response.ok) {
                        const categorias = await response.json();
                        paiField.options = categorias
                            .filter(cat => !cat.pai_id)
                            .map(cat => ({ value: cat.id, label: cat.nome }));
                        console.log(`✅ Pré-carregadas ${paiField.options.length} categorias ${data.tipo} como opções de pai`);
                    }
                } catch (error) {
                    console.error('Erro ao pré-carregar categorias pai:', error);
                }
            }
        }

        // Buscar registros existentes
        await loadExistingRecords(type, config, formFields);

        // Gerar campos do formulário
        generateFormFields(config, data, formFields);

        // Focar no primeiro campo
        setTimeout(() => {
            const firstInput = formFields.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
                console.log('🎯 Foco definido no primeiro campo');
            }
        }, 100);

        console.log('✅ Modal aberto com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar registros:', error);
        formFields.innerHTML = '<div class="error">❌ Erro ao carregar dados: ' + error.message + '</div>';
    }
}

// Função para carregar registros existentes
async function loadExistingRecords(type, config, container) {
    try {
        const response = await fetch(config.endpoint + '?limit=100', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (response.status === 401) {
            container.innerHTML = '<div class="error">⚠️ Sessão expirada. <a href="/login" style="color:#1d4ed8;font-weight:bold;">Clique aqui para entrar novamente</a> e tente de novo.</div><hr class="section-divider">';
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        const records = result.items || result.data || result || [];

        // Criar seção de registros existentes
        const recordsSection = document.createElement('div');
        recordsSection.className = 'existing-records-section';
        recordsSection.innerHTML = `
            <div class="section-header">
                <h3>📋 Registros Existentes (${records.length})</h3>
                <button type="button" class="btn-toggle" onclick="toggleRecordsList()" id="toggle-records-btn">
                    Mostrar Lista ▼
                </button>
            </div>
            <div class="records-list" id="records-list" style="display: none;">
                ${records.length === 0 ? 
                    '<div class="no-records">Nenhum registro encontrado</div>' :
                    generateRecordsList(records, config)
                }
            </div>
            <hr class="section-divider">
        `;

        container.innerHTML = '';
        container.appendChild(recordsSection);

    } catch (error) {
        console.error('Erro ao buscar registros:', error);
        container.innerHTML = '<div class="error">❌ Erro ao carregar registros. Recarregue a página e tente novamente.</div><hr class="section-divider">';
    }
}

// Função para escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Função para gerar lista de registros
function generateRecordsList(records, config) {
    return `
        <div class="records-table">
            <div class="table-header">
                ${config.fields.slice(0, 3).map(field => 
                    `<div class="header-cell">${escapeHtml(field.label)}</div>`
                ).join('')}
                <div class="header-cell">Ações</div>
            </div>
            ${records.map(record => `
                <div class="table-row" data-record-id="${record.id}">
                    ${config.fields.slice(0, 3).map(field => {
                        let value = record[field.name] || '';
                        if (field.type === 'checkbox') {
                            value = value ? '✅' : '❌';
                        } else if (field.type === 'select') {
                            const option = field.options?.find(opt => opt.value === value);
                            value = option ? option.label : value;
                        } else if (typeof value === 'string' && value.length > 30) {
                            value = value.substring(0, 30) + '...';
                        }
                        const displayValue = escapeHtml(String(value));
                        const titleValue = escapeHtml(String(record[field.name] || ''));
                        return `<div class="table-cell" title="${titleValue}">${displayValue}</div>`;
                    }).join('')}
                    <div class="table-cell">
                        <button type="button" class="btn-small btn-edit" onclick="editRecord(${record.id})" 
                                title="Editar registro">✏️</button>
                        <button type="button" class="btn-small btn-delete" onclick="deleteRecord(${record.id})" 
                                title="Excluir registro">🗑️</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Função para gerar campos do formulário
function generateFormFields(config, data, container) {
    const formSection = document.createElement('div');
    formSection.className = 'form-section';
    formSection.innerHTML = `
        <div class="section-header">
            <h3>📝 ${(data && data.id) ? 'Editar Registro' : 'Novo Registro'}</h3>
        </div>
    `;

    config.fields.forEach(field => {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'form-field' + (field.type === 'checkbox' ? ' checkbox' : '');

        let fieldHTML = '';
        const fieldId = `modal-${field.name}`; // Changed ID to be modal-specific
        const currentValue = data ? data[field.name] : field.defaultValue;

        if (field.type === 'checkbox') {
            fieldHTML = `
                <input type="checkbox" id="${fieldId}" name="${field.name}" 
                       ${currentValue ? 'checked' : ''}>
                <label for="${fieldId}">${field.label}</label>
            `;
        } else {
            fieldHTML = `<label for="${fieldId}">${field.label}${field.required ? ' *' : ''}</label>`;

            if (field.type === 'select') {
                fieldHTML += `<select id="${fieldId}" name="${field.name}" ${field.required ? 'required' : ''}>`;
                fieldHTML += '<option value="">Selecione...</option>';
                field.options.forEach(option => {
                    const selected = currentValue === option.value ? 'selected' : '';
                    fieldHTML += `<option value="${option.value}" ${selected}>${option.label}</option>`;
                });
                fieldHTML += '</select>';
            } else if (field.type === 'multiselect') {
                // Renderiza um select com a propriedade multiple
                const select = document.createElement('select');
                select.name = field.name;
                select.id = fieldId;
                select.className = 'form-select';
                select.multiple = true;
                select.style.height = '120px';

                // Adicionar instrução visual
                const hint = document.createElement('small');
                hint.style.color = '#6b7280';
                hint.style.fontSize = '12px';
                hint.style.display = 'block';
                hint.style.marginTop = '4px';
                hint.textContent = 'Use Ctrl/Cmd + clique para selecionar múltiplos';

                if (field.options && field.options.length > 0) {
                    field.options.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt.value;
                        option.textContent = opt.label || opt.value;

                        // Verificar se o valor atual é um array e se contém o valor da opção
                        const selectedValues = Array.isArray(currentValue) ? currentValue : (currentValue ? [currentValue] : []);
                        if (selectedValues.includes(parseInt(option.value))) {
                            option.selected = true;
                        }
                        select.appendChild(option);
                    });
                    console.log(`✅ Multiselect ${field.name} preenchido com ${field.options.length} opções`);
                } else {
                    const emptyOption = document.createElement('option');
                    emptyOption.textContent = 'Nenhum item disponível';
                    emptyOption.disabled = true;
                    select.appendChild(emptyOption);
                    console.warn(`⚠️ Multiselect ${field.name} sem opções disponíveis`);
                }

                fieldDiv.appendChild(select);
                fieldDiv.appendChild(hint);
            } else if (field.type === 'textarea') {
                fieldHTML += `<textarea id="${fieldId}" name="${field.name}" 
                                       ${field.required ? 'required' : ''}>${currentValue || ''}</textarea>`;
            } else {
                const inputType = field.type || 'text';
                const step = field.step ? `step="${field.step}"` : '';
                const min = field.min ? `min="${field.min}"` : '';
                const max = field.max ? `max="${field.max}"` : '';
                const maxlength = field.maxlength ? `maxlength="${field.maxlength}"` : '';

                fieldHTML += `<input type="${inputType}" id="${fieldId}" name="${field.name}" 
                                     value="${currentValue || ''}" ${field.required ? 'required' : ''}
                                     ${step} ${min} ${max} ${maxlength}>`;
            }
        }

        // Se não for multiselect, adiciona o HTML gerado ao fieldDiv
        if (field.type !== 'multiselect') {
            fieldDiv.innerHTML = fieldHTML;
        }
        
        formSection.appendChild(fieldDiv);

        // Adicionar event listener para carregamento dinâmico de categorias pai
        if (field.name === 'tipo' && window.currentModalType === 'subcategorias') {
            const selectElement = fieldDiv.querySelector('select');
            if (selectElement) {
                selectElement.addEventListener('change', async (e) => {
                    await updateCategoryParentOptions(e.target.value);
                });
            }
        }
    });

    container.appendChild(formSection);

    // Se for subcategorias e tiver tipo definido nos dados, carregar opções de pai
    if (window.currentModalType === 'subcategorias' && data && data.tipo) {
        setTimeout(() => updateCategoryParentOptions(data.tipo), 100);
    }
}

// Função para alternar visibilidade da lista
function toggleRecordsList() {
    const recordsList = document.getElementById('records-list');
    const toggleBtn = document.getElementById('toggle-records-btn');

    if (recordsList.style.display === 'none') {
        recordsList.style.display = 'block';
        toggleBtn.textContent = 'Ocultar Lista ▲';
    } else {
        recordsList.style.display = 'none';
        toggleBtn.textContent = 'Mostrar Lista ▼';
    }
}

// Função para scroll suave até o formulário de edição
function scrollToEditForm() {
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Destacar visualmente o formulário
        formSection.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
        formSection.style.transition = 'box-shadow 0.3s ease';
        setTimeout(() => {
            formSection.style.boxShadow = '';
        }, 2000);
        // Focar no primeiro campo
        setTimeout(() => {
            const firstInput = formSection.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        }, 300);
    }
}

// Função para editar registro
async function editRecord(recordId) {
    // Tratamento especial para subcategorias (funciona independente do modal context)
    if (window.currentModalType === 'subcategorias' || window.entityType === 'subcategorias') {
        return await editSubcategoria(recordId);
    }

    if (!window.currentModalType) return;

    const config = window.MODAL_CONFIGS[window.currentModalType];
    try {
        const response = await fetch(`${config.endpoint}/${recordId}`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            const record = await response.json();
            
            // Preencher os campos do modal com os dados do registro
            if (record) {
                // IMPORTANTE: Atualizar currentModalData para que o submitForm faça PUT
                window.currentModalData = { ...record, id: recordId };
                
                config.fields.forEach(field => {
                    const input = document.getElementById(`modal-${field.name}`); // Use modal-specific ID
                    if (input && record[field.name] !== undefined) {
                        if (field.type === 'checkbox') {
                            input.checked = record[field.name];
                        } else if (field.type === 'multiselect') {
                            // Para multiselect, marcar as opções selecionadas
                            const selectedValues = record[field.name] || [];
                            Array.from(input.options).forEach(option => {
                                option.selected = selectedValues.includes(parseInt(option.value));
                            });
                            console.log(`✅ Multiselect ${field.name} preenchido com valores:`, selectedValues);
                        } else {
                            input.value = record[field.name];
                        }
                    }
                });
                console.log('📦 Dados carregados para edição:', record);
                console.log('📦 currentModalData atualizado para PUT:', window.currentModalData);
                
                // Atualizar o título do modal para indicar edição
                const modalTitle = document.getElementById('modal-title');
                if (modalTitle) {
                    modalTitle.textContent = `Editar ${config.title.replace('Cadastro de ', '')}`;
                }
                
                // Atualizar o título da seção do formulário também
                const formSectionTitle = document.querySelector('.form-section .section-header h3');
                if (formSectionTitle) {
                    formSectionTitle.textContent = '📝 Editar Registro';
                }
                
                // Scroll suave até o formulário de edição
                scrollToEditForm();
            }
        } else {
            console.error('Erro ao buscar registro para edição');
        }
    } catch (error) {
        console.error('Erro ao editar registro:', error);
    }
}

// Função especial para editar subcategorias
async function editSubcategoria(recordId) {
    try {
        // Primeiro buscar a subcategoria pelo ID no endpoint correto
        const response = await fetch(`/api/subcategorias/${recordId}`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            console.error('Subcategoria não encontrada com ID:', recordId);
            alert('Erro: Subcategoria não encontrada');
            return;
        }

        const subcategoria = await response.json();

        // Usar o sistema de subcategorias especializado se disponível
        if (window.gerenciarSubcategoriasController && subcategoria.tipo) {
            window.gerenciarSubcategoriasController.editSubcategory(recordId, subcategoria.tipo);
        } else {
            // Preencher formulário existente no modal e fazer scroll
            const tipo = subcategoria.tipo || 'contabil';
            
            // Carregar opções de categoria pai primeiro
            await loadSubcategoryOptions(tipo);
            
            // Atualizar o select de tipo no DOM
            const tipoInput = document.getElementById('modal-tipo');
            if (tipoInput) {
                tipoInput.value = tipo;
            }
            
            // Atualizar opções de categoria pai no DOM
            await updateCategoryParentOptions(tipo);
            
            // Preencher os outros campos
            setTimeout(() => {
                const nomeInput = document.getElementById('modal-nome');
                const paiInput = document.getElementById('modal-pai_id');
                const descricaoInput = document.getElementById('modal-descricao');
                const ativoInput = document.getElementById('modal-ativo');
                
                if (nomeInput) nomeInput.value = subcategoria.nome || '';
                if (paiInput) paiInput.value = subcategoria.pai_id || '';
                if (descricaoInput) descricaoInput.value = subcategoria.descricao || '';
                if (ativoInput) ativoInput.checked = subcategoria.ativo !== false;
                
                // Armazenar ID para update
                window.currentModalData = { ...subcategoria, id: recordId };
                
                // Atualizar título
                const modalTitle = document.getElementById('modal-title');
                if (modalTitle) {
                    modalTitle.textContent = 'Editar Subcategoria';
                }
                
                // Scroll até o formulário
                scrollToEditForm();
                
                console.log('📦 Subcategoria carregada para edição:', subcategoria);
            }, 200);
        }

    } catch (error) {
        console.error('Erro ao editar subcategoria:', error);
        alert('Erro ao carregar subcategoria para edição');
    }
}

// Função auxiliar para carregar opções de categoria pai
async function loadSubcategoryOptions(tipo) {
    const config = window.MODAL_CONFIGS['subcategorias'];
    const paiField = config.fields.find(f => f.name === 'pai_id');

    if (paiField) {
        try {
            const endpoint = tipo === 'contabil' ? '/api/categorias-contabeis' : '/api/categorias-gerenciais';
            const response = await fetch(endpoint, { credentials: 'include' });

            if (response.ok) {
                const categorias = await response.json();
                paiField.options = categorias
                    .filter(cat => !cat.pai_id) // Apenas categorias pai
                    .map(cat => ({ value: cat.id, label: cat.nome }));
            }
        } catch (error) {
            console.error('Erro ao carregar opções de categoria pai:', error);
        }
    }
}

// Função para atualizar dinamicamente as opções de categoria pai
async function updateCategoryParentOptions(tipo) {
    if (!tipo) return;

    const paiSelect = document.getElementById('modal-pai_id'); // Use modal-specific ID
    if (!paiSelect) return;

    // Mostrar indicador de carregamento
    paiSelect.innerHTML = '<option value="">Carregando...</option>';
    paiSelect.disabled = true;

    try {
        const endpoint = tipo === 'contabil' ? '/api/categorias-contabeis' : '/api/categorias-gerenciais';
        const response = await fetch(endpoint, { credentials: 'include' });

        if (response.status === 401) {
            paiSelect.innerHTML = '<option value="">Sessão expirada — recarregue a página</option>';
            return;
        }

        if (response.ok) {
            const categorias = await response.json();
            const categoriaPai = categorias.filter(cat => !cat.pai_id); // Apenas categorias pai

            // Limpar e repovoar o select
            paiSelect.innerHTML = '<option value="">Selecione...</option>';
            categoriaPai.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.nome;
                paiSelect.appendChild(option);
            });

            console.log(`✅ Carregadas ${categoriaPai.length} categorias ${tipo} como opções de pai`);
        } else {
            console.error('Erro ao buscar categorias:', response.status);
            paiSelect.innerHTML = '<option value="">Erro ao carregar — recarregue a página</option>';
        }
    } catch (error) {
        console.error('Erro ao carregar categorias pai:', error);
        paiSelect.innerHTML = '<option value="">Erro ao carregar — recarregue a página</option>';
    } finally {
        paiSelect.disabled = false;
    }
}

// Função para excluir registro
async function deleteRecord(recordId) {
    if (!window.currentModalType) return;

    if (!confirm('Tem certeza que deseja excluir este registro?')) {
        return;
    }

    const config = window.MODAL_CONFIGS[window.currentModalType];
    try {
        const response = await fetch(`${config.endpoint}/${recordId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            if (window.app && window.app.showNotification) {
                window.app.showNotification('Registro excluído com sucesso!', 'success');
            }

            // Recarregar o modal para atualizar a lista
            openModal(window.currentModalType);
        } else {
            console.error('Erro ao excluir registro');
            if (window.app && window.app.showNotification) {
                window.app.showNotification('Erro ao excluir registro', 'error');
            }
        }
    } catch (error) {
        console.error('Erro ao excluir registro:', error);
        if (window.app && window.app.showNotification) {
            window.app.showNotification('Erro de conexão', 'error');
        }
    }
}

// Função para fechar modal
function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
    window.currentModalType = null;
    window.currentModalData = null;
}

// Função para submeter formulário
async function submitForm(event) {
    event.preventDefault();

    if (!window.currentModalType) return;

    const config = window.MODAL_CONFIGS[window.currentModalType];
    const formElement = event.target;
    const data = {};

    // Montar dados do formulário
    config.fields.forEach(field => {
        const input = document.getElementById(`modal-${field.name}`); // Use modal-specific ID
        if (input) {
            if (field.type === 'checkbox') {
                data[field.name] = input.checked;
            } else if (field.type === 'multiselect') {
                // Para multiselect, coletar todos os valores selecionados
                const selectedOptions = Array.from(input.selectedOptions);
                data[field.name] = selectedOptions.map(opt => parseInt(opt.value));
                console.log(`✅ Valores selecionados em ${field.name}:`, data[field.name]);
            } else if (field.type === 'number' || (field.type === 'text' && field.inputMode === 'decimal')) {
                const value = input.value;
                data[field.name] = value ? parseFloat(value) : null;
            } else {
                data[field.name] = input.value || null;
            }
        }
    });

    try {
        // Determinar método HTTP e URL
        // currentModalData pode conter só dados de inicialização (sem id) → POST
        const isEdit = !!(window.currentModalData && window.currentModalData.id);
        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit
            ? `${config.endpoint}/${window.currentModalData.id}`
            : config.endpoint;

        console.log(`Enviando ${method} para ${url}:`, data);

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Sucesso:', result);

            // Mostrar notificação de sucesso
            if (window.app && window.app.showNotification) {
                const action = isEdit ? 'atualizado' : 'criado';
                window.app.showNotification(`Registro ${action} com sucesso!`, 'success');
            }

            // Fechar modal
            closeModal();

            // Recarregar dados se necessário (implementar quando tiver listagem)
            if (typeof refreshCurrentList === 'function') {
                refreshCurrentList();
            }

            // Executar callback personalizado se registrado
            if (typeof window.onModalSuccess === 'function') {
                window.onModalSuccess(window.currentModalType, result);
            }

            // Atualizar dropdown diretamente com o novo registro (sem recarregar página)
            // O callback onModalSuccess já cuida disso em nova_despesa.js/etc
            // Aqui garantimos que funcione mesmo sem callback específico
            if (result && result.id) {
                const modalType = window.currentModalType;
                
                // Mapear tipo de modal para seletores de dropdown
                const dropdownSelectors = {
                    'empresas': ['#empresa', 'select[name="empresa_id"]'],
                    'clientes': ['#cliente', 'select[name="cliente_id"]'],
                    'fornecedores': ['#fornecedor', '#fornecedor_id', 'select[name="fornecedor_id"]'],
                    'projetos': ['#projeto', 'select[name="projeto_id"]'],
                    'produtos-servicos': ['#produto_servico', 'select[name="produto_servico_id"]'],
                    'categorias-contabeis': ['#categoria_contabil', 'select[name="categoria_contabil_id"]'],
                    'categorias-gerenciais': ['#categoria_gerencial', '#categoria_gerencial_id', 'select[name="categoria_gerencial_id"]'],
                    'subcategorias': ['#subcategoria_gerencial', '#subcategoria_contabil', 'select[name="subcategoria_gerencial_id"]', 'select[name="subcategoria_contabil_id"]'],
                    'centros-custo': ['#centro_custo', 'select[name="centro_custo_id"]'],
                    'contas-bancarias': ['#conta_bancaria', 'select[name="conta_bancaria_id"]'],
                    'cartoes-credito': ['#cartao', 'select[name="cartao_id"]']
                };
                
                const selectors = dropdownSelectors[modalType];
                if (selectors) {
                    selectors.forEach(selector => {
                        const select = document.querySelector(selector);
                        if (select) {
                            // Verificar se a opção já existe
                            const existingOption = Array.from(select.options).find(opt => opt.value == result.id);
                            if (!existingOption) {
                                const option = document.createElement('option');
                                option.value = result.id;
                                option.textContent = result.nome_fantasia || result.nome || result.razao_social || 'Novo registro';
                                option.selected = true;
                                select.appendChild(option);
                                console.log(`✅ Opção adicionada ao dropdown ${selector}:`, result.id, option.textContent);
                            } else {
                                existingOption.selected = true;
                            }
                        }
                    });
                }
            }

        } else {
            const error = await response.json();
            console.error('Erro:', error);

            if (window.app && window.app.showNotification) {
                window.app.showNotification(
                    error.detail || 'Erro ao salvar registro',
                    'error'
                );
            }
        }
    } catch (error) {
        console.error('Erro de rede:', error);

        if (window.app && window.app.showNotification) {
            window.app.showNotification('Erro de conexão', 'error');
        }
    }
}

// Helper function to capitalize the first letter of a string
function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Fechar modal com ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// Expor funções globalmente
window.openModal = openModal;
window.closeModal = closeModal;
window.submitForm = submitForm;

console.log('✅ Sistema de modais carregado com sucesso!');