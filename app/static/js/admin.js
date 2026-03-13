/**
 * Painel Administrativo - Bennu Finance
 * JavaScript para gerenciamento e visualização de métricas de uso
 */

let periodoAtual = '7d';
let paginaAtual = 1;
const limite = 50;

// ========== INICIALIZAÇÃO ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Painel administrativo carregado');
    carregarDados('7d');
});

// ========== CONTROLE DE TABS ==========

function mudarTab(tabId) {
    // Desativar todas as tabs
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    
    // Ativar tab selecionada
    event.target.classList.add('active');
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    
    // Carregar dados específicos da tab
    if (tabId === 'usuarios') {
        carregarAtividadeUsuarios();
    } else if (tabId === 'logs-acoes') {
        carregarLogsAcoes(1);
    } else if (tabId === 'sessoes-ativas') {
        carregarSessoesAtivas();
    }
}

// ========== CARREGAMENTO DE DADOS ==========

async function carregarDados(periodo) {
    periodoAtual = periodo;
    
    // Atualizar botões de período
    document.querySelectorAll('[id^="btn-"]').forEach(btn => btn.classList.remove('btn-primary'));
    document.getElementById(`btn-${periodo}`).classList.add('btn-primary');
    
    // Carregar métricas
    await carregarMetricas(periodo);
}

async function carregarMetricas(periodo) {
    try {
        const response = await fetch(`/api/admin/dashboard/metricas?periodo=${periodo}`);
        const data = await response.json();
        
        console.log('📊 Métricas carregadas:', data);
        
        // Atualizar cards de métricas
        document.getElementById('total-acessos').textContent = formatarNumero(data.metricas.total_acessos);
        document.getElementById('usuarios-unicos').textContent = formatarNumero(data.metricas.usuarios_unicos);
        document.getElementById('total-acoes').textContent = formatarNumero(data.metricas.total_acoes);
        document.getElementById('sessoes-ativas').textContent = formatarNumero(data.metricas.sessoes_ativas);
        document.getElementById('tempo-medio').textContent = data.metricas.tempo_medio_sessao_minutos + ' min';
        
        // Atualizar tabelas
        atualizarTabelaAcoesTipo(data.acoes_por_tipo);
        atualizarTabelaEntidades(data.entidades_populares);
        renderizarGraficoAtividade(data.atividade_diaria);
        
    } catch (error) {
        console.error('❌ Erro ao carregar métricas:', error);
    }
}

async function carregarAtividadeUsuarios() {
    try {
        const response = await fetch('/api/admin/usuarios/atividade?limite=20');
        const data = await response.json();
        
        const tbody = document.getElementById('tbody-usuarios');
        
        if (!data.usuarios || data.usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Nenhum usuário encontrado</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        data.usuarios.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.nome}</td>
                <td>${u.email}</td>
                <td style="text-align: center;">${u.total_acoes}</td>
                <td style="text-align: center;">${u.total_sessoes}</td>
                <td>${u.ultimo_acesso ? formatarDataHora(u.ultimo_acesso) : '-'}</td>
                <td>${u.ultima_atividade ? formatarDataHora(u.ultima_atividade) : '-'}</td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('❌ Erro ao carregar atividade de usuários:', error);
    }
}

async function carregarLogsAcoes(pagina) {
    if (pagina < 1) return;
    paginaAtual = pagina;
    
    try {
        const response = await fetch(`/api/admin/logs/acoes?page=${pagina}&limite=${limite}`);
        const data = await response.json();
        
        const tbody = document.getElementById('tbody-logs-acoes');
        
        if (!data.logs || data.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Nenhum log encontrado</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        data.logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatarDataHora(log.created_at)}</td>
                <td>${log.usuario.nome || log.usuario.email || 'Desconhecido'}</td>
                <td><span class="badge badge-${getBadgeAcao(log.acao)}">${traduzirAcao(log.acao)}</span></td>
                <td>${log.entidade}</td>
                <td>${log.descricao || '-'}</td>
                <td>${log.ip_address || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
        
        // Atualizar paginação
        document.getElementById('info-paginacao').textContent = `Página ${data.page} de ${data.total_pages} (${data.total} registros)`;
        document.getElementById('btn-prev').disabled = pagina === 1;
        document.getElementById('btn-next').disabled = pagina >= data.total_pages;
        
    } catch (error) {
        console.error('❌ Erro ao carregar logs de ações:', error);
    }
}

async function carregarSessoesAtivas() {
    try {
        const response = await fetch('/api/admin/sessoes/ativas');
        const data = await response.json();
        
        const tbody = document.getElementById('tbody-sessoes');
        
        if (!data.sessoes || data.sessoes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Nenhuma sessão ativa no momento</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        data.sessoes.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.usuario.nome}</td>
                <td>${s.usuario.email}</td>
                <td>${formatarDataHora(s.inicio)}</td>
                <td>${formatarDataHora(s.ultima_atividade)}</td>
                <td style="text-align: center;">${s.duracao_minutos}</td>
                <td>${s.ip_address || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('❌ Erro ao carregar sessões ativas:', error);
    }
}

// ========== ATUALIZAÇÃO DE TABELAS ==========

function atualizarTabelaAcoesTipo(acoes) {
    const tbody = document.getElementById('tbody-acoes-tipo');
    
    if (!acoes || acoes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Nenhuma ação registrada</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    acoes.forEach(acao => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge badge-${getBadgeAcao(acao.tipo)}">${traduzirAcao(acao.tipo)}</span></td>
            <td style="text-align: right; font-weight: 600;">${formatarNumero(acao.total)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function atualizarTabelaEntidades(entidades) {
    const tbody = document.getElementById('tbody-entidades');
    
    if (!entidades || entidades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Nenhuma entidade modificada</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    entidades.forEach(ent => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 500;">${ent.entidade}</td>
            <td style="text-align: right; font-weight: 600;">${formatarNumero(ent.total)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ========== RENDERIZAÇÃO DE GRÁFICO ==========

function renderizarGraficoAtividade(atividade) {
    const container = document.getElementById('grafico-atividade');
    
    if (!atividade || atividade.length === 0) {
        container.innerHTML = '<p style="color: #9ca3af;">Sem dados para exibir</p>';
        return;
    }
    
    // Encontrar valor máximo
    const maxValor = Math.max(...atividade.map(a => a.total));
    
    // Renderizar barras simples
    let html = '<div style="display: flex; gap: 8px; align-items: flex-end; height: 260px;">';
    
    atividade.forEach(a => {
        const altura = maxValor > 0 ? (a.total / maxValor * 100) : 0;
        const dp = String(a.dia).substring(0, 10).split('-');
        const data = dp.length === 3 ? dp[2] + '/' + dp[1] : a.dia;
        
        html += `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                <div style="width: 100%; background: #3b82f6; border-radius: 4px 4px 0 0; height: ${altura}%; min-height: ${a.total > 0 ? '5px' : '0'}; position: relative;" title="${a.total} ações">
                </div>
                <div style="font-size: 11px; color: #6b7280; writing-mode: horizontal-tb;">${data}</div>
                <div style="font-size: 11px; font-weight: 600; color: #111827;">${a.total}</div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ========== FUNÇÕES AUXILIARES ==========

function formatarNumero(num) {
    if (!num && num !== 0) return '-';
    return new Intl.NumberFormat('pt-BR').format(num);
}

function formatarDataHora(dataStr) {
    if (!dataStr) return '-';
    const data = new Date(dataStr);
    return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function traduzirAcao(acao) {
    const traducoes = {
        'login': 'Login',
        'logout': 'Logout',
        'create': 'Criar',
        'update': 'Atualizar',
        'delete': 'Deletar',
        'view': 'Visualizar',
        'export': 'Exportar',
        'import': 'Importar'
    };
    return traducoes[acao.toLowerCase()] || acao;
}

function getBadgeAcao(acao) {
    const badges = {
        'create': 'success',
        'update': 'warning',
        'delete': 'danger',
        'view': 'info',
        'login': 'primary',
        'logout': 'secondary'
    };
    return badges[acao.toLowerCase()] || 'secondary';
}

// Atualizar métricas a cada 30 segundos
setInterval(() => {
    if (document.querySelector('.tab-button.active').textContent.includes('Visão Geral')) {
        carregarMetricas(periodoAtual);
    }
}, 30000);
