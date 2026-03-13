console.log('💰 Carregando módulo de Contas a Receber...');

let dadosContas = [];
let filtrosAtivos = {};
let aliquotasUniformes = true;
let aliquotasResumo = {};

document.addEventListener('DOMContentLoaded', function() {
    console.log('💰 Inicializando página de Contas a Receber...');
    inicializarFiltros();
    carregarContas();
    console.log('✅ Página de Contas a Receber carregada com sucesso!');
});

function inicializarFiltros() {
    if (window.populateYearSelect) {
        window.populateYearSelect('filter-ano', { includeAllOption: true, selectedYear: new Date().getFullYear() });
    }
    carregarClientes();
    document.getElementById('filter-tipo-data').addEventListener('change', aplicarFiltros);
    document.getElementById('filter-ano').addEventListener('change', aplicarFiltros);
    document.getElementById('filter-mes').addEventListener('change', aplicarFiltros);
    document.getElementById('filter-status').addEventListener('change', aplicarFiltros);
    document.getElementById('filter-cliente').addEventListener('change', aplicarFiltros);
    document.getElementById('filter-descricao').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') aplicarFiltros();
    });
}

async function carregarClientes() {
    try {
        const response = await fetch('/api/clientes?com_receitas=true');
        if (!response.ok) throw new Error('Erro ao carregar clientes');
        const clientes = await response.json();
        const select = document.getElementById('filter-cliente');
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.nome;
            option.textContent = cliente.nome;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
    }
}

async function carregarContas() {
    try {
        console.log('💰 Carregando contas a receber...');

        const params = new URLSearchParams();
        if (filtrosAtivos.tipo_data) params.append('tipo_data', filtrosAtivos.tipo_data);
        if (filtrosAtivos.ano) params.append('ano', filtrosAtivos.ano);
        if (filtrosAtivos.mes) params.append('mes', filtrosAtivos.mes);
        if (filtrosAtivos.status) params.append('status', filtrosAtivos.status);
        if (filtrosAtivos.descricao) params.append('descricao', filtrosAtivos.descricao);

        if (filtrosAtivos.cliente) {
            params.append('cliente', filtrosAtivos.cliente);
        } else {
            params.append('clientes_com_valores', 'true');
        }

        const response = await fetch(`/api/relatorios/contas-a-receber?${params}`);
        if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);

        const data = await response.json();
        dadosContas = data.contas || [];

        aliquotasUniformes = data.resumo?.aliquotas_uniformes !== false;
        aliquotasResumo = data.resumo?.aliquotas || {};

        atualizarCabecalhosImpostos();
        renderizarResumo(data.resumo);
        renderizarTabela();

        console.log('✅ Contas a receber carregadas:', dadosContas.length, 'registros');

    } catch (error) {
        console.error('❌ Erro ao carregar contas a receber:', error);
        mostrarErro('Erro ao carregar dados. Verifique sua conexão e tente novamente.');
    }
}

function atualizarCabecalhosImpostos() {
    const thIrpj = document.getElementById('th-irpj');
    if (thIrpj) {
        const label = thIrpj.querySelector('.th-label');
        if (label) {
            if (aliquotasUniformes && aliquotasResumo.irpj) {
                const pct = aliquotasResumo.irpj.toFixed(2).replace('.', ',');
                label.textContent = `IRPJ (${pct}%)`;
            } else {
                label.textContent = 'IRPJ';
            }
        }
    }

    const thGrouped = document.getElementById('th-csll-pis-cofins');
    if (thGrouped) {
        const label = thGrouped.querySelector('.th-label');
        if (label) {
            if (aliquotasUniformes && aliquotasResumo.csll != null) {
                const combinedPct = ((aliquotasResumo.csll || 0) + (aliquotasResumo.pis || 0) + (aliquotasResumo.cofins || 0)).toFixed(2).replace('.', ',');
                label.textContent = `CSLL/PIS/COFINS (${combinedPct}%)`;
            } else {
                label.textContent = 'CSLL/PIS/COFINS';
            }
        }
    }

    const thIss = document.getElementById('th-iss');
    if (thIss) {
        const label = thIss.querySelector('.th-label');
        if (label) {
            if (aliquotasUniformes && aliquotasResumo.iss) {
                const pct = aliquotasResumo.iss.toFixed(2).replace('.', ',');
                label.textContent = `ISS (${pct}%)`;
            } else {
                label.textContent = 'ISS';
            }
        }
    }
}

function renderizarResumo(resumo) {
    const container = document.getElementById('resumo-container');

    container.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1; min-width: 140px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 11px; color: #6b7280; font-weight: 500;">Total de Contas</span>
                <div style="width: 22px; height: 22px; border-radius: 6px; background: #3b82f6; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 9px; color: white; font-weight: bold;">#</span>
                </div>
            </div>
            <div style="font-size: 18px; font-weight: 600; color: #374151;">${resumo.total_contas}</div>
        </div>
        <div style="background: white; border-radius: 8px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1; min-width: 140px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 11px; color: #6b7280; font-weight: 500;">Valor Bruto Total</span>
                <div style="width: 22px; height: 22px; border-radius: 6px; background: #8b5cf6; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 9px; color: white; font-weight: bold;">R$</span>
                </div>
            </div>
            <div style="font-size: 18px; font-weight: 600; color: #374151;">${formatarMoeda(resumo.valor_total)}</div>
        </div>
        <div style="background: white; border-radius: 8px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1; min-width: 140px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 11px; color: #6b7280; font-weight: 500;">Valor Líquido</span>
                <div style="width: 22px; height: 22px; border-radius: 6px; background: #059669; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 9px; color: white; font-weight: bold;">$</span>
                </div>
            </div>
            <div style="font-size: 18px; font-weight: 600; color: #059669;">${formatarMoeda(resumo.total_liquido || 0)}</div>
        </div>
        <div style="background: white; border-radius: 8px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1; min-width: 140px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 11px; color: #6b7280; font-weight: 500;">Pendente</span>
                <div style="width: 22px; height: 22px; border-radius: 6px; background: #f59e0b; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 9px; color: white; font-weight: bold;">⏳</span>
                </div>
            </div>
            <div style="font-size: 18px; font-weight: 600; color: #374151;">${formatarMoeda(resumo.valor_pendente)}</div>
        </div>
        <div style="background: white; border-radius: 8px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1; min-width: 140px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 11px; color: #6b7280; font-weight: 500;">Recebido</span>
                <div style="width: 22px; height: 22px; border-radius: 6px; background: #10b981; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 9px; color: white; font-weight: bold;">✓</span>
                </div>
            </div>
            <div style="font-size: 18px; font-weight: 600; color: #374151;">${formatarMoeda(resumo.valor_recebido)}</div>
        </div>
        <div style="background: white; border-radius: 8px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1; min-width: 140px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 11px; color: #6b7280; font-weight: 500;">Total Impostos</span>
                <div style="width: 22px; height: 22px; border-radius: 6px; background: #dc2626; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 9px; color: white; font-weight: bold;">%</span>
                </div>
            </div>
            <div style="font-size: 18px; font-weight: 600; color: #dc2626;">${formatarMoeda(resumo.total_impostos || 0)}</div>
        </div>
    `;
}

function calcularImpostosConta(conta) {
    const imp = conta.impostos || {};
    const irpj = imp.irpj || 0;
    const csllPisCofins = (imp.csll || 0) + (imp.pis || 0) + (imp.cofins || 0);
    const iss = imp.iss || 0;
    const totalConhecidos = irpj + csllPisCofins + iss;
    const totalGeral = conta.valor_impostos_total || 0;
    const outrosDescontos = Math.max(0, totalGeral - totalConhecidos);
    const aliq = imp.aliquotas || {};
    const aliqIrpj = aliq.irpj || 0;
    const aliqCsllPisCofins = (aliq.csll || 0) + (aliq.pis || 0) + (aliq.cofins || 0);
    const aliqIss = aliq.iss || 0;
    return { irpj, csllPisCofins, iss, outrosDescontos, aliqIrpj, aliqCsllPisCofins, aliqIss };
}

function renderizarTabela() {
    const tbody = document.getElementById('tabela-contas');
    const tfoot = document.getElementById('tabela-totais');

    if (dadosContas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" style="padding: 40px; text-align: center; color: #6b7280;">
                    Nenhuma conta a receber encontrada para os filtros aplicados.
                </td>
            </tr>
        `;
        tfoot.innerHTML = '';
        return;
    }

    const cellStyle = 'padding: 6px 10px; font-size: 12px; white-space: nowrap;';

    tbody.innerHTML = dadosContas.map(conta => {
        const impostos = calcularImpostosConta(conta);

        let pdfLink = '<span style="color: #d1d5db;">-</span>';
        if (conta.link_nota_fiscal) {
            const safeUrl = (conta.link_nota_fiscal.startsWith('http://') || conta.link_nota_fiscal.startsWith('https://')) ? conta.link_nota_fiscal : '#';
            pdfLink = `<a href="${safeUrl}" target="_blank" rel="noopener" style="color: #3b82f6; text-decoration: none;" title="Abrir PDF da Fatura">📄</a>`;
        }

        return `
        <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="${cellStyle} text-align: center; color: #6b7280;">
                ${formatarData(conta.data_emissao_nf)}
            </td>
            <td style="${cellStyle} color: #374151;">
                ${conta.cliente || 'N/I'}
            </td>
            <td style="${cellStyle} text-align: center; color: #6b7280;">
                ${conta.competencia_contabil || conta.competencia || '-'}
            </td>
            <td style="${cellStyle} text-align: center; color: #6b7280;">
                ${conta.competencia_gerencial || conta.competencia || '-'}
            </td>
            <td style="${cellStyle} text-align: center; color: #6b7280;">
                ${conta.numero_nf || '-'}
            </td>
            <td style="${cellStyle} text-align: right; font-weight: 500; color: #10b981;">
                ${formatarMoeda(conta.valor_bruto)}
            </td>
            <td style="${cellStyle} text-align: right; color: #6b7280; border-left: 2px solid #e5e7eb;">
                ${formatarMoeda(impostos.irpj)}${!aliquotasUniformes && impostos.aliqIrpj ? ' <span style="color:#9ca3af;font-size:10px;">(' + impostos.aliqIrpj.toFixed(2).replace('.',',') + '%)</span>' : ''}
            </td>
            <td style="${cellStyle} text-align: right; color: #6b7280;">
                ${formatarMoeda(impostos.csllPisCofins)}${!aliquotasUniformes && impostos.aliqCsllPisCofins ? ' <span style="color:#9ca3af;font-size:10px;">(' + impostos.aliqCsllPisCofins.toFixed(2).replace('.',',') + '%)</span>' : ''}
            </td>
            <td style="${cellStyle} text-align: right; color: #6b7280;">
                ${formatarMoeda(impostos.iss)}${!aliquotasUniformes && impostos.aliqIss ? ' <span style="color:#9ca3af;font-size:10px;">(' + impostos.aliqIss.toFixed(2).replace('.',',') + '%)</span>' : ''}
            </td>
            <td style="${cellStyle} text-align: right; color: #6b7280;">
                ${formatarMoeda(impostos.outrosDescontos)}
            </td>
            <td style="${cellStyle} text-align: right; font-weight: 600; color: #059669;">
                ${formatarMoeda(conta.valor_liquido)}
            </td>
            <td style="${cellStyle} text-align: center;">
                ${pdfLink}
            </td>
            <td style="${cellStyle} text-align: center; color: #6b7280;">
                ${formatarData(conta.data_pagamento)}
            </td>
            <td style="${cellStyle} text-align: right; font-weight: 500; color: #374151;">
                ${conta.valor_recebido != null ? formatarMoeda(conta.valor_recebido) : '-'}
            </td>
        </tr>`;
    }).join('');

    const totais = {
        valor_bruto: 0, valor_liquido: 0, valor_recebido: 0,
        irpj: 0, csllPisCofins: 0, iss: 0, outrosDescontos: 0
    };
    dadosContas.forEach(c => {
        const imp = calcularImpostosConta(c);
        totais.valor_bruto += (c.valor_bruto || 0);
        totais.valor_liquido += (c.valor_liquido || 0);
        totais.valor_recebido += (c.valor_recebido || 0);
        totais.irpj += imp.irpj;
        totais.csllPisCofins += imp.csllPisCofins;
        totais.iss += imp.iss;
        totais.outrosDescontos += imp.outrosDescontos;
    });

    const footStyle = 'padding: 8px 10px; font-size: 12px; font-weight: 700; white-space: nowrap; border-top: 2px solid #94a3b8;';
    tfoot.innerHTML = `
        <tr style="background: #f1f5f9;">
            <td style="${footStyle} color: #1e293b;">TOTAL</td>
            <td style="${footStyle} color: #6b7280;">${dadosContas.length} registros</td>
            <td style="${footStyle}"></td>
            <td style="${footStyle}"></td>
            <td style="${footStyle}"></td>
            <td style="${footStyle} text-align: right; color: #10b981;">${formatarMoeda(totais.valor_bruto)}</td>
            <td style="${footStyle} text-align: right; color: #6b7280; border-left: 2px solid #e5e7eb;">${formatarMoeda(totais.irpj)}</td>
            <td style="${footStyle} text-align: right; color: #6b7280;">${formatarMoeda(totais.csllPisCofins)}</td>
            <td style="${footStyle} text-align: right; color: #6b7280;">${formatarMoeda(totais.iss)}</td>
            <td style="${footStyle} text-align: right; color: #6b7280;">${formatarMoeda(totais.outrosDescontos)}</td>
            <td style="${footStyle} text-align: right; color: #059669;">${formatarMoeda(totais.valor_liquido)}</td>
            <td style="${footStyle}"></td>
            <td style="${footStyle}"></td>
            <td style="${footStyle} text-align: right; color: #374151;">${formatarMoeda(totais.valor_recebido)}</td>
        </tr>
    `;
}

function aplicarFiltros() {
    filtrosAtivos = {
        tipo_data: document.getElementById('filter-tipo-data').value || 'contabil',
        ano: document.getElementById('filter-ano').value,
        mes: document.getElementById('filter-mes').value,
        status: document.getElementById('filter-status').value,
        cliente: document.getElementById('filter-cliente').value,
        descricao: document.getElementById('filter-descricao').value
    };
    console.log('💰 Aplicando filtros:', filtrosAtivos);
    carregarContas();
}

function limparFiltros() {
    document.getElementById('filter-tipo-data').selectedIndex = 0;
    document.getElementById('filter-ano').selectedIndex = 0;
    document.getElementById('filter-mes').selectedIndex = 0;
    document.getElementById('filter-status').selectedIndex = 0;
    document.getElementById('filter-cliente').selectedIndex = 0;
    document.getElementById('filter-descricao').value = '';
    filtrosAtivos = {};
    carregarContas();
}

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

        const irpjLabel = aliquotasUniformes && aliquotasResumo.irpj
            ? `IRPJ (${aliquotasResumo.irpj.toFixed(2).replace('.', ',')}%)`
            : 'IRPJ';

        const groupedPct = aliquotasUniformes && aliquotasResumo.csll != null
            ? ((aliquotasResumo.csll || 0) + (aliquotasResumo.pis || 0) + (aliquotasResumo.cofins || 0)).toFixed(2).replace('.', ',')
            : null;
        const groupedLabel = groupedPct ? `CSLL/PIS/COFINS (${groupedPct}%)` : 'CSLL/PIS/COFINS';

        const issLabel = aliquotasUniformes && aliquotasResumo.iss
            ? `ISS (${aliquotasResumo.iss.toFixed(2).replace('.', ',')}%)`
            : 'ISS';

        const excelData = dadosContas.map(c => {
            const impostos = calcularImpostosConta(c);
            return {
                'Emissão NF': c.data_emissao_nf ? formatarData(c.data_emissao_nf) : '',
                'Cliente': c.cliente || '',
                'Comp.Cont.': c.competencia_contabil || '',
                'Comp.Ger.': c.competencia_gerencial || '',
                'NF': c.numero_nf || '',
                'Valor Bruto': c.valor_bruto || 0,
                [irpjLabel]: impostos.irpj,
                [groupedLabel]: impostos.csllPisCofins,
                [issLabel]: impostos.iss,
                'Outros Descontos': impostos.outrosDescontos,
                'Valor Líquido': c.valor_liquido || 0,
                'Link PDF': c.link_nota_fiscal || '',
                'Recebimento': c.data_pagamento ? formatarData(c.data_pagamento) : '',
                'Valor Recebido': c.valor_recebido || 0
            };
        });

        const totais = {};
        const keys = Object.keys(excelData[0]);
        keys.forEach(k => {
            if (k === 'Emissão NF') { totais[k] = 'TOTAL'; return; }
            if (k === 'Cliente') { totais[k] = `${dadosContas.length} registros`; return; }
            const numericKeys = ['Valor Bruto', 'Valor Líquido', 'Outros Descontos', 'Valor Recebido', irpjLabel, groupedLabel, issLabel];
            if (numericKeys.includes(k)) {
                totais[k] = excelData.reduce((sum, r) => sum + (r[k] || 0), 0);
            } else {
                totais[k] = '';
            }
        });
        excelData.push(totais);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        const colWidths = [];
        keys.forEach(key => {
            let maxLen = key.length;
            excelData.forEach(row => {
                const val = String(row[key] || '');
                if (val.length > maxLen) maxLen = val.length;
            });
            colWidths.push({ wch: Math.min(maxLen + 2, 40) });
        });
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Contas a Receber');

        const dataAtual = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `contas_a_receber_${dataAtual}.xlsx`);

        if (window.showNotification) {
            showNotification('Excel exportado com sucesso!', 'success');
        }

    } catch (error) {
        console.error('❌ Erro ao exportar Excel:', error);
        alert('Erro ao exportar Excel: ' + error.message);
    }
}

function formatarMoeda(valor) {
    const num = parseFloat(valor) || 0;
    const fixed = Math.abs(num).toFixed(2);
    const parts = fixed.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const sign = num < 0 ? '-' : '';
    return `${sign}R$ ${intPart},${parts[1]}`;
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
            <td colspan="13" style="padding: 40px; text-align: center; color: #ef4444;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">⚠️</span>
                    <span>${mensagem}</span>
                </div>
            </td>
        </tr>
    `;
}
