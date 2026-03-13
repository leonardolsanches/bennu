
let dadosRateioImpostos = null;

// Carregar dados iniciais
document.addEventListener('DOMContentLoaded', async function() {
    // Popular campo de ano com ano corrente + passados + 5 futuros
    if (window.populateYearSelect) {
        window.populateYearSelect('filter-ano', { includePlaceholder: false });
    }
    
    // Aguardar carregamento das empresas antes de carregar rateio
    await carregarEmpresas();
    
    // Verificar se o ano foi populado
    const anoSelect = document.getElementById('filter-ano');
    if (anoSelect && !anoSelect.value) {
        // Definir ano atual como fallback
        const currentYear = new Date().getFullYear();
        anoSelect.value = currentYear.toString();
    }
    
    carregarRateioImpostos();
});

// Carregar empresas para filtro
async function carregarEmpresas() {
    try {
        const response = await fetch('/api/empresas');
        const empresas = await response.json();

        const select = document.getElementById('filter-empresa');
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

// Carregar dados de rateio de impostos
async function carregarRateioImpostos() {
    try {
        const ano = document.getElementById('filter-ano').value;
        const mesInicio = document.getElementById('filter-mes-inicial').value;
        const mesFim = document.getElementById('filter-mes-final').value;
        const fonte = document.getElementById('filter-fonte')?.value || 'realizado';

        console.log(`🔄 Carregando rateio de impostos: ano=${ano}, mês ${mesInicio} a ${mesFim}, fonte=${fonte}`);

        const params = new URLSearchParams({
            ano,
            mes_inicio: mesInicio,
            mes_fim: mesFim,
            fonte: fonte
        });

        const empresa = document.getElementById('filter-empresa').value;
        if (empresa) {
            params.append('empresa', empresa);
        }

        const response = await fetch(`/api/relatorios/rateio-impostos?${params}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        dadosRateioImpostos = await response.json();

        console.log('📊 Dados de rateio de impostos recebidos:', dadosRateioImpostos);

        atualizarResumo();
        renderizarTabelaEmpresas();

    } catch (error) {
        console.error('❌ Erro ao carregar rateio de impostos:', error);
        mostrarErro('Erro ao carregar dados de rateio de impostos: ' + error.message);
    }
}

// Atualizar cards de resumo
function atualizarResumo() {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    document.getElementById('total-impostos').textContent = formatarMoeda(dadosRateioImpostos.total_impostos);
    document.getElementById('total-federal').textContent = formatarMoeda(dadosRateioImpostos.totais_por_tipo.federal);
    document.getElementById('total-estadual').textContent = formatarMoeda(dadosRateioImpostos.totais_por_tipo.estadual);
    document.getElementById('total-municipal').textContent = formatarMoeda(dadosRateioImpostos.totais_por_tipo.municipal);

    const mesInicio = meses[dadosRateioImpostos.mes_inicio - 1];
    const mesFim = meses[dadosRateioImpostos.mes_fim - 1];
    const periodo = mesInicio === mesFim ? 
        `${mesInicio}/${dadosRateioImpostos.ano}` : 
        `${mesInicio} - ${mesFim}/${dadosRateioImpostos.ano}`;

    document.getElementById('periodo-exibido').textContent = periodo;
}

// Renderizar tabela de empresas
function renderizarTabelaEmpresas() {
    const tbody = document.getElementById('lista-empresas');
    const totais = dadosRateioImpostos.totais_por_empresa;

    if (!totais || Object.keys(totais).length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 40px;">Nenhum dado de imposto encontrado para o período selecionado</td></tr>';
        return;
    }

    tbody.innerHTML = Object.entries(totais).map(([empresa, total]) => `
        <tr data-testid="row-empresa-${empresa.replace(/\s+/g, '-')}">
            <td><strong>${empresa}</strong></td>
            <td style="text-align: right;">${formatarMoeda(total)}</td>
            <td style="text-align: center;">
                <button class="btn btn-sm btn-info" onclick="verDetalhamento('${empresa}')" data-testid="button-detalhar-${empresa.replace(/\s+/g, '-')}">
                    <i class="fas fa-eye"></i> Detalhar
                </button>
            </td>
        </tr>
    `).join('');

    // Adicionar linha de total
    tbody.innerHTML += `
        <tr style="border-top: 2px solid #e5e7eb; background: #f3f4f6; font-weight: bold;">
            <td><strong>TOTAL GERAL</strong></td>
            <td style="text-align: right; background: #fee2e2;">${formatarMoeda(dadosRateioImpostos.total_impostos)}</td>
            <td></td>
        </tr>
    `;
}

// Ver detalhamento por empresa
function verDetalhamento(empresaNome) {
    const dados = dadosRateioImpostos.rateio[empresaNome];

    document.getElementById('empresa-detalhada').textContent = empresaNome;

    const tbody = document.getElementById('lista-detalhamento');
    const linhas = [];

    // Iterar por clientes, produtos e impostos
    for (const [clienteNome, produtos] of Object.entries(dados)) {
        for (const [produtoNome, impostos] of Object.entries(produtos)) {
            for (const [impostoNome, detalhes] of Object.entries(impostos)) {
                linhas.push({
                    cliente: clienteNome,
                    produto: produtoNome,
                    imposto: impostoNome,
                    aliquota: detalhes.aliquota,
                    tipo: detalhes.tipo || '-',
                    total: detalhes.total
                });
            }
        }
    }

    if (linhas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Nenhum detalhamento disponível</td></tr>';
    } else {
        // Ordenar por total decrescente
        linhas.sort((a, b) => b.total - a.total);

        tbody.innerHTML = linhas.map(linha => `
            <tr>
                <td>${linha.cliente}</td>
                <td>${linha.produto}</td>
                <td>${linha.imposto}</td>
                <td style="text-align: right;">${linha.aliquota.toFixed(2)}%</td>
                <td><span class="badge badge-${getTipoCor(linha.tipo)}">${linha.tipo}</span></td>
                <td style="text-align: right;"><strong>${formatarMoeda(linha.total)}</strong></td>
            </tr>
        `).join('');

        // Adicionar linha de total
        const totalDetalhamento = linhas.reduce((sum, linha) => sum + linha.total, 0);
        tbody.innerHTML += `
            <tr style="border-top: 2px solid #e5e7eb; font-weight: bold; background: #f9fafb;">
                <td colspan="5">TOTAL</td>
                <td style="text-align: right;">${formatarMoeda(totalDetalhamento)}</td>
            </tr>
        `;
    }

    document.getElementById('detalhamento-empresa').style.display = 'block';

    // Scroll suave até o detalhamento
    document.getElementById('detalhamento-empresa').scrollIntoView({ behavior: 'smooth' });
}

function getTipoCor(tipo) {
    const cores = {
        'federal': 'primary',
        'estadual': 'success',
        'municipal': 'warning'
    };
    return cores[tipo] || 'secondary';
}

// Fechar detalhamento
function fecharDetalhamento() {
    document.getElementById('detalhamento-empresa').style.display = 'none';
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
