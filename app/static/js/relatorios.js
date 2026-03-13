// Relatórios - Sistema de navegação e funcionalidades
console.log('📊 Carregando módulo de relatórios...');

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Inicializando página de relatórios...');

    // Configurar event listeners
    setupEventListeners();
    loadEstatatisticasRapidas();

    console.log('✅ Página de relatórios carregada com sucesso!');
});

// Configurar event listeners
function setupEventListeners() {
    // Event listeners para cards de relatórios já estão configurados via onclick nos botões
    console.log('📊 Event listeners configurados');
}

// Carregar estatísticas rápidas
function loadEstatatisticasRapidas() {
    // Atualizar contador de relatórios disponíveis
    const totalRelatorios = document.querySelectorAll('.report-card').length;
    const statElement = document.getElementById('stat-total-relatorios');
    if (statElement) {
        statElement.textContent = totalRelatorios;
    }
}

// Função para acessar relatório específico
function acessarRelatorio(tipoRelatorio) {
    console.log(`📊 Acessando relatório: ${tipoRelatorio}`);

    switch (tipoRelatorio) {
        case 'cashflow':
            window.location.href = '/relatorios/cashflow';
            break;
        case 'pl-contabil':
            window.location.href = '/relatorios/pl-contabil';
            break;
        case 'pl-consolidado':
            window.location.href = '/relatorios/pl-consolidado';
            break;
        case 'contas-a-pagar':
            window.location.href = '/relatorios/contas-a-pagar';
            break;
        case 'contas-a-receber':
            window.location.href = '/relatorios/contas-a-receber';
            break;
        case 'retencao-fonte':
            window.location.href = '/relatorios/retencao-fonte';
            break;
        case 'cash-control':
            window.location.href = '/relatorios/cash-control';
            break;

        default:
            showErrorMessage('Relatório não encontrado: ' + tipoRelatorio);
    }
}

// Função de utilidade para exibir mensagens de erro
function showErrorMessage(message) {
    console.error('❌ Erro:', message);
    // Implementar toast/modal de erro no futuro
    alert('Erro: ' + message);
}

// Função de utilidade para exibir mensagens de sucesso
function showSuccessMessage(message) {
    console.log('✅ Sucesso:', message);
    // Implementar toast/modal de sucesso no futuro
}

// Funcionalidade de exportação (será implementada nos relatórios específicos)
function exportarRelatorio(tipo = 'CSV') {
    console.log(`📊 Exportando relatório como ${tipo}`);
    showSuccessMessage('Funcionalidade de exportação será implementada em breve');
}