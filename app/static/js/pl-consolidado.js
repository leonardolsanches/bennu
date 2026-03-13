// P&L Consolidado - Demonstração do Resultado com Análise de Variações
console.log('📊 Carregando módulo P&L Consolidado...');

let dadosPLConsolidado = {
    receitas: {},
    impostos: {},
    despesas: {},
    totais: {}
};

let filtrosDisponiveis = {
    empresas: [],
    clientes: [],
    projetos: [],
    produtos_servicos: []
};

let drilldownState = {}; // Controla estado de expansão/contração
let quarterAtual = 1; // Quarter atual sendo exibido (1-4)

// Função para mudar o quarter exibido
function mudarQuarter(quarter) {
    console.log('📊 Mudando para quarter:', quarter);

    quarterAtual = quarter;

    // Atualizar botões ativos
    document.querySelectorAll('.quarter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-q${quarter}`).classList.add('active');

    // Atualizar texto do quarter atual
    document.getElementById('quarter-atual').textContent = `Q${quarter}`;

    // Renderizar tabela com os meses do quarter
    renderizarTabelaPLConsolidado();
}

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Inicializando P&L Consolidado...');

    // Popular campo de ano com ano corrente + passados + 5 futuros
    const anoAtual = new Date().getFullYear();
    if (window.populateYearSelect) {
        window.populateYearSelect('ano-filter', { includePlaceholder: false });
    }
    document.getElementById('ano-filter').value = anoAtual;
    document.getElementById('periodo-atual').textContent = anoAtual;

    // Carregar filtros primeiro e depois os dados
    carregarFiltros().then(() => {
        return carregarDadosPLConsolidado();
    }).then(() => {
        console.log('✅ P&L Consolidado carregado com sucesso!');
    }).catch(error => {
        console.error('❌ Erro ao carregar P&L Consolidado:', error);
        showErrorMessage('Erro ao carregar dados do P&L Consolidado');
    });
});

// Carregar filtros disponíveis
async function carregarFiltros() {
    try {
        console.log('📊 Carregando filtros disponíveis...');

        const response = await fetch('/api/relatorios/pl-consolidado/filtros');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        filtrosDisponiveis = await response.json();
        console.log('✅ Filtros carregados:', filtrosDisponiveis);

        // Popolar dropdowns
        popularDropdown('empresa-filter', filtrosDisponiveis.empresas);
        popularDropdown('cliente-filter', filtrosDisponiveis.clientes);
        popularDropdown('projeto-filter', filtrosDisponiveis.projetos);
        popularDropdown('produto-servico-filter', filtrosDisponiveis.produtos_servicos);

    } catch (error) {
        console.error('❌ Erro ao carregar filtros:', error);
    }
}

// Popular dropdown com opções
function popularDropdown(selectId, opcoes) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Manter primeira opção (Todos)
    const primeiraOpcao = select.firstElementChild;
    select.innerHTML = '';
    select.appendChild(primeiraOpcao);

    // Adicionar opções
    opcoes.forEach(opcao => {
        const option = document.createElement('option');
        option.value = opcao.id;
        option.textContent = opcao.nome + (opcao.tipo ? ` (${opcao.tipo})` : '');
        select.appendChild(option);
    });
}

// Carregar dados do P&L Consolidado
async function carregarDadosPLConsolidado() {
    try {
        console.log('📊 Carregando dados do P&L Consolidado...');

        const ano = document.getElementById('ano-filter').value;
        const mesCorte = document.getElementById('mes-corte-filter').value;
        const empresa = document.getElementById('empresa-filter').value;
        const cliente = document.getElementById('cliente-filter').value;
        const projeto = document.getElementById('projeto-filter').value;
        const produtoServico = document.getElementById('produto-servico-filter').value;

        // Atualizar período na interface
        document.getElementById('periodo-atual').textContent = ano;

        // Construir URL com parâmetros
        const params = new URLSearchParams({
            ano: ano
        });

        if (mesCorte) params.append('mes_corte', mesCorte);
        if (empresa) params.append('empresa', empresa);
        if (cliente) params.append('cliente', cliente);
        if (projeto) params.append('projeto', projeto);
        if (produtoServico) params.append('produto_servico', produtoServico);

        const response = await fetch(`/api/relatorios/pl-consolidado?${params}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        dadosPLConsolidado = await response.json();
        console.log('✅ Dados P&L Consolidado carregados:', dadosPLConsolidado);

        // Renderizar tabela
        renderizarTabelaPLConsolidado();

    } catch (error) {
        console.error('❌ Erro ao carregar dados P&L Consolidado:', error);
        showErrorMessage('Erro ao carregar dados do P&L Consolidado');

        // Mostrar estado de erro na tabela
        document.getElementById('pl-consolidado-tbody').innerHTML = `
            <tr>
                <td colspan="61" style="text-align: center; padding: 40px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <br>Erro ao carregar dados do P&L Consolidado
                    <br><small style="color: #6b7280;">Verifique sua conexão e tente novamente</small>
                </td>
            </tr>
        `;
    }
}

// Renderizar tabela do P&L Consolidado
function renderizarTabelaPLConsolidado() {
    console.log('📊 Renderizando tabela P&L Consolidado para Q' + quarterAtual);

    const tbody = document.getElementById('pl-consolidado-tbody');
    const thead = document.getElementById('pl-consolidado-thead');

    if (!dadosPLConsolidado || !dadosPLConsolidado.totais) {
        tbody.innerHTML = `
            <tr>
                <td colspan="16" style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <br>Nenhum dado encontrado para este período
                </td>
            </tr>
        `;
        return;
    }

    // Definir meses do quarter
    const quarterMeses = {
        1: {meses: [0, 1, 2], nomes: ['JAN', 'FEV', 'MAR']},
        2: {meses: [3, 4, 5], nomes: ['ABR', 'MAI', 'JUN']},
        3: {meses: [6, 7, 8], nomes: ['JUL', 'AGO', 'SET']},
        4: {meses: [9, 10, 11], nomes: ['OUT', 'NOV', 'DEZ']}
    };

    const mesesExibir = quarterMeses[quarterAtual].meses;
    const nomesExibir = quarterMeses[quarterAtual].nomes;

    // Renderizar cabeçalho da tabela - COLUNAS CONDENSADAS
    let theadHtml = `
        <tr style="background: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
            <th rowspan="2" style="text-align: left; padding: 6px 8px; font-weight: 600; color: #475569; min-width: 250px; font-size: 10px; border-right: 1px solid #e2e8f0;">CONCEITOS</th>
    `;

    // Cabeçalhos dos 3 meses - CONDENSADOS
    nomesExibir.forEach((nome, idx) => {
        const borderRight = idx < 2 ? 'border-right: 2px solid #cbd5e0;' : '';
        theadHtml += `<th colspan="3" style="text-align: center; padding: 6px 2px; font-weight: 600; color: #475569; ${borderRight} font-size: 9px;">${nome}</th>`;
    });

    theadHtml += `</tr><tr style="background: #f1f5f9; border-bottom: 2px solid #e2e8f0;">`;

    // Subcolunas para cada mês - APENAS 3 COLUNAS (Previsto, Realizado, Variação)
    nomesExibir.forEach((_, idx) => {
        const borderRight = idx < 2 ? 'border-right: 2px solid #cbd5e0;' : '';
        theadHtml += `
            <th style="text-align: right; padding: 3px 2px; font-weight: 500; color: #6b7280; min-width: 70px; font-size: 7px;">PREV</th>
            <th style="text-align: right; padding: 3px 2px; font-weight: 500; color: #6b7280; min-width: 70px; font-size: 7px;">REAL</th>
            <th style="text-align: right; padding: 3px 2px; font-weight: 500; color: #6b7280; min-width: 50px; font-size: 7px; ${borderRight}">VAR%</th>
        `;
    });

    theadHtml += `</tr>`;
    thead.innerHTML = theadHtml;

    let html = '';

    // 1. RECEITAS - Consolidada com drill-down
    html += criarLinhaConsolidadaComDrilldown(
        'RECEITAS',
        dadosPLConsolidado.totais.receitas_previsto_mes,
        dadosPLConsolidado.totais.receitas_realizado_mes,
        'receita-consolidada',
        'receita',
        mesesExibir
    );

    // 2. IMPOSTOS - Seção consolidada com drill-down
    html += criarLinhaConsolidadaComDrilldown(
        'IMPOSTOS',
        dadosPLConsolidado.totais.impostos_previsto_mes,
        dadosPLConsolidado.totais.impostos_realizado_mes,
        'impostos-consolidado',
        'imposto',
        mesesExibir
    );

    // 3. RECEITA LÍQUIDA (Receitas - Impostos)
    const receitaLiquidaPrevisto = mesesExibir.map(mes => 
        (dadosPLConsolidado.totais.receitas_previsto_mes[mes] || 0) - 
        (dadosPLConsolidado.totais.impostos_previsto_mes[mes] || 0)
    );
    const receitaLiquidaRealizado = mesesExibir.map(mes => 
        (dadosPLConsolidado.totais.receitas_realizado_mes[mes] || 0) - 
        (dadosPLConsolidado.totais.impostos_realizado_mes[mes] || 0)
    );

    html += criarLinhaResultado('RECEITA LÍQUIDA', receitaLiquidaPrevisto, receitaLiquidaRealizado, mesesExibir);

    // 4. DESPESAS - Consolidada com drill-down
    html += criarLinhaConsolidadaComDrilldown(
        'DESPESAS',
        dadosPLConsolidado.totais.despesas_previsto_mes,
        dadosPLConsolidado.totais.despesas_realizado_mes,
        'despesa-consolidada',
        'despesa',
        mesesExibir
    );

    // 5. RESULTADO LÍQUIDO (Receita Líquida - Despesas)
    const resultadoLiquidoPrevisto = mesesExibir.map((mes, idx) => 
        receitaLiquidaPrevisto[idx] - (dadosPLConsolidado.totais.despesas_previsto_mes[mes] || 0)
    );
    const resultadoLiquidoRealizado = mesesExibir.map((mes, idx) => 
        receitaLiquidaRealizado[idx] - (dadosPLConsolidado.totais.despesas_realizado_mes[mes] || 0)
    );

    html += criarLinhaResultado('RESULTADO LÍQUIDO', resultadoLiquidoPrevisto, resultadoLiquidoRealizado, mesesExibir, '#ddd6fe');

    tbody.innerHTML = html;
    console.log('✅ Tabela P&L Consolidado renderizada');
}

// Criar linha consolidada com drill-down
function criarLinhaConsolidadaComDrilldown(titulo, previstoMeses, realizadoMeses, drilldownId, tipo, mesesExibir = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
    let html = `<tr style="background-color: #f3f4f6; border-top: 2px solid #d1d5db; border-bottom: 2px solid #e2e8f0; font-weight: 700;" data-drilldown-id="${drilldownId}">`;

    // Primeira coluna com botão de drill-down
    html += `<td style="padding: 12px 16px; font-size: 12px; color: #374151;">
        <button class="drilldown-btn" onclick="toggleConsolidado('${drilldownId}', '${tipo}')" data-testid="btn-drilldown-${drilldownId}" style="color: #3b82f6; font-weight: bold; font-size: 16px;">
            <span id="icon-${drilldownId}">+</span>
        </button>
        ${titulo}
    </td>`;

    // Colunas condensadas - apenas 3 por mês
    mesesExibir.forEach((mes, idx) => {
        const previsto = previstoMeses[mes];
        const realizado = realizadoMeses[mes];

        const analise = calcularAnaliseVariacoes(previsto, realizado);

        const corPrevisto = obterCorValor(previsto, tipo);
        const corRealizado = obterCorValor(realizado, tipo);
        const corVariacao = analise.variacao >= 0 ? '#059669' : '#dc2626';

        const borderRight = idx < mesesExibir.length - 1 ? 'border-right: 2px solid #cbd5e0;' : '';

        html += `<td style="padding: 6px 2px; text-align: right; color: ${corPrevisto}; font-size: 9px;">${formatarMoeda(previsto)}</td>`;
        html += `<td style="padding: 6px 2px; text-align: right; color: ${corRealizado}; font-size: 9px; font-weight: 700;">${formatarMoeda(realizado)}</td>`;
        html += `<td style="padding: 6px 2px; text-align: right; color: ${corVariacao}; font-size: 8px; ${borderRight}">${formatarPercentual(analise.variacao)}</td>`;
    });

    html += '</tr>';
    return html;
}

// Toggle consolidado (RECEITAS, DESPESAS ou IMPOSTOS)
function toggleConsolidado(drilldownId, tipo) {
    console.log('🔄 Toggle consolidado:', drilldownId, 'tipo:', tipo);

    const icon = document.getElementById(`icon-${drilldownId}`);
    if (!icon) {
        console.warn('⚠️ Ícone não encontrado:', `icon-${drilldownId}`);
        return;
    }

    const isExpanded = drilldownState[drilldownId] || false;

    if (isExpanded) {
        // Contrair
        icon.textContent = '+';
        drilldownState[drilldownId] = false;

        // Esconder linhas filhas
        const safeId = drilldownId.replace(/[^a-z0-9-]/gi, '_');
        const drilldownItems = document.querySelectorAll(`.drilldown-item-${safeId}`);
        drilldownItems.forEach(item => {
            item.style.display = 'none';
            item.classList.remove('expanded');
        });

        console.log('➖ Contraído:', drilldownId);
    } else {
        // Expandir
        icon.textContent = '−';
        drilldownState[drilldownId] = true;

        // Expandir baseado no tipo
        if (tipo === 'receita') {
            expandirReceitasConsolidadas(drilldownId);
        } else if (tipo === 'despesa') {
            expandirDespesasConsolidadas(drilldownId);
        } else if (tipo === 'imposto') {
            expandirImpostosConsolidados(drilldownId);
        }

        console.log('➕ Expandido:', drilldownId);
    }
}

// Expandir receitas consolidadas (Cliente > Projeto > Produto/Serviço > Título)
function expandirReceitasConsolidadas(drilldownId) {
    console.log('📂 Expandindo receitas consolidadas');

    const drilldownRow = document.querySelector(`[data-drilldown-id="${drilldownId}"]`);
    if (!drilldownRow) {
        console.warn('⚠️ Linha pai não encontrada para:', drilldownId);
        return;
    }

    const safeId = drilldownId.replace(/[^a-z0-9-]/gi, '_');
    const existingItems = document.querySelectorAll(`.drilldown-item-${safeId}`);

    if (existingItems.length > 0) {
        console.log('✅ Já existem', existingItems.length, 'linhas filhas, apenas mostrando');
        existingItems.forEach(item => {
            item.style.display = 'table-row';
            item.classList.add('expanded');
        });
        return;
    }

    let html = '';

    // Nível 1: Clientes
    if (dadosPLConsolidado.receitas && Object.keys(dadosPLConsolidado.receitas).length > 0) {
        Object.keys(dadosPLConsolidado.receitas).forEach(clienteNome => {
            const dadosCliente = dadosPLConsolidado.receitas[clienteNome];
            const clienteId = `${drilldownId}_cliente_${clienteNome.replace(/\s+/g, '-').toLowerCase()}`;
            const safeClienteId = clienteId.replace(/[^a-z0-9-]/gi, '_');

            // Verificar se cliente tem projetos OU títulos diretos
            const clienteTemProjetos = dadosCliente.projetos && Object.keys(dadosCliente.projetos).length > 0;
            const clienteTemTitulos = dadosCliente.titulos && Object.keys(dadosCliente.titulos).length > 0;

            // Criar linha do cliente (visível inicialmente) - só é leaf se não tiver nem projetos nem títulos
            html += criarLinhaHierarquica(clienteNome, dadosCliente, 'receita', 2, clienteId, safeId, !clienteTemProjetos && !clienteTemTitulos);

            // Nível 2: Projetos do cliente
            if (clienteTemProjetos) {
                Object.keys(dadosCliente.projetos).forEach(projetoNome => {
                    const dadosProjeto = dadosCliente.projetos[projetoNome];
                    const projetoId = `${clienteId}_projeto_${projetoNome.replace(/\s+/g, '-').toLowerCase()}`;
                    const safeProjetoId = projetoId.replace(/[^a-z0-9-]/gi, '_');

                    // Verificar se projeto tem produtos OU títulos
                    const projetoTemProdutos = dadosProjeto.produtos && Object.keys(dadosProjeto.produtos).length > 0;
                    const projetoTemTitulos = dadosProjeto.titulos && Object.keys(dadosProjeto.titulos).length > 0;

                    html += criarLinhaHierarquicaOculta(projetoNome, dadosProjeto, 'receita', 3, projetoId, safeClienteId, !projetoTemProdutos && !projetoTemTitulos);

                    // Nível 3: Produtos/Serviços do projeto
                    if (projetoTemProdutos) {
                        Object.keys(dadosProjeto.produtos).forEach(produtoNome => {
                            const dadosProduto = dadosProjeto.produtos[produtoNome];
                            const produtoId = `${projetoId}_produto_${produtoNome.replace(/\s+/g, '-').toLowerCase()}`;
                            const safeProdutoId = produtoId.replace(/[^a-z0-9-]/gi, '_');

                            // Verificar se produto tem títulos
                            const produtoTemTitulos = dadosProduto.titulos && Object.keys(dadosProduto.titulos).length > 0;

                            html += criarLinhaHierarquicaOculta(produtoNome, dadosProduto, 'receita', 4, produtoId, safeProjetoId, !produtoTemTitulos);

                            // Nível 4: Títulos (itens) do produto/serviço
                            if (produtoTemTitulos) {
                                Object.keys(dadosProduto.titulos).forEach(tituloNome => {
                                    const dadosTitulo = dadosProduto.titulos[tituloNome];
                                    const tituloId = `${produtoId}_titulo_${tituloNome.replace(/\s+/g, '-').toLowerCase()}`;

                                    html += criarLinhaHierarquicaOculta(tituloNome, dadosTitulo, 'receita', 5, tituloId, safeProdutoId, true);
                                    console.log(`    ✅ Título de receita criado: ${tituloNome} com parentClass: drilldown-item-${safeProdutoId}`);
                                });
                            }
                        });
                    }

                    // Títulos diretos do projeto (sem produto)
                    if (projetoTemTitulos) {
                        Object.keys(dadosProjeto.titulos).forEach(tituloNome => {
                            const dadosTitulo = dadosProjeto.titulos[tituloNome];
                            const tituloId = `${projetoId}_titulo_${tituloNome.replace(/\s+/g, '-').toLowerCase()}`;

                            html += criarLinhaHierarquicaOculta(tituloNome, dadosTitulo, 'receita', 4, tituloId, safeProjetoId, true);
                            console.log(`    ✅ Título direto de projeto criado: ${tituloNome} com parentClass: drilldown-item-${safeProjetoId}`);
                        });
                    }
                });
            }

            // Títulos diretos do cliente (sem projeto)
            if (clienteTemTitulos) {
                Object.keys(dadosCliente.titulos).forEach(tituloNome => {
                    const dadosTitulo = dadosCliente.titulos[tituloNome];
                    const tituloId = `${clienteId}_titulo_${tituloNome.replace(/\s+/g, '-').toLowerCase()}`;

                    html += criarLinhaHierarquicaOculta(tituloNome, dadosTitulo, 'receita', 3, tituloId, safeClienteId, true);
                    console.log(`    ✅ Título direto de cliente criado: ${tituloNome} com parentClass: drilldown-item-${safeClienteId}`);
                });
            }
        });
    }

    if (html) {
        drilldownRow.insertAdjacentHTML('afterend', html);
        console.log('✅ HTML de receitas consolidadas inserido');
    }
}

// Expandir despesas consolidadas (Categoria > Subcategoria > Título)
function expandirDespesasConsolidadas(drilldownId) {
    console.log('📂 Expandindo despesas consolidadas');

    const drilldownRow = document.querySelector(`[data-drilldown-id="${drilldownId}"]`);
    if (!drilldownRow) {
        console.warn('⚠️ Linha pai não encontrada para:', drilldownId);
        return;
    }

    const safeId = drilldownId.replace(/[^a-z0-9-]/gi, '_');
    const existingItems = document.querySelectorAll(`.drilldown-item-${safeId}`);

    if (existingItems.length > 0) {
        console.log('✅ Já existem', existingItems.length, 'linhas filhas, apenas mostrando');
        existingItems.forEach(item => {
            item.style.display = 'table-row';
            item.classList.add('expanded');
        });
        return;
    }

    let html = '';

    // Nível 1: Categorias Gerenciais
    if (dadosPLConsolidado.despesas && Object.keys(dadosPLConsolidado.despesas).length > 0) {
        Object.keys(dadosPLConsolidado.despesas).forEach(categoriaNome => {
            const dadosCategoria = dadosPLConsolidado.despesas[categoriaNome];
            const categoriaId = `${drilldownId}_categoria_${categoriaNome.replace(/\s+/g, '-').toLowerCase()}`;
            const safeCategoriaId = categoriaId.replace(/[^a-z0-9-]/gi, '_');

            // Verificar se categoria tem subcategorias OU títulos diretos
            const categoriaTemSubcategorias = dadosCategoria.subcategorias && Object.keys(dadosCategoria.subcategorias).length > 0;
            const categoriaTemTitulos = dadosCategoria.titulos && Object.keys(dadosCategoria.titulos).length > 0;

            html += criarLinhaHierarquica(categoriaNome, dadosCategoria, 'despesa', 2, categoriaId, safeId, !categoriaTemSubcategorias && !categoriaTemTitulos);

            // Nível 2: Subcategorias
            if (categoriaTemSubcategorias) {
                Object.keys(dadosCategoria.subcategorias).forEach(subcategoriaNome => {
                    const dadosSubcategoria = dadosCategoria.subcategorias[subcategoriaNome];
                    const subcategoriaId = `${categoriaId}_sub_${subcategoriaNome.replace(/\s+/g, '-').toLowerCase()}`;
                    const safeSubcategoriaId = subcategoriaId.replace(/[^a-z0-9-]/gi, '_');

                    // Verificar se subcategoria tem títulos
                    const subcategoriaTemTitulos = dadosSubcategoria.titulos && Object.keys(dadosSubcategoria.titulos).length > 0;

                    html += criarLinhaHierarquicaOculta(subcategoriaNome, dadosSubcategoria, 'despesa', 3, subcategoriaId, safeCategoriaId, !subcategoriaTemTitulos);

                    // Nível 3: Títulos da subcategoria
                    if (subcategoriaTemTitulos) {
                        Object.keys(dadosSubcategoria.titulos).forEach(tituloNome => {
                            const dadosTitulo = dadosSubcategoria.titulos[tituloNome];
                            const tituloId = `${subcategoriaId}_titulo_${tituloNome.replace(/\s+/g, '-').toLowerCase()}`;

                            html += criarLinhaHierarquicaOculta(tituloNome, dadosTitulo, 'despesa', 4, tituloId, safeSubcategoriaId, true);
                            console.log(`    ✅ Título de despesa criado: ${tituloNome} com parentClass: drilldown-item-${safeSubcategoriaId}`);
                        });
                    }
                });
            }

            // Títulos diretos da categoria (sem subcategoria)
            if (categoriaTemTitulos) {
                Object.keys(dadosCategoria.titulos).forEach(tituloNome => {
                    const dadosTitulo = dadosCategoria.titulos[tituloNome];
                    const tituloId = `${categoriaId}_titulo_${tituloNome.replace(/\s+/g, '-').toLowerCase()}`;

                    html += criarLinhaHierarquicaOculta(tituloNome, dadosTitulo, 'despesa', 3, tituloId, safeCategoriaId, true);
                    console.log(`    ✅ Título direto de categoria criado: ${tituloNome} com parentClass: drilldown-item-${safeCategoriaId}`);
                });
            }
        });
    }

    if (html) {
        drilldownRow.insertAdjacentHTML('afterend', html);
        console.log('✅ HTML de despesas consolidadas inserido');
    }
}

// Expandir impostos consolidados
function expandirImpostosConsolidados(drilldownId) {
    console.log('📂 Expandindo impostos consolidados');

    const drilldownRow = document.querySelector(`[data-drilldown-id="${drilldownId}"]`);
    if (!drilldownRow) {
        console.warn('⚠️ Linha pai não encontrada para:', drilldownId);
        return;
    }

    const safeId = drilldownId.replace(/[^a-z0-9-]/gi, '_');
    const existingItems = document.querySelectorAll(`.drilldown-item-${safeId}`);

    if (existingItems.length > 0) {
        console.log('✅ Já existem', existingItems.length, 'linhas filhas, apenas mostrando');
        existingItems.forEach(item => {
            item.style.display = 'table-row';
            item.classList.add('expanded');
        });
        return;
    }

    let html = '';

    // Definir meses do quarter atual
    const quarterMeses = {
        1: [0, 1, 2],
        2: [3, 4, 5],
        3: [6, 7, 8],
        4: [9, 10, 11]
    };
    const mesesExibir = quarterMeses[quarterAtual];

    // Iterar sobre cada tipo de imposto
    if (dadosPLConsolidado.impostos && Object.keys(dadosPLConsolidado.impostos).length > 0) {
        Object.keys(dadosPLConsolidado.impostos).forEach(impostoNome => {
            const dadosImposto = dadosPLConsolidado.impostos[impostoNome];

            // Extrair alíquota do nome do imposto (ex: "PIS (1.65%)" -> "1.65%")
            const matchAliquota = impostoNome.match(/\(([0-9.]+%)\)/);
            const aliquota = matchAliquota ? matchAliquota[1] : '';
            const nomeBase = impostoNome.replace(/\s*\([^)]*\)/, ''); // Remove texto entre parênteses

            // Criar linha do imposto com alíquota
            html += criarLinhaImpostoDetalhada(nomeBase, aliquota, dadosImposto, mesesExibir, safeId);
        });
    }

    if (html) {
        drilldownRow.insertAdjacentHTML('afterend', html);
        console.log('✅ HTML de impostos consolidados inserido');
    }
}

// Criar cabeçalho de seção
function criarCabecalhoSecao(titulo) {
    return `
        <tr style="background-color: #f3f4f6; color: #374151; font-weight: 700; font-size: 12px; border-top: 1px solid #d1d5db;">
            <td style="padding: 12px 16px;">${titulo}</td>
            <td colspan="60"></td>
        </tr>
    `;
}

// Criar linha de item com drilldown hierárquico
function criarLinhaItem(titulo, dados, drilldownId, nivel = 1) {
    const indentacao = ' '.repeat((nivel - 1) * 2);
    const safeDrilldownId = drilldownId.replace(/[^a-z0-9-]/gi, '_');

    let html = `<tr style="border-bottom: 1px solid #f1f5f9;" class="concept-level-${nivel}" data-drilldown-id="${safeDrilldownId}">`;

    // Primeira coluna - nome da conta com botão de drilldown
    html += `<td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px;">
        <button class="drilldown-btn" onclick="toggleDrilldown('${safeDrilldownId}', '${drilldownId.startsWith('imposto') ? 'imposto' : 'despesa'}')" data-testid="btn-drilldown-${safeDrilldownId}" style="color: #3b82f6; font-weight: bold; font-size: 14px;">
            <span id="icon-${safeDrilldownId}">+</span>
        </button>
        ${indentacao}${titulo}
    </td>`;

    // Colunas dos meses (12 meses x 5 subcolunas cada = 60 colunas)
    for (let mes = 0; mes < 12; mes++) {
        const previsto = dados.previsto_meses ? dados.previsto_meses[mes] : 0;
        const realizado = dados.realizado_meses ? dados.realizado_meses[mes] : 0;

        // Calcular análise de variações
        const analise = calcularAnaliseVariacoes(previsto, realizado);

        // Definir cores baseadas no tipo e valores
        const corPrevisto = obterCorValor(previsto, 'imposto');
        const corRealizado = obterCorValor(realizado, 'imposto');
        const corPerformance = analise.performance >= 100 ? '#059669' : '#dc2626';
        const corDiferenca = obterCorValor(analise.diferenca, 'imposto');
        const corVariacao = analise.variacao >= 0 ? '#059669' : '#dc2626';

        // Previsto
        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corPrevisto}; font-size: 9px;">${formatarMoeda(previsto)}</td>`;

        // Realizado
        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corRealizado}; font-size: 9px;">${formatarMoeda(realizado)}</td>`;

        // % Performance
        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corPerformance}; font-size: 8px;">${formatarPercentual(analise.performance)}</td>`;

        // Diferença
        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corDiferenca}; font-size: 9px;">${formatarMoeda(analise.diferenca)}</td>`;

        // % Variação
        const borderRight = mes < 11 ? 'border-right: 2px solid #cbd5e0;' : '';
        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corVariacao}; font-size: 8px; ${borderRight}">${formatarPercentual(analise.variacao)}</td>`;
    }

    html += '</tr>';

    return html;
}

// Criar linha de item de imposto detalhada com nome, alíquota e valores
function criarLinhaImpostoDetalhada(nome, aliquota, dados, mesesExibir = [0, 1, 2], parentClass) {
    const indentacao = '  ';
    const nomeComAliquota = aliquota ? `${nome} (${aliquota})` : nome;

    let html = `<tr class="drilldown-item drilldown-item-${parentClass} concept-level-2" style="display: table-row; background-color: #fefefe;">`;

    // Primeira coluna - nome do imposto com alíquota
    html += `<td style="padding: 6px 8px 6px 32px; border-bottom: 1px solid #f1f5f9; font-size: 10px; color: #6b7280;">
        💰 ${nomeComAliquota}
    </td>`;

    // Colunas condensadas - apenas dos meses do quarter atual
    mesesExibir.forEach((mes, idx) => {
        const previsto = dados.previsto_meses ? dados.previsto_meses[mes] : 0;
        const realizado = dados.realizado_meses ? dados.realizado_meses[mes] : 0;

        const analise = calcularAnaliseVariacoes(previsto, realizado);
        const corPrevisto = obterCorValor(previsto, 'imposto');
        const corRealizado = obterCorValor(realizado, 'imposto');
        const corVariacao = analise.variacao >= 0 ? '#059669' : '#dc2626';

        const borderRight = idx < 2 ? 'border-right: 2px solid #cbd5e0;' : '';

        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corPrevisto}; font-size: 9px;">${formatarMoeda(previsto)}</td>`;
        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corRealizado}; font-size: 9px; font-weight: 500;">${formatarMoeda(realizado)}</td>`;
        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corVariacao}; font-size: 8px; ${borderRight}">${formatarPercentual(analise.variacao)}</td>`;
    });

    html += '</tr>';
    return html;
}

// Criar linha de imposto COM drill-down
function criarLinhaImpostoComDrilldown(titulo, dados, impostoId, mesesExibir = [0, 1, 2]) {
    const safeImpostoId = impostoId.replace(/[^a-z0-9-]/gi, '_');
    const indentacao = '  ';

    let html = `<tr style="border-bottom: 1px solid #f1f5f9;" class="concept-level-2" data-drilldown-id="${safeImpostoId}">`;

    // Primeira coluna - nome do imposto com botão de drill-down
    const aliquota = dados.aliquota || '';
    const nomeCompleto = aliquota ? `${titulo} (${aliquota}%)` : titulo;

    html += `<td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #6b7280;">
        <button class="drilldown-btn" onclick="toggleImposto('${safeImpostoId}')" data-testid="btn-drilldown-${safeImpostoId}" style="color: #3b82f6; font-weight: bold; font-size: 14px;">
            <span id="icon-${safeImpostoId}">+</span>
        </button>
        ${indentacao}${nomeCompleto}
    </td>`;

    // Colunas condensadas - apenas dos meses do quarter atual
    mesesExibir.forEach((mes, idx) => {
        const previsto = dados.previsto_meses ? dados.previsto_meses[mes] : 0;
        const realizado = dados.realizado_meses ? dados.realizado_meses[mes] : 0;

        const analise = calcularAnaliseVariacoes(previsto, realizado);
        const corVariacao = analise.variacao >= 0 ? '#059669' : '#dc2626';

        const borderRight = idx < 2 ? 'border-right: 2px solid #cbd5e0;' : '';

        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: 9px;">${formatarMoeda(previsto)}</td>`;
        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: 9px;">${formatarMoeda(realizado)}</td>`;
        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corVariacao}; font-size: 8px; ${borderRight}">${formatarPercentual(analise.variacao)}</td>`;
    });

    html += '</tr>';
    return html;
}

// Criar linha de imposto COM drill-down
function criarLinhaItemComDrilldown(titulo, dados, tipo, nivel = 1) {
    const indentacao = ' '.repeat((nivel - 1) * 2);
    const impostoId = `imposto-${titulo.toLowerCase().replace(/\s+/g, '-').replace(/[()%]/g, '')}`;
    const safeImpostoId = impostoId.replace(/[^a-z0-9-]/gi, '_');

    let html = `<tr style="border-bottom: 1px solid #f1f5f9;" class="concept-level-${nivel}" data-drilldown-id="${safeImpostoId}">`;

    // Primeira coluna - com botão de drilldown
    html += `<td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px;">
        <button class="drilldown-btn" onclick="toggleImposto('${safeImpostoId}', '${titulo}')" data-testid="btn-drilldown-${safeImpostoId}" style="color: #3b82f6; font-weight: bold; font-size: 14px;">
            <span id="icon-${safeImpostoId}">+</span>
        </button>
        ${indentacao}${titulo}
    </td>`;

    // Colunas condensadas - apenas dos meses do quarter atual
    const quarterMeses = {
        1: [0, 1, 2],
        2: [3, 4, 5],
        3: [6, 7, 8],
        4: [9, 10, 11]
    };
    const mesesExibir = quarterMeses[quarterAtual];

    mesesExibir.forEach((mes, idx) => {
        const previsto = dados.previsto_meses ? dados.previsto_meses[mes] : 0;
        const realizado = dados.realizado_meses ? dados.realizado_meses[mes] : 0;

        const analise = calcularAnaliseVariacoes(previsto, realizado);
        const corVariacao = analise.variacao >= 0 ? '#059669' : '#dc2626';

        const borderRight = idx < 2 ? 'border-right: 2px solid #cbd5e0;' : '';

        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: 9px;">${formatarMoeda(previsto)}</td>`;
        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: 9px;">${formatarMoeda(realizado)}</td>`;
        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corVariacao}; font-size: 8px; ${borderRight}">${formatarPercentual(analise.variacao)}</td>`;
    });

    html += '</tr>';

    return html;
}

// Toggle de impostos
function toggleImposto(impostoId) {
    console.log('🔄 Toggle imposto:', impostoId);

    const icon = document.getElementById(`icon-${impostoId}`);
    if (!icon) {
        console.warn('⚠️ Ícone não encontrado:', impostoId);
        return;
    }

    const isExpanded = icon.textContent === '−';

    if (isExpanded) {
        // Contrair
        icon.textContent = '+';
        const childClass = `drilldown-item-${impostoId}`;
        const children = document.querySelectorAll(`.${childClass}`);
        children.forEach(child => {
            child.style.display = 'none';
            const childIcon = child.querySelector('[id^="icon-"]');
            if (childIcon) childIcon.textContent = '+';
        });
        console.log('➖ Contraído:', impostoId);
    } else {
        // Expandir
        icon.textContent = '−';
        expandirImpostoDetalhes(impostoId);
        console.log('➕ Expandido:', impostoId);
    }
}

// Expandir detalhes do imposto - drill down completo até títulos individuais
function expandirImpostoDetalhes(impostoId) {
    console.log('📂 Expandindo detalhes de imposto:', impostoId);

    const drilldownRow = document.querySelector(`[data-drilldown-id="${impostoId}"]`);
    if (!drilldownRow) {
        console.warn('⚠️ Linha pai não encontrada para imposto:', impostoId);
        return;
    }

    // Extrair nome do imposto do drilldownId
    const impostoNomeOriginal = window.impostoIdToNomeMap && window.impostoIdToNomeMap[impostoId];

    if (!impostoNomeOriginal) {
        console.warn('⚠️ Imposto ID não encontrado no mapeamento:', impostoId, '- Mapeamento disponível:', window.impostoIdToNomeMap);

        const html = `
            <tr class="drilldown-item drilldown-item-${impostoId}" style="display: table-row;">
                <td colspan="10" style="padding: 8px 24px; font-size: 10px; color: #6b7280; font-style: italic;">
                    Detalhes não disponíveis
                </td>
            </tr>
        `;
        drilldownRow.insertAdjacentHTML('afterend', html);
        return;
    }

    // Buscar dados do imposto usando o nome original
    const dadosImposto = dadosPLConsolidado.impostos[impostoNomeOriginal];

    if (!dadosImposto) {
        console.warn('⚠️ Dados não encontrados para imposto:', impostoNomeOriginal, '- Chaves disponíveis:', Object.keys(dadosPLConsolidado.impostos));

        const html = `
            <tr class="drilldown-item drilldown-item-${impostoId}" style="display: table-row;">
                <td colspan="10" style="padding: 8px 24px; font-size: 10px; color: #6b7280; font-style: italic;">
                    Detalhes não disponíveis
                </td>
            </tr>
        `;
        drilldownRow.insertAdjacentHTML('afterend', html);
        return;
    }

    let html = '';

    // Verificar se há subitens ou títulos
    const temSubitens = dadosImposto.subitens && Object.keys(dadosImposto.subitens).length > 0;
    const temTitulos = dadosImposto.titulos && Object.keys(dadosImposto.titulos).length > 0;

    if (temSubitens) {
        // Nível 2: Subitens do imposto
        Object.keys(dadosImposto.subitens).forEach(subitemNome => {
            const dadosSubitem = dadosImposto.subitens[subitemNome];
            const subitemId = `${impostoId}_sub_${subitemNome.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/gi, '_')}`;
            const safeSubitemId = subitemId.replace(/[^a-z0-9-]/gi, '_');

            const subitemTemTitulos = dadosSubitem.titulos && Object.keys(dadosSubitem.titulos).length > 0;

            // Criar linha do subitem (visível inicialmente)
            html += criarLinhaHierarquica(subitemNome, dadosSubitem, 'imposto', 3, subitemId, impostoId, !subitemTemTitulos);

            // Nível 3: Títulos do subitem (ocultos inicialmente)
            if (subitemTemTitulos) {
                Object.keys(dadosSubitem.titulos).forEach(tituloNome => {
                    const dadosTitulo = dadosSubitem.titulos[tituloNome];
                    const tituloId = `${subitemId}_titulo_${tituloNome.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/gi, '_')}`;
                    html += criarLinhaHierarquicaOculta(tituloNome, dadosTitulo, 'imposto', 4, tituloId, safeSubitemId, true);
                    console.log(`    ✅ Título de imposto criado: ${tituloNome} com parentClass: drilldown-item-${safeSubitemId}`);
                });
            }
        });
    } else if (temTitulos) {
        // Títulos diretos (sem subitens) - visíveis inicialmente
        Object.keys(dadosImposto.titulos).forEach(tituloNome => {
            const dadosTitulo = dadosImposto.titulos[tituloNome];
            const tituloId = `${impostoId}_titulo_${tituloNome.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/gi, '_')}`;
            html += criarLinhaHierarquica(tituloNome, dadosTitulo, 'imposto', 3, tituloId, impostoId, true);
            console.log(`    ✅ Título direto de imposto criado: ${tituloNome}`);
        });
    } else {
        // Sem detalhes adicionais
        html = `
            <tr class="drilldown-item drilldown-item-${impostoId}" style="display: table-row;">
                <td colspan="10" style="padding: 8px 24px; font-size: 10px; color: #6b7280; font-style: italic;">
                    Sem detalhes adicionais
                </td>
            </tr>
        `;
    }

    if (html) {
        drilldownRow.insertAdjacentHTML('afterend', html);
        console.log('✅ Detalhes de imposto inseridos com drill down completo');
    }
}

// Criar linha vazia para seções sem dados
function criarLinhaVazia(texto, nivel = 1) {
    const indentacao = ' '.repeat((nivel - 1) * 2);

    return `
        <tr style="border-bottom: 1px solid #f1f5f9; opacity: 0.6;">
            <td style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; font-style: italic; color: #6b7280;">
                ${indentacao}${texto}
            </td>
            <td colspan="60" style="border-bottom: 1px solid #f1f5f9;"></td>
        </tr>
    `;
}

// Criar linha de subtotal
function criarLinhaSubtotal(titulo, previstoMeses, realizadoMeses, mesesExibir = [0, 1, 2]) {
    let html = `<tr style="background-color: #f1f5f9; border-top: 1px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; font-weight: 600;">`;
    html += `<td style="padding: 10px 12px; font-size: 11px;">${titulo}</td>`;

    // Colunas condensadas - apenas 3 por mês
    mesesExibir.forEach((mes, idx) => {
        const previsto = previstoMeses[mes];
        const realizado = realizadoMeses[mes];

        const analise = calcularAnaliseVariacoes(previsto, realizado);
        const corVariacao = analise.variacao >= 0 ? '#059669' : '#dc2626';

        const borderRight = idx < mesesExibir.length - 1 ? 'border-right: 2px solid #cbd5e0;' : '';

        html += `<td style="padding: 6px 2px; text-align: right; font-size: 9px;">${formatarMoeda(previsto)}</td>`;
        html += `<td style="padding: 6px 2px; text-align: right; font-size: 9px;">${formatarMoeda(realizado)}</td>`;
        html += `<td style="padding: 6px 2px; text-align: right; color: ${corVariacao}; font-size: 8px; ${borderRight}">${formatarPercentual(analise.variacao)}</td>`;
    });

    html += '</tr>';
    return html;
}

// Criar linha de resultado com valores nos meses do quarter
function criarLinhaResultado(titulo, previstoArray, realizadoArray, mesesExibir = [0, 1, 2], corFundo = '#ddd6fe') {
    let html = `<tr style="background-color: ${corFundo}; border-top: 2px solid #8b5cf6; border-bottom: 2px solid #8b5cf6; font-weight: 700;">`;
    html += `<td style="padding: 12px 16px; font-size: 12px; color: #374151;">${titulo}</td>`;

    // Colunas condensadas - apenas dos meses do quarter atual
    mesesExibir.forEach((mes, idx) => {
        const previsto = previstoArray[idx] || 0;
        const realizado = realizadoArray[idx] || 0;

        const analise = calcularAnaliseVariacoes(previsto, realizado);
        const corPrevisto = obterCorValor(previsto, 'resultado');
        const corRealizado = obterCorValor(realizado, 'resultado');
        const corVariacao = analise.variacao >= 0 ? '#059669' : '#dc2626';

        const borderRight = idx < 2 ? 'border-right: 2px solid #cbd5e0;' : '';

        html += `<td style="padding: 6px 2px; text-align: right; color: ${corPrevisto}; font-size: 9px;">${formatarMoeda(previsto)}</td>`;
        html += `<td style="padding: 6px 2px; text-align: right; color: ${corRealizado}; font-size: 9px; font-weight: 700;">${formatarMoeda(realizado)}</td>`;
        html += `<td style="padding: 6px 2px; text-align: right; color: ${corVariacao}; font-size: 8px; ${borderRight}">${formatarPercentual(analise.variacao)}</td>`;
    });

    html += '</tr>';
    return html;
}

// Criar linha hierárquica (para níveis 2, 3, 4 e 5)
function criarLinhaHierarquica(nome, dados, tipo, nivel, itemId, parentClass, isLeaf = false) {
    const indentacao = ' '.repeat((nivel - 1) * 4);
    const safeItemId = itemId.replace(/[^a-z0-9-]/gi, '_');
    const icones = {2: '👤', 3: '📁', 4: '📦', 5: '📄'};
    const icone = icones[nivel] || '';

    const bgColors = {2: '#ffffff', 3: '#f8fafc', 4: '#fefefe', 5: '#fafafa'};
    const bgColor = bgColors[nivel] || '#ffffff';

    let html = `<tr class="drilldown-item drilldown-item-${parentClass} concept-level-${nivel}" style="display: table-row; background-color: ${bgColor};">`;

    // Primeira coluna - verificar se há QUALQUER tipo de filho para decidir se mostra botão
    const temTitulos = dados.titulos && Object.keys(dados.titulos).length > 0;
    const temProjetos = dados.projetos && Object.keys(dados.projetos).length > 0;
    const temProdutos = dados.produtos && Object.keys(dados.produtos).length > 0;
    const temSubcategorias = dados.subcategorias && Object.keys(dados.subcategorias).length > 0;
    const temFilhos = temTitulos || temProjetos || temProdutos || temSubcategorias;

    // Nível 5 (título) é sempre leaf, ou se não tem filhos
    const ehLeaf = isLeaf || nivel === 5 || !temFilhos;

    if (ehLeaf) {
        html += `<td style="padding: ${nivel >= 4 ? '4' : '6'}px 8px 4px ${16 + (nivel * 8)}px; border-bottom: 1px solid #f1f5f9; font-size: ${nivel >= 4 ? '9' : '10'}px; color: #6b7280;">
            ${icone} ${nome}
        </td>`;
    } else {
        html += `<td style="padding: 6px 8px 6px ${16 + (nivel * 8)}px; border-bottom: 1px solid #f1f5f9; font-size: 10px; font-weight: ${nivel <= 3 ? '600' : '400'}; color: ${nivel <= 3 ? '#475569' : '#6b7280'};">
            <button class="drilldown-btn" onclick="toggleSubitem('${safeItemId}', '${parentClass}')" data-item-id="${safeItemId}" style="color: #6366f1; font-weight: bold; font-size: 12px; cursor: pointer;">
                <span id="icon-${safeItemId}">+</span>
            </button>
            ${icone} ${nome}
        </td>`;
    }

    // Colunas condensadas - apenas dos meses do quarter atual
    const quarterMeses = {
        1: [0, 1, 2],
        2: [3, 4, 5],
        3: [6, 7, 8],
        4: [9, 10, 11]
    };
    const mesesExibir = quarterMeses[quarterAtual];

    mesesExibir.forEach((mes, idx) => {
        const previsto = dados.previsto_meses ? dados.previsto_meses[mes] : 0;
        const realizado = dados.realizado_meses ? dados.realizado_meses[mes] : 0;

        const analise = calcularAnaliseVariacoes(previsto, realizado);
        const corVariacao = analise.variacao >= 0 ? '#059669' : '#dc2626';

        const fontSize = nivel >= 4 ? '7px' : '8px';
        const borderRight = idx < 2 ? 'border-right: 2px solid #cbd5e0;' : '';

        html += `<td style="padding: 3px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: ${fontSize};">${formatarMoeda(previsto)}</td>`;
        html += `<td style="padding: 3px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: ${fontSize}; font-weight: 500;">${formatarMoeda(realizado)}</td>`;
        html += `<td style="padding: 3px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corVariacao}; font-size: ${fontSize}; ${borderRight}">${formatarPercentual(analise.variacao)}</td>`;
    });

    html += '</tr>';
    return html;
}

// Criar linha hierárquica inicialmente oculta (para títulos dentro de subcategorias)
function criarLinhaHierarquicaOculta(nome, dados, tipo, nivel, itemId, parentClass, isLeaf = false) {
    const safeItemId = itemId.replace(/[^a-z0-9-]/gi, '_');
    const icones = {2: '👤', 3: '📁', 4: '📦', 5: '📄'};
    const icone = icones[nivel] || '';

    let html = `<tr class="drilldown-item drilldown-item-${parentClass} concept-level-${nivel}" style="display: none; background-color: #fefefe;">`;

    // Primeira coluna - com ou sem botão de drilldown
    // Nível 5 (título) ou maior é sempre leaf
    const ehLeaf = isLeaf || nivel >= 5;

    if (ehLeaf) {
        html += `<td style="padding: 4px 8px 4px ${16 + (nivel * 8)}px; border-bottom: 1px solid #f1f5f9; font-size: 9px; color: #6b7280;">
            ${icone} ${nome}
        </td>`;
    } else {
        html += `<td style="padding: 4px 8px 4px ${16 + (nivel * 8)}px; border-bottom: 1px solid #f1f5f9; font-size: 9px; color: #6b7280;">
            <button class="drilldown-btn" onclick="toggleSubitem('${safeItemId}', '${parentClass}')" data-item-id="${safeItemId}" style="color: #6366f1; font-weight: bold; font-size: 12px; cursor: pointer;">
                <span id="icon-${safeItemId}">+</span>
            </button>
            ${icone} ${nome}
        </td>`;
    }

    // Colunas condensadas - apenas dos meses do quarter atual
    const quarterMeses = {
        1: [0, 1, 2],
        2: [3, 4, 5],
        3: [6, 7, 8],
        4: [9, 10, 11]
    };
    const mesesExibir = quarterMeses[quarterAtual];

    mesesExibir.forEach((mes, idx) => {
        const previsto = dados.previsto_meses ? dados.previsto_meses[mes] : 0;
        const realizado = dados.realizado_meses ? dados.realizado_meses[mes] : 0;

        const analise = calcularAnaliseVariacoes(previsto, realizado);
        const corVariacao = analise.variacao >= 0 ? '#059669' : '#dc2626';

        const borderRight = idx < 2 ? 'border-right: 2px solid #cbd5e0;' : '';

        html += `<td style="padding: 2px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: 7px;">${formatarMoeda(previsto)}</td>`;
        html += `<td style="padding: 2px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: 7px;">${formatarMoeda(realizado)}</td>`;
        html += `<td style="padding: 2px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corVariacao}; font-size: 7px; ${borderRight}">${formatarPercentual(analise.variacao)}</td>`;
    });

    html += '</tr>';
    return html;
}

// Toggle de subitens (projetos, produtos, subcategorias, títulos)
function toggleSubitem(itemId, parentClass) {
    const safeItemId = itemId.replace(/[^a-z0-9-]/gi, '_');
    const icon = document.getElementById(`icon-${safeItemId}`);
    if (!icon) {
        console.warn('⚠️ Ícone não encontrado para:', safeItemId);
        return;
    }

    const isExpanded = icon.textContent === '−';
    const childClass = `drilldown-item-${safeItemId}`;

    if (isExpanded) {
        // Contrair - esconder filhos diretos E TODOS os descendentes recursivamente
        icon.textContent = '+';
        const children = document.querySelectorAll(`.${childClass}`);

        children.forEach(child => {
            child.style.display = 'none';

            // Recolher TODOS os descendentes recursivamente
            recolherTodosDescendentes(child);
        });

        console.log('➖ Contraído:', safeItemId, '- Escondidos', children.length, 'filhos e todos descendentes');
    } else {
        // Expandir - mostrar filhos diretos
        icon.textContent = '−';
        const children = document.querySelectorAll(`.${childClass}`);
        console.log(`🔍 Procurando por filhos com classe: ${childClass}`);
        console.log(`📊 Encontrados ${children.length} elementos`);

        if (children.length === 0) {
            console.warn(`⚠️ Nenhum filho encontrado para ${safeItemId}. Classes disponíveis na página:`);
            document.querySelectorAll('tr[class*="drilldown-item"]').forEach(el => {
                console.log(`   - ${el.className}`);
            });
        }

        children.forEach(child => {
            child.style.display = 'table-row';
            console.log(`✅ Mostrando filho direto:`, child);
        });
        console.log('➕ Expandido:', safeItemId, '- Mostrados', children.length, 'filhos diretos');
    }
}

// Função auxiliar para recolher todos os descendentes recursivamente
function recolherTodosDescendentes(elemento) {
    // Buscar ícone de expansão no elemento
    const childIcon = elemento.querySelector('[id^="icon-"]');

    if (childIcon && childIcon.textContent === '−') {
        // Recolher o ícone
        childIcon.textContent = '+';

        // Encontrar o ID do elemento para buscar seus filhos
        const iconId = childIcon.id.replace('icon-', '');
        const grandchildClass = `drilldown-item-${iconId}`;
        const grandchildren = document.querySelectorAll(`.${grandchildClass}`);

        // Esconder todos os filhos
        grandchildren.forEach(grandchild => {
            grandchild.style.display = 'none';

            // Recursivamente recolher os descendentes deste filho
            recolherTodosDescendentes(grandchild);
        });
    }
}

// Calcular análise de variações
function calcularAnaliseVariacoes(previsto, realizado) {
    const performance = previsto !== 0 ? (realizado / previsto) * 100 : 0;
    const diferenca = realizado - previsto;
    const variacao = previsto !== 0 ? ((realizado - previsto) / Math.abs(previsto)) * 100 : 0;

    return { performance, diferenca, variacao };
}

// Obter cor do valor baseado no tipo
function obterCorValor(valor, tipo) {
    if (valor === 0) return '#6b7280';

    switch (tipo) {
        case 'receita':
        case 'total':
        case 'resultado':
            return valor > 0 ? '#059669' : '#dc2626';
        case 'despesa':
        case 'imposto':
            return valor > 0 ? '#dc2626' : '#059669';
        default:
            return valor > 0 ? '#059669' : '#dc2626';
    }
}

// Formatar moeda
function formatarMoeda(valor) {
    if (valor === 0) return '-';

    const valorAbs = Math.abs(valor);
    const sinal = valor < 0 ? '-' : '';

    return sinal + valorAbs.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

// Formatar percentual
function formatarPercentual(valor) {
    if (valor === 0 || !isFinite(valor)) return '-';
    return valor.toFixed(1) + '%';
}

// Toggle drilldown
function toggleDrilldown(drilldownId, tipo) {
    console.log('🔄 Toggle drilldown:', drilldownId, 'tipo:', tipo);

    const icon = document.getElementById(`icon-${drilldownId}`);
    if (!icon) {
        console.warn('⚠️ Ícone não encontrado:', `icon-${drilldownId}`);
        return;
    }

    const isExpanded = drilldownState[drilldownId] || false;

    if (isExpanded) {
        // Contrair
        icon.textContent = '+';
        drilldownState[drilldownId] = false;

        // Esconder linhas filhas
        const drilldownItems = document.querySelectorAll(`.drilldown-item-${drilldownId.replace(/[^a-z0-9-]/gi, '_')}`);
        drilldownItems.forEach(item => {
            item.style.display = 'none';
            item.classList.remove('expanded');
        });

        console.log('➖ Contraído:', drilldownId);
    } else {
        // Expandir
        icon.textContent = '−';
        drilldownState[drilldownId] = true;

        // Mostrar ou criar linhas filhas (apenas para despesas e impostos)
        if (tipo === 'despesa') {
            expandirDespesaDrilldown(drilldownId);
        } else if (tipo === 'imposto') {
            expandirImpostoDrilldown(drilldownId);
        }

        console.log('➕ Expandido:', drilldownId);
    }
}

// Expandir drill down de IMPOSTOS (PIS > COFINS > ... > Outros)
function expandirImpostoDrilldown(drilldownId) {
    console.log('📂 Expandindo imposto drill down:', drilldownId);

    const drilldownRow = document.querySelector(`[data-drilldown-id="${drilldownId}"]`);
    if (!drilldownRow) {
        console.warn('⚠️ Linha pai não encontrada para:', drilldownId);
        return;
    }

    // Extrair nome do imposto do drilldownId
    const impostoNome = drilldownId.replace('drilldown-imposto-', '').replace(/-/g, ' ');

    // Buscar dados do imposto nas impostos
    let dadosImposto = null;

    // Procurar o imposto exato (case-sensitive primeiro)
    if (dadosPLConsolidado.impostos && dadosPLConsolidado.impostos[impostoNome]) {
        dadosImposto = dadosPLConsolidado.impostos[impostoNome];
    } else {
        // Se não encontrar, procurar case-insensitive
        const impostoKey = Object.keys(dadosPLConsolidado.impostos || {}).find(
            key => key.toLowerCase() === impostoNome.toLowerCase()
        );
        if (impostoKey) {
            dadosImposto = dadosPLConsolidado.impostos[impostoKey];
        }
    }

    if (!dadosImposto) {
        console.warn('⚠️ Dados não encontrados para imposto:', impostoNome);
        console.log('📋 Impostos disponíveis:', Object.keys(dadosPLConsolidado.impostos || {}));
        return;
    }

    console.log('📊 Expandindo imposto:', impostoNome, 'com dados:', dadosImposto);

    // Verificar se já existem linhas filhas
    const safeId = drilldownId.replace(/[^a-z0-9-]/gi, '_');
    const existingItems = document.querySelectorAll(`.drilldown-item-${safeId}`);

    if (existingItems.length > 0) {
        console.log('✅ Já existem', existingItems.length, 'linhas filhas, apenas mostrando');
        existingItems.forEach(item => {
            item.style.display = 'table-row';
            item.classList.add('expanded');
        });
        return;
    }

    let html = '';

    // Nível 2: Subitens do imposto (se houver)
    if (dadosImposto.subitens && Object.keys(dadosImposto.subitens).length > 0) {
        Object.keys(dadosImposto.subitens).forEach(subitemNome => {
            const dadosSubitem = dadosImposto.subitens[subitemNome];
            const subitemId = `${drilldownId}_sub_${subitemNome.replace(/\s+/g, '-').toLowerCase()}`;
            const safeSubitemId = subitemId.replace(/[^a-z0-9-]/gi, '_');

            console.log(`📂 Criando subitem: ${subitemNome}, ID: ${safeSubitemId}`);

            // Criar linha do subitem
            html += criarLinhaHierarquica(subitemNome, dadosSubitem, 'imposto', 3, subitemId, safeId, false);

            // Nível 3: Títulos do subitem (se houver)
            if (dadosSubitem.titulos && Object.keys(dadosSubitem.titulos).length > 0) {
                console.log(`  📄 Subitem "${subitemNome}" tem ${Object.keys(dadosSubitem.titulos).length} títulos`);
                Object.keys(dadosSubitem.titulos).forEach(tituloNome => {
                    const dadosTitulo = dadosSubitem.titulos[tituloNome];
                    const tituloId = `${subitemId}_titulo_${tituloNome.replace(/\s+/g, '-').toLowerCase()}`;

                    // Criar linha do título, mas oculta inicialmente
                    // O parentClass DEVE ser safeSubitemId para que toggleSubitem encontre os filhos
                    html += criarLinhaHierarquicaOculta(tituloNome, dadosTitulo, 'imposto', 4, tituloId, safeSubitemId, true);
                    console.log(`    ✅ Título criado: ${tituloNome} com parentClass: drilldown-item-${safeSubitemId}`);
                });
            } else {
                console.log(`  ⚠️ Subitem "${subitemNome}" não tem títulos`);
            }
        });
    } else {
        console.log('⚠️ Imposto não tem subitens');
        // Se não houver subitens, mas houver títulos diretos, criá-los
        if (dadosImposto.titulos && Object.keys(dadosImposto.titulos).length > 0) {
             console.log(`  📄 Imposto "${impostoNome}" tem ${Object.keys(dadosImposto.titulos).length} títulos diretos`);
                Object.keys(dadosImposto.titulos).forEach(tituloNome => {
                    const dadosTitulo = dadosImposto.titulos[tituloNome];
                    const tituloId = `${drilldownId}_titulo_${tituloNome.replace(/\s+/g, '-').toLowerCase()}`;

                    // Criar linha do título, mas oculta inicialmente
                    html += criarLinhaHierarquicaOculta(tituloNome, dadosTitulo, 'imposto', 3, tituloId, safeId, true);
                    console.log(`    ✅ Título direto criado: ${tituloNome} com parentClass: drilldown-item-${safeId}`);
                });
        } else {
             html += criarLinhaVazia('Nenhum detalhe encontrado para este imposto', 3);
        }

    }

    if (html) {
        drilldownRow.insertAdjacentHTML('afterend', html);
        console.log('✅ HTML de subitens/títulos de impostos inserido');
    }
}


// Expandir drill down de DESPESAS (Categoria Gerencial > Subcategoria > Título)
function expandirDespesaDrilldown(drilldownId) {
    console.log('📂 Expandindo despesa drill down:', drilldownId);

    const drilldownRow = document.querySelector(`[data-drilldown-id="${drilldownId}"]`);
    if (!drilldownRow) {
        console.warn('⚠️ Linha pai não encontrada para:', drilldownId);
        return;
    }

    // Extrair nome da categoria do drilldownId
    const categoriaNome = drilldownId.replace('drilldown-despesa-', '').replace(/-/g, ' ');

    // Buscar dados da categoria nas despesas
    let dadosCategoria = null;

    // Procurar a categoria exata (case-sensitive primeiro)
    if (dadosPLConsolidado.despesas && dadosPLConsolidado.despesas[categoriaNome]) {
        dadosCategoria = dadosPLConsolidado.despesas[categoriaNome];
    } else {
        // Se não encontrar, procurar case-insensitive
        const categoriaKey = Object.keys(dadosPLConsolidado.despesas || {}).find(
            key => key.toLowerCase() === categoriaNome.toLowerCase()
        );
        if (categoriaKey) {
            dadosCategoria = dadosPLConsolidado.despesas[categoriaKey];
        }
    }

    if (!dadosCategoria) {
        console.warn('⚠️ Dados não encontrados para categoria:', categoriaNome);
        console.log('📋 Categorias disponíveis:', Object.keys(dadosPLConsolidado.despesas || {}));
        return;
    }

    console.log('📊 Expandindo categoria:', categoriaNome, 'com dados:', dadosCategoria);

    // Verificar se já existem linhas filhas
    const safeId = drilldownId.replace(/[^a-z0-9-]/gi, '_');
    const existingItems = document.querySelectorAll(`.drilldown-item-${safeId}`);

    if (existingItems.length > 0) {
        console.log('✅ Já existem', existingItems.length, 'linhas filhas, apenas mostrando');
        existingItems.forEach(item => {
            item.style.display = 'table-row';
            item.classList.add('expanded');
        });
        return;
    }

    let html = '';

    // Nível 2: Subcategorias da categoria
    if (dadosCategoria.subcategorias && Object.keys(dadosCategoria.subcategorias).length > 0) {
        Object.keys(dadosCategoria.subcategorias).forEach(subcategoriaNome => {
            const dadosSubcategoria = dadosCategoria.subcategorias[subcategoriaNome];
            const subcategoriaId = `${drilldownId}_sub_${subcategoriaNome.replace(/\s+/g, '-').toLowerCase()}`;
            const safeSubcategoriaId = subcategoriaId.replace(/[^a-z0-9-]/gi, '_');

            console.log(`📂 Criando subcategoria: ${subcategoriaNome}, ID: ${safeSubcategoriaId}`);

            // Criar linha da subcategoria
            html += criarLinhaHierarquica(subcategoriaNome, dadosSubcategoria, 'despesa', 3, subcategoriaId, safeId, false);

            // Nível 3: Títulos da subcategoria (sempre criar, mas inicialmente ocultos)
            if (dadosSubcategoria.titulos && Object.keys(dadosSubcategoria.titulos).length > 0) {
                console.log(`  📄 Subcategoria "${subcategoriaNome}" tem ${Object.keys(dadosSubcategoria.titulos).length} títulos`);
                Object.keys(dadosSubcategoria.titulos).forEach(tituloNome => {
                    const dadosTitulo = dadosSubcategoria.titulos[tituloNome];
                    const tituloId = `${subcategoriaId}_titulo_${tituloNome.replace(/\s+/g, '-').toLowerCase()}`;

                    // Criar linha do título, mas oculta inicialmente
                    // O parentClass DEVE ser safeSubcategoriaId para que toggleSubitem encontre os filhos
                    html += criarLinhaHierarquicaOculta(tituloNome, dadosTitulo, 'despesa', 4, tituloId, safeSubcategoriaId, true);
                    console.log(`    ✅ Título criado: ${tituloNome} com parentClass: drilldown-item-${safeSubcategoriaId}`);
                });
            } else {
                console.log(`  ⚠️ Subcategoria "${subcategoriaNome}" não tem títulos`);
            }
        });
    } else {
        console.log('⚠️ Categoria não tem subcategorias');
        html += criarLinhaVazia('Nenhuma subcategoria encontrada', 3);
    }

    if (html) {
        drilldownRow.insertAdjacentHTML('afterend', html);
        console.log('✅ HTML de subcategorias inserido após a linha da categoria');
    }
}

// Carregar detalhes da categoria via API
async function carregarDetalhesCategoria(categoriaNome, drilldownId) {
    try {
        console.log('🔍 Carregando detalhes para categoria:', categoriaNome);

        const ano = document.getElementById('ano-filter').value;
        const empresa = document.getElementById('empresa-filter').value;
        const cliente = document.getElementById('cliente-filter').value;
        const projeto = document.getElementById('projeto-filter').value;
        const produtoServico = document.getElementById('produto-servico-filter').value;

        // Construir URL com parâmetros
        const params = new URLSearchParams({
            ano: ano,
            categoria: categoriaNome
        });

        if (empresa) params.append('empresa', empresa);
        if (cliente) params.append('cliente', cliente);
        if (projeto) params.append('projeto', projeto);
        if (produtoServico) params.append('produto_servico', produtoServico);

        const response = await fetch(`/api/relatorios/pl-consolidado/detalhes-categoria?${params}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const detalhes = await response.json();
        console.log('✅ Detalhes da categoria carregados:', detalhes);

        // Renderizar hierarquia real
        renderizarHierarquiaCategoria(drilldownId, detalhes);

    } catch (error) {
        console.error('❌ Erro ao carregar detalhes da categoria:', error);

        // Fallback: mostrar estrutura básica
        renderizarHierarquiaBasica(drilldownId, categoriaNome);
    }
}

// Renderizar hierarquia real da categoria
function renderizarHierarquiaCategoria(drilldownId, detalhes) {
    const drilldownRow = document.querySelector(`[data-drilldown-id="${drilldownId}"]`);
    if (!drilldownRow) return;

    let html = '';

    // Estrutura: Categoria > Subcategoria > Breve Título
    if (detalhes.subcategorias && Object.keys(detalhes.subcategorias).length > 0) {
        // Renderizar subcategorias
        Object.keys(detalhes.subcategorias).forEach(subcategoriaNome => {
            const dadosSubcategoria = detalhes.subcategorias[subcategoriaNome];
            const subcategoriaId = `${drilldownId}-sub-${subcategoriaNome.replace(/\s+/g, '-')}`;

            // Linha da subcategoria
            html += criarLinhaSubcategoria(subcategoriaNome, dadosSubcategoria, subcategoriaId);

            // Itens (breves títulos) da subcategoria
            if (dadosSubcategoria.itens && Object.keys(dadosSubcategoria.itens).length > 0) {
                Object.keys(dadosSubcategoria.itens).forEach(breveTitulo => {
                    const dadosItem = dadosSubcategoria.itens[breveTitulo];
                    html += criarLinhaItemDetalhado(breveTitulo, dadosItem, subcategoriaId, 4);
                });
            }
        });
    } else {
        // Sem subcategorias, mostrar itens diretos
        if (detalhes.itens && Object.keys(detalhes.itens).length > 0) {
            Object.keys(detalhes.itens).forEach(breveTitulo => {
                const dadosItem = detalhes.itens[breveTitulo];
                html += criarLinhaItemDetalhado(breveTitulo, dadosItem, drilldownId, 3);
            });
        } else {
            html += criarLinhaVazia('Nenhum item encontrado para esta categoria', 3);
        }
    }

    // Inserir após a linha pai
    drilldownRow.insertAdjacentHTML('afterend', html);

    console.log('✅ Hierarquia real renderizada para:', drilldownId);
}

// Criar linha de subcategoria
function criarLinhaSubcategoria(nome, dados, subcategoriaId) {
    let html = `<tr class="drilldown-item drilldown-item-${subcategoriaId.split('-sub-')[0]} concept-level-3" style="display: table-row; background-color: #f8fafc;">`;

    // Primeira coluna - nome da subcategoria com botão de drilldown
    html += `<td style="padding: 6px 8px 6px 32px; border-bottom: 1px solid #f1f5f9; font-size: 10px; font-weight: 600; color: #475569;">
        <button class="drilldown-btn" onclick="toggleSubcategoriaExpansion('${subcategoriaId}')" style="color: #6366f1; font-weight: bold; font-size: 12px;">
            <span id="icon-${subcategoriaId}">+</span>
        </button>
        📁 ${nome}
    </td>`;

    // Colunas dos meses
    for (let mes = 0; mes < 12; mes++) {
        const realizado = dados.realizado_meses ? dados.realizado_meses[mes] : 0;
        const previsto = dados.previsto_meses ? dados.previsto_meses[mes] : 0;

        const analise = calcularAnaliseVariacoes(previsto, realizado);
        const corRealizado = obterCorValor(realizado, 'despesa');

        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: 8px;">${formatarMoeda(previsto)}</td>`;
        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corRealizado}; font-size: 8px; font-weight: 500;">${formatarMoeda(realizado)}</td>`;
        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: 7px;">${formatarPercentual(analise.performance)}</td>`;
        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: 8px;">${formatarMoeda(analise.diferenca)}</td>`;

        const borderRight = mes < 11 ? 'border-right: 2px solid #cbd5e0;' : '';
        html += `<td style="padding: 4px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: 7px; ${borderRight}">${formatarPercentual(analise.variacao)}</td>`;
    }

    html += '</tr>';
    return html;
}

// Criar linha de item (breve título) 
function criarLinhaItemDetalhado(nome, dados, parentId, nivel) {
    const indentacao = ' '.repeat((nivel - 1) * 4);

    let html = `<tr class="drilldown-item drilldown-item-${parentId.split('-sub-')[0]} concept-level-${nivel}" style="display: table-row; background-color: #fefefe;">`;

    // Primeira coluna - breve título
    html += `<td style="padding: 4px 8px 4px ${16 + (nivel * 8)}px; border-bottom: 1px solid #f1f5f9; font-size: 9px; color: #6b7280;">
        📄 ${nome}
    </td>`;

    // Colunas dos meses
    for (let mes = 0; mes < 12; mes++) {
        const realizado = dados.realizado_meses ? dados.realizado_meses[mes] : 0;
        const previsto = dados.previsto_meses ? dados.previsto_meses[mes] : 0;

        const analise = calcularAnaliseVariacoes(previsto, realizado);
        const corRealizado = obterCorValor(realizado, 'despesa');

        html += `<td style="padding: 3px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: 8px;">${formatarMoeda(previsto)}</td>`;
        html += `<td style="padding: 3px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corRealizado}; font-size: 8px;">${formatarMoeda(realizado)}</td>`;
        html += `<td style="padding: 3px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: 7px;">${formatarPercentual(analise.performance)}</td>`;
        html += `<td style="padding: 3px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: 8px;">${formatarMoeda(analise.diferenca)}</td>`;

        const borderRight = mes < 11 ? 'border-right: 2px solid #cbd5e0;' : '';
        html += `<td style="padding: 3px 2px; text-align: right; border-bottom: 1px solid #f1f5f9; font-size: 7px; ${borderRight}">${formatarPercentual(analise.variacao)}</td>`;
    }

    html += '</tr>';
    return html;
}

// Renderizar hierarquia básica (fallback)
function renderizarHierarquiaBasica(drilldownId, categoriaNome) {
    const drilldownRow = document.querySelector(`[data-drilldown-id="${drilldownId}"]`);
    if (!drilldownRow) return;

    const html = `
        <tr class="drilldown-item drilldown-item-${drilldownId} concept-level-3" style="display: table-row; background-color: #fafbfc;">
            <td style="padding: 4px 8px 4px 40px; border-bottom: 1px solid #f1f5f9; font-size: 10px; color: #6b7280;">
                📊 Carregando detalhes de "${categoriaNome}"...
            </td>
            <td colspan="60" style="border-bottom: 1px solid #f1f5f9; background-color: #fafbfc;"></td>
        </tr>
    `;

    drilldownRow.insertAdjacentHTML('afterend', html);
}

// Toggle expansão de subcategoria
function toggleSubcategoriaExpansion(subcategoriaId) {
    console.log('🔄 Toggle subcategoria:', subcategoriaId);

    const icon = document.getElementById(`icon-${subcategoriaId}`);
    if (!icon) return;

    const isExpanded = icon.textContent === '−';
    const parentDrilldownId = subcategoriaId.split('-sub-')[0];

    if (isExpanded) {
        // Contrair - esconder itens da subcategoria
        icon.textContent = '+';
        const items = document.querySelectorAll(`.drilldown-item-${parentDrilldownId}`);
        items.forEach(item => {
            if (item.style.display === 'table-row' && item.classList.contains('concept-level-4')) {
                item.style.display = 'none';
            }
        });
    } else {
        // Expandir - mostrar itens da subcategoria
        icon.textContent = '−';
        const items = document.querySelectorAll(`.drilldown-item-${parentDrilldownId}`);
        items.forEach(item => {
            if (item.classList.contains('concept-level-4')) {
                item.style.display = 'table-row';
            }
        });
    }
}

// Resetar filtros
function resetFilters() {
    document.getElementById('ano-filter').value = new Date().getFullYear();
    document.getElementById('empresa-filter').value = '';
    document.getElementById('cliente-filter').value = '';
    document.getElementById('projeto-filter').value = '';
    document.getElementById('produto-servico-filter').value = '';

    carregarDadosPLConsolidado();
}



// Exportar P&L Consolidado
async function exportarPLConsolidado(formato = 'xlsx') {
    try {
        console.log(`📥 Exportando P&L Consolidado como ${formato.toUpperCase()}...`);

        const ano = document.getElementById('ano-filter').value;
        const empresa = document.getElementById('empresa-filter').value;
        const cliente = document.getElementById('cliente-filter').value;
        const projeto = document.getElementById('projeto-filter').value;
        const produtoServico = document.getElementById('produto-servico-filter').value;

        // Construir URL
        let url = `/api/relatorios/pl-consolidado/export-excel?ano=${ano}`;
        if (empresa) url += `&empresa=${empresa}`;
        if (cliente) url += `&cliente=${cliente}`;
        if (projeto) url += `&projeto=${projeto}`;
        if (produtoServico) url += `&produto_servico=${produtoServico}`;

        console.log('📥 Baixando arquivo Excel de:', url);

        const response = await fetch(url, {
            credentials: 'include',
            headers: {
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `pl-consolidado-${ano}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        showSuccessMessage(`P&L Consolidado exportado como Excel`);

    } catch (error) {
        console.error('❌ Erro ao exportar P&L Consolidado:', error);
        showErrorMessage('Erro ao exportar P&L Consolidado');
    }
}

// Funções utilitárias
function showErrorMessage(message) {
    console.error('❌ Erro:', message);
    alert('Erro: ' + message);
}

function showSuccessMessage(message) {
    console.log('✅ Sucesso:', message);
    alert(message);
}