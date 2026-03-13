let dadosRateio = null;

// Carregar dados iniciais
document.addEventListener('DOMContentLoaded', function() {
    // Popular campo de ano com ano corrente + passados + 5 futuros
    if (window.populateYearSelect) {
        window.populateYearSelect('filtro-ano', { includePlaceholder: false });
    }
    carregarEmpresas();
    carregarRateio();
});

// Carregar empresas para filtro
async function carregarEmpresas() {
    try {
        const response = await fetch('/api/empresas');
        const empresas = await response.json();

        const select = document.getElementById('filtro-empresa');
        empresas.forEach(empresa => {
            const option = document.createElement('option');
            option.value = empresa.id;
            option.textContent = empresa.nome_fantasia || empresa.razao_social;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
    }
}

// Carregar dados de rateio
async function carregarRateio() {
    try {
        const ano = document.getElementById('filtro-ano').value;
        const mesInicio = document.getElementById('filtro-mes-inicio').value;
        const mesFim = document.getElementById('filtro-mes-fim').value;
        const tipo = document.getElementById('filtro-tipo').value;

        console.log(`🔄 Carregando rateio: ano=${ano}, mês ${mesInicio} a ${mesFim}, tipo=${tipo}`);

        const params = new URLSearchParams({
            ano,
            mes_inicio: mesInicio,
            mes_fim: mesFim,
            tipo
        });

        const empresa = document.getElementById('filtro-empresa').value;
        if (empresa) {
            params.append('empresa', empresa);
        }

        const response = await fetch(`/api/relatorios/rateio-despesas?${params}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        dadosRateio = await response.json();

        console.log('📊 Dados de rateio recebidos:', dadosRateio);
        console.log('📊 Quantidade de clientes:', Object.keys(dadosRateio.rateio_por_cliente || {}).length);

        // Verificar estrutura dos dados de cada cliente
        if (dadosRateio.rateio_por_cliente) {
            Object.entries(dadosRateio.rateio_por_cliente).forEach(([cliente, dados]) => {
                console.log(`   Cliente ${cliente}:`, {
                    faturamento_total: dados.faturamento_total,
                    rateio_total: dados.rateio_total,
                    percentual: dados.percentual,
                    meses_com_valores: dados.rateio_meses ? dados.rateio_meses.filter(v => v > 0).length : 0
                });
            });
        }

        atualizarResumo();
        renderizarTabelaMensal();
        renderizarTabelaClientes();

    } catch (error) {
        console.error('❌ Erro ao carregar rateio:', error);
        mostrarErro('Erro ao carregar dados de rateio: ' + error.message);
    }
}

// Atualizar cards de resumo
function atualizarResumo() {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    // Calcular totais reais a partir dos dados
    let totalRateado = 0;
    let totalFaturamento = 0;

    if (dadosRateio.rateio_por_cliente) {
        Object.values(dadosRateio.rateio_por_cliente).forEach(cliente => {
            totalRateado += cliente.rateio_total || 0;
            totalFaturamento += cliente.faturamento_total || 0;
        });
    }

    // Exibir totais
    document.getElementById('total-faturado').textContent = formatarMoeda(totalFaturamento);
    document.getElementById('total-rateado').textContent = formatarMoeda(totalRateado);
    document.getElementById('num-clientes').textContent = dadosRateio.quantidade_clientes || 0;

    const mesInicio = meses[dadosRateio.mes_inicio - 1];
    const mesFim = meses[dadosRateio.mes_fim - 1];
    const periodo = mesInicio === mesFim ? 
        `${mesInicio}/${dadosRateio.ano}` : 
        `${mesInicio} - ${mesFim}/${dadosRateio.ano}`;

    document.getElementById('periodo-exibido').textContent = periodo;

    console.log(`📊 Resumo: Total Rateado = R$ ${totalRateado.toFixed(2)}, Total Faturamento = R$ ${totalFaturamento.toFixed(2)}, Clientes = ${dadosRateio.quantidade_clientes}`);
}

// Renderizar tabela mensal com distribuição ao longo do tempo
function renderizarTabelaMensal() {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                   'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const rateio = dadosRateio.rateio_por_cliente;
    const mesInicio = dadosRateio.mes_inicio;
    const mesFim = dadosRateio.mes_fim;

    if (!rateio || Object.keys(rateio).length === 0) {
        document.getElementById('lista-rateio-mensal').innerHTML = 
            '<tr><td colspan="13" style="text-align: center; padding: 40px;">Nenhum dado de rateio encontrado para o período selecionado</td></tr>';
        return;
    }

    // Identificar meses com dados (colunas dinâmicas)
    const mesesComDados = [];
    for (let i = 0; i < (mesFim - mesInicio + 1); i++) {
        let temDados = false;
        Object.values(rateio).forEach(dados => {
            if (dados.rateio_meses && dados.rateio_meses[i] > 0) temDados = true;
            if (dados.faturamento_meses && dados.faturamento_meses[i] > 0) temDados = true;
        });
        if (temDados) {
            mesesComDados.push({
                indiceOriginal: i,
                indiceAbsoluto: mesInicio - 1 + i,
                nome: meses[mesInicio - 1 + i]
            });
        }
    }

    console.log(`📊 Meses com dados: ${mesesComDados.length} de ${mesFim - mesInicio + 1}`);

    // Criar cabeçalho apenas com meses que têm dados
    const thead = document.getElementById('cabecalho-mensal');
    let headerHTML = '<tr><th style="position: sticky; left: 0; background: white; z-index: 10; min-width: 200px;">Cliente</th>';

    mesesComDados.forEach(mes => {
        headerHTML += `<th style="text-align: center; min-width: 150px;">${mes.nome}</th>`;
    });
    headerHTML += '<th style="text-align: right; background: #f9fafb; font-weight: bold;">TOTAL</th></tr>';
    thead.innerHTML = headerHTML;

    // Criar linhas para cada cliente
    const tbody = document.getElementById('lista-rateio-mensal');

    // Calcular totais mensais para percentuais (apenas meses com dados)
    const totaisMensais = {};
    mesesComDados.forEach(mes => {
        totaisMensais[mes.indiceOriginal] = 0;
        Object.values(rateio).forEach(dados => {
            if (dados.rateio_meses && dados.rateio_meses[mes.indiceOriginal]) {
                totaisMensais[mes.indiceOriginal] += dados.rateio_meses[mes.indiceOriginal];
            }
        });
    });

    let rowsHTML = '';
    Object.entries(rateio).forEach(([cliente, dados]) => {
        const clienteId = cliente.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
        const temDetalhes = dados.detalhes && Object.keys(dados.detalhes).length > 0;
        
        // Linha principal do cliente
        let rowHTML = `<tr data-testid="row-mensal-${clienteId}" class="cliente-row" data-cliente="${clienteId}">`;
        rowHTML += `<td style="position: sticky; left: 0; background: white; z-index: 5; cursor: ${temDetalhes ? 'pointer' : 'default'};" onclick="${temDetalhes ? `toggleDrillDown('${clienteId}')` : ''}">
            ${temDetalhes ? `<i id="icon-${clienteId}" class="fas fa-chevron-right" style="margin-right: 8px; color: #6b7280; transition: transform 0.2s;"></i>` : '<span style="margin-right: 20px;"></span>'}
            <strong>${cliente}</strong>
        </td>`;

        // Células apenas para meses com dados
        mesesComDados.forEach(mes => {
            const idx = mes.indiceOriginal;
            const valor = dados.rateio_meses ? dados.rateio_meses[idx] || 0 : 0;
            const percentual = totaisMensais[idx] > 0 ? (valor / totaisMensais[idx] * 100) : 0;
            const bgColor = valor > 0 ? getColorByPercentage(percentual) : '#f9fafb';

            rowHTML += `
                <td style="text-align: center; background: ${bgColor}; font-size: 13px;">
                    ${valor > 0 ? `
                        <div style="font-weight: bold;">${formatarMoedaCompacto(valor)}</div>
                        <div style="font-size: 11px; color: #6b7280;">${percentual.toFixed(1)}%</div>
                    ` : '-'}
                </td>
            `;
        });

        // Coluna de total
        rowHTML += `
            <td style="text-align: right; background: #f9fafb; font-weight: bold; font-size: 14px;">
                ${formatarMoeda(dados.rateio_total)}
            </td>
        </tr>`;
        rowsHTML += rowHTML;

        // Linhas de drill down (categorias) - inicialmente ocultas
        if (temDetalhes) {
            const categoriasOrdenadas = Object.entries(dados.detalhes)
                .sort((a, b) => b[1].total - a[1].total);

            categoriasOrdenadas.forEach(([categoria, catDados]) => {
                let drillRowHTML = `<tr class="drill-down-row drill-${clienteId}" style="display: none; background: #fafafa;">`;
                drillRowHTML += `<td style="position: sticky; left: 0; background: #fafafa; z-index: 5; padding-left: 35px; font-size: 12px; color: #4b5563;">
                    <i class="fas fa-arrow-right" style="margin-right: 6px; font-size: 10px; color: #9ca3af;"></i>${categoria}
                </td>`;

                mesesComDados.forEach(mes => {
                    const idx = mes.indiceOriginal;
                    const valorCat = catDados.meses ? catDados.meses[idx] || 0 : 0;

                    drillRowHTML += `
                        <td style="text-align: center; font-size: 12px; color: #6b7280; background: #fafafa;">
                            ${valorCat > 0 ? formatarMoedaCompacto(valorCat) : '-'}
                        </td>
                    `;
                });

                drillRowHTML += `
                    <td style="text-align: right; background: #f3f4f6; font-size: 12px; font-weight: 500;">
                        ${formatarMoeda(catDados.total)}
                    </td>
                </tr>`;
                rowsHTML += drillRowHTML;
            });
        }
    });
    tbody.innerHTML = rowsHTML;

    // Calcular totais de faturamento mensais (apenas meses com dados)
    const totaisFaturamentoMensais = {};
    mesesComDados.forEach(mes => {
        totaisFaturamentoMensais[mes.indiceOriginal] = 0;
        Object.values(rateio).forEach(dados => {
            if (dados.faturamento_meses && dados.faturamento_meses[mes.indiceOriginal]) {
                totaisFaturamentoMensais[mes.indiceOriginal] += dados.faturamento_meses[mes.indiceOriginal];
            }
        });
    });

    // Adicionar linha de totais de faturamento
    let totalFaturamentoRow = '<tr style="border-top: 2px solid #e5e7eb; background: #e0f2fe; font-weight: bold;">';
    totalFaturamentoRow += '<td style="position: sticky; left: 0; background: #e0f2fe; z-index: 5;">TOTAL FATURAMENTO</td>';

    mesesComDados.forEach(mes => {
        const total = totaisFaturamentoMensais[mes.indiceOriginal] || 0;
        totalFaturamentoRow += `<td style="text-align: center;">${total > 0 ? formatarMoedaCompacto(total) : '-'}</td>`;
    });

    const totalFaturamentoGeral = Object.values(rateio).reduce((sum, dados) => sum + dados.faturamento_total, 0);
    totalFaturamentoRow += `<td style="text-align: right; background: #bae6fd;">${formatarMoeda(totalFaturamentoGeral)}</td></tr>`;
    tbody.innerHTML += totalFaturamentoRow;

    // Adicionar linha de totais de rateio
    let totalRateioRow = '<tr style="background: #f3f4f6; font-weight: bold;">';
    totalRateioRow += '<td style="position: sticky; left: 0; background: #f3f4f6; z-index: 5;">TOTAL RATEIO</td>';

    mesesComDados.forEach(mes => {
        const total = totaisMensais[mes.indiceOriginal] || 0;
        totalRateioRow += `<td style="text-align: center;">${total > 0 ? formatarMoedaCompacto(total) : '-'}</td>`;
    });

    totalRateioRow += `<td style="text-align: right; background: #e5e7eb;">${formatarMoeda(dadosRateio.total_rateado)}</td></tr>`;
    tbody.innerHTML += totalRateioRow;
    
    // Posicionar no semestre atual após renderizar
    posicionarNoSemestreAtual();
}

// Obter cor baseada no percentual
function getColorByPercentage(percentual) {
    if (percentual >= 40) return '#dbeafe'; // Azul claro
    if (percentual >= 25) return '#dcfce7'; // Verde claro
    if (percentual >= 15) return '#fef3c7'; // Amarelo claro
    if (percentual >= 5) return '#fee2e2';  // Vermelho claro
    return '#f9fafb'; // Cinza
}

// Formatar moeda de forma compacta (para tabela mensal)
function formatarMoedaCompacto(valor) {
    if (valor >= 1000000) {
        return `R$ ${(valor / 1000000).toFixed(1)}M`;
    } else if (valor >= 1000) {
        return `R$ ${(valor / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valor || 0);
}

// Renderizar tabela de clientes
function renderizarTabelaClientes() {
    const tbody = document.getElementById('lista-rateio-clientes');
    const rateio = dadosRateio.rateio_por_cliente;

    if (!rateio || Object.keys(rateio).length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">Nenhum dado de rateio encontrado para o período selecionado</td></tr>';
        return;
    }

    tbody.innerHTML = Object.entries(rateio).map(([cliente, dados]) => `
        <tr data-testid="row-cliente-${cliente.replace(/\s+/g, '-')}">
            <td><strong>${cliente}</strong></td>
            <td style="text-align: right;">${formatarMoeda(dados.faturamento_total)}</td>
            <td style="text-align: right;">${formatarMoeda(dados.rateio_total)}</td>
            <td style="text-align: right;">
                <span class="badge badge-primary">${dados.percentual.toFixed(1)}%</span>
            </td>
            <td style="text-align: center;">
                <button class="btn btn-sm btn-info" onclick="verDetalhamento('${cliente}')" data-testid="button-detalhar-${cliente.replace(/\s+/g, '-')}">
                    <i class="fas fa-eye"></i> Detalhar
                </button>
            </td>
        </tr>
    `).join('');

    // Calcular totais das colunas
    const totalFaturamentoGeral = Object.values(rateio).reduce((sum, dados) => sum + dados.faturamento_total, 0);
    const totalRateioGeral = Object.values(rateio).reduce((sum, dados) => sum + dados.rateio_total, 0);

    // Adicionar linha de totais
    tbody.innerHTML += `
        <tr style="border-top: 2px solid #e5e7eb; background: #f3f4f6; font-weight: bold;">
            <td><strong>TOTAL GERAL</strong></td>
            <td style="text-align: right; background: #bae6fd;">${formatarMoeda(totalFaturamentoGeral)}</td>
            <td style="text-align: right; background: #e5e7eb;">${formatarMoeda(totalRateioGeral)}</td>
            <td style="text-align: right;">100.0%</td>
            <td></td>
        </tr>
    `;
}

// Ver detalhamento por categoria
function verDetalhamento(clienteNome) {
    const dados = dadosRateio.rateio_por_cliente[clienteNome];

    document.getElementById('cliente-detalhado').textContent = clienteNome;

    const tbody = document.getElementById('lista-categorias-detalhadas');
    const detalhes = dados.detalhes;

    if (!detalhes || Object.keys(detalhes).length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;">Nenhum detalhamento disponível</td></tr>';
    } else {
        // Ordenar categorias por valor decrescente
        const categoriasOrdenadas = Object.entries(detalhes)
            .sort((a, b) => b[1].total - a[1].total);

        tbody.innerHTML = categoriasOrdenadas.map(([categoria, dados]) => `
            <tr>
                <td>${categoria}</td>
                <td style="text-align: right;"><strong>${formatarMoeda(dados.total)}</strong></td>
            </tr>
        `).join('');

        // Adicionar linha de total
        tbody.innerHTML += `
            <tr style="border-top: 2px solid #e5e7eb; font-weight: bold; background: #f9fafb;">
                <td>TOTAL</td>
                <td style="text-align: right;">${formatarMoeda(dados.rateio_total)}</td>
            </tr>
        `;
    }

    document.getElementById('detalhamento-cliente').style.display = 'block';

    // Scroll suave até o detalhamento
    document.getElementById('detalhamento-cliente').scrollIntoView({ behavior: 'smooth' });
}

// Toggle drill down (expandir/colapsar categorias na tabela mensal)
function toggleDrillDown(clienteId) {
    const drillRows = document.querySelectorAll(`.drill-${clienteId}`);
    const icon = document.getElementById(`icon-${clienteId}`);
    
    if (drillRows.length === 0) return;
    
    const isVisible = drillRows[0].style.display !== 'none';
    
    drillRows.forEach(row => {
        row.style.display = isVisible ? 'none' : 'table-row';
    });
    
    if (icon) {
        icon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(90deg)';
    }
}

// Fechar detalhamento
function fecharDetalhamento() {
    document.getElementById('detalhamento-cliente').style.display = 'none';
}

// Formatar moeda
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor || 0);
}

function mostrarErro(msg) {
    alert(msg);
}

// Funções de rolagem horizontal
function rolarParaEsquerda() {
    const container = document.getElementById('tabela-container');
    container.scrollBy({ left: -400, behavior: 'smooth' });
}

function rolarParaDireita() {
    const container = document.getElementById('tabela-container');
    container.scrollBy({ left: 400, behavior: 'smooth' });
}

// Atualizar indicadores de rolagem
function atualizarIndicadoresRolagem() {
    const container = document.getElementById('tabela-container');
    const indicadorEsquerda = document.getElementById('scroll-indicator-left');
    const indicadorDireita = document.getElementById('scroll-indicator-right');
    
    if (container.scrollLeft > 50) {
        indicadorEsquerda.style.display = 'flex';
    } else {
        indicadorEsquerda.style.display = 'none';
    }
    
    if (container.scrollLeft < container.scrollWidth - container.clientWidth - 50) {
        indicadorDireita.style.display = 'flex';
    } else {
        indicadorDireita.style.display = 'none';
    }
}

// Posicionar no semestre atual (iniciar visualização nos meses atuais)
function posicionarNoSemestreAtual() {
    const mesAtual = new Date().getMonth(); // 0-11
    const mesInicio = dadosRateio.mes_inicio - 1; // converter para 0-11
    const mesFim = dadosRateio.mes_fim - 1;
    
    // Calcular qual mês deve estar visível (preferencialmente o mês atual ou início do semestre)
    let mesAlvo = mesAtual;
    
    // Se o mês atual não está no período selecionado, usar o mês inicial
    if (mesAtual < mesInicio || mesAtual > mesFim) {
        mesAlvo = mesInicio;
    }
    
    // Calcular posição de rolagem (aproximadamente 150px por mês)
    const container = document.getElementById('tabela-container');
    const posicaoMes = (mesAlvo - mesInicio) * 150;
    
    // Rolar para mostrar o semestre atual centralizado
    setTimeout(() => {
        container.scrollLeft = Math.max(0, posicaoMes - 200);
        atualizarIndicadoresRolagem();
    }, 100);
}

// Adicionar listener de scroll
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('tabela-container');
    if (container) {
        container.addEventListener('scroll', atualizarIndicadoresRolagem);
    }
});