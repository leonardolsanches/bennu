
// Cash Flow - Sistema de projeção cash flow
console.log('📊 Carregando módulo Cash Flow...');

let dadosCashFlow = {
    saldo_inicial: 0,
    receitas: {},
    despesas: {},
    impostos: {},
    saldo_acumulado: [],
    totais: {}
};

// Estado para controlar itens expandidos e sua hierarquia
let expandedItems = {};

// Variável global para armazenar a estrutura do Cash Flow
let estruturaCashFlow = [];

// Largura da primeira coluna é controlada no template HTML

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Inicializando Cash Flow...');

    // Popular campo de ano com ano corrente + passados + 5 futuros
    const anoAtual = new Date().getFullYear();
    if (window.populateYearSelect) {
        window.populateYearSelect('ano-filter', { includePlaceholder: false });
    }
    document.getElementById('ano-filter').value = anoAtual;
    document.getElementById('periodo-atual').textContent = anoAtual;
    document.getElementById('competencia-info').textContent = anoAtual;

    // Atualizar cabeçalhos dos meses na inicialização
    atualizarCabecalhosMeses(anoAtual);

    // Carregar filtros e dados na ordem correta: Ano (já definido), Empresa, Projeto, Cliente, Produto/Serviço
    Promise.all([
        carregarEmpresas(),
        carregarProjetos(),
        carregarClientes(),
        carregarProdutosServicos(),
        carregarDadosCashFlow()
    ]).then(() => {
        console.log('✅ Cash Flow carregado com sucesso!');
    }).catch(error => {
        console.error('❌ Erro ao carregar Cash Flow:', error);
        showErrorMessage('Erro ao carregar dados do Cash Flow');
    });
});

// Carregar lista de empresas
async function carregarEmpresas() {
    try {
        console.log('📊 Carregando empresas...');
        const response = await fetch('/api/empresas', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const empresas = await response.json();

        const empresaSelect = document.getElementById('empresa-filter');
        empresaSelect.innerHTML = '<option value="">Todas as Empresas</option>';

        empresas.forEach(empresa => {
            const option = document.createElement('option');
            option.value = empresa.id;
            option.textContent = empresa.nome_fantasia || empresa.razao_social;
            empresaSelect.appendChild(option);
        });

        console.log('✅ Empresas carregadas:', empresas.length);
    } catch (error) {
        console.error('❌ Erro ao carregar empresas:', error);
        const empresaSelect = document.getElementById('empresa-filter');
        empresaSelect.innerHTML = '<option value="">Todas as Empresas</option>';
    }
}

// Carregar lista de clientes
async function carregarClientes() {
    try {
        console.log('📊 Carregando clientes...');
        const response = await fetch('/api/clientes', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const clientes = await response.json();

        const clienteSelect = document.getElementById('cliente-filter');
        clienteSelect.innerHTML = '<option value="">Todos os Clientes</option>';

        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nome;
            clienteSelect.appendChild(option);
        });

        console.log('✅ Clientes carregados:', clientes.length);
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
        const clienteSelect = document.getElementById('cliente-filter');
        clienteSelect.innerHTML = '<option value="">Todos os Clientes</option>';
    }
}

// Carregar lista de projetos
async function carregarProjetos() {
    try {
        console.log('📊 Carregando projetos...');
        const response = await fetch('/api/projetos', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const projetos = await response.json();
        console.log('📊 Dados de projetos recebidos:', projetos);

        const projetoSelect = document.getElementById('projeto-filter');
        if (!projetoSelect) {
            console.error('❌ Elemento projeto-filter não encontrado no DOM');
            return;
        }

        projetoSelect.innerHTML = '<option value="">Todos os Projetos</option>';

        if (Array.isArray(projetos) && projetos.length > 0) {
            projetos.forEach(projeto => {
                if (projeto && projeto.id && projeto.nome) {
                    const option = document.createElement('option');
                    option.value = projeto.id;
                    option.textContent = projeto.nome;
                    projetoSelect.appendChild(option);
                    console.log('📊 Projeto adicionado ao select:', projeto.nome, 'ID:', projeto.id);
                }
            });
            console.log('✅ Projetos carregados com sucesso:', projetos.length);
        } else {
            console.warn('⚠️ Nenhum projeto encontrado ou resposta inválida');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar projetos:', error);
        const projetoSelect = document.getElementById('projeto-filter');
        if (projetoSelect) {
            projetoSelect.innerHTML = '<option value="">Todos os Projetos</option>';
        }
    }
}

// Carregar lista de produtos/serviços
async function carregarProdutosServicos() {
    try {
        console.log('📊 Carregando produtos/serviços...');
        const response = await fetch('/api/produtos-servicos', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const produtosServicos = await response.json();

        const produtoServicoSelect = document.getElementById('produto-servico-filter');
        produtoServicoSelect.innerHTML = '<option value="">Todos</option>';

        produtosServicos.forEach(ps => {
            const option = document.createElement('option');
            option.value = ps.id;
            option.textContent = ps.nome + (ps.tipo ? ` (${ps.tipo})` : '');
            produtoServicoSelect.appendChild(option);
        });

        console.log('✅ Produtos/Serviços carregados:', produtosServicos.length);
    } catch (error) {
        console.error('❌ Erro ao carregar produtos/serviços:', error);
        const produtoServicoSelect = document.getElementById('produto-servico-filter');
        produtoServicoSelect.innerHTML = '<option value="">Todos</option>';
    }
}

// Carregar dados do Cash Flow
async function carregarDadosCashFlow() {
    const tbody = document.getElementById('cashflow-tbody');
    
    try {
        console.log('📊 Carregando dados do Cash Flow...');

        // Mostrar loading
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="text-center py-3">
                    <div class="d-flex align-items-center justify-content-center">
                        <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                        <span class="small">Carregando dados do Cash Flow...</span>
                    </div>
                </td>
            </tr>
        `;

        const ano = document.getElementById('ano-filter').value;
        const empresa = document.getElementById('empresa-filter').value;
        const cliente = document.getElementById('cliente-filter').value;
        const projeto = document.getElementById('projeto-filter').value;
        const produtoServico = document.getElementById('produto-servico-filter').value;
        const baseEl = document.getElementById('base-filter');
        const base = baseEl ? baseEl.value : 'competencia';

        document.getElementById('periodo-atual').textContent = ano;
        document.getElementById('competencia-info').textContent = ano;

        atualizarCabecalhosMeses(parseInt(ano));
        atualizarInfoHeader(empresa, cliente);

        let url = `/api/relatorios/cashflow-gerencial?ano=${ano}&base=${base}`;
        if (empresa) {
            url += `&empresa=${empresa}`;
        }
        if (cliente) {
            url += `&cliente=${cliente}`;
        }
        if (projeto) {
            url += `&projeto=${projeto}`;
        }
        if (produtoServico) {
            url += `&produto_servico=${produtoServico}`;
        }

        console.log('🔍 Buscando dados de:', url);

        const response = await fetch(url, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        dadosCashFlow = await response.json();
        console.log('✅ Dados Cash Flow carregados:', dadosCashFlow);

        // Resetar estado de expansão ao carregar novos dados
        expandedItems = {};

        // Renderizar tabela
        renderizarTabelaCashFlow();

    } catch (error) {
        console.error('❌ Erro ao carregar dados Cash Flow:', error);
        
        // Mostrar estado de erro na tabela
        tbody.innerHTML = `
            <tr>
                <td colspan="14" style="text-align: center; padding: 40px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <br>Erro ao carregar dados do Cash Flow
                    <br><small style="color: #6b7280;">${error.message || 'Verifique sua conexão e tente novamente'}</small>
                </td>
            </tr>
        `;
        
        // Usar função global se disponível
        if (typeof showErrorMessage === 'function') {
            showErrorMessage('Erro ao carregar dados do Cash Flow');
        }
    }
}

// Atualizar cabeçalhos dos meses (Faturado/Projetado) com base na data de corte
function atualizarCabecalhosMeses(ano) {
    const dataCorteInput = document.getElementById('data-corte-filter');
    let dataCorte;

    if (dataCorteInput && dataCorteInput.value) {
        dataCorte = new Date(dataCorteInput.value + 'T00:00:00');
    } else {
        // Se não houver data de corte definida, usar a data atual
        dataCorte = new Date();
    }

    const anoCorte = dataCorte.getFullYear();
    const mesCorte = dataCorte.getMonth(); // 0-11 (Janeiro = 0)

    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    meses.forEach((mes, index) => {
        const elementoStatus = document.getElementById(`status-${mes}`);
        if (elementoStatus) {
            let status, cor;

            if (ano < anoCorte || (ano === anoCorte && index < mesCorte)) {
                status = 'Faturado';
                cor = '#059669'; // Verde para faturado
            } else if (ano === anoCorte && index === mesCorte) {
                status = 'Atual';
                cor = '#f59e0b'; // Amarelo para mês atual
            } else {
                status = 'Projetado';
                cor = '#3b82f6'; // Azul para projetado
            }

            elementoStatus.textContent = status;
            elementoStatus.style.color = cor;
            elementoStatus.style.fontWeight = '600';
        }
    });
}

// Atualizar informações do cabeçalho
function atualizarInfoHeader(empresaId, clienteId) {
    const infoHeader = document.getElementById('info-header');
    const empresaNome = document.getElementById('empresa-nome');
    const clienteNome = document.getElementById('cliente-nome');

    if (empresaId || clienteId) {
        infoHeader.style.display = 'block';

        if (empresaId) {
            const empresaSelect = document.getElementById('empresa-filter');
            const empresaOption = empresaSelect.querySelector(`option[value="${empresaId}"]`);
            empresaNome.textContent = empresaOption ? empresaOption.textContent : 'Empresa Selecionada';
        } else {
            empresaNome.textContent = 'TODAS AS EMPRESAS';
        }

        if (clienteId) {
            const clienteSelect = document.getElementById('cliente-filter');
            const clienteOption = clienteSelect.querySelector(`option[value="${clienteId}"]`);
            clienteNome.textContent = `Cliente: ${clienteOption ? clienteOption.textContent : 'Cliente Selecionado'}`;
        } else {
            clienteNome.textContent = 'TODOS OS CLIENTES';
        }
    } else {
        infoHeader.style.display = 'none';
    }
}

// Renderizar tabela do Cash Flow
function renderizarTabelaCashFlow() {
    console.log('📊 Renderizando tabela Cash Flow...');

    const tbody = document.getElementById('cashflow-tbody');
    let html = '';

    if (!dadosCashFlow || !dadosCashFlow.totais) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <br>Nenhum dado encontrado para este período
                </td>
            </tr>
        `;
        return;
    }

    // Reinicializar estrutura global
    estruturaCashFlow = [];

    // 1. Linha de Saldo Inicial (apenas se houver valor)
    const saldoInicial = dadosCashFlow.saldo_inicial || 0;
    if (saldoInicial !== 0) {
        estruturaCashFlow.push({
            titulo: 'SALDO INICIAL',
            tipo: 'saldo_inicial',
            nivel: 1,
            categoria: 'saldo_inicial',
            valores: calcularValoresLinhaCashFlow({ categoria: 'saldo_inicial' }),
            expansivel: false
        });
    }

    // 2. Seção RECEITAS com hierarquia: Projeto > Cliente > Produto/Serviço > Título
    let temReceitas = false;
    const receitasItems = [];

    console.log('📊 Dados completos recebidos:', dadosCashFlow);

    // Processar receitas na hierarquia correta
    console.log('📊 Dados completos de projetos recebidos:', dadosCashFlow.projetos);

    if (dadosCashFlow.projetos && Object.keys(dadosCashFlow.projetos).length > 0) {
        console.log('📊 Total de projetos encontrados:', Object.keys(dadosCashFlow.projetos).length);
        console.log('📊 Nomes dos projetos:', Object.keys(dadosCashFlow.projetos));

        Object.keys(dadosCashFlow.projetos).forEach(projetoKey => {
            const projetoData = dadosCashFlow.projetos[projetoKey];
            console.log(`📊 ===== Processando projeto: ${projetoKey} =====`);
            console.log(`📊 Dados do projeto ${projetoKey}:`, JSON.stringify(projetoData, null, 2));

            const valoresProjeto = calcularValoresGrupo(projetoData, 'receita');
            console.log(`📊 Valores calculados para projeto ${projetoKey}:`, valoresProjeto);

            if (temValorNaoZero(valoresProjeto)) {
                temReceitas = true;
                const projetoId = `projeto_${projetoKey.replace(/\s+/g, '_').toLowerCase()}`;

                const projetoItem = {
                    titulo: projetoKey,
                    tipo: 'grupo_receita',
                    nivel: 3,
                    categoria: projetoId,
                    valores: valoresProjeto,
                    expansivel: projetoData.clientes && Object.keys(projetoData.clientes).length > 0,
                    expandido: expandedItems[projetoId] || false,
                    filhos: []
                };

                // Nível 2: Clientes do projeto
                if (projetoData.clientes) {
                    Object.keys(projetoData.clientes).forEach(clienteKey => {
                        const clienteData = projetoData.clientes[clienteKey];
                        const valoresCliente = calcularValoresGrupo(clienteData, 'receita');

                        if (temValorNaoZero(valoresCliente)) {
                            const clienteId = `${projetoId}_cliente_${clienteKey.replace(/\s+/g, '_').toLowerCase()}`;

                            const clienteItem = {
                                titulo: clienteKey,
                                tipo: 'subgrupo_receita',
                                nivel: 4,
                                categoria: clienteId,
                                valores: valoresCliente,
                                expansivel: clienteData.produtos_servicos && Object.keys(clienteData.produtos_servicos).length > 0,
                                expandido: expandedItems[clienteId] || false,
                                filhos: [],
                                pai: projetoId
                            };

                            // Nível 3: Produtos/Serviços do cliente
                            if (clienteData.produtos_servicos) {
                                Object.keys(clienteData.produtos_servicos).forEach(produtoKey => {
                                    const produtoData = clienteData.produtos_servicos[produtoKey];
                                    const valoresProduto = {
                                        competencia: 'Projeção',
                                        meses: [...(produtoData.entrada_mes || Array(12).fill(0))],
                                        total: produtoData.entrada_total || 0
                                    };

                                    if (temValorNaoZero(valoresProduto)) {
                                        const produtoId = `${clienteId}_produto_${produtoKey.replace(/\s+/g, '_').toLowerCase()}`;

                                        // Produto/Serviço como item expansível se tiver títulos
                                        clienteItem.filhos.push({
                                            titulo: produtoKey,
                                            tipo: 'item_receita',
                                            nivel: 5,
                                            categoria: produtoId,
                                            valores: valoresProduto,
                                            expansivel: false,
                                            pai: clienteId
                                        });
                                    }
                                });
                            }

                            projetoItem.filhos.push(clienteItem);
                        }
                    });
                }

                receitasItems.push(projetoItem);
            }
        });
    }

    // Se não há projetos estruturados mas há totais de receitas, criar estrutura "Receitas Diversas"
    if (!temReceitas && dadosCashFlow.totais && dadosCashFlow.totais.entrada_total > 0) {
        console.log('📊 Usando dados de totais para Receitas Diversas');
        temReceitas = true;

        const receitasDiversasItem = {
            titulo: 'Receitas Diversas',
            tipo: 'grupo_receita',
            nivel: 3,
            categoria: 'receitas_diversas',
            valores: {
                competencia: 'Projeção',
                meses: [...(dadosCashFlow.totais.entrada_mes || Array(12).fill(0))],
                total: dadosCashFlow.totais.entrada_total || 0
            },
            expansivel: false
        };

        receitasItems.push(receitasDiversasItem);
    }

    console.log('📊 Receitas processadas:', { temReceitas, receitasItems });


    if (temReceitas) {
        estruturaCashFlow.push({ titulo: 'RECEITAS', tipo: 'header', nivel: 0, expansivel: false });
        estruturaCashFlow.push({ titulo: 'PROJETOS', tipo: 'subheader', nivel: 1, expansivel: false });
        estruturaCashFlow.push(...receitasItems);

        estruturaCashFlow.push({
            titulo: 'TOTAL RECEITAS',
            tipo: 'subtotal',
            nivel: 0,
            categoria: 'total_receitas',
            valores: calcularValoresLinhaCashFlow({ categoria: 'total_receitas' }),
            expansivel: false
        });
    }

    // 2.5 Seção IMPOSTOS (após receitas) com label antes do detalhamento
    let temImpostos = false;
    const impostosItems = [];

    if (dadosCashFlow.impostos && Object.keys(dadosCashFlow.impostos).length > 0) {
        console.log('📊 Processando impostos:', dadosCashFlow.impostos);

        Object.keys(dadosCashFlow.impostos).forEach(impostoKey => {
            const impostoData = dadosCashFlow.impostos[impostoKey];
            const valoresImposto = {
                competencia: 'Calculado',
                meses: impostoData.saida_mes ? impostoData.saida_mes.map(v => -v) : Array(12).fill(0),
                total: -(impostoData.saida_total || 0)
            };

            if (temValorNaoZero(valoresImposto)) {
                temImpostos = true;
                impostosItems.push({
                    titulo: impostoKey,
                    tipo: 'item_imposto',
                    nivel: 2,
                    categoria: `imposto_${impostoKey.replace(/\s+/g, '_').toLowerCase()}`,
                    valores: valoresImposto,
                    expansivel: false
                });
            }
        });
    }

    if (temImpostos) {
        // Label principal IMPOSTOS
        estruturaCashFlow.push({ titulo: 'IMPOSTOS', tipo: 'header', nivel: 0, expansivel: false });
        // Detalhamento dos impostos
        estruturaCashFlow.push(...impostosItems);
        // Total de impostos
        estruturaCashFlow.push({
            titulo: 'TOTAL IMPOSTOS',
            tipo: 'subtotal',
            nivel: 0,
            categoria: 'total_impostos',
            valores: calcularValoresLinhaCashFlow({ categoria: 'total_impostos' }),
            expansivel: false
        });
        // Receita líquida (Receitas - Impostos)
        estruturaCashFlow.push({
            titulo: 'RECEITA LÍQUIDA',
            tipo: 'receita_liquida',
            nivel: 0,
            categoria: 'receita_liquida',
            valores: calcularValoresLinhaCashFlow({ categoria: 'receita_liquida' }),
            expansivel: false
        });
    }

    // 3. Seção DESPESAS
    let temDespesas = false;
    const despesasItems = [];

    if (dadosCashFlow.categorias_despesas) {
        Object.keys(dadosCashFlow.categorias_despesas).forEach(categoriaKey => {
            const despesaData = dadosCashFlow.categorias_despesas[categoriaKey];
            const valoresDespesa = {
                competencia: 'Projeção',
                meses: despesaData.saida_mes ? despesaData.saida_mes.map(v => -v) : Array(12).fill(0),
                total: -(despesaData.saida_total || 0)
            };

            if (temValorNaoZero(valoresDespesa)) {
                temDespesas = true;
                const categoriaId = `despesa_${categoriaKey.replace(/\s+/g, '_').toLowerCase()}`;

                const categoriaItem = {
                    titulo: categoriaKey,
                    tipo: 'grupo_despesa',
                    nivel: 3,
                    categoria: categoriaId,
                    valores: valoresDespesa,
                    expansivel: despesaData.subcategorias && Object.keys(despesaData.subcategorias).length > 0,
                    expandido: expandedItems[categoriaId] || false,
                    filhos: []
                };

                // Subcategorias da despesa
                if (despesaData.subcategorias) {
                    Object.keys(despesaData.subcategorias).forEach(subcategoriaKey => {
                        const subcategoriaData = despesaData.subcategorias[subcategoriaKey];

                        // Calcular valores da subcategoria somando todos os itens
                        let totalSubcategoria = 0;
                        let mesesSubcategoria = Array(12).fill(0);

                        if (subcategoriaData.saida_mes && subcategoriaData.saida_total !== undefined) {
                            // Dados diretos da subcategoria
                            mesesSubcategoria = subcategoriaData.saida_mes.map(v => -v);
                            totalSubcategoria = -(subcategoriaData.saida_total || 0);
                        } else if (subcategoriaData.itens) {
                            // Somar itens da subcategoria
                            Object.values(subcategoriaData.itens).forEach(item => {
                                if (item.saida_mes) {
                                    item.saida_mes.forEach((valor, index) => {
                                        mesesSubcategoria[index] += -(valor || 0);
                                    });
                                    totalSubcategoria += -(item.saida_total || 0);
                                }
                            });
                        }

                        const valoresSubcategoria = {
                            competencia: 'Projeção',
                            meses: mesesSubcategoria,
                            total: totalSubcategoria
                        };

                        if (temValorNaoZero(valoresSubcategoria)) {
                            const subcategoriaId = `${categoriaId}_sub_${subcategoriaKey.replace(/\s+/g, '_').toLowerCase()}`;

                            const subcategoriaItem = {
                                titulo: subcategoriaKey,
                                tipo: 'subgrupo_despesa',
                                nivel: 4,
                                categoria: subcategoriaId,
                                valores: valoresSubcategoria,
                                expansivel: subcategoriaData.itens && Object.keys(subcategoriaData.itens).length > 0,
                                expandido: expandedItems[subcategoriaId] || false,
                                filhos: [],
                                pai: categoriaId
                            };

                            // Itens da subcategoria
                            if (subcategoriaData.itens) {
                                Object.keys(subcategoriaData.itens).forEach(itemKey => {
                                    const itemData = subcategoriaData.itens[itemKey];
                                    const valoresItem = {
                                        competencia: 'Projeção',
                                        meses: itemData.saida_mes ? itemData.saida_mes.map(v => -v) : Array(12).fill(0),
                                        total: -(itemData.saida_total || 0)
                                    };

                                    if (temValorNaoZero(valoresItem)) {
                                        subcategoriaItem.filhos.push({
                                            titulo: itemKey,
                                            tipo: 'item_despesa',
                                            nivel: 5,
                                            categoria: `${subcategoriaId}_item_${itemKey.replace(/\s+/g, '_').toLowerCase()}`,
                                            valores: valoresItem,
                                            expansivel: false,
                                            pai: subcategoriaId
                                        });
                                    }
                                });
                            }

                            // Só adicionar subcategoria se tiver valores
                            if (temValorNaoZero(valoresSubcategoria)) {
                                categoriaItem.filhos.push(subcategoriaItem);
                            }
                        }
                    });
                }

                despesasItems.push(categoriaItem);
            }
        });
    }

    if (temDespesas) {
        estruturaCashFlow.push({ titulo: 'DESPESAS', tipo: 'header', nivel: 0, expansivel: false });
        estruturaCashFlow.push(...despesasItems);

        estruturaCashFlow.push({
            titulo: 'TOTAL DESPESAS',
            tipo: 'subtotal',
            nivel: 0,
            categoria: 'total_despesas',
            valores: calcularValoresLinhaCashFlow({ categoria: 'total_despesas' }),
            expansivel: false
        });
    }

    // 4. Resultado Líquido (sempre mostrar)
    estruturaCashFlow.push({
        titulo: 'RESULTADO LÍQUIDO',
        tipo: 'resultado',
        nivel: 0,
        categoria: 'resultado_liquido',
        valores: calcularValoresLinhaCashFlow({ categoria: 'resultado_liquido' }),
        expansivel: false
    });

    // 5. Saldo Acumulado (sempre mostrar)
    estruturaCashFlow.push({
        titulo: 'SALDO ACUMULADO',
        tipo: 'saldo_acumulado',
        nivel: 0,
        categoria: 'saldo_acumulado',
        valores: calcularValoresLinhaCashFlow({ categoria: 'saldo_acumulado' }),
        expansivel: false
    });

    // Renderizar cada linha
    html = renderizarLinhasComDrillDown(estruturaCashFlow);

    tbody.innerHTML = html;

    // Aplicar largura da primeira coluna após re-render
    setTimeout(() => {
        if (typeof updateFirstColumnWidth === 'function') {
            updateFirstColumnWidth();
        }
    }, 50);

    console.log('✅ Tabela Cash Flow renderizada');
}

// Função para verificar se tem valores não-zero
function temValorNaoZero(valores) {
    if (!valores) return false;
    if (valores.total && valores.total !== 0) return true;
    if (valores.meses && valores.meses.some(v => v !== 0)) return true;
    return false;
}

// Calcular valores para grupos (projeto/cliente)
function calcularValoresGrupo(grupoData, tipo) {
    const valores = {
        competencia: 'Projeção',
        meses: Array(12).fill(0),
        total: 0
    };

    if (!grupoData) return valores;

    if (tipo === 'receita') {
        // 1. Verificar se tem dados diretos de entrada
        if (grupoData.entrada_mes && Array.isArray(grupoData.entrada_mes)) {
            valores.meses = [...grupoData.entrada_mes];
            valores.total = grupoData.entrada_total || 0;
            console.log('📊 Dados diretos encontrados:', valores);
        } 
        // 2. Se tem estrutura de clientes, somar recursivamente
        else if (grupoData.clientes && typeof grupoData.clientes === 'object') {
            Object.values(grupoData.clientes).forEach(cliente => {
                const valoresCliente = calcularValoresGrupo(cliente, 'receita');
                valores.meses.forEach((_, index) => {
                    valores.meses[index] += valoresCliente.meses[index] || 0;
                });
                valores.total += valoresCliente.total || 0;
            });
            console.log('📊 Valores somados de clientes:', valores);
        }
        // 3. Se tem produtos/serviços diretamente
        else if (grupoData.produtos_servicos && typeof grupoData.produtos_servicos === 'object') {
            Object.values(grupoData.produtos_servicos).forEach(produto => {
                if (produto.entrada_mes && Array.isArray(produto.entrada_mes)) {
                    produto.entrada_mes.forEach((valor, index) => {
                        valores.meses[index] += valor || 0;
                    });
                    valores.total += produto.entrada_total || 0;
                }
            });
            console.log('📊 Valores de produtos/serviços:', valores);
        }
    }

    return valores;
}

// Renderizar linhas com drill-down - APENAS linhas com valores não-zero
function renderizarLinhasComDrillDown(estrutura) {
    let html = '';

    estrutura.forEach(item => {
        // Para headers, subheaders e totais, sempre renderizar
        const ehCabecalho = ['header', 'subheader', 'subtotal', 'resultado', 'saldo_inicial', 'saldo_acumulado'].includes(item.tipo);

        if (!ehCabecalho && item.valores && !temValorNaoZero(item.valores)) {
            return; // Pular linhas de itens sem valor
        }

        // Renderizar linha principal
        html += criarLinhaTabelaCashFlow(item, item.valores || { competencia: 'Projeção', meses: Array(12).fill(0), total: 0 });

        // Renderizar filhos se expandido
        if (item.filhos && item.expansivel && expandedItems[item.categoria]) {
            item.filhos.forEach(filho => {
                // Só mostrar filhos com valores não-zero
                if (filho.valores && temValorNaoZero(filho.valores)) {
                    html += criarLinhaTabelaCashFlow(filho, filho.valores);

                    // Renderizar netos se expandido
                    if (filho.filhos && filho.expansivel && expandedItems[filho.categoria]) {
                        filho.filhos.forEach(neto => {
                            // Só mostrar netos com valores não-zero
                            if (neto.valores && temValorNaoZero(neto.valores)) {
                                html += criarLinhaTabelaCashFlow(neto, neto.valores);
                            }
                        });
                    }
                }
            });
        }
    });

    return html;
}

// Toggle expansão de linha
function toggleExpansaoLinha(categoria) {
    expandedItems[categoria] = !expandedItems[categoria];
    renderizarTabelaCashFlow();
}

// Calcular valores para uma linha do Cash Flow
function calcularValoresLinhaCashFlow(item) {
    const valores = {
        competencia: 'Projeção', // Padrão
        meses: Array(12).fill(0),
        total: 0
    };

    // Implementar cálculos baseados nos dados reais
    if (item.categoria && dadosCashFlow) {
        if (item.categoria === 'saldo_inicial') {
            valores.competencia = 'Caixa';
            valores.meses[0] = dadosCashFlow.saldo_inicial || 0; // Só no primeiro mês
            valores.total = dadosCashFlow.saldo_inicial || 0;
        } else if (item.categoria === 'total_receitas' && dadosCashFlow.totais) {
            valores.meses = [...(dadosCashFlow.totais.entrada_mes || Array(12).fill(0))];
            valores.total = dadosCashFlow.totais.entrada_total || 0;
        } else if (item.categoria === 'total_impostos' && dadosCashFlow.impostos) {
            // Somar todos os impostos
            valores.competencia = 'Calculado';
            Object.values(dadosCashFlow.impostos).forEach(impostoData => {
                if (impostoData.saida_mes) {
                    impostoData.saida_mes.forEach((valor, idx) => {
                        valores.meses[idx] -= valor;
                    });
                }
                if (impostoData.saida_total) {
                    valores.total -= impostoData.saida_total;
                }
            });
        } else if (item.categoria === 'receita_liquida' && dadosCashFlow.totais) {
            // Receita Líquida = Receitas - Impostos
            valores.competencia = 'Calculado';
            const receitasMes = dadosCashFlow.totais.entrada_mes || Array(12).fill(0);

            // Calcular total de impostos
            const impostosMes = Array(12).fill(0);
            let impostosTotal = 0;

            if (dadosCashFlow.impostos) {
                Object.values(dadosCashFlow.impostos).forEach(impostoData => {
                    if (impostoData.saida_mes) {
                        impostoData.saida_mes.forEach((valor, idx) => {
                            impostosMes[idx] += valor;
                        });
                    }
                    if (impostoData.saida_total) {
                        impostosTotal += impostoData.saida_total;
                    }
                });
            }

            // Receita líquida = receitas - impostos
            valores.meses = receitasMes.map((receita, idx) => receita - impostosMes[idx]);
            valores.total = (dadosCashFlow.totais.entrada_total || 0) - impostosTotal;
        } else if (item.categoria === 'total_despesas' && dadosCashFlow.totais) {
            valores.meses = dadosCashFlow.totais.saida_mes ? dadosCashFlow.totais.saida_mes.map(v => -v) : Array(12).fill(0);
            valores.total = -(dadosCashFlow.totais.saida_total || 0);
        } else if (item.categoria === 'resultado_liquido' && dadosCashFlow.totais) {
            valores.meses = [...(dadosCashFlow.totais.fluxo_liquido_mes || Array(12).fill(0))];
            valores.total = dadosCashFlow.totais.fluxo_liquido_total || 0;
        } else if (item.categoria === 'saldo_acumulado' && dadosCashFlow.totais) {
            valores.meses = [...(dadosCashFlow.totais.saldo_acumulado_mes || Array(12).fill(0))];
            valores.total = dadosCashFlow.totais.saldo_acumulado_mes ? dadosCashFlow.totais.saldo_acumulado_mes[11] : 0;
        }
    }

    return valores;
}

// Adicionar CSS dinâmico para hover nos itens expansíveis e alinhamento
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .table-wrapper {
            overflow-x: auto;
            width: 100%;
            max-width: 100%;
            margin-left: 0;
            padding-left: 0;
            position: relative;
            left: 0;
        }

        .page-container {
            margin-left: 240px !important;
            padding-left: 12px !important;
            position: relative !important;
            left: 0 !important;
        }

        #cashflow-table {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            margin-left: 0;
            padding-left: 0;
        }

        #cashflow-table th,
        #cashflow-table td {
            min-width: 120px;
            box-sizing: border-box;
            padding: 8px 6px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        #cashflow-table td:first-child {
            position: sticky;
            left: 0;
            z-index: 2;
            background-color: #ffffff;
            border-right: 1px solid #e2e8f0;
            min-width: 250px;
            text-align: left;
            padding-left: 10px;
        }

        #cashflow-table th:first-child {
            position: sticky;
            left: 0;
            z-index: 2;
            background-color: #f8fafc;
            border-right: 1px solid #e2e8f0;
            min-width: 250px;
            text-align: left;
            padding-left: 10px;
        }

        .cashflow-grupo-row:hover,
        .cashflow-subgrupo-row:hover {
            background-color: #e0f2fe !important;
            transition: background-color 0.2s ease;
        }

        .cashflow-item-row {
            border-left: 3px solid #e2e8f0;
        }

        .cashflow-grupo-row[style*="cursor: pointer"] td:first-child,
        .cashflow-subgrupo-row[style*="cursor: pointer"] td:first-child {
            position: relative;
        }

        .expand-icon {
            display: inline-block;
            width: 1em;
            text-align: center;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
});

// Criar linha da tabela Cash Flow
function criarLinhaTabelaCashFlow(item, valores) {
    const corTexto = item.tipo === 'header' ? '#1f2937' : '#374151';

    let classeLinha = '';
    let estiloLinha = `color: ${corTexto};`;

    switch (item.tipo) {
        case 'header':
            classeLinha = 'cashflow-header-row';
            estiloLinha += ' font-weight: 700; background-color: #f3f4f6; color: #111827; font-size: 14px; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;';
            break;
        case 'subheader':
            classeLinha = 'cashflow-subheader-row';
            estiloLinha += ' font-weight: 600; background-color: #f9fafb; color: #374151; border-top: 1px solid #e5e7eb;';
            break;
        case 'subtotal':
            classeLinha = 'cashflow-subtotal-row';
            estiloLinha += ' font-weight: 700; background-color: #f3f4f6; color: #1f2937; border-top: 1px solid #d1d5db; border-bottom: 1px solid #d1d5db; font-size: 13px;';
            break;
        case 'resultado':
            classeLinha = 'cashflow-resultado-row';
            estiloLinha += ' font-weight: 700; background-color: #ede9fe; color: #1f2937; border-top: 1px solid #c4b5fd; border-bottom: 1px solid #c4b5fd; font-size: 14px;';
            break;
        case 'saldo_inicial':
        case 'saldo_acumulado':
            classeLinha = 'cashflow-saldo-row';
            estiloLinha += ' font-weight: 700; background-color: #f0fdf4; color: #1f2937; border-top: 1px solid #bbf7d0; border-bottom: 1px solid #bbf7d0; font-size: 14px;';
            break;
        case 'grupo_receita':
        case 'grupo_despesa':
            classeLinha = 'cashflow-grupo-row';
            estiloLinha += ' font-weight: 500; background-color: #fafbfc;';
            if (item.expansivel) {
                estiloLinha += ' cursor: pointer;';
            }
            break;
        case 'subgrupo_receita':
        case 'subgrupo_despesa':
            classeLinha = 'cashflow-subgrupo-row';
            estiloLinha += ' font-weight: 400; background-color: #f9fafb;';
            if (item.expansivel) {
                estiloLinha += ' cursor: pointer;';
            }
            break;
        case 'item_receita':
        case 'item_despesa':
            classeLinha = 'cashflow-item-row';
            estiloLinha += ' background-color: #fefefe;';
            break;
        case 'item_imposto':
            classeLinha = 'cashflow-item-row';
            estiloLinha += ' background-color: #fef9e7; font-style: italic;';
            break;
        case 'receita_liquida':
            classeLinha = 'cashflow-receita-liquida-row';
            estiloLinha += ' font-weight: 700; background-color: #ecfdf5; color: #1f2937; border-top: 1px solid #a7f3d0; border-bottom: 1px solid #a7f3d0; font-size: 14px;';
            break;
    }

    // Calcular indentação baseada no nível (garantir que nunca seja negativo)
    const nivelIndentacao = Math.max(0, item.nivel - 1);
    const indentacao = '&nbsp;'.repeat(nivelIndentacao * 6);

    // Ícone de expansão/colapso funcional
    let iconeDrillDown = '';
    if (item.expansivel && item.filhos && item.filhos.length > 0) {
        const expandido = expandedItems[item.categoria];
        const icone = expandido ? '−' : '+';
        const corIcone = expandido ? '#dc2626' : '#059669';
        iconeDrillDown = `<span class="expand-icon" onclick="event.stopPropagation(); toggleExpansaoLinha('${item.categoria}');" style="cursor: pointer; color: ${corIcone}; font-weight: bold; margin-right: 6px; user-select: none; display: inline-block; width: 20px; height: 20px; text-align: center; font-size: 16px; background: ${expandido ? '#fee2e2' : '#dcfce7'}; border: 1px solid ${corIcone}; border-radius: 3px; line-height: 18px;">${icone}</span>`;
    } else {
        iconeDrillDown = '<span class="expand-icon" style="display: inline-block; width: 16px; margin-right: 8px;"></span>';
    }

    // Adicionar evento de clique apenas se for expansível
    const eventoClique = item.expansivel ? `onclick="toggleExpansaoLinha('${item.categoria}');" style="${estiloLinha} cursor: pointer;"` : `style="${estiloLinha}"`;

    let html = `<tr class="${classeLinha}" ${eventoClique}>`;
    html += `<td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; position: sticky; left: 0; background: ${item.nivel === 0 ? '#f8f9fa' : 'white'}; z-index: 9; border-right: 2px solid #dee2e6; min-width: ${firstColumnWidth || 300}px; max-width: ${firstColumnWidth || 300}px; width: ${firstColumnWidth || 300}px;">${indentacao}${iconeDrillDown}${item.titulo}</td>`;

    // Colunas dos meses
    const ehTotalizador = ['subtotal', 'resultado', 'saldo_inicial', 'saldo_acumulado', 'receita_liquida'].includes(item.tipo);

    if (valores && valores.meses) {
        valores.meses.forEach(valor => {
            const valorFormatado = formatarMoeda(valor, ehTotalizador);
            const corValor = valor > 0 ? '#059669' : valor < 0 ? '#dc2626' : '#374151';
            const pesoMes = ehTotalizador ? '600' : '400';
            html += `<td style="padding: 8px 6px; text-align: right; border-bottom: 1px solid #f1f5f9; color: ${corValor}; font-size: 11px; font-weight: ${pesoMes};">${valorFormatado}</td>`;
        });
    } else {
        // Preencher com valores vazios se não houver dados
        for (let i = 0; i < 12; i++) {
            html += `<td style="padding: 8px 6px; text-align: right; border-bottom: 1px solid #f1f5f9; color: #6b7280; font-size: 11px;">-</td>`;
        }
    }

    // Coluna total
    const total = valores ? valores.total : 0;
    const totalFormatado = formatarMoeda(total, ehTotalizador);
    const corTotal = total > 0 ? '#059669' : total < 0 ? '#dc2626' : '#374151';
    const pesoTotal = ehTotalizador ? '700' : '400';
    html += `<td style="padding: 8px 6px; text-align: right; border-bottom: 1px solid #f1f5f9; background: #f8fafc; font-weight: ${pesoTotal}; color: ${corTotal}; font-size: 11px;">${totalFormatado}</td>`;

    html += '</tr>';

    return html;
}

// Formatar moeda sem símbolo R$
function formatarMoeda(valor, exibirZero = false) {
    if (valor === 0 && !exibirZero) return '-';

    const valorAbs = Math.abs(valor);
    const sinal = valor < 0 ? '-' : '';

    return sinal + valorAbs.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

// Resetar filtros
function resetFilters() {
    document.getElementById('ano-filter').value = new Date().getFullYear();
    document.getElementById('empresa-filter').value = '';
    document.getElementById('cliente-filter').value = '';
    document.getElementById('projeto-filter').value = '';
    document.getElementById('produto-servico-filter').value = '';
    const baseEl = document.getElementById('base-filter');
    if (baseEl) baseEl.value = 'competencia';
    carregarDadosCashFlow();
}

// Exportar Cash Flow
function exportarCashFlow(formato = 'xlsx') {
    console.log(`📊 Exportando Cash Flow como ${formato.toUpperCase()}...`);

    if (formato === 'xlsx') {
        exportarXLSX();
    } else {
        showErrorMessage(`Formato ${formato.toUpperCase()} não implementado ainda`);
    }
}

// Exportar como XLSX
async function exportarXLSX() {
    try {
        console.log('📥 Iniciando exportação XLSX do Cash Flow...');

        const ano = document.getElementById('ano-filter').value;
        const empresa = document.getElementById('empresa-filter').value;
        const cliente = document.getElementById('cliente-filter').value;
        const projeto = document.getElementById('projeto-filter').value;
        const produtoServico = document.getElementById('produto-servico-filter').value;

        // Construir URL com parâmetros
        let url = `/api/relatorios/cashflow-gerencial/export-excel?ano=${ano}`;
        if (empresa) url += `&empresa=${empresa}`;
        if (cliente) url += `&cliente=${cliente}`;
        if (projeto) url += `&projeto=${projeto}`;
        if (produtoServico) url += `&produto_servico=${produtoServico}`;

        console.log('📥 URL de exportação:', url);

        const response = await fetch(url, {
            credentials: 'include',
            headers: { 
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na resposta do servidor:', errorText);
            throw new Error(`Erro ao exportar: ${response.status} - ${errorText}`);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `cashflow-${ano}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        console.log('✅ Exportação concluída com sucesso');
        if (typeof showSuccessMessage === 'function') {
            showSuccessMessage(`Cash Flow exportado como cashflow-${ano}.xlsx`);
        } else {
            alert(`Cash Flow exportado como cashflow-${ano}.xlsx`);
        }

    } catch (error) {
        console.error('❌ Erro ao exportar XLSX:', error);
        if (typeof showErrorMessage === 'function') {
            showErrorMessage('Erro ao exportar relatório: ' + error.message);
        } else {
            alert('Erro ao exportar relatório: ' + error.message);
        }
    }
}

// Funções de rolagem da tabela
function scrollToTableStart() {
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
        tableWrapper.scrollTo({
            left: 0,
            behavior: 'smooth'
        });
    }
}

function scrollToTableEnd() {
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
        tableWrapper.scrollTo({
            left: tableWrapper.scrollWidth,
            behavior: 'smooth'
        });
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
