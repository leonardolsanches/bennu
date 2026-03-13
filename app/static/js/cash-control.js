/**
 * Cash Control - Extrato de Movimentações Bancárias
 * Relatório de entradas e saídas efetivadas
 */

let cashControlData = null;
let empresas = [];

const mesesNomes = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🏦 Cash Control - Iniciando...');
    
    await carregarEmpresas();
    inicializarFiltros();
    await carregarDadosCashControl();
});

async function carregarEmpresas() {
    try {
        const response = await fetch('/api/empresas', { credentials: 'include' });
        if (response.ok) {
            empresas = await response.json();
            const select = document.getElementById('empresa-filter');
            if (select) {
                empresas.forEach(emp => {
                    const option = document.createElement('option');
                    option.value = emp.id;
                    option.textContent = emp.nome || emp.razao_social;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
    }
}

function inicializarFiltros() {
    const anoAtual = new Date().getFullYear();
    const anoSelect = document.getElementById('ano-filter');
    
    if (anoSelect) {
        for (let ano = anoAtual; ano >= anoAtual - 5; ano--) {
            const option = document.createElement('option');
            option.value = ano;
            option.textContent = ano;
            anoSelect.appendChild(option);
        }
    }
    
    const mesAtual = new Date().getMonth() + 1;
    const mesSelect = document.getElementById('mes-filter');
    if (mesSelect) {
        mesSelect.value = mesAtual.toString();
    }
}

function resetFilters() {
    document.getElementById('ano-filter').value = new Date().getFullYear();
    document.getElementById('mes-filter').value = '';
    document.getElementById('empresa-filter').value = '';
    carregarDadosCashControl();
}

async function carregarDadosCashControl() {
    const loading = document.getElementById('loading-overlay');
    if (loading) loading.style.display = 'flex';
    
    try {
        const ano = document.getElementById('ano-filter')?.value || new Date().getFullYear();
        const mes = document.getElementById('mes-filter')?.value || '';
        const empresa = document.getElementById('empresa-filter')?.value || '';
        
        let url = `/api/relatorios/cash-control?ano=${ano}`;
        if (mes) url += `&mes=${mes}`;
        if (empresa) url += `&empresa=${empresa}`;
        
        console.log('🔄 Carregando Cash Control:', url);
        
        const response = await fetch(url, { credentials: 'include' });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        cashControlData = await response.json();
        console.log('✅ Cash Control carregado:', cashControlData);
        
        atualizarCards();
        renderizarTabela();
        atualizarPeriodoInfo(ano, mes);
        
    } catch (error) {
        console.error('❌ Erro ao carregar Cash Control:', error);
        document.getElementById('cash-control-body').innerHTML = `
            <tr><td colspan="14" class="text-center text-danger py-4">
                Erro ao carregar dados: ${error.message}
            </td></tr>
        `;
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

function atualizarCards() {
    if (!cashControlData || !cashControlData.resumo) return;
    
    const resumo = cashControlData.resumo;
    
    document.getElementById('total-entradas').textContent = formatarMoeda(resumo.total_entradas || 0);
    document.getElementById('total-saidas').textContent = formatarMoeda(resumo.total_saidas || 0);
    document.getElementById('saldo-final').textContent = formatarMoeda(resumo.saldo_final || 0);
    document.getElementById('qtd-movimentacoes').textContent = resumo.quantidade_movimentacoes || 0;
}

function atualizarPeriodoInfo(ano, mes) {
    const periodoInfo = document.getElementById('periodo-info');
    if (periodoInfo) {
        if (mes) {
            periodoInfo.textContent = `Período: ${mesesNomes[parseInt(mes)]}/${ano}`;
        } else {
            periodoInfo.textContent = `Período: ${ano}`;
        }
    }
}

function renderizarTabela() {
    const tbody = document.getElementById('cash-control-body');
    if (!tbody || !cashControlData) return;
    
    const movimentacoes = cashControlData.movimentacoes || [];
    
    if (movimentacoes.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="14" class="text-center py-4 text-muted">
                Nenhuma movimentação encontrada para o período selecionado.
            </td></tr>
        `;
        return;
    }
    
    let html = '';
    
    movimentacoes.forEach((mov, index) => {
        const isEntrada = mov.tipo === 'ENTRADA';
        const valorClass = isEntrada ? 'text-success' : 'text-danger';
        const saldoClass = mov.saldo >= 0 ? 'text-primary' : 'text-danger';
        
        const dataPgto = mov.data ? formatarData(mov.data) : '-';
        const mesAno = mov.data ? obterMesAno(mov.data) : '-';
        const semana = mov.data ? obterSemana(mov.data) : '-';
        const periodo = mov.data ? obterPeriodoSemana(mov.data) : '-';
        
        html += `
            <tr style="background: ${index % 2 === 0 ? '#fff' : '#f9fafb'};">
                <td style="white-space: nowrap;">${mesAno}<br><small class="text-muted">${semana}</small></td>
                <td style="white-space: nowrap;">${periodo}</td>
                <td>${mov.categoria || '-'}</td>
                <td>${mov.centro_custo || '-'}</td>
                <td>${mov.competencia || '-'}</td>
                <td style="white-space: nowrap;">${dataPgto}</td>
                <td>${mov.banco || '-'}</td>
                <td>${mov.forma_pagamento || '-'}</td>
                <td title="${mov.descricao || ''}">${truncar(mov.descricao || '-', 40)}</td>
                <td>${mov.documento || '-'}</td>
                <td title="${mov.observacao || ''}">${truncar(mov.observacao || '', 30)}</td>
                <td class="${valorClass}" style="text-align: right; font-weight: 500;">
                    ${isEntrada ? formatarMoeda(mov.valor) : ''}
                </td>
                <td class="${valorClass}" style="text-align: right; font-weight: 500;">
                    ${!isEntrada ? formatarMoeda(mov.valor) : ''}
                </td>
                <td class="${saldoClass}" style="text-align: right; font-weight: 600;">
                    ${formatarMoeda(mov.saldo)}
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor || 0);
}

function formatarData(dataStr) {
    if (!dataStr) return '-';
    var parts = dataStr.substring(0, 10).split('-');
    if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
    return dataStr;
}

function obterMesAno(dataStr) {
    if (!dataStr) return '-';
    var parts = dataStr.substring(0, 10).split('-');
    if (parts.length !== 3) return '-';
    const mesNum = parseInt(parts[1]);
    const mes = mesesNomes[mesNum];
    const ano = parts[0].slice(-2);
    return `${mes}/${ano}`;
}

function obterSemana(dataStr) {
    if (!dataStr) return '-';
    var parts = dataStr.substring(0, 10).split('-');
    if (parts.length !== 3) return '-';
    const data = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const inicioAno = new Date(data.getFullYear(), 0, 1);
    const dias = Math.floor((data - inicioAno) / (24 * 60 * 60 * 1000));
    const semana = Math.ceil((dias + inicioAno.getDay() + 1) / 7);
    return `Week ${semana}`;
}

function obterPeriodoSemana(dataStr) {
    if (!dataStr) return '-';
    var parts = dataStr.substring(0, 10).split('-');
    if (parts.length !== 3) return '-';
    const data = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    
    const diaSemana = data.getDay();
    const inicioSemana = new Date(data);
    inicioSemana.setDate(data.getDate() - diaSemana);
    
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    
    const formatDia = (d) => d.getDate().toString().padStart(2, '0') + '/' + 
                             (d.getMonth() + 1).toString().padStart(2, '0');
    
    return `${formatDia(inicioSemana)} a ${formatDia(fimSemana)}`;
}

function truncar(texto, tamanho) {
    if (!texto) return '';
    if (texto.length <= tamanho) return texto;
    return texto.substring(0, tamanho) + '...';
}

async function exportarCashControl(formato) {
    const loading = document.getElementById('loading-overlay');
    if (loading) loading.style.display = 'flex';
    
    try {
        const ano = document.getElementById('ano-filter')?.value || new Date().getFullYear();
        const mes = document.getElementById('mes-filter')?.value || '';
        const empresa = document.getElementById('empresa-filter')?.value || '';
        
        let url = `/api/relatorios/cash-control/export-excel?ano=${ano}`;
        if (mes) url += `&mes=${mes}`;
        if (empresa) url += `&empresa=${empresa}`;
        
        console.log('📥 Exportando Cash Control:', url);
        
        const response = await fetch(url, { credentials: 'include' });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        
        const mesNome = mes ? mesesNomes[parseInt(mes)] : 'Ano';
        a.download = `CashControl_${mesNome}_${ano}.xlsx`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        
        console.log('✅ Download concluído');
        
    } catch (error) {
        console.error('❌ Erro ao exportar:', error);
        alert('Erro ao exportar relatório: ' + error.message);
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

window.carregarDadosCashControl = carregarDadosCashControl;
window.resetFilters = resetFilters;
window.exportarCashControl = exportarCashControl;
