
// Contas a Pagar - JavaScript
console.log('💳 Carregando módulo de Contas a Pagar...');

let dadosContas = [];
let filtrosAtivos = {};
let taxColsExpanded = true;  // estado do grupo de colunas de impostos

function toggleTaxCols() {
    taxColsExpanded = !taxColsExpanded;
    // Cabeçalhos
    document.querySelectorAll('.tax-detail-col').forEach(el => {
        el.style.display = taxColsExpanded ? '' : 'none';
    });
    const summaryTh = document.getElementById('th-tax-summary');
    if (summaryTh) summaryTh.style.display = taxColsExpanded ? 'none' : '';
    // Linhas do body e tfoot (re-render para atualizar display inline das células)
    renderizarTabela();
    renderizarTotais();
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('💳 Inicializando página de Contas a Pagar...');
    inicializarFiltros();
    aplicarFiltros();   // carrega todas as contas sem filtro de data inicial
    console.log('✅ Página de Contas a Pagar carregada com sucesso!');
});

// Inicializar filtros
function inicializarFiltros() {
    // Popular anos (sem pré-selecionar — mostra todos por padrão)
    if (window.populateYearSelect) {
        window.populateYearSelect('filter-ano', { includeAllOption: true });
    }
    // Sem pré-seleção de mês — exibe todas as contas ao abrir

    // Carregar fornecedores
    carregarFornecedores();
    
    // Event listeners
    ['filter-tipo-data', 'filter-mes', 'filter-ano', 'filter-status', 'filter-fornecedor'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', aplicarFiltros);
    });
    document.getElementById('filter-descricao').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') aplicarFiltros();
    });
}

// Carregar lista de fornecedores
async function carregarFornecedores() {
    try {
        const response = await fetch('/api/fornecedores');
        if (!response.ok) throw new Error('Erro ao carregar fornecedores');
        
        const fornecedores = await response.json();
        const select = document.getElementById('filter-fornecedor');
        
        fornecedores.forEach(fornecedor => {
            const option = document.createElement('option');
            option.value = fornecedor.nome;
            option.textContent = fornecedor.nome;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
    }
}

// Debounce para busca por texto
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Carregar dados do relatório
async function carregarContas() {
    try {
        console.log('💳 Carregando contas a pagar...');
        
        const params = new URLSearchParams();
        // Tipo de data + mês + ano
        if (filtrosAtivos.tipo_data) params.append('tipo_data', filtrosAtivos.tipo_data);
        if (filtrosAtivos.mes) params.append('mes', filtrosAtivos.mes);
        if (filtrosAtivos.ano) params.append('ano', filtrosAtivos.ano);
        // Outros filtros
        if (filtrosAtivos.status) params.append('status', filtrosAtivos.status);
        if (filtrosAtivos.fornecedor) params.append('fornecedor', filtrosAtivos.fornecedor);
        if (filtrosAtivos.descricao) params.append('descricao', filtrosAtivos.descricao);
        
        const response = await fetch(`/api/relatorios/contas-a-pagar?${params}`);
        if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);
        
        const data = await response.json();
        dadosContas = data.contas || [];
        
        renderizarResumo(data.resumo);
        renderizarTabela();
        renderizarTotais();
        
        console.log('✅ Contas a pagar carregadas:', dadosContas.length, 'registros');
        
    } catch (error) {
        console.error('❌ Erro ao carregar contas a pagar:', error);
        mostrarErro('Erro ao carregar dados. Verifique sua conexão e tente novamente.');
    }
}

// Renderizar cards de resumo
function renderizarResumo(resumo) {
    const container = document.getElementById('resumo-container');
    
    container.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Total de Contas</span>
                <div style="width: 24px; height: 24px; border-radius: 6px; background: #3b82f6; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 10px; color: white; font-weight: bold;">#</span>
                </div>
            </div>
            <div style="font-size: 20px; font-weight: 600; color: #374151;">${resumo.total_contas}</div>
        </div>
        
        <div style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Valor Total</span>
                <div style="width: 24px; height: 24px; border-radius: 6px; background: #8b5cf6; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 10px; color: white; font-weight: bold;">R$</span>
                </div>
            </div>
            <div style="font-size: 20px; font-weight: 600; color: #374151;">${formatarMoeda(resumo.valor_total)}</div>
        </div>
        
        <div style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Pendente</span>
                <div style="width: 24px; height: 24px; border-radius: 6px; background: #f59e0b; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 10px; color: white; font-weight: bold;">⏳</span>
                </div>
            </div>
            <div style="font-size: 20px; font-weight: 600; color: #374151;">${formatarMoeda(resumo.valor_pendente)}</div>
        </div>
        
        <div style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Pago</span>
                <div style="width: 24px; height: 24px; border-radius: 6px; background: #10b981; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 10px; color: white; font-weight: bold;">✓</span>
                </div>
            </div>
            <div style="font-size: 20px; font-weight: 600; color: #374151;">${formatarMoeda(resumo.valor_pago)}</div>
        </div>
    `;
}

// Renderizar tfoot com totais
function renderizarTotais() {
    const tfoot = document.getElementById('tabela-totais');
    if (!tfoot) return;

    if (dadosContas.length === 0) {
        tfoot.innerHTML = '';
        return;
    }

    const totalValorBruto  = dadosContas.reduce((s, c) => s + (c.valor_bruto || c.valor || 0), 0);
    const totalINSS         = dadosContas.reduce((s, c) => s + (c.inss || 0), 0);
    const totalIRRF         = dadosContas.reduce((s, c) => s + (c.irrf || 0), 0);
    const totalISS          = dadosContas.reduce((s, c) => s + (c.iss || 0), 0);
    const totalCSLL         = dadosContas.reduce((s, c) => s + (c.csll_pis_cofins || 0), 0);
    const totalJuros        = dadosContas.reduce((s, c) => s + (c.juros_multas || 0), 0);
    const totalAPagar       = dadosContas.reduce((s, c) => s + (c.total_a_pagar || c.valor_pago || c.valor || 0), 0);

    const footStyle = 'padding: 8px 10px; font-size: 12px; font-weight: 600; background: #f1f5f9;';
    const numStyle  = 'text-align: right;';
    const sepStyle  = 'border-left: 2px solid #e5e7eb;';
    tfoot.innerHTML = `
        <tr>
            <td style="${footStyle}" colspan="2">TOTAL — ${dadosContas.length} registros</td>
            <td style="${footStyle}"></td>
            <td style="${footStyle}"></td>
            <td style="${footStyle}"></td>
            <td style="${footStyle}"></td>
            <td style="${footStyle}"></td>
            <td style="${footStyle}"></td>
            <td style="${footStyle} ${numStyle} color: #ef4444;">${formatarMoeda(totalValorBruto)}</td>
            <td class="tax-summary-col" style="${footStyle} ${numStyle} ${sepStyle} color: #374151;${taxColsExpanded ? ' display:none;' : ''}">${(totalINSS+totalIRRF+totalISS+totalCSLL+totalJuros) > 0 ? formatarMoeda(totalINSS+totalIRRF+totalISS+totalCSLL+totalJuros) : '-'}</td>
            <td class="tax-detail-col" style="${footStyle} ${numStyle} ${sepStyle} color: #374151;${taxColsExpanded ? '' : ' display:none;'}">${totalINSS > 0 ? formatarMoeda(totalINSS) : '-'}</td>
            <td class="tax-detail-col" style="${footStyle} ${numStyle} color: #374151;${taxColsExpanded ? '' : ' display:none;'}">${totalIRRF > 0 ? formatarMoeda(totalIRRF) : '-'}</td>
            <td class="tax-detail-col" style="${footStyle} ${numStyle} color: #374151;${taxColsExpanded ? '' : ' display:none;'}">${totalISS > 0 ? formatarMoeda(totalISS) : '-'}</td>
            <td class="tax-detail-col" style="${footStyle} ${numStyle} color: #374151;${taxColsExpanded ? '' : ' display:none;'}">${totalCSLL > 0 ? formatarMoeda(totalCSLL) : '-'}</td>
            <td class="tax-detail-col" style="${footStyle} ${numStyle} color: #374151;${taxColsExpanded ? '' : ' display:none;'}">${totalJuros > 0 ? formatarMoeda(totalJuros) : '-'}</td>
            <td style="${footStyle} ${numStyle} ${sepStyle} color: #ef4444; font-weight: 700;">${formatarMoeda(totalAPagar)}</td>
            <td style="${footStyle} ${sepStyle}"></td>
            <td style="${footStyle}"></td>
            <td style="${footStyle}"></td>
        </tr>
    `;
}

// Renderizar tabela
function renderizarTabela() {
    const tbody = document.getElementById('tabela-contas');

    if (dadosContas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="100" style="padding: 40px; text-align: center; color: #6b7280;">
                    Nenhuma conta a pagar encontrada para os filtros aplicados.
                </td>
            </tr>
        `;
        return;
    }

    const tdBase   = 'padding: 7px 10px; font-size: 13px; color: #374151; vertical-align: middle;';
    const tdNum    = tdBase + 'text-align: right; font-weight: 500;';
    const tdCtr    = tdBase + 'text-align: center;';
    const tdSep    = 'border-left: 2px solid #e5e7eb;';

    tbody.innerHTML = dadosContas.map(conta => {
        const valorBruto    = conta.valor_bruto || conta.valor || 0;
        const totalAPagar   = conta.total_a_pagar != null ? conta.total_a_pagar : valorBruto;
        const inss          = conta.inss || 0;
        const irrf          = conta.irrf || 0;
        const iss           = conta.iss  || 0;
        const csll          = conta.csll_pis_cofins || 0;
        const juros         = conta.juros_multas || 0;
        const dataPgto      = conta.data_pagamento || (conta.status === 'Pago' ? conta.data_vencimento : null);

        return `
        <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="${tdCtr}">${formatarData(dataPgto)}</td>
            <td style="${tdCtr}">${formatarData(conta.data_emissao)}</td>
            <td style="${tdBase}">
                <div style="max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${conta.fornecedor || ''}">${conta.fornecedor || '-'}</div>
            </td>
            <td style="${tdCtr}">${conta.numero_documento || '-'}</td>
            <td style="${tdBase}">
                <div style="max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${conta.conta_contabil || ''}">${conta.conta_contabil || '-'}</div>
            </td>
            <td style="${tdBase}">
                <div style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${conta.centro_custo || ''}">${conta.centro_custo || '-'}</div>
            </td>
            <td style="${tdCtr}">${conta.competencia_contabil || '-'}</td>
            <td style="${tdBase}">
                <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${conta.descricao || ''}">${conta.descricao || '-'}</div>
            </td>
            <td style="${tdNum} color: #ef4444;">${formatarMoeda(valorBruto)}</td>
            <td class="tax-summary-col" style="${tdNum} ${tdSep}${taxColsExpanded ? ' display:none;' : ''}">${(inss+irrf+iss+csll+juros) > 0 ? formatarMoeda(inss+irrf+iss+csll+juros) : '-'}</td>
            <td class="tax-detail-col" style="${tdNum} ${tdSep}${taxColsExpanded ? '' : ' display:none;'}">${inss > 0 ? formatarMoeda(inss) : '-'}</td>
            <td class="tax-detail-col" style="${tdNum}${taxColsExpanded ? '' : ' display:none;'}">${irrf > 0 ? formatarMoeda(irrf) : '-'}</td>
            <td class="tax-detail-col" style="${tdNum}${taxColsExpanded ? '' : ' display:none;'}">${iss  > 0 ? formatarMoeda(iss)  : '-'}</td>
            <td class="tax-detail-col" style="${tdNum}${taxColsExpanded ? '' : ' display:none;'}">${csll > 0 ? formatarMoeda(csll) : '-'}</td>
            <td class="tax-detail-col" style="${tdNum}${taxColsExpanded ? '' : ' display:none;'}">${juros > 0 ? formatarMoeda(juros) : '-'}</td>
            <td style="${tdNum} ${tdSep} color: #ef4444; font-weight: 700;">${formatarMoeda(totalAPagar)}</td>
            <td style="${tdCtr} ${tdSep}">${formatarData(conta.data_vencimento)}</td>
            <td style="${tdCtr}">${renderizarStatusBadge(conta.status)}</td>
            <td style="${tdCtr}">${conta.competencia_gerencial || '-'}</td>
        </tr>`;
    }).join('');
}

// Renderizar badge de status
function renderizarStatusBadge(status) {
    const badges = {
        'Pago': { bg: '#dcfce7', text: '#166534', label: '✓ Pago' },
        'Pendente': { bg: '#fef3c7', text: '#92400e', label: '⏳ Pendente' }
    };
    
    const badge = badges[status] || { bg: '#f3f4f6', text: '#6b7280', label: status };
    
    return `
        <span style="
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            background-color: ${badge.bg};
            color: ${badge.text};
        ">${badge.label}</span>
    `;
}

// Aplicar filtros
function aplicarFiltros() {
    filtrosAtivos = {
        tipo_data: document.getElementById('filter-tipo-data')?.value || 'pagamento',
        mes: document.getElementById('filter-mes')?.value || '',
        ano: document.getElementById('filter-ano')?.value || '',
        status: document.getElementById('filter-status').value,
        fornecedor: document.getElementById('filter-fornecedor').value,
        descricao: document.getElementById('filter-descricao').value
    };
    console.log('💳 Aplicando filtros:', filtrosAtivos);
    carregarContas();
}

// Limpar filtros
function limparFiltros() {
    const tipoEl = document.getElementById('filter-tipo-data');
    if (tipoEl) tipoEl.value = 'pagamento';
    const mesEl = document.getElementById('filter-mes');
    if (mesEl) mesEl.value = '';
    const anoEl = document.getElementById('filter-ano');
    if (anoEl) anoEl.value = '';
    document.getElementById('filter-status').selectedIndex = 0;
    document.getElementById('filter-fornecedor').selectedIndex = 0;
    document.getElementById('filter-descricao').value = '';
    filtrosAtivos = {};
    carregarContas();
}

// Exportar Excel via SheetJS (client-side)
async function exportarExcel() {
    try {
        if (typeof XLSX === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        if (dadosContas.length === 0) {
            alert('Não há dados para exportar');
            return;
        }

        const excelData = dadosContas.map(c => {
            const dataPgtoExcel = c.data_pagamento || (c.status === 'Pago' ? c.data_vencimento : null);
            return {
            'Data Pgto':        dataPgtoExcel ? formatarData(dataPgtoExcel) : '',
            'Data Emissão':     c.data_emissao   ? formatarData(c.data_emissao)   : '',
            'Fornecedor':       c.fornecedor      || '',
            'Nº Documento':     c.numero_documento || '',
            'Conta Contábil':   c.conta_contabil  || '',
            'Centro de Custo':  c.centro_custo    || '',
            'Comp. Contábil':   c.competencia_contabil || '',
            'Descrição':        c.descricao       || '',
            'Valor Bruto':      c.valor_bruto || c.valor || 0,
            'INSS':             c.inss             || 0,
            'IRRF':             c.irrf             || 0,
            'ISS':              c.iss              || 0,
            'CSLL/PIS/COFINS':  c.csll_pis_cofins  || 0,
            'Juros e Multas':   c.juros_multas     || 0,
            'Total a Pagar':    c.total_a_pagar != null ? c.total_a_pagar : (c.valor_bruto || c.valor || 0),
            'Vencimento':       c.data_vencimento ? formatarData(c.data_vencimento) : '',
            'Status':           c.status || '',
            'Comp. Gerencial':  c.competencia_gerencial || '',
        };
        });

        // Linha de totais
        const keys = Object.keys(excelData[0]);
        const totais = {};
        keys.forEach(k => { totais[k] = ''; });
        totais['Data Pgto']    = 'TOTAL';
        totais['Fornecedor']   = `${dadosContas.length} registros`;
        totais['Valor Bruto']  = excelData.reduce((s, r) => s + (r['Valor Bruto'] || 0), 0);
        totais['INSS']          = excelData.reduce((s, r) => s + (r['INSS'] || 0), 0);
        totais['IRRF']          = excelData.reduce((s, r) => s + (r['IRRF'] || 0), 0);
        totais['ISS']           = excelData.reduce((s, r) => s + (r['ISS'] || 0), 0);
        totais['CSLL/PIS/COFINS'] = excelData.reduce((s, r) => s + (r['CSLL/PIS/COFINS'] || 0), 0);
        totais['Juros e Multas']  = excelData.reduce((s, r) => s + (r['Juros e Multas'] || 0), 0);
        totais['Total a Pagar'] = excelData.reduce((s, r) => s + (r['Total a Pagar'] || 0), 0);
        excelData.push(totais);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        const colWidths = keys.map(key => {
            let maxLen = key.length;
            excelData.forEach(row => { const v = String(row[key] || ''); if (v.length > maxLen) maxLen = v.length; });
            return { wch: Math.min(maxLen + 2, 40) };
        });
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Contas a Pagar');

        const dataAtual = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `contas_a_pagar_${dataAtual}.xlsx`);

        if (window.showNotification) showNotification('Excel exportado com sucesso!', 'success');

    } catch (error) {
        console.error('❌ Erro ao exportar Excel:', error);
        alert('Erro ao exportar Excel: ' + error.message);
    }
}

// Exportar CSV
function exportarCSV() {
    if (dadosContas.length === 0) {
        alert('Não há dados para exportar');
        return;
    }
    
    const headers = ['Fornecedor', 'Descrição', 'Valor', 'Status', 'Vencimento', 'Pagamento', 'Documento'];
    const csvContent = [
        headers.join(','),
        ...dadosContas.map(conta => {
            const isPago = conta.status === 'Pago';
            const valorExp = (isPago && conta.valor_pago != null) ? conta.valor_pago : conta.valor;
            const dataPagExp = conta.data_pagamento || (isPago ? conta.data_vencimento : '') || '';
            return [
                `"${conta.fornecedor}"`,
                `"${conta.descricao}"`,
                valorExp,
                `"${conta.status}"`,
                conta.data_vencimento || '',
                dataPagExp,
                `"${conta.numero_documento || ''}"`
            ].join(',');
        })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contas-a-pagar-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// Funções utilitárias
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor || 0);
}

function formatarData(dataString) {
    if (!dataString) return '-';
    try {
        var parts = dataString.substring(0, 10).split('-');
        if (parts.length === 3) {
            return parts[2] + '/' + parts[1] + '/' + parts[0];
        }
        return dataString;
    } catch(e) {
        return dataString;
    }
}

function mostrarErro(mensagem) {
    const tbody = document.getElementById('tabela-contas');
    tbody.innerHTML = `
        <tr>
            <td colspan="100" style="padding: 40px; text-align: center; color: #ef4444;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">⚠️</span>
                    <span>${mensagem}</span>
                </div>
            </td>
        </tr>
    `;
}
