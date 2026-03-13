/**
 * Utilitários comuns para todo o sistema
 */

// Função auxiliar global para escapar HTML e prevenir XSS
window.escapeHtml = function(text) {
    if (text == null) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

// Função para formatar valores monetários
window.formatCurrency = function(value) {
    if (value == null || value === '') return 'R$ 0,00';
    return parseFloat(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
};

// Função para formatar datas (sem UTC shift - parse direto da string YYYY-MM-DD)
window.formatDate = function(date) {
    if (!date) return '';
    var str = String(date).substring(0, 10);
    var parts = str.split('-');
    if (parts.length === 3) {
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }
    return str;
};

// Função para criar badges seguros
window.createBadge = function(isActive, activeText = 'Ativo', inactiveText = 'Inativo') {
    const badgeClass = isActive ? 'badge-success' : 'badge-danger';
    const badgeText = isActive ? activeText : inactiveText;
    return `<span class="badge ${badgeClass}">${badgeText}</span>`;
};

// ==========================================
// FUNÇÃO DE EDIÇÃO DE TRANSAÇÕES
// ==========================================

/**
 * Redireciona para a página de edição apropriada baseado no tipo da transação
 * @param {number} id - ID da transação
 * @param {string} tipo - Tipo da transação ('receita' ou 'despesa') - opcional
 */
window.editarTransacao = async function(id, tipo) {
    console.log(`📝 Iniciando edição da transação ID ${id}, tipo fornecido: ${tipo}`);

    try {
        // Se o tipo não foi fornecido, buscar da API
        if (!tipo) {
            console.log(`🔍 Tipo não fornecido, buscando da API...`);
            const response = await fetch(`/api/transacoes/${id}`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Erro ao buscar transação: ${response.status}`);
            }

            const transacao = await response.json();
            tipo = transacao.tipo;
            console.log(`✅ Tipo obtido da API: ${tipo}`);
        }

        // Redirecionar para a página correta
        if (tipo === 'receita') {
            console.log(`📝 Redirecionando para edição de receita ID ${id}`);
            window.location.href = `/editar-receita/${id}`;
        } else if (tipo === 'despesa') {
            console.log(`📝 Redirecionando para edição de despesa ID ${id}`);
            window.location.href = `/editar-despesa/${id}`;
        } else {
            throw new Error(`Tipo de transação inválido: ${tipo}`);
        }
    } catch (error) {
        console.error('❌ Erro ao editar transação:', error);
        if (window.app && window.app.showNotification) {
            window.app.showNotification('Erro ao abrir edição: ' + error.message, 'error');
        } else {
            alert('Erro ao abrir edição: ' + error.message);
        }
    }
};

// ==========================================
// FUNÇÃO PARA POPULAR CAMPOS DE ANO
// ==========================================

/**
 * Popula um select de ano com ano corrente, anos passados e 5 anos futuros
 * @param {string} selectId - ID do elemento select
 * @param {Object} options - Opções de configuração
 * @param {boolean} options.includeAllOption - Se deve incluir opção "Todos" no início
 * @param {number} options.selectedYear - Ano a ser selecionado (default: ano corrente)
 * @param {number} options.startYear - Ano inicial (default: 2020)
 */
window.populateYearSelect = function(selectId, options = {}) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const currentYear = new Date().getFullYear();
    const startYear = options.startYear || 2020;
    const endYear = currentYear + 5;
    const selectedYear = options.selectedYear || currentYear;
    const includeAllOption = options.includeAllOption || false;
    const includePlaceholder = options.includePlaceholder !== false;

    // Limpar opções existentes
    select.innerHTML = '';

    // Adicionar opção "Todos" se solicitado
    if (includeAllOption) {
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'Todos';
        select.appendChild(allOption);
    } else if (includePlaceholder) {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Selecione...';
        select.appendChild(placeholder);
    }

    // Adicionar anos do mais recente ao mais antigo
    for (let year = endYear; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year.toString();
        option.textContent = year.toString();
        if (year === selectedYear) {
            option.selected = true;
        }
        select.appendChild(option);
    }
};

// ==========================================
// FUNÇÕES GLOBAIS EXPORTADAS
// ==========================================

// ==========================================
// COLLAPSIBLE SECTIONS
// ==========================================

/**
 * Inicializa todas as seções colapsáveis na página
 */
window.initCollapsibleSections = function() {
    document.querySelectorAll('.collapsible-header').forEach(header => {
        header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            const isCollapsed = this.classList.contains('collapsed');
            
            if (isCollapsed) {
                this.classList.remove('collapsed');
                if (content) content.classList.remove('collapsed');
            } else {
                this.classList.add('collapsed');
                if (content) content.classList.add('collapsed');
            }
            
            // Salvar estado no localStorage
            const sectionId = this.dataset.sectionId;
            if (sectionId) {
                localStorage.setItem(`collapsible-${sectionId}`, isCollapsed ? 'expanded' : 'collapsed');
            }
        });
        
        // Restaurar estado do localStorage
        const sectionId = header.dataset.sectionId;
        if (sectionId) {
            const savedState = localStorage.getItem(`collapsible-${sectionId}`);
            if (savedState === 'collapsed') {
                header.classList.add('collapsed');
                const content = header.nextElementSibling;
                if (content) content.classList.add('collapsed');
            }
        }
    });
};

/**
 * Toggle uma seção colapsável específica
 */
window.toggleSection = function(sectionId) {
    const header = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (header) {
        header.click();
    }
};

// Inicializar seções colapsáveis quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.initCollapsibleSections();
    window.initFormSections();
});

/**
 * Toggle de seções de formulário colapsáveis
 */
window.toggleFormSection = function(header) {
    const content = header.nextElementSibling;
    const isCollapsed = header.classList.contains('collapsed');
    
    if (isCollapsed) {
        header.classList.remove('collapsed');
        if (content) content.classList.remove('collapsed');
    } else {
        header.classList.add('collapsed');
        if (content) content.classList.add('collapsed');
    }
    
    // Salvar estado no localStorage
    const sectionId = header.dataset.section;
    const formId = header.closest('form')?.id || 'form';
    if (sectionId) {
        localStorage.setItem(`form-section-${formId}-${sectionId}`, isCollapsed ? 'expanded' : 'collapsed');
    }
};

/**
 * Inicializar estado das seções de formulário
 * Seções sempre carregam abertas por padrão (removendo qualquer estado collapsed)
 */
window.initFormSections = function() {
    document.querySelectorAll('.section-header-collapsible').forEach(header => {
        header.classList.remove('collapsed');
        const content = header.nextElementSibling;
        if (content) content.classList.remove('collapsed');
    });
};

console.log('✅ Utils.js carregado com funções globais disponíveis');