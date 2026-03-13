// Relatório de Retenção na Fonte - JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Inicializando Relatório de Retenção na Fonte...');
    
    // Popular campo de ano com ano corrente + passados + 5 futuros
    if (window.populateYearSelect) {
        window.populateYearSelect('filter-ano', { includeAllOption: true, selectedYear: new Date().getFullYear() });
    }
    
    // Carregar empresas para filtro
    carregarEmpresas();
    
    // Carregar dados iniciais
    carregarRetencoes();
});

async function carregarEmpresas() {
    try {
        const response = await fetch('/api/empresas', { credentials: 'include' });
        if (response.ok) {
            const empresas = await response.json();
            const select = document.getElementById('filter-empresa');
            if (select) {
                empresas.forEach(emp => {
                    const option = document.createElement('option');
                    option.value = emp.id;
                    option.textContent = emp.nome;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
    }
}

async function carregarRetencoes() {
    const tabela = document.getElementById('tabela-retencoes');
    const resumoContainer = document.getElementById('resumo-container');
    const impostosGrid = document.getElementById('impostos-grid');
    
    try {
        // Mostrar loading
        if (tabela) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: 40px; text-align: center; color: #6b7280;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                            <div class="spinner"></div>
                            <span>Carregando retenções...</span>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        // Obter filtros
        const ano = document.getElementById('filter-ano')?.value || '';
        const mes = document.getElementById('filter-mes')?.value || '';
        const status = document.getElementById('filter-status')?.value || '';
        const imposto = document.getElementById('filter-imposto')?.value || '';
        const empresa = document.getElementById('filter-empresa')?.value || '';
        
        // Construir URL com filtros
        const params = new URLSearchParams();
        if (ano) params.append('ano', ano);
        if (mes) params.append('mes', mes);
        if (status) params.append('status', status);
        if (imposto) params.append('imposto_nome', imposto);
        if (empresa) params.append('empresa', empresa);
        
        const response = await fetch(`/api/relatorios/retencao-fonte?${params}`, { credentials: 'include' });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Dados recebidos:', data);
        
        // Atualizar resumo
        if (resumoContainer) {
            resumoContainer.innerHTML = `
                <div class="summary-card" style="flex: 1; min-width: 200px; background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Total de Retenções</div>
                    <div style="font-size: 24px; font-weight: 700; color: #374151;">${data.resumo.total_retencoes}</div>
                </div>
                <div class="summary-card" style="flex: 1; min-width: 200px; background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Valor Total</div>
                    <div style="font-size: 24px; font-weight: 700; color: #ef4444;">${formatCurrency(data.resumo.valor_total)}</div>
                </div>
                <div class="summary-card" style="flex: 1; min-width: 200px; background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Pendente</div>
                    <div style="font-size: 24px; font-weight: 700; color: #f59e0b;">${formatCurrency(data.resumo.valor_pendente)}</div>
                </div>
                <div class="summary-card" style="flex: 1; min-width: 200px; background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Pago</div>
                    <div style="font-size: 24px; font-weight: 700; color: #10b981;">${formatCurrency(data.resumo.valor_pago)}</div>
                </div>
            `;
        }
        
        // Atualizar resumo por imposto
        if (impostosGrid && data.resumo.por_imposto) {
            // Também atualizar filtro de impostos
            const selectImposto = document.getElementById('filter-imposto');
            if (selectImposto && selectImposto.options.length <= 1) {
                data.resumo.por_imposto.forEach(imp => {
                    const option = document.createElement('option');
                    option.value = imp.nome;
                    option.textContent = imp.nome;
                    selectImposto.appendChild(option);
                });
            }
            
            impostosGrid.innerHTML = data.resumo.por_imposto.map(imp => `
                <div style="background: #fef3c7; border-radius: 8px; padding: 12px; border-left: 4px solid #f59e0b;">
                    <div style="font-weight: 600; color: #92400e; margin-bottom: 4px;">${imp.nome}</div>
                    <div style="font-size: 18px; font-weight: 700; color: #78350f;">${formatCurrency(imp.valor_total)}</div>
                    <div style="font-size: 12px; color: #a16207;">${imp.quantidade} retenções</div>
                </div>
            `).join('');
        }
        
        // Renderizar tabela
        if (tabela) {
            if (data.retencoes.length === 0) {
                tabela.innerHTML = `
                    <tr>
                        <td colspan="7" style="padding: 40px; text-align: center; color: #6b7280;">
                            Nenhuma retenção encontrada para os filtros selecionados.
                        </td>
                    </tr>
                `;
            } else {
                tabela.innerHTML = data.retencoes.map(ret => `
                    <tr>
                        <td>
                            <span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
                                ${ret.imposto}
                            </span>
                        </td>
                        <td>${ret.fornecedor}</td>
                        <td>${ret.empresa}</td>
                        <td class="text-end" style="font-weight: 600; color: #dc2626;">${formatCurrency(ret.valor)}</td>
                        <td class="text-center">
                            <span class="badge ${ret.status === 'Pago' ? 'badge-success' : 'badge-warning'}">
                                ${ret.status}
                            </span>
                        </td>
                        <td class="text-center">${ret.competencia || '-'}</td>
                        <td class="text-center">${formatDate(ret.data_vencimento)}</td>
                    </tr>
                `).join('');
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar retenções:', error);
        if (tabela) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: 40px; text-align: center; color: #dc2626;">
                        Erro ao carregar dados. Tente novamente.
                    </td>
                </tr>
            `;
        }
    }
}

function aplicarFiltros() {
    carregarRetencoes();
}

function limparFiltros() {
    document.getElementById('filter-ano').value = new Date().getFullYear();
    document.getElementById('filter-mes').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-imposto').value = '';
    document.getElementById('filter-empresa').value = '';
    carregarRetencoes();
}

function exportarCSV() {
    const tabela = document.getElementById('tabela-retencoes');
    if (!tabela) return;
    
    const rows = tabela.querySelectorAll('tr');
    let csv = 'Imposto,Fornecedor,Empresa,Valor,Status,Competência,Vencimento\n';
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            const rowData = Array.from(cells).map(cell => `"${cell.textContent.trim()}"`).join(',');
            csv += rowData + '\n';
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `retencao_fonte_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    var parts = dateStr.substring(0, 10).split('-');
    if (parts.length === 3) {
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }
    return dateStr;
}
